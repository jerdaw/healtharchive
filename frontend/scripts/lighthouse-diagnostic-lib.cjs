"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
// Keep builtin loading synchronous here; frame roots are resolved only when local diagnostics are enabled.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { fileURLToPath } = require("node:url");

const ROUTES = new Map([
  ["/", "home"],
  ["/archive?q=health", "archive"],
  ["/snapshot/phac-2025-02-15-covid-epi", "snapshot"],
]);

const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const MAX_PENDING_CHARS = 8_192;
const MAX_CHILD_CDP_FAILURE_MARKERS = 16;
const MAX_FAILURE_DIAGNOSTIC_MARKERS = 6;
const DIAGNOSTIC_UNAVAILABLE = "unavailable-or-other";
const CHILD_SPAWN_FAILURE_CLASSES = new Set([
  "not-found",
  "permission-denied",
  "resource-limit",
  "argument-limit",
  "other",
]);
const BROWSER_PRODUCTS = new Map([
  ["Chrome", "chrome"],
  ["Chromium", "chromium"],
  ["HeadlessChrome", "headless-chrome"],
]);
const BROWSER_PRODUCT_VERSION =
  /^(Chrome|Chromium|HeadlessChrome)\/(\d{1,3}\.\d{1,3}\.\d{1,6}\.\d{1,6})$/;
const CDP_FAILURE_CLASSES = new Set([
  "protocol-timeout",
  "target-crashed",
  "command-rejected",
  DIAGNOSTIC_UNAVAILABLE,
]);
// Fixed to the literal CDP methods called by the pinned Lighthouse 12.6.1 core sources.
const SAFE_CDP_METHODS = new Set([
  "Animation.disable",
  "Animation.enable",
  "Audits.disable",
  "Audits.enable",
  "Audits.getEncodedResponse",
  "Browser.getVersion",
  "CSS.disable",
  "CSS.enable",
  "CSS.getMatchedStylesForNode",
  "CSS.getStyleSheetText",
  "CSS.startRuleUsageTracking",
  "CSS.stopRuleUsageTracking",
  "DOM.disable",
  "DOM.enable",
  "DOM.getDocument",
  "DOM.pushNodeByPathToFrontend",
  "DOM.pushNodesByBackendIdsToFrontend",
  "DOM.resolveNode",
  "DOMDebugger.getEventListeners",
  "DOMSnapshot.captureSnapshot",
  "DOMSnapshot.disable",
  "DOMSnapshot.enable",
  "Debugger.disable",
  "Debugger.enable",
  "Debugger.getScriptSource",
  "Debugger.resume",
  "Debugger.setAsyncCallStackDepth",
  "Debugger.setSkipAllPauses",
  "Emulation.setCPUThrottlingRate",
  "Emulation.setDeviceMetricsOverride",
  "Emulation.setScriptExecutionDisabled",
  "Emulation.setTouchEmulationEnabled",
  "IO.read",
  "Log.disable",
  "Log.enable",
  "Log.startViolationsReport",
  "Log.stopViolationsReport",
  "Network.clearBrowserCache",
  "Network.emulateNetworkConditions",
  "Network.enable",
  "Network.getResponseBody",
  "Network.loadNetworkResource",
  "Network.setBlockedURLs",
  "Network.setCacheDisabled",
  "Network.setExtraHTTPHeaders",
  "Network.setUserAgentOverride",
  "Page.addScriptToEvaluateOnNewDocument",
  "Page.captureScreenshot",
  "Page.createIsolatedWorld",
  "Page.enable",
  "Page.getFrameTree",
  "Page.getLayoutMetrics",
  "Page.getNavigationHistory",
  "Page.handleJavaScriptDialog",
  "Page.navigate",
  "Page.navigateToHistoryEntry",
  "Page.setLifecycleEventsEnabled",
  "Profiler.disable",
  "Profiler.enable",
  "Profiler.startPreciseCoverage",
  "Profiler.stopPreciseCoverage",
  "Profiler.takePreciseCoverage",
  "Runtime.callFunctionOn",
  "Runtime.disable",
  "Runtime.enable",
  "Runtime.evaluate",
  "Runtime.runIfWaitingForDebugger",
  "Runtime.terminateExecution",
  "Storage.clearDataForOrigin",
  "Storage.getUsageAndQuota",
  "Target.getTargetInfo",
  "Target.setAutoAttach",
  "Tracing.end",
  "Tracing.recordClockSyncMarker",
  "Tracing.start",
]);
const GATHER_PHASES = new Map([
  ["startInstrumentation", "start-instrumentation"],
  ["startSensitiveInstrumentation", "start-sensitive-instrumentation"],
  ["stopSensitiveInstrumentation", "stop-sensitive-instrumentation"],
  ["stopInstrumentation", "stop-instrumentation"],
  ["getArtifact", "get-artifact"],
]);
const GATHERER_IDS = new Map([
  ["DevtoolsLog", "devtools-log"],
  ["Trace", "trace"],
  ["Accessibility", "accessibility"],
  ["AnchorElements", "anchor-elements"],
  ["CacheContents", "cache-contents"],
  ["ConsoleMessages", "console-messages"],
  ["CSSUsage", "css-usage"],
  ["Doctype", "doctype"],
  ["DOMStats", "dom-stats"],
  ["FontSize", "font-size"],
  ["Inputs", "inputs"],
  ["IFrameElements", "iframe-elements"],
  ["ImageElements", "image-elements"],
  ["InspectorIssues", "inspector-issues"],
  ["JsUsage", "js-usage"],
  ["LinkElements", "link-elements"],
  ["MainDocumentContent", "main-document-content"],
  ["MetaElements", "meta-elements"],
  ["NetworkUserAgent", "network-user-agent"],
  ["OptimizedImages", "optimized-images"],
  ["ResponseCompression", "response-compression"],
  ["RobotsTxt", "robots-txt"],
  ["Scripts", "scripts"],
  ["SourceMaps", "source-maps"],
  ["Stacks", "stacks"],
  ["Stylesheets", "stylesheets"],
  ["TraceElements", "trace-elements"],
  ["ViewportDimensions", "viewport-dimensions"],
  ["devtoolsLogs", "devtools-logs"],
  ["traces", "traces"],
  ["FullPageScreenshot", "full-page-screenshot"],
  ["BFCacheFailures", "bf-cache-failures"],
]);
const SAFE_GATHER_DIAGNOSTIC_PHASES = new Set(
  [...GATHER_PHASES.values()].flatMap((phase) =>
    [...GATHERER_IDS.values()].map((gatherer) => ["gather-", phase, "-", gatherer].join("")),
  ),
);
const MAX_CHILD_DIAGNOSTIC_PHASES = 192;
const DIAGNOSTIC_TRUNCATED_PHASE = "lighthouse-diagnostic-truncated";
const LIGHTHOUSE_RUNTIME_ERROR_CODES = new Map([
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
]);
const LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE = "unavailable-or-other";
const LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASSES = new Map([
  ["Error", "error"],
  ["TypeError", "type-error"],
  ["RangeError", "range-error"],
  ["ReferenceError", "reference-error"],
  ["SyntaxError", "syntax-error"],
  ["URIError", "uri-error"],
  ["EvalError", "eval-error"],
  ["AggregateError", "aggregate-error"],
]);
const LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASS_VALUES = new Set([
  ...LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASSES.values(),
  LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE,
]);
const PRE_DRIVER_FAILURE_STAGES = new Set([
  "config-init",
  "url-normalize",
  "puppeteer-attach",
  "puppeteer-new-page",
  "chrome-cleanup",
]);
const DIAGNOSTIC_STAGE_NAMES = new Set([
  ...PRE_DRIVER_FAILURE_STAGES,
  "navigation-stop-instrumentation",
  "navigation-disable-async-stacks",
  "navigation-clear-throttling",
  "navigation-debug-data",
]);
const FAILURE_ORIGINS = new Set(["primary", "cleanup"]);
const FAILURE_STAGE_UNAVAILABLE = "unavailable-or-other";
const FAILURE_FRAME_MODULES = new Set(["lighthouse", "puppeteer-core", "chrome-launcher", "none"]);
const FAILURE_CAUSE_CODES = new Map([
  ["EADDRNOTAVAIL", "eaddrnotavail"],
  ["EAI_AGAIN", "eai-again"],
  ["ECONNREFUSED", "econnrefused"],
  ["ECONNRESET", "econnreset"],
  ["EHOSTUNREACH", "ehostunreach"],
  ["ENETUNREACH", "enetunreach"],
  ["ENOTFOUND", "enotfound"],
  ["ETIMEDOUT", "etimedout"],
  ["UND_ERR_ABORTED", "und-err-aborted"],
  ["UND_ERR_BODY_TIMEOUT", "und-err-body-timeout"],
  ["UND_ERR_CONNECT_TIMEOUT", "und-err-connect-timeout"],
  ["UND_ERR_HEADERS_TIMEOUT", "und-err-headers-timeout"],
  ["UND_ERR_RESPONSE_STATUS_CODE", "und-err-response-status-code"],
  ["UND_ERR_SOCKET", "und-err-socket"],
]);
const FAILURE_CAUSE_CODE_VALUES = new Set([
  ...FAILURE_CAUSE_CODES.values(),
  DIAGNOSTIC_UNAVAILABLE,
]);
const MAX_FAILURE_CAUSE_DEPTH = 4;
const MAX_FAILURE_CAUSE_NODES = 8;
const MAX_AGGREGATE_FAILURE_CAUSES = 4;
const DIAGNOSTIC_MODULE_SPECS = [
  { name: "lighthouse", version: "12.6.1" },
  { name: "puppeteer-core", version: "24.43.1" },
  { name: "chrome-launcher", version: "1.2.1" },
];
const SAFE_DIAGNOSTIC_STAGE_PHASES = new Set(
  [...DIAGNOSTIC_STAGE_NAMES].flatMap((stage) =>
    ["started", "completed", "failed"].map((state) => `${stage}-${state}`),
  ),
);
const FAILURE_FRAME_FILE = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const MAX_FAILURE_STACK_CHARS = 65_536;
const MAX_FAILURE_STACK_LINES = 128;
const MAX_FAILURE_FRAME_PATH_CHARS = 4_096;
const MAX_DIAGNOSTIC_PACKAGE_JSON_BYTES = 131_072;
const LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES = new Set([
  ...[...LIGHTHOUSE_RUNTIME_ERROR_CODES.values(), LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE].map(
    (code) => `lighthouse-runtime-error-code-${code}`,
  ),
]);
const SAFE_CHILD_DIAGNOSTIC_PHASES = new Set([
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
  ...LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  "lighthouse-cli-started",
  "lighthouse-cli-exit-zero",
  "lighthouse-cli-exit-nonzero",
  ...SAFE_DIAGNOSTIC_STAGE_PHASES,
  ...SAFE_GATHER_DIAGNOSTIC_PHASES,
]);

