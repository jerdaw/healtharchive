import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { fileURLToPath } from "node:url";

export const LOOPBACK_HOST = "127.0.0.1";

const DEFAULT_STARTUP_TIMEOUT_MS = 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const SERVER_LOG_LIMIT = 20_000;

export async function findAvailablePort(host = LOOPBACK_HOST) {
  const socket = net.createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, host, resolve);
  });
  const address = socket.address();
  const port = typeof address === "object" && address !== null ? address.port : null;
  await new Promise((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve())),
  );
  if (port === null) {
    throw new Error("Could not allocate a loopback port");
  }
  return port;
}

export async function startFailFastApiStub({ port, host = LOOPBACK_HOST, purpose }) {
  const server = http.createServer((_request, response) => {
    response.writeHead(503, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ detail: `${purpose} backend stub` }));
  });

  await new Promise((resolve, reject) => {
    const handleError = (error) => reject(error);
    server.once("error", handleError);
    server.listen(port, host, () => {
      server.removeListener("error", handleError);
      resolve();
    });
  });
  return server;
}

export async function prepareStandaloneAssets() {
  const standaloneStatic = fileURLToPath(
    new URL("../.next/standalone/.next/static/", import.meta.url),
  );
  const standalonePublic = fileURLToPath(new URL("../.next/standalone/public/", import.meta.url));

  await rm(standaloneStatic, { recursive: true, force: true });
  await rm(standalonePublic, { recursive: true, force: true });
  await mkdir(fileURLToPath(new URL("../.next/standalone/.next/", import.meta.url)), {
    recursive: true,
  });
  await cp(fileURLToPath(new URL("../.next/static/", import.meta.url)), standaloneStatic, {
    recursive: true,
  });
  await cp(fileURLToPath(new URL("../public/", import.meta.url)), standalonePublic, {
    recursive: true,
  });
}

function appendBounded(current, chunk) {
  return `${current}${chunk}`.slice(-SERVER_LOG_LIMIT);
}

export function startStandaloneFrontend({ port, host = LOOPBACK_HOST, env = process.env }) {
  const standaloneRoot = fileURLToPath(new URL("../.next/standalone/", import.meta.url));
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("../.next/standalone/server.js", import.meta.url))],
    {
      cwd: standaloneRoot,
      env: {
        ...env,
        HOSTNAME: host,
        NEXT_TELEMETRY_DISABLED: "1",
        NODE_ENV: "production",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs = appendBounded(logs, chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    logs = appendBounded(logs, chunk.toString());
  });

  return { child, getLogs: () => logs };
}

export async function waitForServer({
  origin,
  child,
  startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}) {
  const deadline = Date.now() + startupTimeoutMs;
  let lastError = "no response";

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited before readiness (code ${child.exitCode})`);
    }
    try {
      await fetch(origin, {
        redirect: "manual",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Next server did not become ready: ${lastError}`);
}

export async function stopChildProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  signalChild(child, "SIGTERM");
  await waitForChildExit(child, 5_000);
  if (child.exitCode === null && child.signalCode === null) {
    signalChild(child, "SIGKILL");
    await waitForChildExit(child);
  }
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let timeout;
    const finish = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      child.removeListener("exit", finish);
      resolve();
    };
    child.once("exit", finish);
    if (timeoutMs !== undefined) timeout = setTimeout(finish, timeoutMs);
  });
}

function signalChild(child, signal) {
  if (child.healtharchiveProcessGroup === true && process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
  child.kill(signal);
}

export async function stopHttpServer(server) {
  if (server === null) return;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
