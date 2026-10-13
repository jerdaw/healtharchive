import { resolve } from "node:path";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const LOOPBACK_BASE_URL = "http://127.0.0.1:3000";
export const MAX_HTML_BYTES = 2 * 1024 * 1024;
export const MAX_MANIFEST_BYTES = 512 * 1024;
export const MAX_SERVER_BUNDLE_BYTES = 2 * 1024 * 1024;
export const MAX_SERVER_CHUNKS = 64;
export const MAX_SERVER_CHUNKS_TOTAL_BYTES = 8 * 1024 * 1024;

export const PUBLIC_CONFIG_ROUTES = Object.freeze([
  { path: "/exports", expected: "https://api.healtharchive.ca", kind: "api" },
  { path: "/fr/exports", expected: "https://api.healtharchive.ca", kind: "api" },
  { path: "/status", expected: "https://replay.healtharchive.ca", kind: "replay" },
  { path: "/fr/status", expected: "https://replay.healtharchive.ca", kind: "replay" },
]);

const LOCALHOST_ORIGINS = ["http://localhost:8001", "http://127.0.0.1:8001"];
const SENTINEL_ORIGINS = ["https://api-sentinel.invalid", "https://replay-sentinel.invalid"];
const EXPECTED_REPLAY_ORIGIN = "https://replay.healtharchive.ca";
const REPLAY_SENTINEL_ORIGIN = "https://replay-sentinel.invalid";
const REPLAY_ENV_NAME = "NEXT_PUBLIC_REPLAY_BASE_URL";
const ARCHIVE_ROUTE_KEY = "/[locale]/archive/page";
const ROUTE_MARKERS = Object.freeze({
  "/exports": ["Exports overview", "Export manifest"],
  "/fr/exports": ["Aperçu des exports", "Manifeste des exports"],
  "/status": ["Current status", "Per-source coverage"],
  "/fr/status": ["Statut actuel", "Couverture par source"],
});

export class SmokeProbeError extends Error {
  constructor(code) {
    super(code);
    this.name = "SmokeProbeError";
    this.code = code;
  }
}

function countOccurrences(value, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = value.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function decodeHtmlAttribute(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[\da-f]+|\d+);/gi, (entity) => {
    const normalized = entity.toLowerCase();
    const named = {
      "&amp;": "&",
      "&quot;": '"',
      "&apos;": "'",
      "&lt;": "<",
      "&gt;": ">",
    };
    if (normalized in named) return named[normalized];
    const numeric = normalized.startsWith("&#x")
      ? Number.parseInt(normalized.slice(3, -1), 16)
      : Number.parseInt(normalized.slice(2, -1), 10);
    if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 0x10ffff) return "\uFFFD";
    try {
      return String.fromCodePoint(numeric);
    } catch {
      return "\uFFFD";
    }
  });
}