function boundedChunkText(chunk) {
  if (Buffer.isBuffer(chunk)) {
    return chunk.toString("utf8", Math.max(0, chunk.length - MAX_PENDING_CHARS));
  }
  return String(chunk).slice(-MAX_PENDING_CHARS);
}

function splitBoundedLines(pending, chunk, maxPendingChars = MAX_PENDING_CHARS) {
  const chunkText = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
  const lines = (pending + chunkText).split(/\r?\n/);
  const incomplete = lines.pop() ?? "";
  return { lines, pending: incomplete.slice(-maxPendingChars) };
}

function findInstalledModuleRoot(entryPath, expectedName, expectedVersion) {
  let realEntry;
  try {
    realEntry = fs.realpathSync(entryPath);
  } catch {
    return null;
  }

  let directory = path.dirname(realEntry);
  for (let depth = 0; depth < 12; depth += 1) {
    const packagePath = path.join(directory, "package.json");
    try {
      const packageStat = fs.lstatSync(packagePath);
      if (
        !packageStat.isFile() ||
        packageStat.isSymbolicLink() ||
        packageStat.size > MAX_DIAGNOSTIC_PACKAGE_JSON_BYTES
      ) {
        return null;
      }
      const metadata = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      if (metadata.name === expectedName && metadata.version === expectedVersion) {
        const realRoot = fs.realpathSync(directory);
        const relativeEntry = path.relative(realRoot, realEntry);
        if (
          relativeEntry === "" ||
          relativeEntry === ".." ||
          relativeEntry.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativeEntry)
        ) {
          return null;
        }
        return realRoot;
      }
    } catch {
      // An unavailable, malformed, or unexpected package root is not trusted for frame output.
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return null;
}

function resolveDiagnosticModuleRoots(importerUrl) {
  const roots = Object.create(null);
  try {
    const importerPath = importerUrl instanceof URL ? fileURLToPath(importerUrl) : importerUrl;
    if (typeof importerPath !== "string" || !path.isAbsolute(importerPath)) return roots;
    const localRequire = createRequire(importerPath);
    for (const spec of DIAGNOSTIC_MODULE_SPECS) {
      try {
        const entry = localRequire.resolve(spec.name);
        const root = findInstalledModuleRoot(entry, spec.name, spec.version);
        if (root !== null) roots[spec.name] = root;
      } catch {
        // Missing or version-drifted modules are omitted, never inferred from a stack string.
      }
    }
  } catch {
    // Diagnostics remain unavailable rather than affecting Lighthouse execution.
  }
  return roots;
}

function failureNameClass(error) {
  try {
    const name = error?.name;
    return LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASSES.get(name) ?? DIAGNOSTIC_UNAVAILABLE;
  } catch {
    return DIAGNOSTIC_UNAVAILABLE;
  }
}

function parseStackFrame(line) {
  const match = line.match(/^\s*at\s+(?:(?:async\s+)?[^\n]*?\s+\()?(.+):(\d+):(\d+)\)?\s*$/);
  if (!match) return null;
  const lineNumber = Number(match[2]);
  const columnNumber = Number(match[3]);
  if (
    !Number.isSafeInteger(lineNumber) ||
    lineNumber < 1 ||
    lineNumber > 10_000_000 ||
    !Number.isSafeInteger(columnNumber) ||
    columnNumber < 1 ||
    columnNumber > 10_000_000
  ) {
    return null;
  }
  let filePath = match[1];
  if (filePath.length > MAX_FAILURE_FRAME_PATH_CHARS) return null;
  if (filePath.startsWith("file://")) {
    try {
      filePath = fileURLToPath(filePath);
    } catch {
      return null;
    }
  }
  return { filePath, line: lineNumber, column: columnNumber };
}

function firstRelevantInstalledModuleFrame(error, moduleRoots) {
  let stack;
  try {
    stack = error?.stack;
  } catch {
    stack = null;
  }
  if (typeof stack !== "string" || stack.length > MAX_FAILURE_STACK_CHARS) {
    return { module: "none", file: "none", line: 0, column: 0 };
  }

  const roots = Object.entries(moduleRoots ?? {})
    .filter(([name, root]) => FAILURE_FRAME_MODULES.has(name) && typeof root === "string")
    .sort(([, left], [, right]) => right.length - left.length);
  if (roots.length === 0) return { module: "none", file: "none", line: 0, column: 0 };

  for (const line of stack.split(/\r?\n/).slice(1, MAX_FAILURE_STACK_LINES + 1)) {
    const frame = parseStackFrame(line);
    if (!frame) continue;
    let realFrame;
    try {
      realFrame = fs.realpathSync(frame.filePath);
    } catch {
      continue;
    }

    for (const [name, root] of roots) {
      let realRoot;
      try {
        realRoot = fs.realpathSync(root);
      } catch {
        continue;
      }
      const relative = path.relative(realRoot, realFrame);
      if (
        relative === "" ||
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
      ) {
        continue;
      }
      const normalizedFile = relative.split(path.sep).join("/");
      if (!FAILURE_FRAME_FILE.test(normalizedFile)) continue;
      return {
        module: name,
        file: normalizedFile,
        line: frame.line,
        column: frame.column,
      };
    }
  }
  return { module: "none", file: "none", line: 0, column: 0 };
}

function safeFailureCauseCode(error) {
  const pending = [{ value: error, depth: 0 }];
  const visited = new Set();
  let visitedCount = 0;

  while (pending.length > 0 && visitedCount < MAX_FAILURE_CAUSE_NODES) {
    const current = pending.shift();
    const value = current?.value;
    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function") ||
      visited.has(value)
    ) {
      continue;
    }
    visited.add(value);
    visitedCount += 1;

    let code;
    try {
      code = value.code;
    } catch {
      code = null;
    }
    if (typeof code === "string" && FAILURE_CAUSE_CODES.has(code)) {
      return FAILURE_CAUSE_CODES.get(code);
    }
    if (current.depth >= MAX_FAILURE_CAUSE_DEPTH) continue;

    let cause;
    try {
      cause = value.cause;
    } catch {
      cause = null;
    }
    if (cause !== null && (typeof cause === "object" || typeof cause === "function")) {
      pending.push({ value: cause, depth: current.depth + 1 });
    }

    let errors;
    try {
      errors = value.errors;
    } catch {
      errors = null;
    }
    let hasNestedErrors = false;
    try {
      hasNestedErrors = Array.isArray(errors);
    } catch {
      hasNestedErrors = false;
    }
    if (hasNestedErrors) {
      let length = 0;
      try {
        length = Math.min(errors.length, MAX_AGGREGATE_FAILURE_CAUSES);
      } catch {
        length = 0;
      }
      for (let index = 0; index < length; index += 1) {
        let nested;
        try {
          nested = errors[index];
        } catch {
          continue;
        }
        if (nested !== null && (typeof nested === "object" || typeof nested === "function")) {
          pending.push({ value: nested, depth: current.depth + 1 });
        }
      }
    }
  }

  return DIAGNOSTIC_UNAVAILABLE;
}

