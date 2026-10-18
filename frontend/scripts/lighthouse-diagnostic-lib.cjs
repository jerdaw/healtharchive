"use strict";

const ROUTES = new Map([
  ["/", "home"],
  ["/archive?q=health", "archive"],
  ["/snapshot/phac-2025-02-15-covid-epi", "snapshot"],
]);

const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const MAX_PENDING_CHARS = 8_192;
const MAX_CHILD_CDP_FAILURE_MARKERS = 16;
const DIAGNOSTIC_UNAVAILABLE = "unavailable-or-other";
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
]);
const LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE = "unavailable-or-other";
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
  const events = [];
  for (const line of split.lines) {
    const match = line.match(/^HA_LIGHTHOUSE_DIAGNOSTIC phase=([a-z-]+)$/);
    if (match && allowlist.has(match[1])) {
      phases.push(match[1]);
      events.push(match[1]);
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
    }
  }
  return { phases, browserVersions, cdpFailures, events, pending: split.pending };
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

function runtimeErrorDiagnosticPhase(stdout) {
  let runtimeErrorCode = null;
  try {
    if (typeof stdout === "string") {
      runtimeErrorCode = JSON.parse(stdout)?.runtimeError?.code ?? null;
    }
  } catch {
    // A malformed or incomplete Lighthouse result has no safe code to report.
  }

  const code =
    typeof runtimeErrorCode === "string"
      ? (LIGHTHOUSE_RUNTIME_ERROR_CODES.get(runtimeErrorCode) ??
        LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE)
      : LIGHTHOUSE_RUNTIME_ERROR_UNAVAILABLE;
  return `lighthouse-runtime-error-code-${code}`;
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
  DIAGNOSTIC_UNAVAILABLE,
  MAX_CHILD_CDP_FAILURE_MARKERS,
  SAFE_CDP_METHODS,
  browserVersionDiagnosticEvent,
  cdpFailureDiagnosticEvent,
  createBoundedDiagnosticEventEmitter,
  createCdpFailureDiagnosticWriter,
  dispatchDiagnosticEvents,
  createBoundedDiagnosticPhaseEmitter,
  formatDiagnosticTelemetryMarker,
  finishDiagnosticRun,
  LighthouseDiagnosticParser,
  LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  MAX_CHILD_DIAGNOSTIC_PHASES,
  parseDiagnosticMarkerChunk,
  SAFE_GATHER_DIAGNOSTIC_PHASES,
  formatProgressEvent,
  runtimeErrorDiagnosticPhase,
  shouldTolerateWindowsChromeCleanupExit,
  splitBoundedLines,
  writeBrowserVersionDiagnostic,
};
