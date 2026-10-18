import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  LOOPBACK_HOST,
  findAvailablePort,
  startFailFastApiStub,
  stopHttpServer,
  stopChildProcess,
} from "../scripts/local-production-server-lib.mjs";
import {
  isWslEnvironment,
  readBuildMetadata,
  requireExplicitWslChrome,
  resolveBuildApiBaseUrl,
  writeBuildMetadata,
} from "../scripts/build-metadata-lib.mjs";

const require = createRequire(import.meta.url);
const {
  AUDIT_PATHS,
  createLighthouseConfig,
  requireLoopbackOrigin,
} = require("../scripts/lighthouse-config.cjs");
const {
  LighthouseDiagnosticParser,
  formatProgressEvent,
} = require("../scripts/lighthouse-diagnostic-lib.cjs");

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

  it("keeps diagnostics gated, bounded, and separate from the Lighthouse JSON result", async () => {
    const runner = await readFile(path.resolve("scripts/run-lighthouse.mjs"), "utf8");
    const patch = await readFile(path.resolve("patches/@lhci+cli+0.15.1.patch"), "utf8");
    const cli = await readFile(
      path.resolve("node_modules/@lhci/cli/src/collect/node-runner.js"),
      "utf8",
    );

    expect(runner).toContain("const COMMAND_TIMEOUT_MS = 5 * 60_000;");
    expect(runner).toContain("stopChildProcess(child).then(");
    expect(runner).toContain("diagnostic details suppressed.");
    expect(runner).toContain("attempt=${currentAttempt}");
    expect(runner).toContain('"lighthouse-cli-exit-nonzero"');
    expect(runner).toContain('HEALTHARCHIVE_LIGHTHOUSE_DIAGNOSTICS: "1"');
    expect(runner).toContain('stdio: ["ignore", "pipe", "pipe"]');
    expect(runner).toContain(
      'console.log("Running three Lighthouse samples for each configured route.");',
    );
    expect(runner).not.toContain("Running three Lighthouse samples for each route at");
    expect(patch).toContain("DIAGNOSTICS_ENABLED");
    expect(cli).toContain("if (DIAGNOSTICS_ENABLED) lhArgs.push('--verbose');");
    expect(cli).toContain("HA_LIGHTHOUSE_DIAGNOSTIC phase=lighthouse-cli-started");
    expect(cli).toContain("lighthouse-cli-exit-nonzero");
    expect(cli).toContain("error.stdout = DIAGNOSTICS_ENABLED ? '' : stdout;");
    expect(cli).toContain("raw Lighthouse output suppressed by the bounded diagnostic mode");
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