function inspectArchiveSiteAnchors(html, path) {
  let labels = 0;
  let invalidHrefs = 0;
  let internalFallbacks = 0;
  let externalReplayLinks = 0;
  const internalHrefPattern =
    path === "/status" ? /^\/browse\/[1-9]\d*$/ : /^\/fr\/browse\/[1-9]\d*$/;
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const text = decodeHtmlAttribute(match[2].replace(/<[^>]*>/g, " "))
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase();
    if (!text.includes("view archived site") && !text.includes("voir le site archivé")) continue;
    labels += 1;

    const hrefs = [
      ...match[1].matchAll(/(?:^|\s)href(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi),
    ];
    if (hrefs.length !== 1) {
      invalidHrefs += 1;
      continue;
    }

    const rawHref = hrefs[0][1] ?? hrefs[0][2] ?? hrefs[0][3] ?? "";
    if (
      !rawHref ||
      rawHref.length > 16_384 ||
      /&(?:[a-z]+|#)/i.test(rawHref.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[\da-f]+|\d+);/gi, ""))
    ) {
      invalidHrefs += 1;
      continue;
    }

    const decodedHref = decodeHtmlAttribute(rawHref);
    if (internalHrefPattern.test(decodedHref)) {
      internalFallbacks += 1;
      continue;
    }

    try {
      const parsed = new URL(decodedHref);
      if (
        parsed.origin !== EXPECTED_REPLAY_ORIGIN ||
        parsed.username !== "" ||
        parsed.password !== ""
      ) {
        invalidHrefs += 1;
      } else {
        externalReplayLinks += 1;
      }
    } catch {
      invalidHrefs += 1;
    }
  }

  return { labels, invalidHrefs, internalFallbacks, externalReplayLinks };
}

function isHtmlContentType(contentType) {
  return contentType.split(";", 1)[0].trim().toLowerCase() === "text/html";
}

function isWithinDirectory(directory, candidate) {
  const relativePath = relative(directory, candidate);
  return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}

async function readBoundedRegularFile(filePath, maxBytes) {
  const info = await lstat(filePath);
  if (!info.isFile() || info.size > maxBytes) throw new SmokeProbeError("bundle-file-invalid");
  return readFile(filePath, "utf8");
}

export async function inspectCompiledReplayOrigin({
  serverRoot = resolve(process.cwd(), ".next/server"),
} = {}) {
  const counts = {
    result: "fail",
    reason: "bundle-inspection-failed",
    chunksChecked: 0,
    expectedOriginRefs: 0,
    sentinelOriginRefs: 0,
    runtimeEnvRefs: 0,
  };

  try {
    const root = resolve(serverRoot);
    const manifestPath = resolve(root, "app-paths-manifest.json");
    const manifestText = await readBoundedRegularFile(manifestPath, MAX_MANIFEST_BYTES);
    const manifest = JSON.parse(manifestText);
    const routeFile = manifest?.[ARCHIVE_ROUTE_KEY];
    if (typeof routeFile !== "string") throw new SmokeProbeError("archive-route-unmapped");

    const routeBundlePath = resolve(root, routeFile);
    if (!isWithinDirectory(root, routeBundlePath))
      throw new SmokeProbeError("archive-route-invalid");
    const routeBundle = await readBoundedRegularFile(routeBundlePath, MAX_SERVER_BUNDLE_BYTES);
    const chunkRefs = [
      ...new Set([...routeBundle.matchAll(/chunks\/ssr\/[^"'\s]+?\.js/g)].map((match) => match[0])),
    ];
    if (chunkRefs.length === 0 || chunkRefs.length > MAX_SERVER_CHUNKS) {
      throw new SmokeProbeError("archive-server-chunks-invalid");
    }

    let totalBytes = 0;
    for (const chunkRef of chunkRefs) {
      const chunkPath = resolve(root, chunkRef);
      if (!isWithinDirectory(root, chunkPath)) throw new SmokeProbeError("archive-chunk-invalid");
      const chunkText = await readBoundedRegularFile(chunkPath, MAX_SERVER_BUNDLE_BYTES);
      totalBytes += Buffer.byteLength(chunkText);
      if (totalBytes > MAX_SERVER_CHUNKS_TOTAL_BYTES) {
        throw new SmokeProbeError("archive-server-chunks-too-large");
      }
      counts.chunksChecked += 1;
      counts.expectedOriginRefs += countOccurrences(chunkText, EXPECTED_REPLAY_ORIGIN);
      counts.sentinelOriginRefs += countOccurrences(chunkText, REPLAY_SENTINEL_ORIGIN);
      counts.runtimeEnvRefs += countOccurrences(chunkText, REPLAY_ENV_NAME);
    }

    if (counts.sentinelOriginRefs > 0) counts.reason = "replay-sentinel-origin-present";
    else if (counts.expectedOriginRefs === 0) counts.reason = "compiled-replay-origin-absent";
    else if (counts.runtimeEnvRefs > 0) counts.reason = "replay-origin-not-compiled";
    else {
      counts.result = "pass";
      counts.reason = "";
    }
  } catch (error) {
    counts.reason = error instanceof SmokeProbeError ? error.code : "bundle-inspection-failed";
  }

  return counts;
}

async function cancelBody(response) {
  let timer;
  try {
    if (response.body) {
      await Promise.race([
        response.body.cancel(),
        new Promise((resolve) => {
          timer = setTimeout(resolve, 100);
        }),
      ]);
    }
  } catch {
    // Cancellation is best-effort; no body is emitted or persisted.
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function requestWithTimeout(
  fetchImpl,
  url,
  timeoutMs,
  consumeResponse = async (response) => response,
) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new SmokeProbeError("request-timeout"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, {
          cache: "no-store",
          headers: { accept: "text/html" },
          redirect: "manual",
          signal: controller.signal,
        });
        return consumeResponse(response);
      })(),
      timeout,
    ]);
  } catch (error) {
    if (error instanceof SmokeProbeError) throw error;
    if (controller.signal.aborted || error?.name === "AbortError")
      throw new SmokeProbeError("request-timeout");
    throw new SmokeProbeError("request-error");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  return requestWithTimeout(fetchImpl, url, timeoutMs);
}

export async function readBoundedHtml(response, maxBytes = MAX_HTML_BYTES) {
  const reader = response.body?.getReader();
  if (!reader) throw new SmokeProbeError("body-unavailable");

  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (totalBytes + value.byteLength > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the bounded-size failure classification.
        }
        throw new SmokeProbeError("response-too-large");
      }
      const chunk = Buffer.from(value);
      totalBytes += chunk.byteLength;
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof SmokeProbeError) throw error;
    throw new SmokeProbeError("response-read-error");
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

export function classifyHtmlResponse({ path, status, contentType, html }) {
  const route = PUBLIC_CONFIG_ROUTES.find((candidate) => candidate.path === path);
  if (!route) throw new SmokeProbeError("unexpected-route");

  const apiRefs = countOccurrences(html, "https://api.healtharchive.ca");
  const replayRefs = countOccurrences(html, "https://replay.healtharchive.ca");
  const archiveLinks = inspectArchiveSiteAnchors(html, path);
  const localhostRefs = LOCALHOST_ORIGINS.reduce(
    (total, origin) => total + countOccurrences(html, origin),
    0,
  );
  const sentinelRefs = SENTINEL_ORIGINS.reduce(
    (total, origin) => total + countOccurrences(html, origin),
    0,
  );
  const expectedRefs = route.kind === "api" ? apiRefs : replayRefs;
  const expectedOriginRequired =
    route.kind === "api" || archiveLinks.labels > archiveLinks.internalFallbacks;
  const canonicalPageShape = ROUTE_MARKERS[path].every((marker) => html.includes(marker));

  let reason = "";
  if (status !== 200) reason = "http-status";
  else if (!isHtmlContentType(contentType)) reason = "content-type";
  else if (!canonicalPageShape) reason = "page-shape";
  else if (localhostRefs > 0) reason = "localhost-origin-present";
  else if (sentinelRefs > 0) reason = "sentinel-origin-present";
  else if (archiveLinks.invalidHrefs > 0) reason = "archive-link-origin-invalid";
  else if (expectedOriginRequired && expectedRefs === 0) reason = "expected-origin-absent";

  return {
    path,
    status,
    apiRefs,
    replayRefs,
    archiveLinkLabels: archiveLinks.labels,
    invalidArchiveHrefCount: archiveLinks.invalidHrefs,
    internalBrowseFallbackCount: archiveLinks.internalFallbacks,
    externalReplayLinkCount: archiveLinks.externalReplayLinks,
    expectedOriginRequired,
    canonicalPageShape,
    localhostRefs,
    sentinelRefs,
    result: reason ? "fail" : "pass",
    reason,
  };
}

export async function probeRoute({
  path,
  fetchImpl = fetch,
  baseUrl = LOOPBACK_BASE_URL,
  requestTimeoutMs = 3_000,
  maxHtmlBytes = MAX_HTML_BYTES,
}) {
  let status = "unavailable";
  try {
    return await requestWithTimeout(
      fetchImpl,
      `${baseUrl}${path}`,
      requestTimeoutMs,
      async (response) => {
        status = response.status;
        const contentType = response.headers.get("content-type") ?? "";
        if (response.status !== 200 || !isHtmlContentType(contentType)) {
          await cancelBody(response);
          return classifyHtmlResponse({ path, status: response.status, contentType, html: "" });
        }

        try {
          const html = await readBoundedHtml(response, maxHtmlBytes);
          return classifyHtmlResponse({ path, status: response.status, contentType, html });
        } catch (error) {
          return {
            path,
            status: response.status,
            apiRefs: 0,
            replayRefs: 0,
            archiveLinkLabels: 0,
            invalidArchiveHrefCount: 0,
            internalBrowseFallbackCount: 0,
            externalReplayLinkCount: 0,
            expectedOriginRequired: true,
            canonicalPageShape: false,
            localhostRefs: 0,
            sentinelRefs: 0,
            result: "fail",
            reason: error instanceof SmokeProbeError ? error.code : "response-read-error",
          };
        }
      },
    );
  } catch (error) {
    const route = PUBLIC_CONFIG_ROUTES.find((candidate) => candidate.path === path);
    if (!route) throw new SmokeProbeError("unexpected-route");
    return {
      path,
      status,
      apiRefs: 0,
      replayRefs: 0,
      archiveLinkLabels: 0,
      invalidArchiveHrefCount: 0,
      internalBrowseFallbackCount: 0,
      externalReplayLinkCount: 0,
      expectedOriginRequired: true,
      canonicalPageShape: false,
      localhostRefs: 0,
      sentinelRefs: 0,
      result: "fail",
      reason: error instanceof SmokeProbeError ? error.code : "probe-error",
    };
  }
}

export async function waitForReadiness({
  fetchImpl = fetch,
  baseUrl = LOOPBACK_BASE_URL,
  readinessTimeoutMs = 30_000,
  requestTimeoutMs = 1_500,
  pollIntervalMs = 250,
  now = Date.now,
  sleep = (duration) => new Promise((resolveSleep) => setTimeout(resolveSleep, duration)),
}) {
  const deadline = now() + readinessTimeoutMs;
  let attempts = 0;
  let lastFailure = "not-ready";

  while (attempts < 120 && now() < deadline) {
    attempts += 1;
    try {
      const timeout = Math.max(1, Math.min(requestTimeoutMs, deadline - now()));
      const response = await fetchWithTimeout(fetchImpl, `${baseUrl}/exports`, timeout);
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status === 200 && isHtmlContentType(contentType)) {
        await cancelBody(response);
        return { attempts };
      }
      lastFailure =
        response.status === 200 ? "readiness-not-html" : `readiness-http-${response.status}`;
      await cancelBody(response);
    } catch (error) {
      lastFailure = error instanceof SmokeProbeError ? error.code : "readiness-error";
    }

    const remaining = deadline - now();
    if (remaining > 0) await sleep(Math.min(pollIntervalMs, remaining));
  }

  throw new SmokeProbeError(`readiness-timeout-${lastFailure}`);
}

