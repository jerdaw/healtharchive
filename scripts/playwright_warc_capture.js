#!/usr/bin/env node

/**
 * Container-side browser fallback capture for hostile sites.
 *
 * This script is intended to run inside an official Playwright Docker image.
 * It owns the browser context and queue traversal, then writes a manifest plus
 * one body file per captured page into a mounted host directory.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

function argValue(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  if (idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function intValue(flag, fallback) {
  const raw = argValue(flag);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function boolValue(flag, fallback = false) {
  const raw = argValue(flag);
  if (!raw) return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function normalizeTargetUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    if (!url.pathname) url.pathname = "/";
    return url.toString();
  } catch {
    return null;
  }
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_err) {
    // Fall through to cwd-based resolution.
  }
  const { createRequire } = require("node:module");
  const requireFromCwd = createRequire(`${process.cwd()}/`);
  return requireFromCwd("playwright");
}

async function detectPlaywrightVersion(playwright) {
  const fromEnv = String(process.env.PLAYWRIGHT_VERSION || "").trim();
  if (fromEnv) return fromEnv;

  const fromModule = String(playwright?.version || "").trim();
  if (fromModule) return fromModule;

  try {
    const { createRequire } = require("node:module");
    const requireFromCwd = createRequire(`${process.cwd()}/`);
    const playwrightEntry = requireFromCwd.resolve("playwright");
    const playwrightDir = path.dirname(playwrightEntry);
    const packageJsonPath = path.join(playwrightDir, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    const version = String(packageJson.version || "").trim();
    if (version) return version;
  } catch (_err) {
    // Best effort only; runtime metadata can omit the npm version.
  }

  return "";
}

function emitJson(payload) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function emitInfo(context, message, details) {
  emitJson({
    timestamp: new Date().toISOString(),
    logLevel: "info",
    context,
    message,
    details,
  });
}

function emitWarn(context, message, details) {
  emitJson({
    timestamp: new Date().toISOString(),
    logLevel: "warn",
    context,
    message,
    details,
  });
}

function emitStatus({ crawled, total, pending, failed }) {
  emitInfo("crawlStatus", "Crawl statistics", {
    crawled,
    total,
    pending,
    failed,
    limit: { max: 0, hit: false },
    pendingPages: [],
  });
}

async function collectLinks(page) {
  return page.evaluate(() => {
    const pairs = [
      ["a", "href"],
      ["area", "href"],
      ["link", "href"],
      ["script", "src"],
      ["img", "src"],
      ["iframe", "src"],
      ["source", "src"],
      ["video", "src"],
      ["audio", "src"],
    ];

    const found = [];
    for (const [tagName, attrName] of pairs) {
      const nodes = document.querySelectorAll(tagName);
      for (const node of nodes) {
        const raw = node.getAttribute(attrName);
        if (!raw) continue;
        try {
          found.push(new URL(raw, document.baseURI).toString());
        } catch {
          // Ignore malformed URLs.
        }
      }
    }
    return found;
  });
}

async function main() {
  const manifestPath = argValue("--manifest");
  const bodiesDir = argValue("--bodies-dir");
  const seedsJson = argValue("--seeds-json", "[]");
  const includePattern = argValue("--scope-include-rx");
  const excludePattern = argValue("--scope-exclude-rx");
  const expandLinks = boolValue("--expand-links", true);
  const viewportWidth = intValue("--viewport-width", 1440);
  const viewportHeight = intValue("--viewport-height", 900);
  const navigationTimeoutMs = intValue("--navigation-timeout-ms", 150000);
  const settleMs = intValue("--settle-ms", 5000);
  const locale = argValue("--locale", "en-CA");
  const timezone = argValue("--timezone", "America/Toronto");

  if (!manifestPath || !bodiesDir) {
    // eslint-disable-next-line no-console
    console.error("Missing required args: --manifest and --bodies-dir");
    process.exit(2);
  }

  let seeds;
  try {
    seeds = JSON.parse(seedsJson);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Invalid --seeds-json payload: ${err}`);
    process.exit(2);
  }
  if (!Array.isArray(seeds) || seeds.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Expected non-empty JSON array for --seeds-json");
    process.exit(2);
  }

  const includeRx = includePattern ? new RegExp(includePattern) : null;
  const excludeRx = excludePattern ? new RegExp(excludePattern) : null;
  const allows = (url) => {
    if (excludeRx && excludeRx.test(url)) return false;
    if (includeRx && !includeRx.test(url)) return false;
    return true;
  };

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.mkdir(bodiesDir, { recursive: true });

  const playwright = loadPlaywright();
  const { chromium } = playwright;
  const browser = await chromium.launch({
    args: ["--disable-dev-shm-usage"],
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    locale,
    timezoneId: timezone,
  });

  const queue = [];
  const seen = new Set();
  for (const raw of seeds) {
    const normalized = normalizeTargetUrl(raw);
    if (!normalized) continue;
    if (!allows(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    queue.push(normalized);
  }

  let crawled = 0;
  let failed = 0;
  const records = [];
  const failures = [];

  emitInfo("playwrightWarc", "Starting browser fallback capture", {
    seeds: queue,
    expandLinks,
    viewport: { width: viewportWidth, height: viewportHeight },
    locale,
    timezone,
  });
  emitStatus({ crawled, total: seen.size, pending: queue.length, failed });

  while (queue.length > 0) {
    const requestedUrl = queue.shift();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(navigationTimeoutMs);

    try {
      const response = await page.goto(requestedUrl, {
        waitUntil: "load",
        timeout: navigationTimeoutMs,
      });
      await page.waitForTimeout(settleMs);

      const finalUrl =
        normalizeTargetUrl(page.url()) ||
        normalizeTargetUrl(response ? response.url() : "") ||
        requestedUrl;

      let headers = {};
      let statusCode = null;
      let bodySource = "rendered_dom";
      let bodyBuffer = null;
      let contentType = null;

      if (response) {
        headers = await response.allHeaders();
        statusCode = response.status();
        contentType =
          headers["content-type"] || headers["Content-Type"] || headers["Content-type"] || null;
        if (contentType) {
          contentType = String(contentType).split(";", 1)[0].trim().toLowerCase();
        }
        try {
          bodyBuffer = await response.body();
          if (bodyBuffer && bodyBuffer.length > 0) {
            bodySource = "network_response";
          }
        } catch (_err) {
          bodyBuffer = null;
        }
      }

      if (!bodyBuffer || bodyBuffer.length === 0) {
        const html = await page.content();
        bodyBuffer = Buffer.from(html, "utf8");
        bodySource = "rendered_dom";
        if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
          headers["content-type"] = "text/html; charset=utf-8";
        }
        if (!contentType) {
          contentType = "text/html";
        }
      }

      const cookieCount = (await context.cookies()).length;
      const discoveredUrls = [];
      if (expandLinks) {
        const rawLinks = await collectLinks(page);
        for (const rawLink of rawLinks) {
          const normalized = normalizeTargetUrl(rawLink);
          if (!normalized) continue;
          if (!allows(normalized)) continue;
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          queue.push(normalized);
          discoveredUrls.push(normalized);
        }
      }

      const bodyFileName = `record-${String(records.length + 1).padStart(6, "0")}${
        bodySource === "rendered_dom" ? ".html" : ".bin"
      }`;
      const bodyPath = path.join(bodiesDir, bodyFileName);
      await fs.writeFile(bodyPath, bodyBuffer);

      records.push({
        requestedUrl,
        finalUrl,
        statusCode,
        headers,
        bodyPath: `bodies/${bodyFileName}`,
        bodySource,
        cookieCount,
        captureTimestamp: new Date().toISOString(),
        contentType,
        discoveredUrls,
      });
      crawled += 1;

      emitInfo("playwrightWarc", "Captured document", {
        requestedUrl,
        finalUrl,
        statusCode,
        bodySource,
        cookieCount,
      });
    } catch (error) {
      failed += 1;
      failures.push({
        requestedUrl,
        error: String(error),
      });
      emitWarn("playwrightWarc", "Document capture failed", {
        requestedUrl,
        error: String(error),
      });
    } finally {
      await page.close().catch(() => {});
      emitStatus({ crawled, total: seen.size, pending: queue.length, failed });
    }
  }

  const manifest = {
    runtime: {
      backend: "playwright_warc",
      playwrightVersion: await detectPlaywrightVersion(playwright),
      chromiumVersion: await browser.version(),
      viewport: { width: viewportWidth, height: viewportHeight },
      locale,
      timezone,
      expandLinks,
      navigationTimeoutMs,
      settleMs,
    },
    records,
    failures,
  };

  await browser.close();
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