function normalizeFailureDiagnosticEvent(event) {
  const frameModule = FAILURE_FRAME_MODULES.has(event?.frame?.module) ? event.frame.module : "none";
  const frameFile =
    frameModule !== "none" &&
    typeof event?.frame?.file === "string" &&
    event.frame.file.length <= 192 &&
    FAILURE_FRAME_FILE.test(event.frame.file)
      ? event.frame.file
      : "none";
  const line =
    frameFile !== "none" &&
    Number.isSafeInteger(event?.frame?.line) &&
    event.frame.line > 0 &&
    event.frame.line <= 10_000_000
      ? event.frame.line
      : 0;
  const column =
    frameFile !== "none" &&
    Number.isSafeInteger(event?.frame?.column) &&
    event.frame.column > 0 &&
    event.frame.column <= 10_000_000
      ? event.frame.column
      : 0;
  const validFrame = frameFile !== "none" && line > 0 && column > 0;
  return {
    type: "failure",
    stage: DIAGNOSTIC_STAGE_NAMES.has(event?.stage) ? event.stage : FAILURE_STAGE_UNAVAILABLE,
    origin: FAILURE_ORIGINS.has(event?.origin) ? event.origin : "primary",
    nameClass: LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASS_VALUES.has(event?.nameClass)
      ? event.nameClass
      : DIAGNOSTIC_UNAVAILABLE,
    causeCode: FAILURE_CAUSE_CODE_VALUES.has(event?.causeCode)
      ? event.causeCode
      : DIAGNOSTIC_UNAVAILABLE,
    frame: validFrame
      ? { module: frameModule, file: frameFile, line, column }
      : { module: "none", file: "none", line: 0, column: 0 },
  };
}

