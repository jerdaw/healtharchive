import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

import diagnosticLib from "./lighthouse-diagnostic-lib.cjs";
import {
  createInterruptController,
  registerInterruptCleanup,
  stopOwnedProcessGroup,
} from "./lighthouse-process-safety-lib.mjs";

const MAX_SAMPLE_MS = 120_000;
const MAX_SERVER_START_MS = 45_000;
const MAX_BUILD_FILES = 30_000;
const MAX_BUILD_BYTES = 2_000_000_000;
const SAFE_PHASES = new Set([
  "lighthouse-cli-started",
  "lighthouse-cli-exit-zero",
  "lighthouse-cli-exit-nonzero",
  "chrome-starting",
  "chrome-ready",
  "chrome-start-failed",
  "chrome-profile-warning",
  "chrome-kill-failed",
  "devtools-connect-started",
  "devtools-connect-completed",
  "devtools-connect-failed",
  "navigation-setup-started",
  "navigation-setup-completed",
  "network-setup-started",
  "network-setup-completed",
  "navigation-started",
  "navigation-completed",
  "audit-started",
  "audit-completed",
  "results-started",
  "results-completed",
  "lighthouse-runtime-error",
  ...diagnosticLib.LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  ...diagnosticLib.SAFE_GATHER_DIAGNOSTIC_PHASES,
  "lighthouse-diagnostic-truncated",
]);

const SOURCE_PINS = new Map([
  ["package-lock.json", "e8ffcfe80f1e32104bad4079c4e101d70cfbca261730cf98eb07daf35b3a9687"],
  [
    "scripts/lighthouse-config.cjs",
    "0ba73d26ce625670920de9ff8cc0ca09c918f74bcbf06ef7434f63d5fc4e1d74",
  ],
  [
    "scripts/local-production-server-lib.mjs",
    "dcb23be965cb1f7de725bad8ce059f79a8c9be3b3a1fd8e63d61bd307cd03ce0",
  ],
  [
    "scripts/build-metadata-lib.mjs",
    "3cf4a8825072df4281c3eb7eca918951bd848d89896d85757048f414a473367b",
  ],
  [
    "scripts/internal-link-check-lib.mjs",
    "b8268d5142d64419f0f9d6843c3ca86ae2e72d8731bf60d326b493875eeca3e8",
  ],
]);
const interruptController = createInterruptController();

const require = createRequire(import.meta.url);

function safeStopReason(error) {
  if (error?.code === "EADDRINUSE") return "loopback-api-port-in-use";
  if (error?.code === "ENOENT") return "required-local-file-missing";
  if (error?.code === "EACCES" || error?.code === "EPERM") return "local-permission-denied";
  return "local-preflight-or-run-failed";
}

function parseFrontendRoot(argv) {
  const index = argv.indexOf("--frontend-root");
  if (index < 0 || typeof argv[index + 1] !== "string" || argv.length !== index + 2) {
    throw new Error("frontend-root-required");
  }
  const supplied = argv[index + 1];
  if (!path.isAbsolute(supplied)) throw new Error("frontend-root-must-be-absolute");
  return path.resolve(supplied);
}

