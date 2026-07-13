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

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const lhciCli = fileURLToPath(new URL("../node_modules/@lhci/cli/src/cli.js", import.meta.url));
const reportDirectory = fileURLToPath(new URL("../.lighthouseci/", import.meta.url));
const metadataPath = fileURLToPath(
  new URL("../.next/healtharchive-build-metadata.json", import.meta.url),
);
const COMMAND_TIMEOUT_MS = 5 * 60_000;

let activeCommand = null;

function runCommand(args, { env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: frontendRoot,
      detached: process.platform !== "win32",
      env,
      stdio: "inherit",
    });
    child.healtharchiveProcessGroup = process.platform !== "win32";
    activeCommand = child;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      void stopChildProcess(child).then(
        () => reject(new Error(`${args[0]} exceeded the five-minute command timeout`)),
        reject,
      );
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
          `${args[0]} failed${signal === null ? ` with exit code ${code}` : ` on ${signal}`}`,
        ),
      );
    });
  });
}

function boundedError(error) {
  return (error instanceof Error ? error.message : "unknown error")
    .replaceAll(/\s+/g, " ")
    .slice(0, 500);
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
    throw new Error(
      `Runtime API base ${runtimeApiBaseUrl} does not match the existing build contract ${apiBaseUrl}`,
    );
  }
  try {
    apiStub = await startFailFastApiStub({ ...apiTarget, purpose: "lighthouse" });
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      throw new Error(
        `Cannot start the Lighthouse API stub at ${apiBaseUrl}: the configured port is already in use`,
      );
    }
    throw error;
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
  } catch (error) {
    throw new Error(
      `A production standalone build is required; run npm run build first (${boundedError(error)})`,
    );
  }
  frontend = startStandaloneFrontend({ port: frontendPort, env });
  await waitForServer({ origin, child: frontend.child });

  await rm(reportDirectory, { recursive: true, force: true });
  console.log(`Running three Lighthouse samples for each route at ${origin}.`);
  await runCommand([lhciCli, "autorun", "--config=.lighthouserc.cjs"], {
    env: { ...env, HEALTHARCHIVE_LIGHTHOUSE_ORIGIN: origin },
  });
  console.log(`Lighthouse reports written to ${reportDirectory}`);
} catch (error) {
  console.error(`Lighthouse performance gate failed: ${boundedError(error)}`);
  const logs = frontend?.getLogs().trim() ?? "";
  if (logs !== "") console.error(`Bounded Next server output:\n${logs}`);
  process.exitCode = 1;
} finally {
  await stop();
}