function failureDiagnosticEvent(stage, origin, error, moduleRoots) {
  return normalizeFailureDiagnosticEvent({
    type: "failure",
    stage,
    origin,
    nameClass: failureNameClass(error),
    causeCode: stage === "puppeteer-attach" ? safeFailureCauseCode(error) : DIAGNOSTIC_UNAVAILABLE,
    frame: firstRelevantInstalledModuleFrame(error, moduleRoots),
  });
}

function formatFailureDiagnosticMarker(event) {
  const safe = normalizeFailureDiagnosticEvent(event);
  return [
    "HA_LIGHTHOUSE_DIAGNOSTIC failure",
    `stage=${safe.stage}`,
    `origin=${safe.origin}`,
    `class=${safe.nameClass}`,
    `cause-code=${safe.causeCode}`,
    `frame-module=${safe.frame.module}`,
    `frame-file=${safe.frame.file}`,
    `frame-line=${safe.frame.line}`,
    `frame-column=${safe.frame.column}`,
  ].join(" ");
}

function parseFailureDiagnosticMarker(line) {
  const match = line.match(
    /^HA_LIGHTHOUSE_DIAGNOSTIC failure stage=([a-z-]+) origin=([a-z-]+) class=([a-z-]+) cause-code=([a-z-]+) frame-module=([a-z-]+) frame-file=([A-Za-z0-9_./-]+) frame-line=(\d+) frame-column=(\d+)$/,
  );
  if (!match) {
    return normalizeFailureDiagnosticEvent(null);
  }
  return normalizeFailureDiagnosticEvent({
    type: "failure",
    stage: match[1],
    origin: match[2],
    nameClass: match[3],
    causeCode: match[4],
    frame: {
      module: match[5],
      file: match[6],
      line: Number(match[7]),
      column: Number(match[8]),
    },
  });
}

function writeFailureDiagnostic(stage, origin, error, moduleRoots, writeMarker) {
  try {
    const marker = formatFailureDiagnosticMarker(
      failureDiagnosticEvent(stage, origin, error, moduleRoots),
    );
    writeMarker(`${marker}\n`);
  } catch {
    // Diagnostics are best-effort and must not replace Lighthouse errors.
  }
}

function writeDiagnosticStagePhase(stage, state, writeMarker) {
  const phase = `${stage}-${state}`;
  if (!SAFE_DIAGNOSTIC_STAGE_PHASES.has(phase)) return;
  try {
    writeMarker(`HA_LIGHTHOUSE_DIAGNOSTIC phase=${phase}\n`);
  } catch {
    // Stage telemetry is best-effort and must not change Lighthouse execution.
  }
}

function runDiagnosticStage(stage, operation, options = {}) {
  const settings = options && typeof options === "object" ? options : {};
  const writeMarker =
    typeof settings.writeMarker === "function"
      ? settings.writeMarker
      : (line) => process.stderr.write(line);
  const reportFailure = (error) => {
    writeDiagnosticStagePhase(stage, "failed", writeMarker);
    writeFailureDiagnostic(stage, "primary", error, settings.moduleRoots, writeMarker);
  };

  writeDiagnosticStagePhase(stage, "started", writeMarker);
  try {
    const result = operation();
    if (result && typeof result.then === "function") {
      return result.then(
        (value) => {
          writeDiagnosticStagePhase(stage, "completed", writeMarker);
          return value;
        },
        (error) => {
          reportFailure(error);
          throw error;
        },
      );
    }
    writeDiagnosticStagePhase(stage, "completed", writeMarker);
    return result;
  } catch (error) {
    reportFailure(error);
    throw error;
  }
}

function runCleanupPreservingPrimary(options = {}) {
  const settings = options && typeof options === "object" ? options : {};
  const writeMarker =
    typeof settings.writeMarker === "function"
      ? settings.writeMarker
      : (line) => process.stderr.write(line);
  writeDiagnosticStagePhase("chrome-cleanup", "started", writeMarker);
  let cleanupError = null;
  try {
    settings.cleanup();
    writeDiagnosticStagePhase("chrome-cleanup", "completed", writeMarker);
  } catch (error) {
    cleanupError = error;
    writeDiagnosticStagePhase("chrome-cleanup", "failed", writeMarker);
    writeFailureDiagnostic("chrome-cleanup", "cleanup", error, settings.moduleRoots, writeMarker);
  }
  return {
    error: settings.primaryError ?? cleanupError,
    cleanupError,
  };
}