async function sha256File(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function hashTreeEntry(hash, label, filePath, totals, ignored = new Set()) {
  if (ignored.has(label)) return;
  const details = await lstat(filePath);
  if (details.isSymbolicLink()) throw new Error("build-symlink-not-allowed");
  if (details.isDirectory()) {
    hash.update(`D\0${label}\0${details.mode & 0o777}\0`);
    const entries = await readdir(filePath, { withFileTypes: true });
    entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
    for (const entry of entries) {
      await hashTreeEntry(
        hash,
        `${label}/${entry.name}`,
        path.join(filePath, entry.name),
        totals,
        ignored,
      );
    }
    return;
  }
  if (!details.isFile()) throw new Error("build-entry-not-regular-file");
  totals.files += 1;
  totals.bytes += details.size;
  if (totals.files > MAX_BUILD_FILES || totals.bytes > MAX_BUILD_BYTES) {
    throw new Error("build-identity-size-limit");
  }
  hash.update(`F\0${label}\0${details.mode & 0o777}\0${details.size}\0`);
  hash.update(await readFile(filePath));
}

async function hashBuildInputs(frontendRoot, runtimeRoot = null, scratchRoot = null) {
  const roots =
    runtimeRoot === null
      ? [
          ["standalone", path.join(frontendRoot, ".next", "standalone")],
          ["static", path.join(frontendRoot, ".next", "static")],
          ["public", path.join(frontendRoot, "public")],
          ["build-id", path.join(frontendRoot, ".next", "BUILD_ID")],
          ["build-metadata", path.join(frontendRoot, ".next", "healtharchive-build-metadata.json")],
        ]
      : [
          ["standalone", runtimeRoot],
          ["static", path.join(runtimeRoot, ".next", "static")],
          ["public", path.join(runtimeRoot, "public")],
          ["build-id", path.join(scratchRoot, "identity", "BUILD_ID")],
          [
            "build-metadata",
            path.join(scratchRoot, "identity", "healtharchive-build-metadata.json"),
          ],
        ];
  const hash = createHash("sha256");
  const totals = { files: 0, bytes: 0 };
  for (const [label, filePath] of roots) {
    await hashTreeEntry(
      hash,
      label,
      filePath,
      totals,
      new Set(["standalone/.next/static", "standalone/public"]),
    );
  }
  return { sha256: hash.digest("hex"), ...totals };
}

async function assertSourcePins(frontendRoot) {
  for (const [relativePath, expectedHash] of SOURCE_PINS) {
    if ((await sha256File(path.join(frontendRoot, relativePath))) !== expectedHash) {
      throw new Error("source-pin-mismatch");
    }
  }

  const lock = JSON.parse(await readFile(path.join(frontendRoot, "package-lock.json"), "utf8"));
  if (
    lock.packages?.["node_modules/@lhci/cli"]?.version !== "0.15.1" ||
    lock.packages?.["node_modules/lighthouse"]?.version !== "12.6.1"
  ) {
    throw new Error("locked-lighthouse-version-mismatch");
  }
}

async function assertEmptyExistingReports(frontendRoot) {
  const entries = await readdir(path.join(frontendRoot, ".lighthouseci"));
  if (entries.length !== 0) throw new Error("existing-lighthouse-reports-present");
}

async function copyReadOnlyBuildToScratch(frontendRoot, scratchRoot) {
  const standaloneSource = path.join(frontendRoot, ".next", "standalone");
  const runtimeRoot = path.join(scratchRoot, "standalone");
  const serverPath = path.join(standaloneSource, "server.js");
  const staticSource = path.join(frontendRoot, ".next", "static");
  const publicSource = path.join(frontendRoot, "public");
  const identityRoot = path.join(scratchRoot, "identity");

  await access(serverPath, fsConstants.R_OK);
  await access(staticSource, fsConstants.R_OK);
  await access(publicSource, fsConstants.R_OK);
  await access(path.join(frontendRoot, ".next", "BUILD_ID"), fsConstants.R_OK);
  await mkdir(identityRoot, { recursive: false, mode: 0o700 });
  await cp(standaloneSource, runtimeRoot, { recursive: true, preserveTimestamps: true });
  await cp(staticSource, path.join(runtimeRoot, ".next", "static"), {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
  await cp(publicSource, path.join(runtimeRoot, "public"), {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
  await cp(path.join(frontendRoot, ".next", "BUILD_ID"), path.join(identityRoot, "BUILD_ID"));
  await cp(
    path.join(frontendRoot, ".next", "healtharchive-build-metadata.json"),
    path.join(identityRoot, "healtharchive-build-metadata.json"),
  );
  return runtimeRoot;
}

async function waitForLoopbackServer({ origin, child }) {
  const deadline = Date.now() + MAX_SERVER_START_MS;
  while (Date.now() < deadline) {
    interruptController.throwIfInterrupted();
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("local-frontend-exited-before-ready");
    }
    try {
      const response = await fetch(origin, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      await response.body?.cancel().catch(() => {});
      if (response.status >= 200 && response.status < 400) return;
    } catch {
      // The only request is to the allocated loopback origin.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("local-frontend-readiness-timeout");
}

function createSafeEnvironment({
  frontendPort,
  apiBaseUrl,
  chromePath,
  isWsl,
  helperPath,
  scratchRoot,
}) {
  const env = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    TMPDIR: scratchRoot,
    TMP: scratchRoot,
    TEMP: scratchRoot,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_BACKEND_URL: apiBaseUrl,
    NEXT_PUBLIC_LOG_API_HEALTH_FAILURE: "false",
    NEXT_PUBLIC_SHOW_API_BASE_HINT: "false",
    NEXT_PUBLIC_SHOW_API_HEALTH_BANNER: "false",
    HOSTNAME: "127.0.0.1",
    PORT: String(frontendPort),
    CHROME_PATH: chromePath,
    HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: "1",
    HEALTHARCHIVE_LIGHTHOUSE_SINGLE_ATTEMPT: "1",
    HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTIC_HELPER: helperPath,
    ...(isWsl ? { HEALTHARCHIVE_LINUX_CHROME: "1" } : {}),
  };

  for (const name of ["WSL_DISTRO_NAME", "WSL_INTEROP", "LANG", "LC_ALL"]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return env;
}

function createSingleHomeConfig({ createLighthouseConfig, origin, outputDir }) {
  const config = createLighthouseConfig(origin);
  config.ci.collect.numberOfRuns = 1;
  config.ci.collect.url = [new URL("/", `${origin}/`).href];
  config.ci.collect.settings.chromeFlags = `${config.ci.collect.settings.chromeFlags} --no-proxy-server`;
  config.ci.upload.outputDir = outputDir;
  return config;
}

async function runOneHomeSample({ frontendRoot, origin, scratchRoot, env }) {
  interruptController.throwIfInterrupted();
  const configModule = require(path.join(frontendRoot, "scripts", "lighthouse-config.cjs"));
  const configPath = path.join(scratchRoot, "lighthouserc.cjs");
  const reportPath = path.join(scratchRoot, "reports");
  const config = createSingleHomeConfig({
    createLighthouseConfig: configModule.createLighthouseConfig,
    origin,
    outputDir: reportPath,
  });
  await writeFile(configPath, `module.exports = ${JSON.stringify(config, null, 2)};\n`, {
    flag: "wx",
    mode: 0o600,
  });

  const cliPath = path.join(frontendRoot, "node_modules", "@lhci", "cli", "src", "cli.js");
  await access(cliPath, fsConstants.R_OK);
  interruptController.throwIfInterrupted();
  const lighthouseCwd = scratchRoot;
  const scratchReportsDir = path.join(scratchRoot, ".lighthouseci");
  await mkdir(scratchReportsDir, { recursive: false, mode: 0o700 });
  interruptController.throwIfInterrupted();
  return new Promise((resolve) => {
    const startedAt = process.hrtime.bigint();
    const progress = new diagnosticLib.LighthouseDiagnosticParser();
    const seenPhases = new Set();
    let markerPending = "";
    let timedOut = false;
    let settled = false;
    let groupStopPromise = null;
    let child = null;

    const emitPhase = (phase) => {
      if (!SAFE_PHASES.has(phase) || seenPhases.has(phase) || seenPhases.size >= 48) return;
      seenPhases.add(phase);
      console.log(`phase=${phase} elapsedSec=${elapsedSeconds(startedAt)}`);
    };
    const emitTelemetry = (event) => {
      if (event.type === "browser-version") {
        console.log(`browser=${event.product} version=${event.version}`);
      } else if (event.type === "cdp-failure") {
        console.log(`cdpFailure=${event.method} class=${event.failureClass}`);
      } else if (event.type === "runtime-error") {
        console.log(
          `runtimeErrorClass=${event.nameClass} codePresent=${event.codePresent} codeClass=${event.codePhase}`,
        );
      } else if (event.type === "spawn-failure") {
        const failureClass = diagnosticLib.CHILD_SPAWN_FAILURE_CLASSES.has(event.failureClass)
          ? event.failureClass
          : "other";
        console.log(`spawnFailure=${failureClass}`);
      }
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const stopGroupOnce = () => {
      groupStopPromise ??= stopOwnedProcessGroup(child);
      return groupStopPromise;
    };

    child = spawn(
      process.execPath,
      [cliPath, "autorun", `--config=${path.join(scratchRoot, "lighthouserc.cjs")}`],
      {
        cwd: lighthouseCwd,
        detached: process.platform !== "win32",
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.healtharchiveProcessGroup = process.platform !== "win32";
    lighthouseChild = child;

    child.stdout.on("data", (chunk) => {
      for (const event of progress.pushStdout(chunk)) {
        const line = diagnosticLib.formatProgressEvent(event);
        if (line !== null) console.log(`progress=${line}`);
      }
    });
    child.stderr.on("data", (chunk) => {
      const parsed = diagnosticLib.parseDiagnosticMarkerChunk(markerPending, chunk, SAFE_PHASES);
      markerPending = parsed.pending;
      diagnosticLib.dispatchDiagnosticEvents(parsed.events, {
        emitPhase,
        emitTelemetry,
      });
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      void stopGroupOnce()
        .then(() => {
          if (lighthouseChild === child) lighthouseChild = null;
          finish({ status: "timeout", exitClass: "timeout" });
        })
        .catch(() => finish({ status: "blocked", exitClass: "process-group-stop-failed" }));
    }, MAX_SAMPLE_MS);
    child.once("error", () => {
      if (lighthouseChild === child) lighthouseChild = null;
      finish({ status: "spawn-error", exitClass: "spawn-error" });
    });
    child.once("close", (code, signal) => {
      void stopGroupOnce()
        .then(() => {
          if (lighthouseChild === child) lighthouseChild = null;
          if (timedOut) return;
          finish({
            status: code === 0 ? "completed" : "failed",
            exitClass:
              signal === null ? `exit-${Number.isInteger(code) ? code : "unknown"}` : "signal",
          });
        })
        .catch(() => {
          if (lighthouseChild === child) lighthouseChild = child;
          finish({ status: "blocked", exitClass: "process-group-stop-failed" });
        });
    });
  });
}

function elapsedSeconds(startedAt) {
  const elapsed = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
  return Math.min(120, Math.max(0, Math.floor(elapsed)));
}

let frontendChild = null;
let apiStub = null;
let lighthouseChild = null;
let scratchRoot = null;
let cleanupPromise = null;
let stopHttpServer = null;
let setupInProgress = true;

async function cleanup({ removeScratch = true } = {}) {
  if (cleanupPromise !== null) return cleanupPromise;
  const currentCleanup = (async () => {
    const failures = [];
    try {
      if (lighthouseChild !== null) {
        await stopOwnedProcessGroup(lighthouseChild);
        lighthouseChild = null;
      }
    } catch {
      failures.push("lighthouse-process-group-stop-failed");
    }
    try {
      if (frontendChild !== null) {
        await stopOwnedProcessGroup(frontendChild);
        frontendChild = null;
      }
    } catch {
      failures.push("frontend-process-group-stop-failed");
    }
    try {
      if (apiStub !== null) {
        await stopHttpServer(apiStub);
        apiStub = null;
      }
    } catch {
      failures.push("api-stub-stop-failed");
    }
    if (failures.length === 0 && removeScratch) {
      try {
        if (scratchRoot !== null) {
          await rm(scratchRoot, { recursive: true, force: true });
          scratchRoot = null;
        }
      } catch {
        failures.push("scratch-cleanup-failed");
      }
    }
    return failures;
  })();
  cleanupPromise = currentCleanup;
  try {
    return await currentCleanup;
  } finally {
    if (cleanupPromise === currentCleanup) cleanupPromise = null;
  }
}

registerInterruptCleanup({
  interruptController,
  cleanup,
  isSetup: () => setupInProgress,
});

try {
  const frontendRoot = parseFrontendRoot(process.argv.slice(2));
  interruptController.throwIfInterrupted();
  const realFrontendRoot = await realpath(frontendRoot);
  interruptController.throwIfInterrupted();
  if (realFrontendRoot !== frontendRoot) throw new Error("frontend-root-symlinked");
  await assertSourcePins(frontendRoot);
  interruptController.throwIfInterrupted();
  await assertEmptyExistingReports(frontendRoot);
  interruptController.throwIfInterrupted();

  if (process.platform !== "linux") throw new Error("linux-local-runtime-required");
  const buildMetadataPath = path.join(frontendRoot, ".next", "healtharchive-build-metadata.json");
  const { readBuildMetadata, requireExplicitWslChrome, isWslEnvironment } = await import(
    pathToFileURL(path.join(frontendRoot, "scripts", "build-metadata-lib.mjs"))
  );
  const { getLoopbackHttpTarget } = await import(
    pathToFileURL(path.join(frontendRoot, "scripts", "internal-link-check-lib.mjs"))
  );
  const localServerHelpers = await import(
    pathToFileURL(path.join(frontendRoot, "scripts", "local-production-server-lib.mjs"))
  );
  interruptController.throwIfInterrupted();
  const { LOOPBACK_HOST, findAvailablePort, startFailFastApiStub } = localServerHelpers;
  stopHttpServer = localServerHelpers.stopHttpServer;

  const buildMetadata = await readBuildMetadata(buildMetadataPath);
  interruptController.throwIfInterrupted();
  const apiTarget = getLoopbackHttpTarget(buildMetadata.apiBaseUrl);
  if (apiTarget === null || apiTarget.host !== LOOPBACK_HOST) {
    throw new Error("build-api-target-not-loopback");
  }

  const release = os.release();
  const chromePath = await requireExplicitWslChrome({ release });
  interruptController.throwIfInterrupted();
  const expectedChromePath = process.env.HEALTHARCHIVE_EXPECTED_CHROME_PATH;
  if (
    chromePath === null ||
    !path.isAbsolute(chromePath) ||
    path.extname(chromePath).toLowerCase() === ".exe" ||
    !expectedChromePath ||
    path.resolve(chromePath) !== path.resolve(expectedChromePath)
  ) {
    throw new Error("explicit-pinned-linux-chrome-required");
  }

  const isWsl = isWslEnvironment({ release });
  scratchRoot = await mkdtemp(path.join(os.tmpdir(), "ha-lh-home-diag-"));
  interruptController.throwIfInterrupted();
  const buildIdentityBeforeCopy = await hashBuildInputs(frontendRoot);
  interruptController.throwIfInterrupted();
  const runtimeRoot = await copyReadOnlyBuildToScratch(frontendRoot, scratchRoot);
  interruptController.throwIfInterrupted();
  const buildIdentityInScratch = await hashBuildInputs(frontendRoot, runtimeRoot, scratchRoot);
  interruptController.throwIfInterrupted();
  const buildIdentityAfterCopy = await hashBuildInputs(frontendRoot);
  interruptController.throwIfInterrupted();
  if (
    buildIdentityBeforeCopy.sha256 !== buildIdentityInScratch.sha256 ||
    buildIdentityBeforeCopy.sha256 !== buildIdentityAfterCopy.sha256
  ) {
    throw new Error("build-changed-during-scratch-copy");
  }
  const helperPath = fileURLToPath(new URL("./lighthouse-diagnostic-lib.cjs", import.meta.url));
  const frontendPort = await findAvailablePort(LOOPBACK_HOST);
  interruptController.throwIfInterrupted();
  apiStub = await startFailFastApiStub({
    ...apiTarget,
    purpose: "single-home-lighthouse-diagnostic",
  });
  interruptController.throwIfInterrupted();
  const env = createSafeEnvironment({
    frontendPort,
    apiBaseUrl: buildMetadata.apiBaseUrl,
    chromePath,
    isWsl,
    helperPath,
    scratchRoot,
  });

  frontendChild = spawn(process.execPath, [path.join(runtimeRoot, "server.js")], {
    cwd: runtimeRoot,
    detached: process.platform !== "win32",
    env,
    stdio: ["ignore", "ignore", "ignore"],
  });
  frontendChild.healtharchiveProcessGroup = process.platform !== "win32";
  const origin = `http://${LOOPBACK_HOST}:${frontendPort}`;
  await waitForLoopbackServer({ origin, child: frontendChild });
  interruptController.throwIfInterrupted();
  setupInProgress = false;
  console.log(
    `diagnostic=home-single-sample-v1 buildIdentity=sha256:${buildIdentityBeforeCopy.sha256} buildFiles=${buildIdentityBeforeCopy.files} buildBytes=${buildIdentityBeforeCopy.bytes} api=loopback-only chrome=explicit-pinned`,
  );
  const result = await runOneHomeSample({ frontendRoot, origin, scratchRoot, env });
  interruptController.throwIfInterrupted();
  console.log(`sample=${result.status} exit=${result.exitClass}`);
  const outcome = diagnosticLib.homeSampleOutcome(result.status);
  console.log(`homeSampleCompleted=${outcome.completed}`);
  if (!outcome.completed) process.exitCode = outcome.exitCode;
  await assertEmptyExistingReports(frontendRoot);
  interruptController.throwIfInterrupted();
  console.log("originalReports=unchanged");
} catch (error) {
  console.log(`diagnosticStopped=${safeStopReason(error)}`);
  process.exitCode = 2;
} finally {
  const cleanupFailures = await cleanup();
  console.log(`cleanup=${cleanupFailures.length === 0 ? "complete" : "incomplete"}`);
  console.log(`scratchRetained=${scratchRoot !== null}`);
  if (cleanupFailures.length > 0 && process.exitCode === 0) process.exitCode = 3;
  if (interruptController.exitCode !== null) process.exitCode = interruptController.exitCode;
}
