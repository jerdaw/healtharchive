import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter, once } from "node:events";
import fs from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  LOOPBACK_HOST,
  findAvailablePort,
  startFailFastApiStub,
  stopHttpServer,
  stopChildProcess,
} from "../scripts/local-production-server-lib.mjs";
import {
  createInterruptController,
  registerInterruptCleanup,
  stopOwnedProcessGroup,
} from "../scripts/lighthouse-process-safety-lib.mjs";
import {
  isWslEnvironment,
  readBuildMetadata,
  requireExplicitWslChrome,
  resolveBuildApiBaseUrl,
  writeBuildMetadata,
} from "../scripts/build-metadata-lib.mjs";

const require = createRequire(import.meta.url);
const lighthouseRequire = createRequire(
  path.resolve("node_modules/lighthouse/core/gather/runner-helpers.js"),
);
const lighthouseLoggerPath = lighthouseRequire.resolve("lighthouse-logger");
const {
  AUDIT_PATHS,
  createLighthouseConfig,
  requireLoopbackOrigin,
} = require("../scripts/lighthouse-config.cjs");
const {
  createBoundedDiagnosticPhaseEmitter,
  createBoundedDiagnosticEventEmitter,
  createCdpFailureDiagnosticWriter,
  dispatchDiagnosticEvents,
  browserVersionDiagnosticEvent,
  cdpFailureDiagnosticEvent,
  childSpawnFailureDiagnosticEvent,
  CHILD_SPAWN_FAILURE_CLASSES,
  formatDiagnosticTelemetryMarker,
  finishDiagnosticRun,
  MAX_CHILD_CDP_FAILURE_MARKERS,
  LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  LIGHTHOUSE_RUNTIME_ERROR_CODES,
  LighthouseDiagnosticParser,
  MAX_CHILD_DIAGNOSTIC_PHASES,
  parseDiagnosticMarkerChunk,
  SAFE_CDP_METHODS,
  SAFE_GATHER_DIAGNOSTIC_PHASES,
  formatProgressEvent,
  runtimeErrorDiagnosticPhase,
  runtimeErrorDiagnosticEvent,
  runtimeErrorCodeDiagnosticPhase,
  formatRuntimeErrorDiagnosticMarker,
  homeSampleOutcome,
  shouldTolerateWindowsChromeCleanupExit,
  spawnPinnedNode,
} = require("../scripts/lighthouse-diagnostic-lib.cjs");
const { applyPatch } = require("diff");

const LHCI_NODE_RUNNER_BASE_BLOB = "cda78e9a28f0e454fc497de50077ab3f705196cb";

function gitBlobSha1(source) {
  const bytes = Buffer.from(source);
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest("hex");
}

async function createPatchedLhciRunnerHarness({ childProcessModule, envOverrides = {} }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ha-patched-lhci-runner-"));
  const reportsDirectory = path.join(root, "reports");
  const lighthouseRoot = path.join(root, "lighthouse");
  const lighthouseCli = path.join(lighthouseRoot, "cli", "index.js");
  await mkdir(reportsDirectory);
  await mkdir(path.dirname(lighthouseCli), { recursive: true });
  await mkdir(path.join(lighthouseRoot, "core"), { recursive: true });
  await writeFile(path.join(lighthouseRoot, "core", "index.js"), "module.exports = {};\n");
  await writeFile(
    lighthouseCli,
    "process.stdout.write(JSON.stringify({execPath: process.execPath}));\n",
  );

  const loaded = await loadZeroFuzzPatchedLhciRunner({
    childProcessModule,
    envOverrides,
    root,
    reportsDirectory,
  });
  return {
    ...loaded,
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
    root,
  };
}

async function loadZeroFuzzPatchedLhciRunner({
  childProcessModule,
  envOverrides = {},
  root,
  reportsDirectory,
}) {
  const baselinePath = path.resolve("tests/lhci-node-runner-0.15.1.base.txt");
  const patchPath = path.resolve("patches/@lhci+cli+0.15.1.patch");
  const baseline = await readFile(baselinePath, "utf8");
  const patch = await readFile(patchPath, "utf8");
  const targetBlobMatch = patch.match(/^index cda78e9\.\.([0-9a-f]{40}) 100644$/m);
  if (gitBlobSha1(baseline) !== LHCI_NODE_RUNNER_BASE_BLOB || targetBlobMatch === null) {
    throw new Error("pinned-lhci-node-runner-baseline-mismatch");
  }
  const patchedSource = applyPatch(baseline, patch, { fuzzFactor: 0 });
  if (patchedSource === false || gitBlobSha1(patchedSource) !== targetBlobMatch[1]) {
    throw new Error("zero-fuzz-lhci-node-runner-patch-mismatch");
  }

  const lighthouseEntry = path.join(root, "lighthouse", "core", "index.js");
  const lighthouseCli = path.join(root, "lighthouse", "cli", "index.js");
  const helperPath = path.resolve("scripts/lighthouse-diagnostic-lib.cjs");
  const output = [];
  const fsCounts = { writeFileSync: 0, unlinkSync: 0 };
  const fsModule = new Proxy(fs, {
    get(target, property) {
      if (property === "writeFileSync" || property === "unlinkSync") {
        return (...args) => {
          fsCounts[property] += 1;
          return Reflect.get(target, property, target).apply(target, args);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const mockedProcess = {
    env: {
      ...process.env,
      ...envOverrides,
      HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: "1",
      HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTIC_HELPER: helperPath,
      LHCITEST_MOCK_LHR: "",
    },
    platform: process.platform,
    stderr: { write: (marker) => (output.push(String(marker)), true) },
  };
  const moduleRecord = { exports: {} };
  const mockedRequire = (specifier) => {
    if (specifier === "os") return os;
    if (specifier === "fs") return fsModule;
    if (specifier === "path") return path;
    if (specifier === "uuid") return { v4: () => "bounded-spawn-test" };
    if (specifier === "child_process") return childProcessModule;
    if (specifier === "@lhci/utils/src/saved-reports.js") {
      return { getSavedReportsDirectory: () => reportsDirectory };
    }
    if (specifier === helperPath) return require(helperPath);
    throw new Error(`unexpected-node-runner-dependency:${specifier}`);
  };
  mockedRequire.resolve = (specifier) => {
    if (specifier !== "lighthouse") throw new Error("unexpected-node-runner-resolve");
    return lighthouseEntry;
  };
  vm.runInNewContext(
    patchedSource,
    {
      Buffer,
      __dirname: path.dirname(path.join(root, "collect", "node-runner.js")),
      __filename: path.join(root, "collect", "node-runner.js"),
      console,
      exports: moduleRecord.exports,
      module: moduleRecord,
      process: mockedProcess,
      require: mockedRequire,
    },
    { filename: "pinned-lhci-node-runner-0.15.1.js" },
  );
  return { Runner: moduleRecord.exports, fsCounts, lighthouseCli, output };
}

function runPinnedLighthouseGatherLogger({ colors }) {
  const source = `
    import logger from ${JSON.stringify(pathToFileURL(lighthouseLoggerPath).href)};
    process.stdout.write(process.stderr.isTTY ? "tty" : "pipe");
    logger.setLevel("verbose");
    logger.verbose("artifacts:startInstrumentation", "Trace");
  `;

  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    encoding: "utf8",
    env: { ...process.env, DEBUG_COLORS: colors ? "yes" : "no" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
  });
}

function runPinnedProtocolSession({ mode, diagnostics = true }) {
  const sessionUrl = pathToFileURL(
    path.resolve("node_modules/lighthouse/core/gather/session.js"),
  ).href;
  const source = `
    import { EventEmitter } from 'node:events';
    import logger from ${JSON.stringify(pathToFileURL(lighthouseLoggerPath).href)};
    import { ProtocolSession } from ${JSON.stringify(sessionUrl)};

    logger.setLevel('silent');
    const mode = ${JSON.stringify(mode)};
    const hostile = 'HOSTILE_CDP_SECRET_SENTINEL /private/should-not-appear';

    class FakeCDPSession extends EventEmitter {
      constructor() {
        super();
        this.calls = 0;
      }
      id() { return 'test-session'; }
      detach() { return Promise.resolve(); }
      send(method) {
        this.calls += 1;
        if (mode === 'browser') {
          return Promise.resolve({
            product: 'Chrome/155.0.8059.39',
            userAgent: hostile,
            revision: hostile,
            jsVersion: hostile,
          });
        }
        if (mode === 'hostile-browser') {
          return Promise.resolve({ product: 'Chrome/155.0.8059.39\\n' + hostile });
        }
        if (mode === 'ordinary-rejection') {
          return Promise.reject(Object.assign(new Error(hostile), { data: hostile }));
        }
        if (mode === 'timeout' || mode === 'target-crashed') {
          return new Promise(() => {});
        }
        if (mode === 'unknown-method') {
          return Promise.reject(Object.assign(new Error(hostile), { data: hostile }));
        }
        return Promise.resolve({ ok: true });
      }
    }

    const fake = new FakeCDPSession();
    const session = new ProtocolSession(fake);
    const method = mode === 'browser' || mode === 'hostile-browser'
      ? 'Browser.getVersion'
      : mode === 'unknown-method' ? 'Private.token' : 'Page.navigate';
    if (mode === 'timeout') session.setNextProtocolTimeout(8);

    let result;
    const operation = session.sendCommand(method).then(
      value => ({ outcome: 'resolved', callCount: fake.calls, resultOk: value?.ok === true }),
      error => ({
        outcome: 'rejected',
        callCount: fake.calls,
        errorName: error?.name ?? 'other',
        errorCode: error?.code ?? 'none',
        protocolMethodPreserved: error?.protocolMethod === method,
        protocolErrorPreserved: error?.protocolError === hostile,
      }),
    );
    if (mode === 'target-crashed') {
      setImmediate(() => fake.emit('*', 'Inspector.targetCrashed', {}));
    }
    result = await operation;
    process.stdout.write(JSON.stringify(result));
  `;

  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    encoding: "utf8",
    env: {
      ...process.env,
      HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: diagnostics ? "1" : "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
  });
}

async function pinnedLighthouseCdpMethods() {
  const root = path.resolve("node_modules/lighthouse/core");
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && file.endsWith(".js")) files.push(file);
    }
  }

  await walk(root);
  const methods = new Set();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(
      /\.sendCommand(?:AndIgnore)?\(\s*['"`]([A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*)['"`]/g,
    )) {
      methods.add(match[1]);
    }
  }
  return methods;
}