function parseDiagnosticMarkerChunk(
  pending,
  chunk,
  allowlist,
  maxPendingChars = MAX_PENDING_CHARS,
) {
  const split = splitBoundedLines(pending, chunk, maxPendingChars);
  const phases = [];
  const browserVersions = [];
  const cdpFailures = [];
  const spawnFailures = [];
  const events = [];
  const failures = [];
  for (const line of split.lines) {
    const match = line.match(/^HA_LIGHTHOUSE_DIAGNOSTIC phase=([a-z-]+)$/);
    if (match && allowlist.has(match[1])) {
      phases.push(match[1]);
      events.push(match[1]);
      continue;
    }

    if (line.startsWith("HA_LIGHTHOUSE_DIAGNOSTIC runtime-error ")) {
      events.push(parseRuntimeErrorDiagnosticMarker(line));
      continue;
    }

    if (line.startsWith("HA_LIGHTHOUSE_DIAGNOSTIC failure ")) {
      const event = parseFailureDiagnosticMarker(line);
      if (failures.length < MAX_FAILURE_DIAGNOSTIC_MARKERS) {
        failures.push(event);
        events.push(event);
      }
      continue;
    }

    const browserPrefix = "HA_LIGHTHOUSE_DIAGNOSTIC browser ";
    if (line.startsWith(browserPrefix)) {
      const browserMatch = line.match(
        /^HA_LIGHTHOUSE_DIAGNOSTIC browser product=(chrome|chromium|headless-chrome|unavailable-or-other) version=(\d{1,3}\.\d{1,3}\.\d{1,6}\.\d{1,6}|unavailable-or-other)$/,
      );
      const event = browserMatch
        ? { type: "browser-version", product: browserMatch[1], version: browserMatch[2] }
        : {
            type: "browser-version",
            product: DIAGNOSTIC_UNAVAILABLE,
            version: DIAGNOSTIC_UNAVAILABLE,
          };
      browserVersions.push(event);
      events.push(event);
      continue;
    }

    const cdpPrefix = "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure ";
    if (line.startsWith(cdpPrefix)) {
      const cdpMatch = line.match(
        /^HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=([^\s]{1,128}) class=([a-z-]{1,32})$/,
      );
      const method =
        cdpMatch && SAFE_CDP_METHODS.has(cdpMatch[1]) ? cdpMatch[1] : DIAGNOSTIC_UNAVAILABLE;
      const failureClass =
        cdpMatch && CDP_FAILURE_CLASSES.has(cdpMatch[2]) ? cdpMatch[2] : DIAGNOSTIC_UNAVAILABLE;
      const event = { type: "cdp-failure", method, failureClass };
      cdpFailures.push(event);
      events.push(event);
      continue;
    }

    const spawnFailurePrefix = "HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure ";
    if (spawnFailures.length === 0 && line.startsWith(spawnFailurePrefix)) {
      const spawnMatch = line.match(
        /^HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=([a-z-]{1,32})$/,
      );
      const failureClass =
        spawnMatch && CHILD_SPAWN_FAILURE_CLASSES.has(spawnMatch[1]) ? spawnMatch[1] : "other";
      const event = { type: "spawn-failure", failureClass };
      spawnFailures.push(event);
      events.push(event);
    }
  }
  return {
    phases,
    browserVersions,
    cdpFailures,
    spawnFailures,
    failures,
    events,
    pending: split.pending,
  };
}

function dispatchDiagnosticEvents(events, { emitPhase, emitTelemetry }) {
  for (const event of events) {
    if (typeof event === "string") emitPhase(event);
    else emitTelemetry(event);
  }
}

function browserVersionDiagnosticEvent(product) {
  if (typeof product !== "string") {
    return {
      type: "browser-version",
      product: DIAGNOSTIC_UNAVAILABLE,
      version: DIAGNOSTIC_UNAVAILABLE,
    };
  }

  const match = product.match(BROWSER_PRODUCT_VERSION);
  if (!match) {
    return {
      type: "browser-version",
      product: DIAGNOSTIC_UNAVAILABLE,
      version: DIAGNOSTIC_UNAVAILABLE,
    };
  }

  return {
    type: "browser-version",
    product: BROWSER_PRODUCTS.get(match[1]),
    version: match[2],
  };
}

function cdpFailureDiagnosticEvent(method, error) {
  let failureClass = DIAGNOSTIC_UNAVAILABLE;
  if (error?.code === "PROTOCOL_TIMEOUT") {
    failureClass = "protocol-timeout";
  } else if (error?.code === "TARGET_CRASHED") {
    failureClass = "target-crashed";
  } else {
    failureClass = "command-rejected";
  }

  return {
    type: "cdp-failure",
    method: SAFE_CDP_METHODS.has(method) ? method : DIAGNOSTIC_UNAVAILABLE,
    failureClass,
  };
}

function childSpawnFailureDiagnosticEvent(error) {
  let code = null;
  try {
    if (typeof error?.code === "string") code = error.code;
  } catch {
    // Child-process diagnostics are best-effort and never inspect arbitrary error text.
  }
  const failureClass =
    code === "ENOENT"
      ? "not-found"
      : code === "EACCES" || code === "EPERM"
        ? "permission-denied"
        : code === "EMFILE" || code === "ENFILE"
          ? "resource-limit"
          : code === "E2BIG"
            ? "argument-limit"
            : "other";
  return { type: "spawn-failure", failureClass };
}

function spawnPinnedNode(childProcess, args, options) {
  if (!childProcess || typeof childProcess.spawn !== "function") {
    throw new TypeError("child-process-spawn-required");
  }
  return childProcess.spawn(process.execPath, args, options);
}

function formatDiagnosticTelemetryMarker(event) {
  if (event?.type === "browser-version") {
    const validProduct = [...BROWSER_PRODUCTS.values()].includes(event.product);
    const validVersion =
      typeof event.version === "string" &&
      /^\d{1,3}\.\d{1,3}\.\d{1,6}\.\d{1,6}$/.test(event.version);
    const safeEvent =
      validProduct && validVersion
        ? event
        : {
            type: "browser-version",
            product: DIAGNOSTIC_UNAVAILABLE,
            version: DIAGNOSTIC_UNAVAILABLE,
          };
    return `HA_LIGHTHOUSE_DIAGNOSTIC browser product=${safeEvent.product} version=${safeEvent.version}`;
  }
  if (event?.type === "cdp-failure") {
    const method = SAFE_CDP_METHODS.has(event.method) ? event.method : DIAGNOSTIC_UNAVAILABLE;
    const failureClass = CDP_FAILURE_CLASSES.has(event.failureClass)
      ? event.failureClass
      : DIAGNOSTIC_UNAVAILABLE;
    return `HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=${method} class=${failureClass}`;
  }
  if (event?.type === "spawn-failure") {
    const failureClass = CHILD_SPAWN_FAILURE_CLASSES.has(event.failureClass)
      ? event.failureClass
      : "other";
    return `HA_LIGHTHOUSE_DIAGNOSTIC spawn-failure class=${failureClass}`;
  }
  if (event?.type === "failure") return formatFailureDiagnosticMarker(event);
  return null;
}

