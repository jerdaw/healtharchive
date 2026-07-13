import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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