describe("Lighthouse configuration", () => {
  it("builds three representative local audit URLs with three runs", () => {
    const config = createLighthouseConfig("http://127.0.0.1:43123");

    expect(AUDIT_PATHS).toEqual(["/", "/archive?q=health", "/snapshot/phac-2025-02-15-covid-epi"]);
    expect(config.ci.collect.numberOfRuns).toBe(3);
    expect(config.ci.collect.url).toEqual([
      "http://127.0.0.1:43123/",
      "http://127.0.0.1:43123/archive?q=health",
      "http://127.0.0.1:43123/snapshot/phac-2025-02-15-covid-epi",
    ]);
    expect(config.ci.assert.aggregationMethod).toBe("median-run");
    expect(config.ci.upload.target).toBe("filesystem");
  });

  it.each([
    "https://127.0.0.1:43123",
    "http://example.com:43123",
    "http://user:secret@127.0.0.1:43123",
    "http://127.0.0.1:43123/path",
    "not a URL",
  ])("rejects unsafe audit origin %s", (origin) => {
    expect(() => requireLoopbackOrigin(origin)).toThrow();
  });
});

describe("bounded Lighthouse phase diagnostics", () => {
  it("reports only allowlisted route and sample ordinals from LHCI progress", () => {
    const parser = new LighthouseDiagnosticParser();
    const events = [
      ...parser.pushStdout("Running Lighthouse 3 time(s) on http://127.0.0.1:44451/\nRun #1..."),
      ...parser.pushStdout("done.\n"),
      ...parser.pushStdout(
        "Running Lighthouse 3 time(s) on http://127.0.0.1:44451/archive?q=health\nRun #2...done.\n",
      ),
      ...parser.pushStdout(
        "Running Lighthouse 3 time(s) on http://127.0.0.1:44451/snapshot/phac-2025-02-15-covid-epi\n",
      ),
    ];

    expect(events.map(formatProgressEvent)).toEqual([
      "route=home state=started",
      "route=home run=1 state=started",
      "route=home run=1 state=completed",
      "route=archive state=started",
      "route=archive run=2 state=completed",
      "route=snapshot state=started",
    ]);
  });

  it("rejects non-loopback, unconfigured, or non-three-run collection targets", () => {
    const parser = new LighthouseDiagnosticParser();
    const events = parser.pushStdout(
      [
        "Running Lighthouse 3 time(s) on https://example.invalid/",
        "Run #1...done.",
        "Running Lighthouse 2 time(s) on http://127.0.0.1:44451/",
        "Run #1...done.",
        "Running Lighthouse 3 time(s) on http://127.0.0.1:44451/private-path",
        "Run #1...done.",
      ].join("\n"),
    );
    expect(events).toEqual([]);
  });

  it("classifies Chrome, DevTools, navigation, and audit phases without forwarding raw text", () => {
    const parser = new LighthouseDiagnosticParser();
    const input = [
      "  LH:ChromeLauncher Waiting for browser.. +1ms",
      "  LH:ChromeLauncher Waiting for browser....\u001b[32m✓\u001b[0m +3ms",
      "  LH:status Connecting to browser +4ms",
      "  LH:status Navigating to http://127.0.0.1:44451/?token=private-value +5ms",
      "  LH:statusEnd:verbose Navigating to http://127.0.0.1:44451/?token=private-value +6ms",
      "  LH:status Analyzing and running audits... +7ms",
      "  LH:statusEnd:verbose Analyzing and running audits... +8ms",
      "  LH:status Generating results... +9ms",
      "  LH:statusEnd:verbose Generating results... +10ms",
      "  LH:ChromeLauncher:error Chrome could not be killed for /private/profile --token=private-value",
      "  LH:ChromeLauncher:error Failed to set browser prefs for /private/profile",
      "Unable to connect to Chrome at /private/chrome --token=private-value",
      "Runtime error encountered: body=private-value",
      "  LH:ChromeLauncher Launching with command: /private/path --proxy-server=secret",
      "  LH:status Raw response body contains private-value",
    ].join("\n");
    const events = parser.pushStderr(input);
    const output = events.join(" ");

    expect(events).toEqual([
      "chrome-starting",
      "chrome-ready",
      "devtools-connect-started",
      "navigation-started",
      "navigation-completed",
      "audit-started",
      "audit-completed",
      "results-started",
      "results-completed",
      "chrome-kill-failed",
      "chrome-profile-warning",
      "devtools-connect-failed",
      "lighthouse-runtime-error",
    ]);
    expect(output).not.toMatch(/private-value|secret|127\.0\.0\.1|\/private\/path|Raw response/);
  });

  it("handles split diagnostic messages and bounds retained partial text", () => {
    const parser = new LighthouseDiagnosticParser();
    expect(parser.pushStderr(" LH:status Navigating to http://127.0.0.1:44")).toEqual([]);
    expect(parser.pushStderr("451/?secret=never-print +12ms")).toEqual([]);
    expect(parser.flushStderr()).toEqual(["navigation-started"]);

    const oversized = new LighthouseDiagnosticParser();
    expect(oversized.pushStderr("x".repeat(20_000))).toEqual([]);
    expect(oversized.flushStderr()).toEqual([]);
  });

  it("classifies only known Lighthouse gatherer boundaries into fixed safe enums", () => {
    const parser = new LighthouseDiagnosticParser();
    const events = parser.pushStderr(
      [
        "  LH:artifacts:stopSensitiveInstrumentation:verbose Trace +1ms",
        "  LH:artifacts:getArtifact:verbose FullPageScreenshot +123ms",
        "  LH:artifacts:unknownPhase:verbose Trace +2ms",
        "  LH:artifacts:getArtifact:verbose PrivateGatherer +3ms",
        "  LH:artifacts:getArtifact:verbose Trace https://private.example/path +4ms",
      ].join("\n"),
    );

    expect(events).toEqual([
      "gather-stop-sensitive-instrumentation-trace",
      "gather-get-artifact-full-page-screenshot",
    ]);
    expect(SAFE_GATHER_DIAGNOSTIC_PHASES.size).toBe(160);
    expect(events.every((event) => SAFE_GATHER_DIAGNOSTIC_PHASES.has(event))).toBe(true);
    expect(events.join(" ")).not.toMatch(/private|https?:|FullPageScreenshot|Trace/);
  });

  it("recognizes the pinned Lighthouse logger's non-TTY gather line without timing", () => {
    const child = runPinnedLighthouseGatherLogger({ colors: false });
    const parser = new LighthouseDiagnosticParser();

    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(child.stdout).toBe("pipe");
    expect(child.stderr.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")).not.toMatch(
      /\s\+\d+(?:\.\d+)?(?:ms|s|m|h|d)\s*$/,
    );
    expect(parser.pushStderr(child.stderr)).toEqual(["gather-start-instrumentation-trace"]);
  });

  it("recognizes colored logger timing units and rejects arbitrary suffixes", () => {
    const coloredChild = runPinnedLighthouseGatherLogger({ colors: true });
    const parser = new LighthouseDiagnosticParser();
    const invalidSuffixes = [
      " LH:artifacts:getArtifact:verbose Trace +45s private-value",
      " LH:artifacts:getArtifact:verbose Trace +45fortnights",
    ].join("\n");
    const secondsFixture =
      "\u001b[32m  LH:artifacts:getArtifact:verbose Trace\u001b[0m \u001b[32m+45s\u001b[0m\n";

    expect(coloredChild.error).toBeUndefined();
    expect(coloredChild.status).toBe(0);
    expect(coloredChild.stdout).toBe("pipe");
    expect(coloredChild.stderr).toContain("\u001b[");
    expect(coloredChild.stderr.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")).toMatch(
      /\s\+\d+(?:\.\d+)?(?:ms|s|m|h|d)\s*$/,
    );
    expect(parser.pushStderr(coloredChild.stderr)).toEqual(["gather-start-instrumentation-trace"]);
    expect(parser.pushStderr(secondsFixture)).toEqual(["gather-get-artifact-trace"]);
    expect(parser.pushStderr(invalidSuffixes)).toEqual([]);
  });

  it("recognizes a gatherer boundary split across stderr chunks", () => {
    const parser = new LighthouseDiagnosticParser();
    expect(parser.pushStderr(" LH:artifacts:getArtifact:verbose Trace +")).toEqual([]);
    expect(parser.pushStderr("1ms\n")).toEqual(["gather-get-artifact-trace"]);
  });

  it("processes complete gatherer lines before bounding a coalesced stderr chunk", () => {
    const parser = new LighthouseDiagnosticParser();
    const phases = parser.pushStderr(
      [
        " LH:artifacts:startInstrumentation:verbose Trace +1ms",
        "x".repeat(9_000),
        " LH:artifacts:getArtifact:verbose FullPageScreenshot +123ms",
        "tail".repeat(3_000),
      ].join("\n"),
    );

    expect(phases).toEqual([
      "gather-start-instrumentation-trace",
      "gather-get-artifact-full-page-screenshot",
    ]);
    expect(parser.stderrPending).toHaveLength(8_192);
    expect(parser.flushStderr()).toEqual([]);
  });

  it.each([
    ["NO_SPEEDLINE_FRAMES", "no-speedline-frames"],
    ["SPEEDINDEX_OF_ZERO", "speedindex-of-zero"],
    ["NO_SCREENSHOTS", "no-screenshots"],
    ["INVALID_SPEEDLINE", "invalid-speedline"],
    ["NO_TRACING_STARTED", "no-tracing-started"],
    ["NO_RESOURCE_REQUEST", "no-resource-request"],
    ["NO_NAVSTART", "no-navstart"],
    ["NO_FCP", "no-fcp"],
    ["NO_DCL", "no-dcl"],
    ["NO_FMP", "no-fmp"],
    ["NO_LCP", "no-lcp"],
    ["NO_LCP_ALL_FRAMES", "no-lcp-all-frames"],
    ["UNSUPPORTED_OLD_CHROME", "unsupported-old-chrome"],
    ["NO_TTI_CPU_IDLE_PERIOD", "no-tti-cpu-idle-period"],
    ["NO_TTI_NETWORK_IDLE_PERIOD", "no-tti-network-idle-period"],
    ["NO_DOCUMENT_REQUEST", "no-document-request"],
    ["FAILED_DOCUMENT_REQUEST", "failed-document-request"],
    ["ERRORED_DOCUMENT_REQUEST", "errored-document-request"],
    ["INSECURE_DOCUMENT_REQUEST", "insecure-document-request"],
    ["CHROME_INTERSTITIAL_ERROR", "chrome-interstitial-error"],
    ["PAGE_HUNG", "page-hung"],
    ["NOT_HTML", "not-html"],
    ["TRACING_ALREADY_STARTED", "tracing-already-started"],
    ["PARSING_PROBLEM", "parsing-problem"],
    ["READ_FAILED", "read-failed"],
    ["PROTOCOL_TIMEOUT", "protocol-timeout"],
    ["DNS_FAILURE", "dns-failure"],
    ["CRI_TIMEOUT", "cri-timeout"],
    ["TARGET_CRASHED", "target-crashed"],
    ["INVALID_URL", "invalid-url"],
    ["MISSING_REQUIRED_ARTIFACT", "missing-required-artifact"],
    ["ERRORED_REQUIRED_ARTIFACT", "errored-required-artifact"],
  ])("maps only the allowlisted Lighthouse runtime code %s", (code, codeId) => {
    expect(runtimeErrorDiagnosticPhase(JSON.stringify({ runtimeError: { code } }))).toBe(
      `lighthouse-runtime-error-code-${codeId}`,
    );
  });

  it("maps malformed, missing, unknown, and non-top-level codes to one safe enum", () => {
    const sentinel = "HOSTILE_RUNTIME_ERROR_SENTINEL_DO_NOT_EMIT";
    const unavailablePhase = "lighthouse-runtime-error-code-unavailable-or-other";
    const cases = [
      "not valid JSON",
      JSON.stringify({}),
      JSON.stringify({ runtimeError: { message: sentinel } }),
      JSON.stringify({ runtimeError: { code: sentinel } }),
      JSON.stringify({ audits: { runtimeError: { code: "DNS_FAILURE" } } }),
    ];
    const phases = cases.map(runtimeErrorDiagnosticPhase);

    expect(LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES.size).toBe(33);
    expect(phases).toEqual(Array(cases.length).fill(unavailablePhase));
    expect(JSON.stringify(phases)).not.toContain(sentinel);
    expect(
      runtimeErrorDiagnosticPhase(
        JSON.stringify({
          runtimeError: { code: "DNS_FAILURE", message: sentinel },
          requestedUrl: sentinel,
          audits: { body: sentinel },
        }),
      ),
    ).toBe("lighthouse-runtime-error-code-dns-failure");
  });

  it("maps an early Lighthouse error object through the fixed code enum only", () => {
    const sentinel = "PRIVATE_MESSAGE_SENTINEL_DO_NOT_EMIT";
    const phase = runtimeErrorCodeDiagnosticPhase("UNSUPPORTED_OLD_CHROME");
    const parsed = parseDiagnosticMarkerChunk(
      "",
      `HA_LIGHTHOUSE_DIAGNOSTIC phase=${phase}\n`,
      LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
    );
    const unknown = runtimeErrorCodeDiagnosticPhase(sentinel);

    expect(phase).toBe("lighthouse-runtime-error-code-unsupported-old-chrome");
    expect(parsed.events).toEqual([phase]);
    expect(unknown).toBe("lighthouse-runtime-error-code-unavailable-or-other");
    expect(`${phase} ${unknown}`).not.toContain(sentinel);
  });

  it("captures only bounded runtime-error class, code-presence, and known-code enums", () => {
    const sentinel = "HOSTILE_RUNTIME_NAME_CODE_MESSAGE_SENTINEL";
    const error = Object.assign(new TypeError(sentinel), {
      name: "TypeError",
      code: "NO_FCP",
      stack: sentinel,
    });
    const marker = formatRuntimeErrorDiagnosticMarker(error);
    const parser = new LighthouseDiagnosticParser();
    const parsed = parser.pushStderr(`${marker}\n`);
    const unknown = runtimeErrorDiagnosticEvent({
      name: sentinel,
      code: sentinel,
      message: sentinel,
    });
    const missing = runtimeErrorDiagnosticEvent({ name: "Error", message: sentinel });

    expect(parsed).toEqual([
      {
        type: "runtime-error",
        nameClass: "type-error",
        codePresent: true,
        codePhase: "lighthouse-runtime-error-code-no-fcp",
      },
    ]);
    expect(unknown).toEqual({
      type: "runtime-error",
      nameClass: "unavailable-or-other",
      codePresent: true,
      codePhase: "lighthouse-runtime-error-code-unavailable-or-other",
    });
    expect(missing.codePresent).toBe(false);
    expect(`${marker} ${JSON.stringify(unknown)}`).not.toContain(sentinel);
    const hostileMarker = parser.pushStderr(
      `HA_LIGHTHOUSE_DIAGNOSTIC runtime-error class=${sentinel} code-present=true code-phase=${sentinel}\n`,
    );
    expect(hostileMarker).toEqual([
      {
        type: "runtime-error",
        nameClass: "unavailable-or-other",
        codePresent: false,
        codePhase: "lighthouse-runtime-error-code-unavailable-or-other",
      },
    ]);
    expect(JSON.stringify(hostileMarker)).not.toContain(sentinel);
  });

  it("covers every error code in the pinned Lighthouse package", async () => {
    const lighthousePath = pathToFileURL(
      path.resolve("node_modules/lighthouse/core/lib/lh-error.js"),
    ).href;
    const { LighthouseError } = await import(lighthousePath);

    expect([...LIGHTHOUSE_RUNTIME_ERROR_CODES.keys()].sort()).toEqual(
      Object.keys(LighthouseError.errors).sort(),
    );
  });

  it("waits for trailing child stdout before extracting the runtime code", async () => {
    const lhr = JSON.stringify({
      lighthouseVersion: "12.6.1",
      runtimeError: { code: "TARGET_CRASHED" },
    });
    const child = spawn(
      process.execPath,
      ["-e", `process.stdout.write(${JSON.stringify(lhr)}); process.exit(1);`],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    let stdout = "";
    let stdoutAtExit = null;
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stdout.pause();
    child.once("exit", () => {
      stdoutAtExit = stdout;
      child.stdout.resume();
    });
    const closePromise = once(child, "close");
    const stdoutEndPromise = once(child.stdout, "end");
    const [[exitCode]] = await Promise.all([closePromise, stdoutEndPromise]);

    expect(exitCode).toBe(1);
    expect(stdoutAtExit).not.toContain('"code":"TARGET_CRASHED"');
    expect(runtimeErrorDiagnosticPhase(stdout)).toBe(
      "lighthouse-runtime-error-code-target-crashed",
    );
  });

  it("flushes an unterminated Chrome cleanup diagnostic before deciding to tolerate exit 1", () => {
    const parser = new LighthouseDiagnosticParser();
    const phases = [];
    const emitted = [];
    const emit = createBoundedDiagnosticPhaseEmitter(phases, (phase) => emitted.push(phase));

    for (const phase of parser.pushStderr(" LH:status Generating results...\n")) emit(phase);
    expect(
      parser.pushStderr(" LH:ChromeLauncher:error Chrome could not be killed for /private/profile"),
    ).toEqual([]);
    expect(phases).not.toContain("chrome-kill-failed");

    const tolerated = shouldTolerateWindowsChromeCleanupExit({
      exitCode: 1,
      platform: "win32",
      hasLhr: true,
      parser,
      emitPhase: emit,
      phases,
    });
    finishDiagnosticRun(parser, emit, 1, tolerated ? null : runtimeErrorDiagnosticPhase("{}"));

    expect(tolerated).toBe(true);
    expect(phases).toEqual([
      "results-started",
      "chrome-kill-failed",
      "lighthouse-cli-exit-nonzero",
    ]);
    expect(emitted).toEqual(phases);
  });

  it("reserves truncation and both terminal slots within the child marker cap", () => {
    const phases = [];
    const emitted = [];
    const emit = createBoundedDiagnosticPhaseEmitter(phases, (phase) => emitted.push(phase), 4);
    emit("chrome-starting");
    emit("chrome-ready");
    finishDiagnosticRun(
      new LighthouseDiagnosticParser(),
      emit,
      1,
      "lighthouse-runtime-error-code-dns-failure",
    );

    expect(MAX_CHILD_DIAGNOSTIC_PHASES).toBe(192);
    expect(phases).toEqual([
      "chrome-starting",
      "lighthouse-diagnostic-truncated",
      "lighthouse-runtime-error-code-dns-failure",
      "lighthouse-cli-exit-nonzero",
    ]);
    expect(emitted).toEqual(phases);
    expect(emitted).toHaveLength(4);
  });

  it("keeps a runtime code and exit marker when the 192-phase detail budget saturates", () => {
    const phases = [];
    const emitted = [];
    const emit = createBoundedDiagnosticPhaseEmitter(phases, (phase) => emitted.push(phase));
    const detailPhases = [...SAFE_GATHER_DIAGNOSTIC_PHASES];
    for (let index = 0; index < MAX_CHILD_DIAGNOSTIC_PHASES * 2; index += 1) {
      emit(detailPhases[index % detailPhases.length]);
    }

    const runtimeErrorPhase = "lighthouse-runtime-error-code-dns-failure";
    finishDiagnosticRun(new LighthouseDiagnosticParser(), emit, 1, runtimeErrorPhase);

    expect(phases).toHaveLength(MAX_CHILD_DIAGNOSTIC_PHASES);
    expect(emitted).toHaveLength(MAX_CHILD_DIAGNOSTIC_PHASES);
    expect(phases).toContain("lighthouse-diagnostic-truncated");
    expect(phases).toContain(runtimeErrorPhase);
    expect(phases).toContain("lighthouse-cli-exit-nonzero");
    expect(emitted).toEqual(phases);
  });

  it("flushes an unterminated child stderr marker before its exit marker", () => {
    const parser = new LighthouseDiagnosticParser();
    const phases = [];
    const emitted = [];
    const emit = createBoundedDiagnosticPhaseEmitter(phases, (phase) => emitted.push(phase));
    expect(parser.pushStderr(" LH:artifacts:getArtifact:verbose Trace +1ms")).toEqual([]);

    finishDiagnosticRun(parser, emit, 0);

    expect(phases).toEqual(["gather-get-artifact-trace", "lighthouse-cli-exit-zero"]);
    expect(emitted).toEqual(phases);
  });

  it("keeps all complete outer marker lines and bounds only the incomplete tail", () => {
    const complete = "HA_LIGHTHOUSE_DIAGNOSTIC phase=chrome-ready\n";
    const chunk = complete.repeat(300) + "HA_LIGHTHOUSE_DIAGNOSTIC phase=" + "x".repeat(1000);
    const parsed = parseDiagnosticMarkerChunk("", chunk, new Set(["chrome-ready"]), 32);

    expect(parsed.phases).toHaveLength(300);
    expect(parsed.phases.every((phase) => phase === "chrome-ready")).toBe(true);
    expect(parsed.pending).toHaveLength(32);
    expect(parsed.pending).toBe("x".repeat(32));
  });

  it("keeps diagnostics gated, bounded, and separate from the Lighthouse JSON result", async () => {
    const runner = await readFile(path.resolve("scripts/run-lighthouse.mjs"), "utf8");
    const homeRunner = await readFile(
      path.resolve("scripts/run-lighthouse-home-diagnostic.mjs"),
      "utf8",
    );
    const patch = await readFile(path.resolve("patches/@lhci+cli+0.15.1.patch"), "utf8");
    const lighthousePatch = await readFile(path.resolve("patches/lighthouse+12.6.1.patch"), "utf8");
    const chromeLauncherPatch = await readFile(
      path.resolve("patches/lighthouse++chrome-launcher+1.2.1.patch"),
      "utf8",
    );
    const diagnostics = await readFile(
      path.resolve("scripts/lighthouse-diagnostic-lib.cjs"),
      "utf8",
    );
    const cli = await readFile(
      path.resolve("node_modules/@lhci/cli/src/collect/node-runner.js"),
      "utf8",
    );

    expect(runner).toContain("const COMMAND_TIMEOUT_MS = 5 * 60_000;");
    expect(runner).toContain("stopChildProcess(child).then(");
    expect(runner).toContain("diagnostic details suppressed.");
    expect(runner).toContain("attempt=${currentAttempt}");
    expect(runner).toContain('"lighthouse-cli-exit-nonzero"');
    expect(runner).toContain("...diagnosticLib.SAFE_GATHER_DIAGNOSTIC_PHASES");
    expect(runner).toContain("diagnosticLib.parseDiagnosticMarkerChunk");
    expect(runner).toContain("diagnosticLib.dispatchDiagnosticEvents(parsed.events");
    expect(runner).toContain("attribution=best-effort");
    expect(runner).toContain('HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: "1"');
    expect(runner).toContain('stdio: ["ignore", "pipe", "pipe"]');
    expect(runner).toContain("...diagnosticLib.LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES");
    expect(runner).toContain(
      'console.log("Running three Lighthouse samples for each configured route.");',
    );
    expect(runner).not.toContain("Running three Lighthouse samples for each route at");
    expect(patch).toContain("DIAGNOSTICS_ENABLED");
    expect(patch).toContain("createBoundedDiagnosticPhaseEmitter");
    expect(patch).toContain("finishDiagnosticRun");
    expect(lighthousePatch).toContain("resultWithTimeoutPromise.then(");
    expect(lighthousePatch).toContain("throw error;");
    expect(lighthousePatch).toContain("createCdpFailureDiagnosticWriter");
    expect(lighthousePatch).not.toMatch(/error\.message|userAgent|revision|jsVersion/);
    expect(lighthousePatch).toContain("formatRuntimeErrorDiagnosticMarker(err)");
    expect(lighthousePatch).toContain("HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTIC_HELPER");
    const earlyErrorHook = lighthousePatch.slice(
      lighthousePatch.indexOf(
        "+      const marker = DiagnosticTools.formatRuntimeErrorDiagnosticMarker(err);",
      ),
    );
    expect(earlyErrorHook.slice(0, 300)).not.toMatch(/err\.(message|stack|friendlyMessage)/);
    expect(cli).toContain("if (DIAGNOSTICS_ENABLED) lhArgs.push('--verbose');");
    expect(cli).toContain("HA_LIGHTHOUSE_DIAGNOSTIC phase=lighthouse-cli-started");
    expect(cli).toContain("child.once(DIAGNOSTICS_ENABLED ? 'close' : 'exit', code => {");
    expect(
      cli.indexOf("child.once(DIAGNOSTICS_ENABLED ? 'close' : 'exit', code => {"),
    ).toBeLessThan(cli.indexOf("DiagnosticTools.runtimeErrorDiagnosticPhase(stdout)"));
    expect(cli).toContain("DiagnosticTools.shouldTolerateWindowsChromeCleanupExit({");
    expect(cli.indexOf("DiagnosticTools.shouldTolerateWindowsChromeCleanupExit(")).toBeLessThan(
      cli.indexOf("DiagnosticTools.runtimeErrorDiagnosticPhase(stdout)"),
    );
    expect(diagnostics).toContain("lighthouse-cli-exit-nonzero");
    expect(cli).toContain("createBoundedDiagnosticPhaseEmitter");
    expect(cli).toContain("createBoundedDiagnosticEventEmitter");
    expect(cli).toContain("for (const event of diagnosticParser.pushStderr(chunk))");
    expect(cli).toContain("DiagnosticTools.finishDiagnosticRun(");
    expect(cli).toContain("runtimeErrorPhase,");
    expect(cli).toContain("error.stdout = DIAGNOSTICS_ENABLED ? '' : stdout;");
    expect(cli).toContain("raw Lighthouse output suppressed by the bounded diagnostic mode");
    expect(patch).toContain("HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTIC_HELPER");
    expect(patch).toContain("earlyRuntimeCodeReported");
    expect(patch).toContain("earlyRuntimeErrorCodeReported = true");
    expect(patch).toContain(
      "DiagnosticTools.spawnPinnedNode(childProcess, [LH_CLI_PATH, ...args], {env})",
    );
    expect(patch).toContain("child.once('error', failToStart);");
    expect(patch).toContain("DiagnosticTools.childSpawnFailureDiagnosticEvent(error)");
    expect(patch).toContain("Lighthouse child process could not be started");
    expect(runner).toContain('event.type === "spawn-failure"');
    expect(homeRunner).toContain("spawnFailure=${failureClass}");
    expect(patch).toContain("HEALTHARCHIVE_LIGHTHOUSE_SINGLE_ATTEMPT === '1'");
    expect(runner).not.toContain("HEALTHARCHIVE_LIGHTHOUSE_SINGLE_ATTEMPT");

    expect(homeRunner).toContain("config.ci.collect.numberOfRuns = 1;");
    expect(homeRunner).toContain('HEALTHARCHIVE_LIGHTHOUSE_SINGLE_ATTEMPT: "1"');
    expect(homeRunner).toContain('config.ci.collect.url = [new URL("/", `${origin}/`).href];');
    expect(homeRunner).toContain("--no-proxy-server");
    expect(homeRunner).toContain("const MAX_SAMPLE_MS = 120_000;");
    expect(homeRunner).toContain("await cp(standaloneSource, runtimeRoot");
    expect(homeRunner).not.toContain("prepareStandaloneAssets");
    expect(homeRunner).not.toContain('rm(path.join(frontendRoot, ".lighthouseci"');
    expect(homeRunner).toContain("existing-lighthouse-reports-present");
    expect(homeRunner).toContain("cwd: lighthouseCwd,");
    expect(homeRunner).toContain("await assertEmptyExistingReports(frontendRoot);");
    expect(homeRunner).toContain("await hashBuildInputs(frontendRoot, runtimeRoot, scratchRoot);");
    expect(homeRunner).toContain("stopOwnedProcessGroup(lighthouseChild)");
    expect(homeRunner).toContain("interruptController.throwIfInterrupted();");
    expect(homeRunner).toContain("const outcome = diagnosticLib.homeSampleOutcome(result.status);");
    expect(homeRunner).toContain("if (!outcome.completed) process.exitCode = outcome.exitCode;");
    expect(homeRunner).toContain("homeSampleCompleted=${outcome.completed}");
    expect(homeRunner).not.toContain("source=99970c1");
    expect(chromeLauncherPatch).toContain(
      "detached: process.platform !== 'win32' && process.env.HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS !== '1',",
    );
    expect(chromeLauncherPatch).toContain("process.kill(this.chromeProcess.pid, 'SIGKILL');");
  });
});

describe("one-shot diagnostic cancellation and process-group cleanup", () => {
  it("blocks launch when an early signal reaches the next preflight checkpoint", () => {
    const interruption = createInterruptController();
    let launches = 0;

    interruption.request("SIGINT");
    expect(() => {
      interruption.throwIfInterrupted();
      launches += 1;
    }).toThrow("diagnostic-interrupted");
    expect(launches).toBe(0);
    expect(interruption.exitCode).toBe(130);
  });

  it("keeps signal handlers installed and starts async cleanup only once", () => {
    const signalTarget = new EventEmitter();
    let finishCleanup;
    const cleanup = vi.fn(() => new Promise((resolve) => (finishCleanup = resolve)));
    const interruption = createInterruptController();
    const dispose = registerInterruptCleanup({
      signalTarget,
      interruptController: interruption,
      cleanup,
      isSetup: () => true,
    });

    signalTarget.emit("SIGINT");
    signalTarget.emit("SIGINT");
    signalTarget.emit("SIGTERM");

    expect(interruption.exitCode).toBe(130);
    expect(signalTarget.exitCode).toBe(130);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledWith({ removeScratch: false });
    expect(signalTarget.listenerCount("SIGINT")).toBe(1);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(1);

    finishCleanup([]);
    dispose();
    expect(signalTarget.listenerCount("SIGINT")).toBe(0);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(0);
  });

  it("returns nonzero for every non-completed Home sample state", () => {
    expect(homeSampleOutcome("completed")).toEqual({ completed: true, exitCode: 0 });
    for (const status of ["failed", "timeout", "blocked", "spawn-error", "unknown"]) {
      expect(homeSampleOutcome(status)).toEqual({ completed: false, exitCode: 4 });
    }
  });

  it.skipIf(process.platform !== "linux")(
    "stops only a registered isolated Lighthouse process group before scratch cleanup",
    async () => {
      const child = spawn(
        process.execPath,
        [
          "-e",
          "const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' }); process.stdout.write('ready\\n'); setInterval(() => {}, 1000);",
        ],
        { detached: true, stdio: ["ignore", "pipe", "ignore"] },
      );
      child.healtharchiveProcessGroup = true;
      const ready = once(child.stdout, "data");
      const closed = once(child, "close");

      await ready;
      await stopOwnedProcessGroup(child);
      await closed;
      expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
      expect(() => process.kill(-child.pid, 0)).toThrow();
    },
  );

  it("refuses to signal a process group without the owned-group marker", async () => {
    const kill = vi.fn();
    await expect(
      stopOwnedProcessGroup({ pid: 424242, healtharchiveProcessGroup: false }, { kill }),
    ).rejects.toThrow("owned-process-group-proof-missing");
    expect(kill).not.toHaveBeenCalled();
  });

  it("refuses to manage process groups outside the supported Linux runtime", async () => {
    const kill = vi.fn();
    await expect(
      stopOwnedProcessGroup(
        { pid: 424242, healtharchiveProcessGroup: true },
        { kill, platform: "darwin" },
      ),
    ).rejects.toThrow("owned-process-group-proof-missing");
    expect(kill).not.toHaveBeenCalled();
  });

  it("signals only the registered process group and accepts its confirmed exit", async () => {
    const calls = [];
    let groupAlive = true;
    const kill = (pid, signal) => {
      calls.push([pid, signal]);
      if (pid !== -424242) throw new Error("unexpected-process-group");
      if (signal === "SIGTERM") {
        groupAlive = false;
        return;
      }
      if (signal === 0 && !groupAlive) {
        throw Object.assign(new Error("group-exited"), { code: "ESRCH" });
      }
      throw new Error("unexpected-signal");
    };

    await stopOwnedProcessGroup(
      { pid: 424242, healtharchiveProcessGroup: true },
      {
        kill,
        platform: "linux",
      },
    );

    expect(calls).toEqual([
      [-424242, "SIGTERM"],
      [-424242, 0],
    ]);
  });

  it("isolates LHCI intermediate report clearing from the source report directory", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "healtharchive-lhci-cwd-test-"));
    const sourceRoot = path.join(parent, "source");
    const scratchRoot = path.join(parent, "scratch");
    const sourceReport = path.join(sourceRoot, ".lighthouseci", "lhr-123.json");
    const scratchReport = path.join(scratchRoot, ".lighthouseci", "lhr-456.json");
    const savedReportsPath = require.resolve("@lhci/utils/src/saved-reports.js");
    try {
      await mkdir(path.dirname(sourceReport), { recursive: true });
      await mkdir(path.dirname(scratchReport), { recursive: true });
      await writeFile(sourceReport, "source-report-sentinel", "utf8");
      await writeFile(scratchReport, "scratch-report-sentinel", "utf8");
      const result = spawnSync(
        process.execPath,
        ["-e", `require(${JSON.stringify(savedReportsPath)}).clearSavedReportsAndLHRs();`],
        { cwd: scratchRoot, encoding: "utf8", timeout: 5_000 },
      );

      expect(result.status).toBe(0);
      await expect(readFile(sourceReport, "utf8")).resolves.toBe("source-report-sentinel");
      await expect(readdir(path.join(scratchRoot, ".lighthouseci"))).resolves.toEqual([]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});

describe("bounded Lighthouse browser and CDP diagnostics", () => {
  it("allowlists exactly the literal CDP methods used by pinned Lighthouse core", async () => {
    const sourceMethods = await pinnedLighthouseCdpMethods();
    expect(sourceMethods.size).toBeGreaterThan(0);
    expect([...SAFE_CDP_METHODS].sort()).toEqual([...sourceMethods].sort());
  });

  it("captures only a fixed browser product enum and a strict dotted numeric version", () => {
    expect(browserVersionDiagnosticEvent("Chrome/155.0.8059.39")).toEqual({
      type: "browser-version",
      product: "chrome",
      version: "155.0.8059.39",
    });
    expect(browserVersionDiagnosticEvent("Chromium/155.0.8059.0")).toEqual({
      type: "browser-version",
      product: "chromium",
      version: "155.0.8059.0",
    });
    for (const hostile of [
      "Chrome/155.0.8059.39\nTOKEN_SECRET_SENTINEL",
      "Google Chrome 155.0.8059.39",
      "Chrome/155.0.8059.39 /private/profile",
      "Brave/155.0.8059.39",
      "Chrome/155.0.8059",
    ]) {
      expect(browserVersionDiagnosticEvent(hostile)).toEqual({
        type: "browser-version",
        product: "unavailable-or-other",
        version: "unavailable-or-other",
      });
    }
  });

  it("maps unknown methods and failure classes to fixed enums without echoing hostile text", () => {
    const secret = "TOKEN_SECRET_SENTINEL /private/profile https://private.invalid";
    expect(cdpFailureDiagnosticEvent("Page.navigate", { code: "PROTOCOL_TIMEOUT" })).toEqual({
      type: "cdp-failure",
      method: "Page.navigate",
      failureClass: "protocol-timeout",
    });
    expect(cdpFailureDiagnosticEvent("Page.navigate", { code: "TARGET_CRASHED" })).toEqual({
      type: "cdp-failure",
      method: "Page.navigate",
      failureClass: "target-crashed",
    });
    expect(
      cdpFailureDiagnosticEvent("Page.navigate", {
        protocolMethod: "Page.navigate",
        message: secret,
      }),
    ).toEqual({
      type: "cdp-failure",
      method: "Page.navigate",
      failureClass: "command-rejected",
    });

    const unknown = cdpFailureDiagnosticEvent(`Page.navigate ${secret}`, {
      protocolMethod: `Page.navigate ${secret}`,
      message: secret,
    });
    expect(unknown).toEqual({
      type: "cdp-failure",
      method: "unavailable-or-other",
      failureClass: "command-rejected",
    });
    expect(formatDiagnosticTelemetryMarker(unknown)).not.toContain(secret);
  });

  it("parses split and coalesced telemetry markers, rejecting hostile and overlong fields", () => {
    const parser = new LighthouseDiagnosticParser();
    const browserMarker = "HA_LIGHTHOUSE_DIAGNOSTIC browser product=chrome version=155.0.8059.39\n";
    const cdpMarker =
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Debugger.getScriptSource class=protocol-timeout\n";
    expect(parser.pushStderr(browserMarker.slice(0, 33))).toEqual([]);
    expect(parser.pushStderr(browserMarker.slice(33) + cdpMarker)).toEqual([
      { type: "browser-version", product: "chrome", version: "155.0.8059.39" },
      {
        type: "cdp-failure",
        method: "Debugger.getScriptSource",
        failureClass: "protocol-timeout",
      },
    ]);

    const hostile = "TOKEN_SECRET_SENTINEL /private/profile https://private.invalid";
    expect(
      parser.pushStderr(
        `HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=${hostile} class=${hostile}\n` +
          `HA_LIGHTHOUSE_DIAGNOSTIC browser product=Chrome version=${hostile}\n`,
      ),
    ).toEqual([
      {
        type: "cdp-failure",
        method: "unavailable-or-other",
        failureClass: "unavailable-or-other",
      },
      {
        type: "browser-version",
        product: "unavailable-or-other",
        version: "unavailable-or-other",
      },
    ]);
    expect(JSON.stringify(parser.pushStderr(`${hostile.repeat(200)}\n`))).not.toContain(hostile);

    const overlong = parseDiagnosticMarkerChunk(
      "",
      `HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=${"X".repeat(200)} class=command-rejected\n`,
      new Set(),
    );
    expect(overlong.cdpFailures).toEqual([
      {
        type: "cdp-failure",
        method: "unavailable-or-other",
        failureClass: "unavailable-or-other",
      },
    ]);
    expect(JSON.stringify(overlong)).not.toContain("X".repeat(200));

    const partial = parseDiagnosticMarkerChunk(
      "",
      `HA_LIGHTHOUSE_DIAGNOSTIC ${"x".repeat(9000)}`,
      new Set(),
      128,
    );
    expect(partial.pending).toHaveLength(128);
  });

  it("classifies child spawn failures into a fixed non-disclosing enum", () => {
    const secret = "TOKEN_SECRET_SENTINEL /private/profile /usr/local/bin/node";
    const cases = [
      ["ENOENT", "not-found"],
      ["EACCES", "permission-denied"],
      ["EPERM", "permission-denied"],
      ["EMFILE", "resource-limit"],
      ["ENFILE", "resource-limit"],
      ["E2BIG", "argument-limit"],
      [secret, "other"],
    ];

    for (const [code, failureClass] of cases) {
      const event = childSpawnFailureDiagnosticEvent({
        code,
        message: secret,
        path: secret,
        env: { TOKEN: secret },
      });
      expect(event).toEqual({ type: "spawn-failure", failureClass });
      expect(CHILD_SPAWN_FAILURE_CLASSES.has(event.failureClass)).toBe(true);
      expect(formatDiagnosticTelemetryMarker(event)).toBe(
        `HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=${failureClass}`,
      );
      expect(formatDiagnosticTelemetryMarker(event)).not.toContain(secret);
    }

    const hostileLine =
      `HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=${secret}\n` +
      "HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=not-found\n";
    const parsed = parseDiagnosticMarkerChunk("", hostileLine, new Set());
    expect(parsed.spawnFailures).toEqual([{ type: "spawn-failure", failureClass: "other" }]);
    expect(JSON.stringify(parsed)).not.toContain(secret);

    const emitted = [];
    const emitEvent = createBoundedDiagnosticEventEmitter(
      () => {},
      (marker) => emitted.push(marker),
    );
    emitEvent(childSpawnFailureDiagnosticEvent({ code: "ENOENT", message: secret }));
    emitEvent(childSpawnFailureDiagnosticEvent({ code: "EACCES", message: secret }));
    expect(emitted).toEqual(["HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=not-found\n"]);
  });

  it("uses process.execPath when PATH has no node or a conflicting node", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ha-pinned-node-spawn-"));
    const noNodePath = path.join(root, "empty-path");
    const conflictPath = path.join(root, "conflict-path");
    const sentinel = path.join(root, "conflicting-node-ran");
    await mkdir(noNodePath);
    await mkdir(conflictPath);

    const calls = [];
    const injectedChildProcess = {
      spawn(command, args, options) {
        calls.push(command);
        return spawnSync(command, args, {
          ...options,
          encoding: "utf8",
          timeout: 5_000,
        });
      },
    };
    const runPinnedChild = (env) =>
      spawnPinnedNode(injectedChildProcess, ["-e", "process.stdout.write(process.execPath)"], {
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });

    try {
      const missing = runPinnedChild({ PATH: noNodePath });
      expect(missing.status).toBe(0);
      expect(missing.stdout).toBe(process.execPath);

      const conflictingNode = path.join(conflictPath, "node");
      await writeFile(
        conflictingNode,
        `#!/bin/sh\nprintf 'ran' > ${JSON.stringify(sentinel)}\nexit 93\n`,
        { mode: 0o700 },
      );
      await chmod(conflictingNode, 0o700);
      const conflicting = runPinnedChild({ PATH: conflictPath });
      expect(conflicting.status).toBe(0);
      expect(conflicting.stdout).toBe(process.execPath);
      expect(await readdir(conflictPath)).toEqual(["node"]);
      expect(await readdir(root)).not.toContain("conflicting-node-ran");
      expect(calls).toEqual([process.execPath, process.execPath]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("runs the zero-fuzz patched LighthouseRunner with a pinned Node under hostile PATH values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ha-node-runner-paths-"));
    const emptyPath = path.join(root, "empty-path");
    const conflictingPath = path.join(root, "conflicting-path");
    const sentinel = path.join(root, "conflicting-node-ran");
    await mkdir(emptyPath);
    await mkdir(conflictingPath);
    const conflictingNode = path.join(conflictingPath, "node");
    await writeFile(
      conflictingNode,
      `#!/bin/sh\nprintf 'ran' > ${JSON.stringify(sentinel)}\nexit 93\n`,
      { mode: 0o700 },
    );
    await chmod(conflictingNode, 0o700);

    try {
      for (const fakePath of [emptyPath, conflictingPath]) {
        const calls = [];
        const harness = await createPatchedLhciRunnerHarness({
          childProcessModule: {
            spawn(command, args, options) {
              calls.push({ command, args, env: options.env });
              return spawn(command, args, options);
            },
          },
          envOverrides: { PATH: fakePath },
        });
        try {
          const output = await new harness.Runner().run("http://127.0.0.1:4173/", {
            settings: { maxWaitForLoad: 1 },
          });
          expect(JSON.parse(output)).toEqual({ execPath: process.execPath });
          expect(calls).toHaveLength(1);
          expect(calls[0].command).toBe(process.execPath);
          expect(calls[0].env.PATH).toBe(fakePath);
          expect(harness.fsCounts).toEqual({ writeFileSync: 1, unlinkSync: 1 });
          expect(harness.output.join("")).not.toContain(sentinel);
        } finally {
          await harness.cleanup();
        }
      }

      expect(await readdir(root)).toContain("conflicting-path");
      expect(await readdir(root)).not.toContain("conflicting-node-ran");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("settles once and cleans once when the patched runner's spawn throws synchronously", async () => {
    const secret = "TOKEN_SENTINEL /private/runner/profile /custom/node/path";
    const spawnCalls = [];
    const harness = await createPatchedLhciRunnerHarness({
      childProcessModule: {
        spawn(command) {
          spawnCalls.push(command);
          const error = new Error(secret);
          error.code = "ENOENT";
          error.path = secret;
          error.env = { TOKEN: secret };
          throw error;
        },
      },
    });
    try {
      let settlements = 0;
      const result = await new harness.Runner()
        .run("http://127.0.0.1:4173/", {
          settings: { maxWaitForLoad: 1 },
        })
        .then(
          (value) => ((settlements += 1), { value }),
          (error) => ((settlements += 1), { error }),
        );
      await new Promise((resolve) => setImmediate(resolve));

      expect(result.error?.message).toBe("Lighthouse child process could not be started");
      expect(result.error?.stdout).toBe("");
      expect(result.error?.stderr).toBe(
        "[raw Lighthouse output suppressed by the bounded diagnostic mode]",
      );
      expect(settlements).toBe(1);
      expect(spawnCalls).toEqual([process.execPath]);
      expect(harness.fsCounts).toEqual({ writeFileSync: 1, unlinkSync: 1 });
      const markers = harness.output.join("");
      expect(
        markers.match(/HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=not-found\n/g),
      ).toHaveLength(1);
      expect(
        markers.match(/HA_LIGHTHOUSE_DIAGNOSTIC phase=lighthouse-cli-exit-nonzero\n/g),
      ).toHaveLength(1);
      expect(
        `${markers}${result.error.message}${result.error.stdout}${result.error.stderr}`,
      ).not.toContain(secret);
    } finally {
      await harness.cleanup();
    }
  });

  it("ignores close after async spawn error without duplicate settlement, marker, or cleanup", async () => {
    const secret = "BEARER_SENTINEL /private/async/profile /sensitive/node/path";
    const spawnCalls = [];
    const harness = await createPatchedLhciRunnerHarness({
      childProcessModule: {
        spawn(command) {
          spawnCalls.push(command);
          const child = new EventEmitter();
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          queueMicrotask(() => {
            child.stdout.emit("data", Buffer.from(secret));
            child.stderr.emit("data", Buffer.from(secret));
            const error = new Error(secret);
            error.code = "EACCES";
            error.path = secret;
            error.env = { BEARER: secret };
            child.emit("error", error);
            child.emit("close", null, "SIGTERM");
          });
          return child;
        },
      },
    });
    try {
      let settlements = 0;
      const result = await new harness.Runner()
        .run("http://127.0.0.1:4173/", {
          settings: { maxWaitForLoad: 1 },
        })
        .then(
          (value) => ((settlements += 1), { value }),
          (error) => ((settlements += 1), { error }),
        );
      await new Promise((resolve) => setImmediate(resolve));

      expect(result.error?.message).toBe("Lighthouse child process could not be started");
      expect(result.error?.stdout).toBe("");
      expect(result.error?.stderr).toBe(
        "[raw Lighthouse output suppressed by the bounded diagnostic mode]",
      );
      expect(settlements).toBe(1);
      expect(spawnCalls).toEqual([process.execPath]);
      expect(harness.fsCounts).toEqual({ writeFileSync: 1, unlinkSync: 1 });
      const markers = harness.output.join("");
      expect(
        markers.match(/HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=permission-denied\n/g),
      ).toHaveLength(1);
      expect(
        markers.match(/HA_LIGHTHOUSE_DIAGNOSTIC phase=lighthouse-cli-exit-nonzero\n/g),
      ).toHaveLength(1);
      expect(
        `${markers}${result.error.message}${result.error.stdout}${result.error.stderr}`,
      ).not.toContain(secret);
    } finally {
      await harness.cleanup();
    }
  });

  it("preserves same-stream marker order across retry boundaries", () => {
    const allowlist = new Set(["lighthouse-cli-started"]);
    const chunk = [
      "HA_LIGHTHOUSE_DIAGNOSTIC phase=lighthouse-cli-started",
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Page.navigate class=protocol-timeout",
      "HA_LIGHTHOUSE_DIAGNOSTIC phase=lighthouse-cli-started",
      "HA_LIGHTHOUSE_DIAGNOSTIC browser product=chrome version=155.0.8059.39",
      "",
    ].join("\n");
    const parsed = parseDiagnosticMarkerChunk("", chunk, allowlist);
    const observed = [];
    let attempt = 0;

    dispatchDiagnosticEvents(parsed.events, {
      emitPhase: (phase) => {
        if (phase === "lighthouse-cli-started") attempt += 1;
      },
      emitTelemetry: (event) => observed.push({ attempt, event }),
    });

    expect(observed).toEqual([
      {
        attempt: 1,
        event: {
          type: "cdp-failure",
          method: "Page.navigate",
          failureClass: "protocol-timeout",
        },
      },
      {
        attempt: 2,
        event: { type: "browser-version", product: "chrome", version: "155.0.8059.39" },
      },
    ]);
  });

  it("caps CDP markers separately so phase saturation cannot consume failure or terminal evidence", () => {
    const phases = [];
    const markers = [];
    const emitPhase = createBoundedDiagnosticPhaseEmitter(
      phases,
      (phase) => markers.push(`phase=${phase}`),
      4,
    );
    const emitEvent = createBoundedDiagnosticEventEmitter(
      emitPhase,
      (marker) => markers.push(marker.trim()),
      2,
    );
    for (let index = 0; index < 50; index += 1) {
      emitEvent(index % 2 === 0 ? "chrome-starting" : "chrome-ready");
    }
    emitEvent({ type: "browser-version", product: "chrome", version: "155.0.8059.39" });
    emitEvent({
      type: "cdp-failure",
      method: "Page.navigate",
      failureClass: "protocol-timeout",
    });
    emitEvent({
      type: "cdp-failure",
      method: "Debugger.getScriptSource",
      failureClass: "command-rejected",
    });
    emitEvent({
      type: "cdp-failure",
      method: "Network.enable",
      failureClass: "command-rejected",
    });
    finishDiagnosticRun(
      new LighthouseDiagnosticParser(),
      emitEvent,
      1,
      "lighthouse-runtime-error-code-protocol-timeout",
    );

    expect(phases).toEqual([
      "chrome-starting",
      "lighthouse-diagnostic-truncated",
      "lighthouse-runtime-error-code-protocol-timeout",
      "lighthouse-cli-exit-nonzero",
    ]);
    expect(markers).toContain(
      "HA_LIGHTHOUSE_DIAGNOSTIC browser product=chrome version=155.0.8059.39",
    );
    expect(markers).toContain(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Page.navigate class=protocol-timeout",
    );
    expect(markers).toContain(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Debugger.getScriptSource class=command-rejected",
    );
    expect(markers).not.toContain(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Network.enable class=command-rejected",
    );
  });

  it("caps the protocol writer and emits only one fixed unavailable event for unknown methods", () => {
    const markers = [];
    const write = createCdpFailureDiagnosticWriter((marker) => markers.push(marker), 3);
    for (const method of [
      "Page.navigate",
      "Debugger.getScriptSource",
      "Private.token",
      "Private.other",
    ]) {
      write(method, { protocolMethod: method });
    }

    expect(MAX_CHILD_CDP_FAILURE_MARKERS).toBe(16);
    expect(markers).toHaveLength(3);
    expect(markers.at(-1)).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=unavailable-or-other class=command-rejected\n",
    );
    expect(markers.join("")).not.toMatch(/Private\.|token/);
  });

  it("exercises the pinned ProtocolSession for success, rejection, timeout, crash, and diagnostics-off", () => {
    const browser = runPinnedProtocolSession({ mode: "browser" });
    expect(browser.error).toBeUndefined();
    expect(browser.status).toBe(0);
    expect(JSON.parse(browser.stdout)).toEqual({
      outcome: "resolved",
      callCount: 1,
      resultOk: false,
    });
    expect(browser.stderr).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC browser product=chrome version=155.0.8059.39\n",
    );
    expect(browser.stderr).not.toMatch(/HOSTILE_CDP_SECRET_SENTINEL|revision|jsVersion|userAgent/);

    const hostileBrowser = runPinnedProtocolSession({ mode: "hostile-browser" });
    expect(hostileBrowser.status).toBe(0);
    expect(hostileBrowser.stderr).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC browser product=unavailable-or-other version=unavailable-or-other\n",
    );
    expect(hostileBrowser.stderr).not.toContain("HOSTILE_CDP_SECRET_SENTINEL");

    const ordinary = runPinnedProtocolSession({ mode: "ordinary-rejection" });
    expect(ordinary.status).toBe(0);
    expect(JSON.parse(ordinary.stdout)).toMatchObject({
      outcome: "rejected",
      errorName: "Error",
      protocolMethodPreserved: true,
      protocolErrorPreserved: true,
    });
    expect(ordinary.stderr).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Page.navigate class=command-rejected\n",
    );
    expect(ordinary.stderr).not.toContain("HOSTILE_CDP_SECRET_SENTINEL");

    const timeout = runPinnedProtocolSession({ mode: "timeout" });
    expect(timeout.status).toBe(0);
    expect(JSON.parse(timeout.stdout)).toMatchObject({
      outcome: "rejected",
      errorCode: "PROTOCOL_TIMEOUT",
    });
    expect(timeout.stderr).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Page.navigate class=protocol-timeout\n",
    );

    const crashed = runPinnedProtocolSession({ mode: "target-crashed" });
    expect(crashed.status).toBe(0);
    expect(JSON.parse(crashed.stdout)).toMatchObject({
      outcome: "rejected",
      errorCode: "TARGET_CRASHED",
    });
    expect(crashed.stderr).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=Page.navigate class=target-crashed\n",
    );

    const success = runPinnedProtocolSession({ mode: "success" });
    expect(success.status).toBe(0);
    expect(success.stderr).toBe("");

    const unknownMethod = runPinnedProtocolSession({ mode: "unknown-method" });
    expect(unknownMethod.status).toBe(0);
    expect(unknownMethod.stderr).toBe(
      "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=unavailable-or-other class=command-rejected\n",
    );
    expect(unknownMethod.stderr).not.toMatch(/Private\.|token|HOSTILE_CDP_SECRET_SENTINEL/);

    const disabled = runPinnedProtocolSession({ mode: "ordinary-rejection", diagnostics: false });
    expect(disabled.status).toBe(0);
    expect(disabled.stdout).toBe(ordinary.stdout);
    expect(disabled.stderr).not.toContain("HA_LIGHTHOUSE_DIAGNOSTIC");
  });
});