function writeBrowserVersionDiagnostic(product, write = (line) => process.stderr.write(line)) {
  try {
    const line = formatDiagnosticTelemetryMarker(browserVersionDiagnosticEvent(product));
    if (line !== null) write(`${line}\n`);
  } catch {
    // Diagnostics must never alter Lighthouse result semantics.
  }
}

function createCdpFailureDiagnosticWriter(
  write = (line) => process.stderr.write(line),
  maxMarkers = MAX_CHILD_CDP_FAILURE_MARKERS,
) {
  const reported = new Set();
  const limit = Number.isSafeInteger(maxMarkers)
    ? Math.min(MAX_CHILD_CDP_FAILURE_MARKERS, Math.max(0, maxMarkers))
    : MAX_CHILD_CDP_FAILURE_MARKERS;
  return (method, error) => {
    try {
      const event = cdpFailureDiagnosticEvent(method, error);
      const key = `${event.method}:${event.failureClass}`;
      if (reported.has(key) || reported.size >= limit) return;
      reported.add(key);
      const line = formatDiagnosticTelemetryMarker(event);
      if (line !== null) write(`${line}\n`);
    } catch {
      // Diagnostics must never alter Lighthouse result semantics.
    }
  };
}

function createBoundedDiagnosticEventEmitter(
  emitPhase,
  writeMarker,
  maxCdpFailureMarkers = MAX_CHILD_CDP_FAILURE_MARKERS,
) {
  let browserVersionReported = false;
  let runtimeErrorReported = false;
  let spawnFailureReported = false;
  const reportedFailures = new Set();
  const reportedCdpFailures = new Set();
  const limit = Number.isSafeInteger(maxCdpFailureMarkers)
    ? Math.min(MAX_CHILD_CDP_FAILURE_MARKERS, Math.max(0, maxCdpFailureMarkers))
    : MAX_CHILD_CDP_FAILURE_MARKERS;

  return (event) => {
    if (typeof event === "string") {
      emitPhase(event);
      return;
    }
    if (event?.type === "browser-version") {
      if (browserVersionReported) return;
      browserVersionReported = true;
    } else if (event?.type === "runtime-error") {
      if (runtimeErrorReported) return;
      runtimeErrorReported = true;
      const normalized = normalizeRuntimeErrorDiagnosticEvent(event);
      writeMarker(`${formatRuntimeErrorDiagnosticMarker(normalized)}\n`);
      return;
    } else if (event?.type === "cdp-failure") {
      const normalized = {
        ...event,
        method: SAFE_CDP_METHODS.has(event.method) ? event.method : DIAGNOSTIC_UNAVAILABLE,
        failureClass: CDP_FAILURE_CLASSES.has(event.failureClass)
          ? event.failureClass
          : DIAGNOSTIC_UNAVAILABLE,
      };
      const key = `${normalized.method}:${normalized.failureClass}`;
      if (reportedCdpFailures.has(key) || reportedCdpFailures.size >= limit) return;
      reportedCdpFailures.add(key);
      event = normalized;
    } else if (event?.type === "spawn-failure") {
      if (spawnFailureReported) return;
      spawnFailureReported = true;
      event = {
        type: "spawn-failure",
        failureClass: CHILD_SPAWN_FAILURE_CLASSES.has(event.failureClass)
          ? event.failureClass
          : "other",
      };
    } else if (event?.type === "failure") {
      event = normalizeFailureDiagnosticEvent(event);
      const key = `${event.stage}:${event.origin}`;
      if (reportedFailures.has(key) || reportedFailures.size >= MAX_FAILURE_DIAGNOSTIC_MARKERS) {
        return;
      }
      reportedFailures.add(key);
    } else {
      return;
    }

    const marker = formatDiagnosticTelemetryMarker(event);
    if (marker !== null) writeMarker(`${marker}\n`);
  };
}

function createBoundedDiagnosticPhaseEmitter(
  phases,
  writeMarker,
  maxPhases = MAX_CHILD_DIAGNOSTIC_PHASES,
) {
  const phaseLimit = Number.isSafeInteger(maxPhases)
    ? Math.min(MAX_CHILD_DIAGNOSTIC_PHASES, Math.max(4, maxPhases))
    : MAX_CHILD_DIAGNOSTIC_PHASES;
  const detailLimit = phaseLimit - 3;
  let truncated = phases.includes(DIAGNOSTIC_TRUNCATED_PHASE);

  return (phase) => {
    if (!SAFE_CHILD_DIAGNOSTIC_PHASES.has(phase)) return;
    const isTerminalPhase =
      phase === "lighthouse-cli-exit-zero" ||
      phase === "lighthouse-cli-exit-nonzero" ||
      LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES.has(phase);
    if (isTerminalPhase) {
      if (phases.includes(phase)) return;
      if (phases.length >= phaseLimit) return;
      phases.push(phase);
      writeMarker(phase);
      return;
    }

    if (truncated || phases[phases.length - 1] === phase) return;
    if (phases.length >= detailLimit) {
      phases.push(DIAGNOSTIC_TRUNCATED_PHASE);
      truncated = true;
      writeMarker(DIAGNOSTIC_TRUNCATED_PHASE);
      return;
    }

    phases.push(phase);
    writeMarker(phase);
  };
}

function runtimeErrorCodeDiagnosticPhase(runtimeErrorCode) {
  const code =
    typeof runtimeErrorCode === "string"
      ? (LIGHTHOUSE_RUNTIME_ERROR_CODES.get(runtimeErrorCode) ??
        LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE)
      : LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE;
  return `lighthouse-runtime-error-code-${code}`;
}

function runtimeErrorDiagnosticEvent(error) {
  const errorName = typeof error?.name === "string" ? error.name : null;
  return {
    type: "runtime-error",
    nameClass:
      LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASSES.get(errorName) ?? LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE,
    codePresent: error?.code !== undefined && error?.code !== null,
    codePhase: runtimeErrorCodeDiagnosticPhase(error?.code),
  };
}

function formatRuntimeErrorDiagnosticMarker(error) {
  const event =
    error?.type === "runtime-error"
      ? normalizeRuntimeErrorDiagnosticEvent(error)
      : runtimeErrorDiagnosticEvent(error);
  return [
    "HA_LIGHTHOUSE_DIAGNOSTIC runtime-error",
    `class=${event.nameClass}`,
    `code-present=${event.codePresent}`,
    `code-phase=${event.codePhase}`,
  ].join(" ");
}

