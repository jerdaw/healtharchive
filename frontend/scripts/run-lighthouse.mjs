import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  isWslEnvironment,
  readBuildMetadata,
  requireExplicitWslChrome,
  resolveBuildApiBaseUrl,
} from "./build-metadata-lib.mjs";
import { getLoopbackHttpTarget } from "./internal-link-check-lib.mjs";
import {
  LOOPBACK_HOST,
  findAvailablePort,
  prepareStandaloneAssets,
  startFailFastApiStub,
  startStandaloneFrontend,
  stopChildProcess,
  stopHttpServer,
  waitForServer,
} from "./local-production-server-lib.mjs";
import diagnosticLib from "./lighthouse-diagnostic-lib.cjs";

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const lhciCli = fileURLToPath(new URL("../node_modules/@lhci/cli/src/cli.js", import.meta.url));
const reportDirectory = fileURLToPath(new URL("../.lighthouseci/", import.meta.url));
const metadataPath = fileURLToPath(
  new URL("../.next/healtharchive-build-metadata.json", import.meta.url),
);
const COMMAND_TIMEOUT_MS = 5 * 60_000;
const SAFE_DIAGNOSTIC_PHASES = new Set([
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

let activeCommand = null;

function runCommand(args, { env }) {
  return new Promise((resolve, reject) => {
    const progress = new diagnosticLib.LighthouseDiagnosticParser();
    const commandStartedAt = process.hrtime.bigint();
    let lastPhase = "lhci-started";
    let currentRoute = "unknown";
    let currentRun = "unknown";
    let currentAttempt = 0;
    let telemetryRunKey = "";
    let reportedCdpFailures = new Set();
    let browserVersionReported = false;
    const resetTelemetryBudget = () => {
      const key = `${currentRoute}:${currentRun}:${currentAttempt}`;
      if (key === telemetryRunKey) return;
      telemetryRunKey = key;
      reportedCdpFailures = new Set();
      browserVersionReported = false;
    };
    const writeProgress = (event) => {
      const line = diagnosticLib.formatProgressEvent(event);
      if (line === null) return;
      currentRoute = event.route;
      currentRun = event.kind === "run" ? event.run : "unknown";
      currentAttempt = 0;
      resetTelemetryBudget();
      lastPhase = event.kind === "run" ? `collection-${event.state}` : "route-started";
      console.log(`Lighthouse diagnostic: ${line} elapsedSec=${elapsedSeconds(commandStartedAt)}`);
    };
    const writeDiagnosticPhase = (phase) => {
      if (!SAFE_DIAGNOSTIC_PHASES.has(phase)) return;
      if (phase === "lighthouse-cli-started") currentAttempt = Math.min(3, currentAttempt + 1);
      resetTelemetryBudget();
      lastPhase = phase;
      console.log(
        `Lighthouse diagnostic: phase=${phase} route=${currentRoute} run=${currentRun} attempt=${currentAttempt} elapsedSec=${elapsedSeconds(commandStartedAt)}`,
      );
    };
    const writeDiagnosticTelemetry = (event) => {
      resetTelemetryBudget();
      // LHCI progress uses stdout and child markers use stderr; attribution is best-effort across streams.
      const context = `route=${currentRoute} run=${currentRun} attempt=${currentAttempt} attribution=best-effort elapsedSec=${elapsedSeconds(commandStartedAt)}`;
      if (event.type === "browser-version") {
        if (browserVersionReported) return;
        browserVersionReported = true;
        console.log(
          `Lighthouse diagnostic: browser=${event.product} version=${event.version} ${context}`,
        );
        return;
      }
      if (event.type !== "cdp-failure") return;
      const key = `${event.method}:${event.failureClass}`;
      if (reportedCdpFailures.has(key) || reportedCdpFailures.size >= 16) return;
      reportedCdpFailures.add(key);
      console.log(
        `Lighthouse diagnostic: cdpFailure=${event.method} class=${event.failureClass} ${context}`,
      );
    };
    const child = spawn(process.execPath, args, {
      cwd: frontendRoot,
      detached: process.platform !== "win32",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.healtharchiveProcessGroup = process.platform !== "win32";
    activeCommand = child;
    let timedOut = false;
    let markerPending = "";
    child.stdout.on("data", (chunk) => {
      if (timedOut) return;
      for (const event of progress.pushStdout(chunk)) writeProgress(event);
    });
    child.stderr.on("data", (chunk) => {
      if (timedOut) return;
      const parsed = diagnosticLib.parseDiagnosticMarkerChunk(
        markerPending,
        chunk,
        SAFE_DIAGNOSTIC_PHASES,
      );
      markerPending = parsed.pending;
      diagnosticLib.dispatchDiagnosticEvents(parsed.events, {
        emitPhase: writeDiagnosticPhase,
        emitTelemetry: writeDiagnosticTelemetry,
      });
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      void stopChildProcess(child).then(() => {
        reject(
          new Error(
            `Lighthouse command exceeded the five-minute timeout; lastPhase=${lastPhase} route=${currentRoute} run=${currentRun} attempt=${currentAttempt} elapsedSec=${elapsedSeconds(commandStartedAt)}`,
          ),
        );
      }, reject);
    }, COMMAND_TIMEOUT_MS);
    child.once("error", (error) => {
      clearTimeout(timeout);
      if (activeCommand === child) activeCommand = null;
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (activeCommand === child) activeCommand = null;
      if (timedOut) return;
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Lighthouse CI command failed${signal === null ? ` with exit code ${code}` : ` on ${signal}`}`,
        ),
      );
    });
  });
}

function elapsedSeconds(startedAt) {
  const elapsed = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
  return Math.min(300, Math.max(0, Math.floor(elapsed)));
}

function safeFailureSummary(error) {
  const message = error instanceof Error ? error.message : "";
  const timeout = message.match(
    /^Lighthouse command exceeded the five-minute timeout; lastPhase=([a-z-]+) route=(home|archive|snapshot|unknown) run=([1-3]|unknown) attempt=([0-3]) elapsedSec=(\d{1,3})$/,
  );
  if (timeout) {
    return `Lighthouse command exceeded the five-minute timeout; lastPhase=${timeout[1]} route=${timeout[2]} run=${timeout[3]} attempt=${timeout[4]} elapsedSec=${timeout[5]}`;
  }
  const exit = message.match(/^Lighthouse CI command failed (with exit code \d+|on SIG[A-Z]+)$/);
  if (exit) return `Lighthouse CI command failed ${exit[1]}`;
  return "Lighthouse performance gate failed; diagnostic details suppressed.";
}

let apiStub = null;
let frontend = null;
let stopping = false;

async function stop() {
  if (stopping) return;
  stopping = true;
  await Promise.all([
    activeCommand === null ? Promise.resolve() : stopChildProcess(activeCommand),
    frontend === null ? Promise.resolve() : stopChildProcess(frontend.child),
    stopHttpServer(apiStub),
  ]);
}

function stopOnSignal(signal) {
  void stop().finally(() => {
    process.kill(process.pid, signal);
  });
}

process.once("SIGINT", () => stopOnSignal("SIGINT"));
process.once("SIGTERM", () => stopOnSignal("SIGTERM"));

try {
  const release = os.release();
  const chromePath = await requireExplicitWslChrome({ release });
  const buildMetadata = await readBuildMetadata(metadataPath);
  const apiBaseUrl = buildMetadata.apiBaseUrl;
  const apiTarget = getLoopbackHttpTarget(apiBaseUrl);
  if (apiTarget === null) {
    throw new Error(
      "Lighthouse requires the existing build's API base to use non-privileged loopback HTTP",
    );
  }
  const runtimeApiBaseUrl = resolveBuildApiBaseUrl();
  if (runtimeApiBaseUrl !== apiBaseUrl) {
    throw new Error("Runtime API base does not match the existing build contract.");
  }
  try {
    apiStub = await startFailFastApiStub({ ...apiTarget, purpose: "lighthouse" });
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      throw new Error("Cannot start the local Lighthouse API stub: configured port is in use.");
    }
    throw new Error("Cannot start the local Lighthouse API stub.");
  }
  const env = {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_BACKEND_URL: apiBaseUrl,
    NEXT_PUBLIC_LOG_API_HEALTH_FAILURE: "false",
    NEXT_PUBLIC_SHOW_API_BASE_HINT: "false",
    NEXT_PUBLIC_SHOW_API_HEALTH_BANNER: "false",
    NEXT_TELEMETRY_DISABLED: "1",
    ...(chromePath !== null && isWslEnvironment({ release })
      ? { HEALTHARCHIVE_LINUX_CHROME: "1" }
      : {}),
  };

  const frontendPort = await findAvailablePort();
  const origin = `http://${LOOPBACK_HOST}:${frontendPort}`;
  try {
    await prepareStandaloneAssets();
  } catch {
    throw new Error("A production standalone build is required; run npm run build first.");
  }
  frontend = startStandaloneFrontend({ port: frontendPort, env });
  await waitForServer({ origin, child: frontend.child });

  await rm(reportDirectory, { recursive: true, force: true });
  console.log("Running three Lighthouse samples for each configured route.");
  await runCommand([lhciCli, "autorun", "--config=.lighthouserc.cjs"], {
    env: {
      ...env,
      HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: "1",
      HEALTHARCHIVE_LIGHTHOUSE_ORIGIN: origin,
    },
  });
  console.log("Lighthouse reports written.");
} catch (error) {
  console.error(safeFailureSummary(error));
  const logs = frontend?.getLogs().trim() ?? "";
  if (logs !== "") console.error("Next server diagnostic output captured and suppressed.");
  process.exitCode = 1;
} finally {
  await stop();
}
