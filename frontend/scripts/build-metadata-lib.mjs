import { access, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

export const BUILD_METADATA_VERSION = 1;

export function resolveBuildApiBaseUrl(env = process.env) {
  const configured = env.NEXT_PUBLIC_API_BASE_URL ?? env.NEXT_PUBLIC_BACKEND_URL;
  return configured ? configured.replace(/\/+$/, "") : "http://localhost:8001";
}

export async function writeBuildMetadata(filePath, apiBaseUrl) {
  const payload = {
    apiBaseUrl,
    version: BUILD_METADATA_VERSION,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function readBuildMetadata(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read build metadata at ${filePath}: ${error.message}`);
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    parsed.version !== BUILD_METADATA_VERSION ||
    typeof parsed.apiBaseUrl !== "string" ||
    parsed.apiBaseUrl === ""
  ) {
    throw new Error(`Invalid build metadata at ${filePath}`);
  }
  return parsed;
}

export async function requireExplicitWslChrome({
  env = process.env,
  platform = process.platform,
  release,
}) {
  const isWsl = isWslEnvironment({ env, platform, release });
  const chromePath = env.CHROME_PATH;
  if (isWsl && !chromePath) {
    throw new Error(
      "CHROME_PATH must point to a Linux Chrome/Chromium executable under WSL; Windows Chrome auto-detection is unsafe",
    );
  }
  if (!chromePath) return null;
  if (!path.isAbsolute(chromePath) || (isWsl && /\.exe$/i.test(chromePath))) {
    throw new Error("CHROME_PATH must be an absolute Linux executable path under WSL");
  }
  try {
    await access(chromePath, fsConstants.X_OK);
  } catch {
    throw new Error(`CHROME_PATH is not executable: ${chromePath}`);
  }
  return chromePath;
}

export function isWslEnvironment({ env = process.env, platform = process.platform, release }) {
  return platform === "linux" && (Boolean(env.WSL_DISTRO_NAME) || /microsoft/i.test(release ?? ""));
}
