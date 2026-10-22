import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import net from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import vm from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const diagnostics = require("../scripts/lighthouse-diagnostic-lib.cjs");
const lighthouseRoot = path.resolve("node_modules/lighthouse");
const lighthouseRequire = createRequire(
  path.join(lighthouseRoot, "core/gather/navigation-runner.js"),
);
const diagnosticRoots = diagnostics.resolveDiagnosticModuleRoots(
  pathToFileURL(path.join(lighthouseRoot, "core/gather/navigation-runner.js")),
);

const originalProcessKill = process.kill;

afterEach(() => {
  process.kill = originalProcessKill;
  vi.restoreAllMocks();
});

function readFailureMarker(markers) {
  const result = diagnostics.parseDiagnosticMarkerChunk("", markers.join(""), new Set());
  expect(result.failures).toHaveLength(1);
  return result.failures[0];
}

const SAFE_CHILD_PROCESS_SIGNALS = new Set([
  "SIGABRT",
  "SIGALRM",
  "SIGBUS",
  "SIGFPE",
  "SIGHUP",
  "SIGILL",
  "SIGINT",
  "SIGKILL",
  "SIGPIPE",
  "SIGQUIT",
  "SIGSEGV",
  "SIGTERM",
  "SIGTRAP",
  "SIGUSR1",
  "SIGUSR2",
]);

function formatSafeChildFailure(error) {
  const code = error?.code;
  const status =
    Number.isSafeInteger(code) && code >= 0 && code <= 255
      ? `exit-${code}`
      : code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
        ? "max-buffer"
        : code === "ENOENT"
          ? "spawn-not-found"
          : code === "EACCES"
            ? "spawn-denied"
            : "other";
  const signal = SAFE_CHILD_PROCESS_SIGNALS.has(error?.signal)
    ? error.signal.toLowerCase()
    : "none";
  const stderr = Buffer.isBuffer(error?.stderr)
    ? error.stderr.toString("utf8", Math.max(0, error.stderr.length - 16_384))
    : typeof error?.stderr === "string"
      ? error.stderr.slice(-16_384)
      : "";
  const parser = new diagnostics.LighthouseDiagnosticParser();
  const events = [...parser.pushStderr(stderr), ...parser.flushStderr()];
  const phases = events
    .filter(
      (event) => typeof event === "string" && diagnostics.SAFE_DIAGNOSTIC_STAGE_PHASES.has(event),
    )
    .slice(0, 8);
  const failures = events
    .filter((event) => event?.type === "failure")
    .slice(0, 2)
    .map((event) => `${event.stage}/${event.origin}/${event.nameClass}/${event.causeCode}`);
  return `status=${status} signal=${signal} killed=${error?.killed === true} phases=${phases.join(",") || "none"} failures=${failures.join(",") || "none"}`;
}