function normalizeRuntimeErrorDiagnosticEvent(event) {
  return {
    type: "runtime-error",
    nameClass: LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASS_VALUES.has(event?.nameClass)
      ? event.nameClass
      : LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE,
    codePresent: event?.codePresent === true,
    codePhase: LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES.has(event?.codePhase)
      ? event.codePhase
      : runtimeErrorCodeDiagnosticPhase(null),
  };
}

function parseRuntimeErrorDiagnosticMarker(line) {
  const match = line.match(
    /^HA_LIGHTHOUSE_DIAGNOSTIC runtime-error class=([a-z-]+) code-present=(true|false) code-phase=(lighthouse-runtime-error-code-[a-z-]+)$/,
  );
  return {
    type: "runtime-error",
    nameClass:
      match && LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASS_VALUES.has(match[1])
        ? match[1]
        : LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE,
    codePresent: match ? match[2] === "true" : false,
    codePhase:
      match && LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES.has(match[3])
        ? match[3]
        : runtimeErrorCodeDiagnosticPhase(null),
  };
}

function runtimeErrorDiagnosticPhase(stdout) {
  let runtimeErrorCode = null;
  try {
    if (typeof stdout === "string") {
      runtimeErrorCode = JSON.parse(stdout)?.runtimeError?.code ?? null;
    }
  } catch {
    // A malformed or incomplete Lighthouse result has no safe code to report.
  }

  return runtimeErrorCodeDiagnosticPhase(runtimeErrorCode);
}

function homeSampleOutcome(status) {
  const completed = status === "completed";
  return { completed, exitCode: completed ? 0 : 4 };
}

function finishDiagnosticRun(parser, emitPhase, exitCode, runtimeErrorPhase = null) {
  for (const event of parser.flushStderr()) emitPhase(event);
  if (runtimeErrorPhase !== null) emitPhase(runtimeErrorPhase);
  emitPhase(exitCode === 0 ? "lighthouse-cli-exit-zero" : "lighthouse-cli-exit-nonzero");
}

function shouldTolerateWindowsChromeCleanupExit({
  exitCode,
  platform,
  hasLhr,
  parser,
  emitPhase,
  phases,
}) {
  for (const phase of parser.flushStderr()) emitPhase(phase);
  return (
    exitCode === 1 &&
    platform === "win32" &&
    hasLhr &&
    phases.includes("results-started") &&
    phases.includes("chrome-kill-failed")
  );
}

