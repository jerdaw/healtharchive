import { JSDOM } from "jsdom";

/**
 * Resolve a rendered anchor to a same-origin route pathname.
 *
 * Query strings and fragments are intentionally removed: this checker owns
 * route reachability, while page behavior remains covered by component and
 * integration tests.
 */
export function normalizeInternalPath({ href, currentPath, origin }) {
  if (typeof href !== "string" || href.trim() === "") {
    return null;
  }

  let target;
  let expectedOrigin;
  try {
    expectedOrigin = new URL(origin).origin;
    target = new URL(href, new URL(currentPath, `${expectedOrigin}/`));
  } catch {
    return null;
  }

  if (
    (target.protocol !== "http:" && target.protocol !== "https:") ||
    target.origin !== expectedOrigin
  ) {
    return null;
  }

  return target.pathname || "/";
}

/** Extract sorted, unique, same-origin anchor paths from rendered HTML. */
export function extractInternalPaths(html, { currentPath, origin }) {
  const document = new JSDOM(html).window.document;
  const paths = new Set();

  for (const anchor of document.querySelectorAll("a[href]")) {
    const path = normalizeInternalPath({
      href: anchor.getAttribute("href"),
      currentPath,
      origin,
    });
    if (path !== null) {
      paths.add(path);
    }
  }

  return [...paths].sort();
}

/** Classify a followed fetch response without retaining response content. */
export function classifyPageResponse({ status, contentType }) {
  if (status >= 400) {
    return { ok: false, parseLinks: false, reason: `HTTP ${status}` };
  }

  return {
    ok: true,
    parseLinks: contentType.toLowerCase().includes("text/html"),
    reason: null,
  };
}

/** Resolve a redirect while preventing the local crawl from leaving origin. */
export function resolveSameOriginRedirect({ location, currentUrl, origin }) {
  let target;
  let expectedOrigin;
  try {
    expectedOrigin = new URL(origin).origin;
    target = new URL(location, currentUrl);
  } catch {
    return null;
  }

  if (
    (target.protocol !== "http:" && target.protocol !== "https:") ||
    target.origin !== expectedOrigin
  ) {
    return null;
  }

  return target.href;
}

/** Return true when adding newly discovered routes would truncate the crawl. */
export function wouldExceedPageLimit({ discoveredCount, addedCount, maxPages }) {
  return discoveredCount + addedCount > maxPages;
}

/** Return a safe local bind target for a fail-fast API stub, or null. */
export function getLoopbackHttpTarget(apiBaseUrl) {
  let target;
  try {
    target = new URL(apiBaseUrl);
  } catch {
    return null;
  }

  if (
    target.protocol !== "http:" ||
    (target.hostname !== "127.0.0.1" && target.hostname !== "localhost")
  ) {
    return null;
  }

  const port = Number.parseInt(target.port || "80", 10);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
    return null;
  }

  return { host: "127.0.0.1", port };
}