describe("Lighthouse failure diagnostics", () => {
  it("identifies a real Lighthouse configuration throw before browser attachment", async () => {
    const { initializeConfig } = await import(
      pathToFileURL(path.join(lighthouseRoot, "core/config/config.js"))
    );
    const markers = [];
    const primaryError = await diagnostics
      .runDiagnosticStage(
        "config-init",
        () => initializeConfig("navigation", { audits: { malformed: true } }, {}),
        { moduleRoots: diagnosticRoots, writeMarker: (line) => markers.push(line) },
      )
      .then(
        () => null,
        (error) => error,
      );

    expect(primaryError).toBeInstanceOf(TypeError);
    const failure = readFailureMarker(markers);
    expect(failure).toMatchObject({
      type: "failure",
      stage: "config-init",
      origin: "primary",
      nameClass: "type-error",
      frame: { module: "lighthouse", file: "core/config/config-helpers.js" },
    });
    expect(failure.frame.line).toBeGreaterThan(0);
    expect(failure.frame.column).toBeGreaterThan(0);
    expect(path.isAbsolute(failure.frame.file)).toBe(false);
    expect(markers[0]).toContain("phase=config-init-started");
    expect(markers.at(-2)).toContain("phase=config-init-failed");
  });

  it("emits fixed lifecycle markers while preserving synchronous stage behavior", () => {
    const markers = [];
    const value = diagnostics.runDiagnosticStage("url-normalize", () => 17, {
      moduleRoots: diagnosticRoots,
      writeMarker: (line) => markers.push(line),
    });

    expect(value).toBe(17);
    expect(markers).toEqual([
      "HA_LIGHTHOUSE_DIAGNOSTIC phase=url-normalize-started\n",
      "HA_LIGHTHOUSE_DIAGNOSTIC phase=url-normalize-completed\n",
    ]);
    expect(
      diagnostics.parseDiagnosticMarkerChunk(
        "",
        markers.join(""),
        diagnostics.SAFE_DIAGNOSTIC_STAGE_PHASES,
      ).phases,
    ).toEqual(["url-normalize-started", "url-normalize-completed"]);
  });

  it("reports bounded async navigation stages and preserves failure classification", async () => {
    const stages = [
      "navigation-stop-instrumentation",
      "navigation-disable-async-stacks",
      "navigation-clear-throttling",
      "navigation-debug-data",
    ];
    const markers = [];

    for (const stage of stages) {
      await diagnostics.runDiagnosticStage(stage, async () => undefined, {
        moduleRoots: diagnosticRoots,
        writeMarker: (line) => markers.push(line),
      });
    }

    const parsed = diagnostics.parseDiagnosticMarkerChunk(
      "",
      markers.join(""),
      diagnostics.SAFE_DIAGNOSTIC_STAGE_PHASES,
    );
    expect(parsed.phases).toEqual(
      stages.flatMap((stage) => [`${stage}-started`, `${stage}-completed`]),
    );

    const failure = new TypeError("private diagnostic detail must not be emitted");
    await expect(
      diagnostics.runDiagnosticStage("navigation-clear-throttling", () => Promise.reject(failure), {
        moduleRoots: diagnosticRoots,
        writeMarker: (line) => markers.push(line),
      }),
    ).rejects.toBe(failure);
    expect(readFailureMarker(markers)).toMatchObject({
      stage: "navigation-clear-throttling",
      origin: "primary",
      nameClass: "type-error",
    });
    expect(markers.join("")).not.toContain("private diagnostic detail");
  });

  it("marks the actual patched navigation post-instrumentation awaits", async () => {
    const navigationRunnerPath = path.join(lighthouseRoot, "core/gather/navigation-runner.js");
    const previousDiagnostics = process.env.HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS;
    const markers = [];
    process.env.HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS = "1";
    vi.resetModules();

    try {
      const { _navigation } = await import(pathToFileURL(navigationRunnerPath).href);
      const session = new EventEmitter();
      let failNetworkCleanup = false;
      session.setNextProtocolTimeout = vi.fn();
      session.onCrashPromise = () => new Promise(() => {});
      session.sendCommand = vi.fn(async (method) => {
        if (method === "Page.navigate") {
          setImmediate(() => {
            session.emit("Page.domContentEventFired", {});
            session.emit("Page.loadEventFired", {});
          });
        }
        return {};
      });
      session.sendCommandAndIgnore = vi.fn(async (method) => {
        if (failNetworkCleanup && method === "Network.emulateNetworkConditions") {
          throw new TypeError("private cleanup detail");
        }
      });
      const networkMonitor = new EventEmitter();
      networkMonitor.is2Idle = () => true;
      networkMonitor.isCriticalIdle = () => true;
      networkMonitor.getInflightRequests = () => [];
      networkMonitor.getNavigationUrls = async () => ({
        requestedUrl: "http://127.0.0.1/",
        mainDocumentUrl: "http://127.0.0.1/",
      });
      const baseArtifacts = {
        URL: {
          requestedUrl: "http://127.0.0.1/",
          mainDocumentUrl: "http://127.0.0.1/",
          finalDisplayedUrl: "http://127.0.0.1/",
        },
        LighthouseRunWarnings: [],
      };
      const driver = {
        url: vi.fn(async () => "http://127.0.0.1/"),
        defaultSession: session,
        networkMonitor,
      };
      const resolvedConfig = {
        artifacts: [],
        settings: {
          networkQuietThresholdMs: 0,
          cpuQuietThresholdMs: 0,
          pauseAfterLoadMs: 0,
          pauseAfterFcpMs: 0,
          maxWaitForLoad: 500,
        },
      };

      const originalWrite = process.stderr.write;
      process.stderr.write = (chunk) => {
        markers.push(String(chunk));
        return true;
      };
      try {
        await _navigation({
          driver,
          page: {},
          resolvedConfig,
          requestor: "http://127.0.0.1/",
          baseArtifacts,
          computedCache: new Map(),
        });
      } finally {
        process.stderr.write = originalWrite;
      }

      const phaseEvents = diagnostics.parseDiagnosticMarkerChunk(
        "",
        markers.join(""),
        diagnostics.SAFE_DIAGNOSTIC_STAGE_PHASES,
      ).phases;
      expect(phaseEvents).toEqual([
        "navigation-stop-instrumentation-started",
        "navigation-stop-instrumentation-completed",
        "navigation-disable-async-stacks-started",
        "navigation-disable-async-stacks-completed",
        "navigation-clear-throttling-started",
        "navigation-clear-throttling-completed",
        "navigation-debug-data-started",
        "navigation-debug-data-completed",
      ]);

      failNetworkCleanup = true;
      const secondMarkers = [];
      process.stderr.write = (chunk) => {
        secondMarkers.push(String(chunk));
        return true;
      };
      try {
        await expect(
          _navigation({
            driver,
            page: {},
            resolvedConfig,
            requestor: "http://127.0.0.1/",
            baseArtifacts,
            computedCache: new Map(),
          }),
        ).rejects.toBeInstanceOf(TypeError);
      } finally {
        process.stderr.write = originalWrite;
      }
      expect(secondMarkers.join("")).toContain(
        "phase=navigation-clear-throttling-started\nHA_LIGHTHOUSE_DIAGNOSTIC phase=navigation-clear-throttling-failed\n",
      );
      expect(readFailureMarker(secondMarkers)).toMatchObject({
        stage: "navigation-clear-throttling",
        origin: "primary",
        nameClass: "type-error",
      });
      expect(secondMarkers.join("")).not.toContain("private cleanup detail");
    } finally {
      vi.resetModules();
      if (previousDiagnostics === undefined) {
        delete process.env.HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS;
      } else {
        process.env.HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS = previousDiagnostics;
      }
    }
  });

  it("formats child failures with bounded fields and omits raw process details", () => {
    const secret = "/private/runner/token.env?token=do-not-print";
    const error = Object.assign(new Error(`raw child error ${secret}`), {
      code: 13,
      signal: "SIGKILL",
      killed: true,
      stderr: [
        "HA_LIGHTHOUSE_DIAGNOSTIC phase=puppeteer-attach-started",
        "HA_LIGHTHOUSE_DIAGNOSTIC failure stage=puppeteer-attach origin=primary class=type-error cause-code=econnreset frame-module=none frame-file=none frame-line=0 frame-column=0",
        `Error: ${secret} command=/private/runner/node env=DO_NOT_PRINT`,
      ].join("\n"),
    });

    const summary = formatSafeChildFailure(error);
    expect(summary).toBe(
      "status=exit-13 signal=sigkill killed=true phases=puppeteer-attach-started failures=puppeteer-attach/primary/type-error/econnreset",
    );
    expect(summary).not.toContain(secret);
    expect(summary).not.toContain("command=");
    expect(summary).not.toContain("env=");
    expect(summary).not.toContain("/private/");
  });

  it("maps unsupported child error scalars to safe fallback values", () => {
    const error = Object.assign(new Error("not emitted"), {
      code: "ECONNRESET",
      signal: "SIGUNKNOWN",
      killed: "yes",
      stderr: "raw process output must not be emitted",
    });

    expect(formatSafeChildFailure(error)).toBe(
      "status=other signal=none killed=false phases=none failures=none",
    );
  });

  it("reports a bounded last-entered navigation stage in child timeout summaries", () => {
    const secret = "/private/runner/command.env?token=do-not-print";
    const error = Object.assign(new Error(secret), {
      code: "ETIMEDOUT",
      signal: "SIGTERM",
      killed: true,
      stderr: [
        "HA_LIGHTHOUSE_DIAGNOSTIC phase=navigation-clear-throttling-started",
        `raw timeout details ${secret}`,
      ].join("\n"),
    });

    const summary = formatSafeChildFailure(error);
    expect(summary).toBe(
      "status=other signal=sigterm killed=true phases=navigation-clear-throttling-started failures=none",
    );
    expect(summary).not.toContain(secret);
  });

  it("identifies a real Lighthouse URL-normalization failure", async () => {
    const { default: UrlUtils } = await import(
      pathToFileURL(path.join(lighthouseRoot, "core/lib/url-utils.js"))
    );
    const markers = [];
    let error = null;
    try {
      diagnostics.runDiagnosticStage("url-normalize", () => UrlUtils.normalizeUrl("http://["), {
        moduleRoots: diagnosticRoots,
        writeMarker: (line) => markers.push(line),
      });
    } catch (failure) {
      error = failure;
    }

    expect(error).toBeInstanceOf(Error);
    expect(readFailureMarker(markers)).toMatchObject({
      stage: "url-normalize",
      origin: "primary",
      frame: { module: "lighthouse", file: "core/lib/url-utils.js" },
    });
  });

  it("skips Node internal frames and identifies the first real Puppeteer attach frame", async () => {
    const puppeteer = lighthouseRequire("puppeteer-core");
    const markers = [];
    const error = await diagnostics
      .runDiagnosticStage(
        "puppeteer-attach",
        () => puppeteer.connect({ browserURL: "not-a-url" }),
        { moduleRoots: diagnosticRoots, writeMarker: (line) => markers.push(line) },
      )
      .then(
        () => null,
        (failure) => failure,
      );

    expect(error).toBeInstanceOf(TypeError);
    const failure = readFailureMarker(markers);
    expect(failure).toMatchObject({
      stage: "puppeteer-attach",
      origin: "primary",
      nameClass: "type-error",
      frame: { module: "puppeteer-core" },
    });
    expect(failure.frame.file).toMatch(/BrowserConnector\.js$/);
    expect(failure.frame.file).not.toMatch(/(^|\/)\.\.(\/|$)/);
  });

  it("classifies a browserURL discovery-fetch TypeError without inventing a module frame", async () => {
    const puppeteer = lighthouseRequire("puppeteer-core");
    const cause = new AggregateError(
      [
        Object.assign(new Error("unknown nested cause"), { code: "PRIVATE_BACKEND_FAILURE" }),
        Object.assign(new Error("synthetic local debugger refusal"), { code: "ECONNREFUSED" }),
      ],
      "synthetic fetch cause must not be emitted",
    );
    const fetchError = new TypeError("fetch failed", { cause });
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(fetchError);
    const markers = [];
    const error = await diagnostics
      .runDiagnosticStage(
        "puppeteer-attach",
        () => puppeteer.connect({ browserURL: "http://127.0.0.1:9", defaultViewport: null }),
        { moduleRoots: diagnosticRoots, writeMarker: (line) => markers.push(line) },
      )
      .then(
        () => null,
        (failure) => failure,
      );

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:9/json/version", { method: "GET" });
    expect(error).toBe(fetchError);
    expect(error.cause).toBeInstanceOf(AggregateError);
    const failure = readFailureMarker(markers);
    expect(failure).toMatchObject({
      stage: "puppeteer-attach",
      origin: "primary",
      nameClass: "type-error",
      causeCode: "econnrefused",
      frame: { module: "none", file: "none", line: 0, column: 0 },
    });
    const childEvents = new diagnostics.LighthouseDiagnosticParser().pushStderr(markers.join(""));
    expect(childEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "failure", causeCode: "econnrefused" }),
      ]),
    );
    expect(diagnostics.formatDiagnosticTelemetryMarker(failure)).toContain(
      "cause-code=econnrefused",
    );
    expect(markers.join("")).not.toContain("fetch failed");
    expect(markers.join("")).not.toContain("synthetic fetch cause");
    expect(markers.join("")).not.toContain("PRIVATE_BACKEND_FAILURE");
    expect(markers.join("")).not.toContain("ECONNREFUSED");
  });

  it("redacts unknown, hostile, and over-depth failure cause codes", async () => {
    const secret = "/Users/jer/private/token.env?secret=do-not-print";
    const unknown = Object.assign(new Error(secret), { code: secret });
    const nestedUnknown = Object.assign(new Error("unknown internal code"), {
      code: "ERR_PRIVATE_SERVICE_TOKEN",
    });
    const hostile = new Error("hostile code getter");
    Object.defineProperty(hostile, "code", {
      get() {
        throw new Error(secret);
      },
    });
    const depthLimited = new Error("depth limit root");
    let current = depthLimited;
    for (let depth = 0; depth < 5; depth += 1) {
      const next = new Error(`depth ${depth}`);
      current.cause = next;
      current = next;
    }
    current.code = "ECONNRESET";
    const cyclic = new Error("cycle root");
    cyclic.cause = cyclic;
    const cappedAggregate = new AggregateError([
      ...Array.from({ length: 4 }, (_, index) =>
        Object.assign(new Error(`unknown branch ${index}`), { code: `ERR_PRIVATE_${index}` }),
      ),
      Object.assign(new Error("beyond aggregate branch cap"), { code: "ECONNRESET" }),
    ]);

    for (const failure of [
      unknown,
      nestedUnknown,
      hostile,
      depthLimited,
      cyclic,
      cappedAggregate,
    ]) {
      const markers = [];
      await expect(
        diagnostics.runDiagnosticStage("puppeteer-attach", () => Promise.reject(failure), {
          moduleRoots: diagnosticRoots,
          writeMarker: (line) => markers.push(line),
        }),
      ).rejects.toBe(failure);

      expect(readFailureMarker(markers).causeCode).toBe("unavailable-or-other");
      expect(markers.join("")).not.toContain(secret);
      expect(markers.join("")).not.toContain("ERR_PRIVATE_SERVICE_TOKEN");
      expect(markers.join("")).not.toContain("ECONNRESET");
    }
  });

  it("reports a bounded cause code through the actual patched navigation runner", async () => {
    const server = net.createServer((socket) => socket.once("data", () => socket.destroy()));
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const port = server.address().port;
    const navigationRunnerUrl = pathToFileURL(
      path.join(lighthouseRoot, "core/gather/navigation-runner.js"),
    ).href;
    const source = `
      const { navigationGather } = await import(${JSON.stringify(navigationRunnerUrl)});
      try {
        await navigationGather(undefined, "http://127.0.0.1:${port}/", {
          flags: { hostname: "127.0.0.1", port: ${port}, logLevel: "error" },
        });
      } catch {}
    `;

    try {
      let stderr;
      try {
        ({ stderr } = await execFileAsync(process.execPath, ["--input-type=module", "-e", source], {
          cwd: path.resolve(".."),
          env: {
            ...process.env,
            HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: "1",
          },
          maxBuffer: 16_384,
        }));
      } catch (error) {
        throw new Error(`Patched navigation runner child failed: ${formatSafeChildFailure(error)}`);
      }

      const events = new diagnostics.LighthouseDiagnosticParser().pushStderr(stderr);
      const failure = events.find((event) => event?.type === "failure");

      expect(failure).toMatchObject({
        stage: "puppeteer-attach",
        origin: "primary",
        nameClass: "type-error",
      });
      expect(["econnreset", "und-err-socket"]).toContain(failure.causeCode);
      expect(stderr).not.toContain("fetch failed");
      expect(stderr).not.toContain("127.0.0.1:");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("identifies a real Puppeteer new-page failure without opening a browser", async () => {
    const puppeteerRoot = diagnosticRoots["puppeteer-core"];
    const { CdpBrowser } = require(path.join(puppeteerRoot, "lib/cjs/puppeteer/cdp/Browser.js"));
    const connection = {
      on() {},
      off() {},
      send() {
        return Promise.reject(new Error("synthetic CDP rejection must not be emitted"));
      },
    };
    const browser = new CdpBrowser(connection, [], null, null, null, null, null);
    const markers = [];
    const error = await diagnostics
      .runDiagnosticStage("puppeteer-new-page", () => browser.newPage(), {
        moduleRoots: diagnosticRoots,
        writeMarker: (line) => markers.push(line),
      })
      .then(
        () => null,
        (failure) => failure,
      );

    expect(error).toBeInstanceOf(Error);
    expect(readFailureMarker(markers)).toMatchObject({
      stage: "puppeteer-new-page",
      origin: "primary",
      frame: { module: "puppeteer-core" },
    });
  });

  it("keeps cleanup failure telemetry separate and preserves a primary error", async () => {
    const chromeLauncher = lighthouseRequire("chrome-launcher");
    const launcher = new chromeLauncher.Launcher({}, {});
    launcher.chromeProcess = { pid: 31337, on() {} };
    launcher.userDataDir = "\0";
    const killError = Object.assign(new Error("private process detail"), { code: "ESRCH" });
    process.kill = vi.fn(() => {
      throw killError;
    });
    const primaryError = new Error("primary message must not be emitted");
    const markers = [];

    const result = diagnostics.runCleanupPreservingPrimary({
      cleanup: () => launcher.kill(),
      primaryError,
      moduleRoots: diagnosticRoots,
      writeMarker: (line) => markers.push(line),
    });

    expect(result.error).toBe(primaryError);
    expect(result.cleanupError).toBeInstanceOf(TypeError);
    expect(process.kill).toHaveBeenCalledTimes(1);
    const failure = readFailureMarker(markers);
    expect(failure).toMatchObject({
      stage: "chrome-cleanup",
      origin: "cleanup",
      nameClass: "type-error",
      frame: { module: "chrome-launcher" },
    });
    expect(failure.frame.file).toMatch(/chrome-launcher\.js$/);
    expect(markers.join("")).not.toContain("private process detail");
    expect(markers.join("")).not.toContain("primary message must not be emitted");
    expect(markers.join("")).not.toContain("\0");
  });

  it("reduces invalid markers and hostile errors to bounded enums without paths or messages", async () => {
    const secret = "/Users/jer/private/secret.env?token=do-not-print";
    const hostileError = new TypeError(secret);
    const markers = [];

    await expect(
      diagnostics.runDiagnosticStage("not-a-stage", () => Promise.reject(hostileError), {
        moduleRoots: Object.create(null),
        writeMarker: (line) => markers.push(line),
      }),
    ).rejects.toBe(hostileError);

    const marker = markers.join("");
    expect(marker).not.toContain(secret);
    expect(marker).not.toContain("/Users/");
    expect(marker).not.toContain("token=");
    expect(readFailureMarker(markers)).toMatchObject({
      stage: "unavailable-or-other",
      origin: "primary",
      nameClass: "type-error",
      frame: { module: "none", file: "none", line: 0, column: 0 },
    });

    const malformed = diagnostics.parseFailureDiagnosticMarker(
      `HA_LIGHTHOUSE_DIAGNOSTIC failure stage=secret origin=cleanup class=type-error cause-code=${secret} frame-module=puppeteer-core frame-file=${secret} frame-line=1 frame-column=1`,
    );
    expect(malformed.frame).toEqual({ module: "none", file: "none", line: 0, column: 0 });
    expect(malformed.causeCode).toBe("unavailable-or-other");
    expect(JSON.stringify(malformed)).not.toContain("/Users/");

    const failureMarker = markers.find((line) =>
      line.startsWith("HA_LIGHTHOUSE_DIAGNOSTIC failure "),
    );
    const repeatedMarker = failureMarker.repeat(8);
    const bounded = diagnostics.parseDiagnosticMarkerChunk("", repeatedMarker, new Set());
    expect(bounded.failures).toHaveLength(diagnostics.MAX_FAILURE_DIAGNOSTIC_MARKERS);
  });

  it("does not retry Chrome cleanup and returns cleanup-only failures when no primary exists", async () => {
    const chromeLauncher = lighthouseRequire("chrome-launcher");
    const launcher = new chromeLauncher.Launcher({}, {});
    launcher.chromeProcess = { pid: 31338, on() {} };
    launcher.userDataDir = "\0";
    process.kill = vi.fn(() => {
      throw Object.assign(new Error("not emitted"), { code: "ESRCH" });
    });
    const markers = [];

    const result = diagnostics.runCleanupPreservingPrimary({
      cleanup: () => launcher.kill(),
      moduleRoots: diagnosticRoots,
      writeMarker: (line) => markers.push(line),
    });

    expect(result.error).toBe(result.cleanupError);
    expect(result.cleanupError).toBeInstanceOf(TypeError);
    expect(process.kill).toHaveBeenCalledTimes(1);
    expect(readFailureMarker(markers).origin).toBe("cleanup");
  });

  it("patches bounded navigation boundaries and routes CLI cleanup through preservation", async () => {
    const navigationRunner = await readFile(
      path.join(lighthouseRoot, "core/gather/navigation-runner.js"),
      "utf8",
    );
    const cliRun = await readFile(path.join(lighthouseRoot, "cli/run.js"), "utf8");
    const homeRunner = await readFile(
      path.resolve("scripts/run-lighthouse-home-diagnostic.mjs"),
      "utf8",
    );
    const ciRunner = await readFile(path.resolve("scripts/run-lighthouse.mjs"), "utf8");

    for (const stage of [
      "config-init",
      "url-normalize",
      "puppeteer-attach",
      "puppeteer-new-page",
    ]) {
      expect(navigationRunner).toContain(`runDiagnosticStage('${stage}'`);
    }
    for (const stage of [
      "navigation-stop-instrumentation",
      "navigation-disable-async-stacks",
      "navigation-clear-throttling",
      "navigation-debug-data",
    ]) {
      expect(navigationRunner).toContain(`runDiagnosticStage('${stage}'`);
      expect(diagnostics.SAFE_DIAGNOSTIC_STAGE_PHASES).toContain(`${stage}-started`);
      expect(diagnostics.SAFE_DIAGNOSTIC_STAGE_PHASES).toContain(`${stage}-completed`);
    }
    expect(navigationRunner.indexOf("runDiagnosticStage('puppeteer-new-page'")).toBeLessThan(
      navigationRunner.indexOf("new Driver(page)"),
    );
    expect(cliRun).toContain("runCleanupPreservingPrimary({");
    expect(cliRun).toContain("if (!DIAGNOSTICS_ENABLED) {");
    expect(cliRun).toContain("const cleanupError = cleanupLaunchedChrome();");
    expect(cliRun).toContain("return printErrorAndExit(cleanupLaunchedChrome(err));");
    expect(cliRun).toContain("launchedChrome = undefined;");
    expect(homeRunner).toContain("failureStage=${safe.stage}");
    expect(homeRunner).toContain("failureCauseCode=${safe.causeCode}");
    expect(homeRunner).toContain(
      'const EXPECTED_BUILD_IDENTITY_SHA256 =\n  "af9f0df453041ab9f57c58ddf58c9bfd9b349608d6060afa91032a00ede0fb48";',
    );
    expect(homeRunner).toContain("const EXPECTED_BUILD_FILES = 2_028;");
    expect(homeRunner).toContain("const EXPECTED_BUILD_BYTES = 54_854_885;");
    expect(homeRunner.indexOf('throw new Error("saved-build-identity-mismatch")')).toBeLessThan(
      homeRunner.indexOf("const runtimeRoot = await copyReadOnlyBuildToScratch"),
    );
    expect(homeRunner).toContain(
      "seenFailureMarkers.size >= diagnosticLib.MAX_FAILURE_DIAGNOSTIC_MARKERS",
    );
    expect(homeRunner).not.toMatch(/event\.(message|stack|friendlyMessage)/);
    expect(ciRunner).toContain("...diagnosticLib.SAFE_DIAGNOSTIC_STAGE_PHASES");
    expect(ciRunner).toContain("failureStage=${safe.stage}");
    expect(ciRunner).toContain("failureCauseCode=${safe.causeCode}");
    expect(ciRunner).toContain(
      "reportedFailureMarkers.size >= diagnosticLib.MAX_FAILURE_DIAGNOSTIC_MARKERS",
    );
    expect(ciRunner).not.toMatch(/event\.(message|stack|friendlyMessage)/);
  });

  it("preserves pre-diagnostic Lighthouse cleanup behavior when diagnostics are disabled", async () => {
    const cliRun = await readFile(path.join(lighthouseRoot, "cli/run.js"), "utf8");
    const start = cliRun.indexOf("async function runLighthouse(");
    const end = cliRun.indexOf("\nexport {", start);
    const functionSource = cliRun.slice(start, end);
    const killError = new Error("baseline cleanup throw");
    const kill = vi
      .fn()
      .mockImplementationOnce(() => {
        throw killError;
      })
      .mockImplementationOnce(() => {});
    const printedErrors = [];
    const fixtureProcess = {
      stderr: { write() {} },
      on() {},
      removeListener() {},
      exit() {},
    };
    const context = {
      DIAGNOSTICS_ENABLED: false,
      DiagnosticTools: null,
      diagnosticModuleRoots: null,
      process: fixtureProcess,
      getDebuggableChrome: async () => ({ port: 9222, kill }),
      lighthouse: async () => null,
      saveResults: async () => {},
      printErrorAndExit(error) {
        printedErrors.push(error);
        return "baseline-printed";
      },
      log: { warn() {} },
      UrlUtils: { isLikeLocalhost: () => true },
    };
    vm.runInNewContext(`${functionSource}\nthis.runLighthouse = runLighthouse;`, context);

    const result = await context.runLighthouse(
      null,
      { gatherMode: true, auditMode: false, hostname: "localhost" },
      null,
    );

    expect(result).toBe("baseline-printed");
    expect(kill).toHaveBeenCalledTimes(2);
    expect(printedErrors).toEqual([killError]);
  });

  it("preserves disabled-mode unhandled cleanup throws before process exit", async () => {
    const cliRun = await readFile(path.join(lighthouseRoot, "cli/run.js"), "utf8");
    const start = cliRun.indexOf("async function runLighthouse(");
    const end = cliRun.indexOf("\nexport {", start);
    const functionSource = cliRun.slice(start, end);
    const cleanupError = new Error("baseline unhandled cleanup throw");
    const kill = vi.fn(() => {
      throw cleanupError;
    });
    let unhandledHandler = null;
    const fixtureProcess = {
      stderr: { write() {} },
      on(event, handler) {
        if (event === "unhandledRejection") unhandledHandler = handler;
      },
      removeListener() {},
      exit: vi.fn(),
    };
    const context = {
      DIAGNOSTICS_ENABLED: false,
      DiagnosticTools: null,
      diagnosticModuleRoots: null,
      process: fixtureProcess,
      getDebuggableChrome: async () => ({ port: 9222, kill }),
      lighthouse: () => new Promise(() => {}),
      saveResults: async () => {},
      printErrorAndExit: vi.fn(),
      log: { warn() {} },
      UrlUtils: { isLikeLocalhost: () => true },
    };
    vm.runInNewContext(`${functionSource}\nthis.runLighthouse = runLighthouse;`, context);

    void context.runLighthouse(
      null,
      { gatherMode: true, auditMode: false, hostname: "localhost" },
      null,
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(unhandledHandler).toBeTypeOf("function");
    let receivedError = null;
    try {
      unhandledHandler(cleanupError);
    } catch (error) {
      receivedError = error;
    }
    expect(receivedError).toBe(cleanupError);
    expect(kill).toHaveBeenCalledTimes(1);
    expect(fixtureProcess.exit).not.toHaveBeenCalled();
  });
});