describe("local performance server utilities", () => {
  it("allocates a dynamic port and serves a deterministic fail-fast API response", async () => {
    const port = await findAvailablePort();
    const server = await startFailFastApiStub({ port, purpose: "test" });
    try {
      const response = await fetch(`http://${LOOPBACK_HOST}:${port}/api/search`);
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ detail: "test backend stub" });
    } finally {
      await stopHttpServer(server);
    }
  });

  it("rejects a second stub on an occupied API port", async () => {
    const port = await findAvailablePort();
    const server = await startFailFastApiStub({ port, purpose: "first" });
    try {
      await expect(startFailFastApiStub({ port, purpose: "second" })).rejects.toMatchObject({
        code: "EADDRINUSE",
      });
    } finally {
      await stopHttpServer(server);
    }
  });

  it("terminates and awaits an isolated process group", async () => {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      detached: process.platform !== "win32",
      stdio: "ignore",
    });
    child.healtharchiveProcessGroup = process.platform !== "win32";
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    await stopChildProcess(child);
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
  });
});

describe("production build contract", () => {
  it("provides public production configuration to Next in the Docker build and runner", async () => {
    const dockerfile = await readFile(path.resolve("Dockerfile"), "utf8");
    const dockerignore = await readFile(path.resolve(".dockerignore"), "utf8");
    const builderStart = dockerfile.indexOf("FROM base AS builder");
    const runnerStart = dockerfile.indexOf("FROM node:20-bookworm-slim AS runner");
    expect(builderStart).toBeGreaterThan(-1);
    expect(runnerStart).toBeGreaterThan(builderStart);

    const builderStage = dockerfile.slice(builderStart, runnerStart);
    const runnerStage = dockerfile.slice(runnerStart);
    const publicDefaults = [
      ["NEXT_PUBLIC_API_BASE_URL", "https://api.healtharchive.ca"],
      ["NEXT_PUBLIC_REPLAY_BASE_URL", "https://replay.healtharchive.ca"],
      ["NEXT_PUBLIC_SHOW_API_HEALTH_BANNER", "false"],
      ["NEXT_PUBLIC_LOG_API_HEALTH_FAILURE", "false"],
      ["NEXT_PUBLIC_SHOW_API_BASE_HINT", "false"],
    ];

    for (const [name, value] of publicDefaults) {
      expect(dockerfile).toContain(`ARG ${name}=${value}`);
      const envAssignment = "ENV " + name + "=${" + name + "}";
      for (const stage of [builderStage, runnerStage]) {
        expect(stage).toContain(`ARG ${name}\n`);
        expect(stage).toContain(envAssignment);
      }
    }

    expect(dockerignore.split(/\r?\n/)).toContain(".env");
    expect(dockerignore.split(/\r?\n/)).toContain(".env.*");
    expect(dockerfile).not.toContain("http://localhost:8001");
  });

  it("records and reads the exact API base compiled into the build", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "healtharchive-build-contract-"));
    const filePath = path.join(directory, "metadata.json");
    try {
      await writeBuildMetadata(filePath, "http://127.0.0.1:8123");
      await expect(readBuildMetadata(filePath)).resolves.toEqual({
        apiBaseUrl: "http://127.0.0.1:8123",
        version: 1,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("matches the frontend API environment precedence and fallback", () => {
    expect(resolveBuildApiBaseUrl({})).toBe("http://localhost:8001");
    expect(resolveBuildApiBaseUrl({ NEXT_PUBLIC_BACKEND_URL: "http://localhost:8123/" })).toBe(
      "http://localhost:8123",
    );
    expect(
      resolveBuildApiBaseUrl({
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:9000/",
        NEXT_PUBLIC_BACKEND_URL: "http://localhost:8123",
      }),
    ).toBe("http://127.0.0.1:9000");
  });

  it("requires an explicit Linux browser under WSL", async () => {
    expect(
      isWslEnvironment({ env: {}, platform: "linux", release: "microsoft-standard-WSL2" }),
    ).toBe(true);
    await expect(
      requireExplicitWslChrome({ env: {}, platform: "linux", release: "microsoft-standard-WSL2" }),
    ).rejects.toThrow(/CHROME_PATH must point to a Linux/);
    await expect(
      requireExplicitWslChrome({
        env: { CHROME_PATH: "C:\\Program Files\\Chrome\\chrome.exe", WSL_DISTRO_NAME: "Ubuntu" },
        platform: "linux",
        release: "microsoft-standard-WSL2",
      }),
    ).rejects.toThrow(/absolute Linux executable/);
  });
});