function routeNameFromLine(line) {
  const match = line.match(/^Running Lighthouse 3 time\(s\) on (https?:\/\/[^\s]+)$/);
  if (!match) return null;

  try {
    const url = new URL(match[1]);
    if (
      url.protocol !== "http:" ||
      (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
      !/^\d+$/.test(url.port) ||
      url.hash !== "" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return null;
    }
    return ROUTES.get(`${url.pathname}${url.search}`) ?? null;
  } catch {
    return null;
  }
}

class LighthouseDiagnosticParser {
  constructor() {
    this.stdoutPending = "";
    this.stderrPending = "";
    this.currentRoute = null;
    this.currentRun = null;
  }

  pushStdout(chunk) {
    this.stdoutPending = `${this.stdoutPending}${boundedChunkText(chunk)}`.slice(
      -MAX_PENDING_CHARS,
    );
    const events = [];
    const lines = this.stdoutPending.split(/\r?\n/);
    this.stdoutPending = lines.pop() ?? "";

    for (const rawLine of lines) this.acceptCollectionLine(rawLine, events);

    const partialLine = this.stdoutPending;
    const route = routeNameFromLine(partialLine);
    if (partialLine.startsWith("Running Lighthouse ")) {
      const routeChanged = route !== this.currentRoute;
      this.currentRoute = route;
      this.currentRun = null;
      if (route !== null && routeChanged) events.push({ kind: "route", route, state: "started" });
    }
    const runStart = partialLine.match(/^Run #([1-3])\.\.\./);
    if (runStart && this.currentRoute !== null) {
      this.currentRun = Number(runStart[1]);
      events.push({
        kind: "run",
        route: this.currentRoute,
        run: this.currentRun,
        state: "started",
      });
    }
    if (/^Run #[1-3]\.\.\.done\.$/.test(partialLine) && this.currentRoute !== null) {
      const run = Number(partialLine.match(/^Run #([1-3])/)[1]);
      this.currentRun = run;
      events.push({ kind: "run", route: this.currentRoute, run, state: "completed" });
    }

    return events;
  }

  acceptCollectionLine(rawLine, events) {
    const line = rawLine.trim();
    const route = routeNameFromLine(line);
    if (line.startsWith("Running Lighthouse ")) {
      const routeChanged = route !== this.currentRoute;
      this.currentRoute = route;
      this.currentRun = null;
      if (route !== null && routeChanged) events.push({ kind: "route", route, state: "started" });
      return;
    }

    const runMatch = line.match(/^Run #([1-3])\.\.\.(done\.|failed!)?$/);
    if (!runMatch || this.currentRoute === null) return;
    const run = Number(runMatch[1]);
    this.currentRun = run;
    const state =
      runMatch[2] === "done." ? "completed" : runMatch[2] === "failed!" ? "failed" : "started";
    events.push({ kind: "run", route: this.currentRoute, run, state });
  }

  pushStderr(chunk) {
    const split = splitBoundedLines(this.stderrPending, chunk);
    this.stderrPending = split.pending;
    return split.lines.flatMap((line) => this.classifyDiagnosticLine(line));
  }

  flushStderr() {
    const pending = this.stderrPending;
    this.stderrPending = "";
    return pending === "" ? [] : this.classifyDiagnosticLine(pending);
  }

  classifyDiagnosticLine(rawLine) {
    const line = rawLine.replace(ANSI_ESCAPE, "");
    const events = [];
    const phaseMatch = line.match(/^HA_LIGHTHOUSE_DIAGNOSTIC phase=([a-z-]+)$/);
    if (phaseMatch && SAFE_CHILD_DIAGNOSTIC_PHASES.has(phaseMatch[1])) {
      events.push(phaseMatch[1]);
      return events;
    }
    if (line.startsWith("HA_LIGHTHOUSE_DIAGNOSTIC runtime-error ")) {
      events.push(parseRuntimeErrorDiagnosticMarker(line));
      return events;
    }
    if (line.startsWith("HA_LIGHTHOUSE_DIAGNOSTIC failure ")) {
      events.push(parseFailureDiagnosticMarker(line));
      return events;
    }
    const browserPrefix = "HA_LIGHTHOUSE_DIAGNOSTIC browser ";
    if (line.startsWith(browserPrefix)) {
      const match = line.match(
        /^HA_LIGHTHOUSE_DIAGNOSTIC browser product=(chrome|chromium|headless-chrome|unavailable-or-other) version=(\d{1,3}\.\d{1,3}\.\d{1,6}\.\d{1,6}|unavailable-or-other)$/,
      );
      events.push(
        match
          ? { type: "browser-version", product: match[1], version: match[2] }
          : browserVersionDiagnosticEvent(null),
      );
      return events;
    }
    const cdpPrefix = "HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure ";
    if (line.startsWith(cdpPrefix)) {
      const match = line.match(
        /^HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=([^\s]{1,128}) class=([a-z-]{1,32})$/,
      );
      events.push({
        type: "cdp-failure",
        method: match && SAFE_CDP_METHODS.has(match[1]) ? match[1] : DIAGNOSTIC_UNAVAILABLE,
        failureClass:
          match && CDP_FAILURE_CLASSES.has(match[2]) ? match[2] : DIAGNOSTIC_UNAVAILABLE,
      });
      return events;
    }
    const gatherMatch = line.match(
      /(?:^|\s)LH:artifacts:([A-Za-z]+):verbose\s+([A-Za-z]+)(?:\s+\+\d+(?:\.\d+)?(?:ms|s|m|h|d))?\s*$/,
    );
    if (gatherMatch) {
      const phase = GATHER_PHASES.get(gatherMatch[1]);
      const gatherer = GATHERER_IDS.get(gatherMatch[2]);
      if (phase && gatherer) events.push(["gather-", phase, "-", gatherer].join(""));
    }
    if (/Debugger protocol timed out while connecting to Chrome\.?/.test(line)) {
      events.push("devtools-connect-failed");
    } else if (/Unable to connect to Chrome\b/.test(line)) {
      events.push("devtools-connect-failed");
    } else if (/Runtime error encountered:/.test(line)) {
      events.push("lighthouse-runtime-error");
    }
    const chromeIndex = line.indexOf("LH:ChromeLauncher");
    if (chromeIndex !== -1) {
      const message = line
        .slice(chromeIndex + "LH:ChromeLauncher".length)
        .replace(/^:(?:error|warn|verbose)\s+/, " ")
        .trim();
      if (/\bFailed to start\b/i.test(message)) {
        events.push("chrome-start-failed");
      } else if (/\bFailed to set browser prefs\b/i.test(message)) {
        events.push("chrome-profile-warning");
      } else if (/Chrome could not be killed/i.test(message)) {
        events.push("chrome-kill-failed");
      } else if (/Waiting for browser/.test(message) && /✓/.test(message)) {
        events.push("chrome-ready");
      } else if (/Waiting for browser/.test(message)) {
        events.push("chrome-starting");
      }
    }

    const statusMatch = line.match(
      /\bLH:(statusEnd(?::verbose)?|status)\s+(.+?)(?:\s+\+\d+ms)?\s*$/,
    );
    if (!statusMatch) return events;
    const [, statusType, message] = statusMatch;
    const state = statusType.startsWith("statusEnd") ? "completed" : "started";
    const knownStatuses = [
      [/^Connecting to browser$/, "devtools-connect"],
      [/^Navigating to /, "navigation"],
      [/^Preparing target for navigation mode$/, "navigation-setup"],
      [/^Preparing network conditions$/, "network-setup"],
      [/^Analyzing and running audits\.\.\.$/, "audit"],
      [/^Generating results\.\.\.$/, "results"],
    ];
    for (const [pattern, phase] of knownStatuses) {
      if (pattern.test(message)) {
        events.push(`${phase}-${state}`);
        break;
      }
    }
    return events;
  }
}

function formatProgressEvent(event) {
  if (event.kind === "route") return `route=${event.route} state=${event.state}`;
  if (event.kind === "run") {
    return `route=${event.route} run=${event.run} state=${event.state}`;
  }
  return null;
}

module.exports = {
  BROWSER_PRODUCTS,
  CDP_FAILURE_CLASSES,
  CHILD_SPAWN_FAILURE_CLASSES,
  DIAGNOSTIC_UNAVAILABLE,
  MAX_CHILD_CDP_FAILURE_MARKERS,
  MAX_FAILURE_DIAGNOSTIC_MARKERS,
  SAFE_CDP_METHODS,
  SAFE_DIAGNOSTIC_STAGE_PHASES,
  browserVersionDiagnosticEvent,
  cdpFailureDiagnosticEvent,
  childSpawnFailureDiagnosticEvent,
  createBoundedDiagnosticEventEmitter,
  createCdpFailureDiagnosticWriter,
  dispatchDiagnosticEvents,
  createBoundedDiagnosticPhaseEmitter,
  formatDiagnosticTelemetryMarker,
  formatFailureDiagnosticMarker,
  failureDiagnosticEvent,
  firstRelevantInstalledModuleFrame,
  finishDiagnosticRun,
  LighthouseDiagnosticParser,
  LIGHTHOUSE_RUNTIME_ERROR_CODES,
  LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  LIGHTHOUSE_RUNTIME_ERROR_NAME_CLASSES,
  MAX_CHILD_DIAGNOSTIC_PHASES,
  parseDiagnosticMarkerChunk,
  parseFailureDiagnosticMarker,
  normalizeFailureDiagnosticEvent,
  SAFE_GATHER_DIAGNOSTIC_PHASES,
  formatProgressEvent,
  homeSampleOutcome,
  runtimeErrorDiagnosticPhase,
  runtimeErrorDiagnosticEvent,
  runtimeErrorCodeDiagnosticPhase,
  formatRuntimeErrorDiagnosticMarker,
  resolveDiagnosticModuleRoots,
  runCleanupPreservingPrimary,
  runDiagnosticStage,
  shouldTolerateWindowsChromeCleanupExit,
  spawnPinnedNode,
  splitBoundedLines,
  writeBrowserVersionDiagnostic,
};