export async function runDockerPublicConfigSmoke(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? LOOPBACK_BASE_URL;
  const replayBundle = await inspectCompiledReplayOrigin(options);
  let readiness;
  try {
    readiness = await waitForReadiness({ ...options, fetchImpl, baseUrl });
  } catch (error) {
    return {
      readiness: "fail",
      readinessReason: error instanceof SmokeProbeError ? error.code : "readiness-error",
      replayBundle,
      results: [],
      result: "fail",
    };
  }

  const results = [];
  for (const route of PUBLIC_CONFIG_ROUTES) {
    results.push(await probeRoute({ ...options, fetchImpl, baseUrl, path: route.path }));
  }
  return {
    readiness: "pass",
    readinessAttempts: readiness.attempts,
    replayBundle,
    results,
    result:
      replayBundle.result === "pass" && results.every((item) => item.result === "pass")
        ? "pass"
        : "fail",
  };
}

function printSummary(summary) {
  if (summary.readiness !== "pass") {
    console.log(`readiness=fail reason=${summary.readinessReason}`);
    console.log("dockerPublicConfigSmoke=fail");
    return;
  }

  console.log(`readiness=pass attempts=${summary.readinessAttempts}`);
  console.log(
    `replayBundle=${summary.replayBundle.result} reason=${summary.replayBundle.reason || "none"} ` +
      `chunksChecked=${summary.replayBundle.chunksChecked} ` +
      `expectedOriginRefs=${summary.replayBundle.expectedOriginRefs} ` +
      `sentinelOriginRefs=${summary.replayBundle.sentinelOriginRefs} ` +
      `runtimeEnvRefs=${summary.replayBundle.runtimeEnvRefs}`,
  );
  for (const item of summary.results) {
    console.log(
      `route=${item.path} status=${item.status} apiRefs=${item.apiRefs} ` +
        `replayRefs=${item.replayRefs} archiveLinkLabels=${item.archiveLinkLabels} ` +
        `invalidArchiveHrefCount=${item.invalidArchiveHrefCount} ` +
        `internalBrowseFallbackCount=${item.internalBrowseFallbackCount} ` +
        `externalReplayLinkCount=${item.externalReplayLinkCount} ` +
        `expectedOriginRequired=${item.expectedOriginRequired} ` +
        `canonicalPageShape=${item.canonicalPageShape} localhostRefs=${item.localhostRefs} ` +
        `sentinelRefs=${item.sentinelRefs} result=${item.result} reason=${item.reason || "none"}`,
    );
  }
  console.log(`dockerPublicConfigSmoke=${summary.result}`);
}

async function main() {
  const summary = await runDockerPublicConfigSmoke();
  printSummary(summary);
  if (summary.result !== "pass") process.exitCode = 1;
}

const executedFromStdin = process.argv[1] === "-";
const executedByPath =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executedFromStdin || executedByPath) {
  main().catch(() => {
    console.log("dockerPublicConfigSmoke=fail reason=unexpected-probe-error");
    process.exitCode = 1;
  });
}
