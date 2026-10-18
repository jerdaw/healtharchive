"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS CLI helper.
const fs = require("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Existing diagnostics contract is CommonJS.
const diagnosticLib = require("./lighthouse-diagnostic-lib.cjs");
const {
  BROWSER_PRODUCTS,
  CDP_FAILURE_CLASSES,
  LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  SAFE_CDP_METHODS,
  SAFE_GATHER_DIAGNOSTIC_PHASES,
} = diagnosticLib;

const MAX_LOG_BYTES = 1_048_576;
const MAX_BROWSER_MARKERS = 27;
const MAX_SUMMARY_EVENTS = 64;
const VERSION_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,6}\.\d{1,6}$/;
const ROUTES = new Set(["home", "archive", "snapshot", "unknown"]);
const CLI_PHASES = new Set([
  "lighthouse-cli-started",
  "lighthouse-cli-exit-zero",
  "lighthouse-cli-exit-nonzero",
  "lighthouse-runtime-error",
  "lighthouse-diagnostic-truncated",
]);
// Keep this literal set aligned with the non-spread entries in run-lighthouse.mjs.
const SAFE_OPERATIONAL_PHASES = new Set([
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
]);

const SAFE_PHASES = new Set([
  ...SAFE_OPERATIONAL_PHASES,
  ...SAFE_GATHER_DIAGNOSTIC_PHASES,
  ...LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES,
  ...CLI_PHASES,
]);

function parseContext(fields) {
  const [route, run, attempt, elapsedText] = fields;
  const elapsed = Number(elapsedText);
  if (
    !ROUTES.has(route) ||
    !/^(?:[1-3]|unknown)$/.test(run) ||
    !/^[0-3]$/.test(attempt) ||
    !Number.isInteger(elapsed) ||
    elapsed < 0 ||
    elapsed > 300
  ) {
    return null;
  }
  return {route, run, attempt, elapsed};
}

function summarizeLog(text, expectedVersion) {
  if (!VERSION_PATTERN.test(expectedVersion)) {
    throw new Error("expected browser version invalid");
  }

  const browserProducts = new Set([...BROWSER_PRODUCTS.values()].filter((product) =>
    product === "chrome" || product === "headless-chrome",
  ));
  const browserVersions = [];
  const phaseBySample = new Map();
  const cdpEvents = new Map();
  let malformedBrowserMarker = false;

  for (const line of text.split(/\r?\n/)) {
    let match = line.match(
      /^Lighthouse diagnostic: browser=([a-z-]{1,32}) version=([\w.-]{1,64}) route=([a-z-]{1,16}) run=([\w-]{1,16}) attempt=(\d) attribution=best-effort elapsedSec=(\d{1,3})$/,
    );
    if (match) {
      const [, product, version, ...fields] = match;
      const context = parseContext(fields);
      if (context && VERSION_PATTERN.test(version)) {
        browserVersions.push({product, version, ...context});
      } else {
        malformedBrowserMarker = true;
      }
      continue;
    }
    if (line.startsWith("Lighthouse diagnostic: browser=")) {
      malformedBrowserMarker = true;
      continue;
    }

    match = line.match(
      /^Lighthouse diagnostic: phase=([a-z0-9-]{1,96}) route=([a-z-]{1,16}) run=([\w-]{1,16}) attempt=(\d) elapsedSec=(\d{1,3})$/,
    );
    if (match) {
      const [, phase, ...fields] = match;
      const context = parseContext(fields);
      if (context && SAFE_PHASES.has(phase)) {
        phaseBySample.set(`${context.route}:${context.run}:${context.attempt}`, {phase, ...context});
      }
      continue;
    }

    match = line.match(
      /^Lighthouse diagnostic: cdpFailure=([A-Za-z][A-Za-z0-9.]{0,127}) class=([a-z-]{1,32}) route=([a-z-]{1,16}) run=([\w-]{1,16}) attempt=(\d) attribution=best-effort elapsedSec=(\d{1,3})$/,
    );
    if (match) {
      const [, method, failureClass, ...fields] = match;
      const context = parseContext(fields);
      if (context && SAFE_CDP_METHODS.has(method) && CDP_FAILURE_CLASSES.has(failureClass)) {
        const key = `${method}:${failureClass}`;
        if (!cdpEvents.has(key)) cdpEvents.set(key, {method, failureClass, ...context});
      }
    }
  }

  const markerVersionCheck =
    browserVersions.length > 0 &&
    browserVersions.length <= MAX_BROWSER_MARKERS &&
    !malformedBrowserMarker &&
    browserVersions.every(
      (event) => browserProducts.has(event.product) && event.version === expectedVersion,
    );
  const events = [
    ...browserVersions
      .filter((event) => browserProducts.has(event.product))
      .map((event) =>
      `browser=${event.product} version=${event.version} route=${event.route} run=${event.run} attempt=${event.attempt} elapsedSec=${event.elapsed}`,
      ),
    ...[...phaseBySample.values()].map((event) =>
      `phase=${event.phase} route=${event.route} run=${event.run} attempt=${event.attempt} elapsedSec=${event.elapsed}`,
    ),
    ...[...cdpEvents.values()].map((event) =>
      `cdpFailure=${event.method} class=${event.failureClass} route=${event.route} run=${event.run} attempt=${event.attempt} elapsedSec=${event.elapsed}`,
    ),
  ];

  return {
    browserMarkerCount: browserVersions.length,
    browserMarkerVersionCheck: markerVersionCheck ? "passed" : "failed",
    safeEvents: events.slice(0, MAX_SUMMARY_EVENTS),
    summaryTruncated: events.length > MAX_SUMMARY_EVENTS,
  };
}

function main() {
  const [logPath, expectedVersion] = process.argv.slice(2);
  if (!logPath || !expectedVersion) {
    process.stdout.write("comparisonSummary=invalid-input\n");
    return 2;
  }

  try {
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0);
    const fd = fs.openSync(logPath, flags);
    let logText;
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_LOG_BYTES) {
        process.stdout.write("comparisonSummary=log-unavailable-or-over-limit\n");
        return 1;
      }
      const chunks = [];
      let total = 0;
      while (true) {
        const chunk = Buffer.alloc(Math.min(64 * 1024, MAX_LOG_BYTES + 1 - total));
        const count = fs.readSync(fd, chunk, 0, chunk.length, null);
        if (count === 0) break;
        total += count;
        if (total > MAX_LOG_BYTES) {
          process.stdout.write("comparisonSummary=log-unavailable-or-over-limit\n");
          return 1;
        }
        chunks.push(chunk.subarray(0, count));
      }
      logText = Buffer.concat(chunks).toString("utf8");
    } finally {
      fs.closeSync(fd);
    }

    const summary = summarizeLog(logText, expectedVersion);
    process.stdout.write(
      `browserMarkerCount=${summary.browserMarkerCount} ` +
        `browserMarkerVersionCheck=${summary.browserMarkerVersionCheck} ` +
        `summaryTruncated=${String(summary.summaryTruncated)}\n`,
    );
    for (const event of summary.safeEvents) {
      process.stdout.write(`safeDiagnostic=${event}\n`);
    }
    return summary.browserMarkerVersionCheck === "passed" ? 0 : 1;
  } catch {
    process.stdout.write("comparisonSummary=invalid-or-unavailable\n");
    return 1;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = {
  MAX_LOG_BYTES,
  SAFE_OPERATIONAL_PHASES,
  SAFE_PHASES,
  summarizeLog,
};
