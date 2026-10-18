"use strict";

const ROUTES = new Map([
  ["/", "home"],
  ["/archive?q=health", "archive"],
  ["/snapshot/phac-2025-02-15-covid-epi", "snapshot"],
]);

const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const MAX_PENDING_CHARS = 8_192;

function boundedChunkText(chunk) {
  if (Buffer.isBuffer(chunk)) {
    return chunk.toString("utf8", Math.max(0, chunk.length - MAX_PENDING_CHARS));
  }
  return String(chunk).slice(-MAX_PENDING_CHARS);
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
    this.stderrPending = `${this.stderrPending}${boundedChunkText(chunk)}`.slice(
      -MAX_PENDING_CHARS,
    );
    const lines = this.stderrPending.split(/\r?\n/);
    this.stderrPending = lines.pop() ?? "";
    return lines.flatMap((line) => this.classifyDiagnosticLine(line));
  }

  flushStderr() {
    const pending = this.stderrPending;
    this.stderrPending = "";
    return pending === "" ? [] : this.classifyDiagnosticLine(pending);
  }

  classifyDiagnosticLine(rawLine) {
    const line = rawLine.replace(ANSI_ESCAPE, "");
    const events = [];
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

module.exports = { LighthouseDiagnosticParser, formatProgressEvent };
