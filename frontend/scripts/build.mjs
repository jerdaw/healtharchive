import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveBuildApiBaseUrl, writeBuildMetadata } from "./build-metadata-lib.mjs";

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const metadataPath = fileURLToPath(
  new URL("../.next/healtharchive-build-metadata.json", import.meta.url),
);

const child = spawn(process.execPath, [nextCli, "build"], {
  cwd: frontendRoot,
  env: process.env,
  stdio: "inherit",
});

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`Next build stopped on ${signal}`));
      return;
    }
    resolve(code ?? 1);
  });
});

if (exitCode !== 0) process.exit(exitCode);

await writeBuildMetadata(metadataPath, resolveBuildApiBaseUrl());
console.log(`Recorded public API build contract at ${metadataPath}`);
