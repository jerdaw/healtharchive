import { describe, expect, it } from "vitest";

import {
  classifyPageResponse,
  extractInternalPaths,
  getLoopbackHttpTarget,
  normalizeInternalPath,
  resolveSameOriginRedirect,
  wouldExceedPageLimit,
} from "../scripts/internal-link-check-lib.mjs";

const origin = "http://127.0.0.1:43123";

describe("normalizeInternalPath", () => {
  it.each([
    ["/about", "/en", "/about"],
    ["methods", "/fr/", "/fr/methods"],
    ["../contact", "/fr/about", "/contact"],
    ["/archive?q=health&page=2#results", "/", "/archive"],
    ["#main-content", "/fr/methods", "/fr/methods"],
    [`${origin}/fr/status`, "/", "/fr/status"],
  ])("normalizes %s from %s", (href, currentPath, expected) => {
    expect(normalizeInternalPath({ href, currentPath, origin })).toBe(expected);
  });

  it.each([
    "https://example.com/about",
    "mailto:hello@example.com",
    "tel:+15555555555",
    "javascript:void(0)",
    "data:text/plain,hello",
    "",
  ])("rejects non-crawlable href %s", (href) => {
    expect(normalizeInternalPath({ href, currentPath: "/", origin })).toBeNull();
  });
});

describe("extractInternalPaths", () => {
  it("extracts stable unique same-origin anchors", () => {
    const html = `
      <a href="/about">About</a>
      <a href="/about#team">Team</a>
      <a href="methods">Methods</a>
      <a href="/fr/status?from=footer">État</a>
      <a href="https://example.com/elsewhere">Elsewhere</a>
      <a>Missing href</a>
    `;

    expect(extractInternalPaths(html, { currentPath: "/", origin })).toEqual([
      "/about",
      "/fr/status",
      "/methods",
    ]);
  });

  it("resolves relative anchors from the current page", () => {
    expect(
      extractInternalPaths('<a href="../contact">Contact</a>', {
        currentPath: "/fr/about",
        origin,
      }),
    ).toEqual(["/contact"]);
  });
});

describe("classifyPageResponse", () => {
  it("accepts successful HTML, including a followed redirect", () => {
    expect(
      classifyPageResponse({
        status: 200,
        contentType: "text/html; charset=utf-8",
        redirected: true,
      }),
    ).toEqual({ ok: true, parseLinks: true, reason: null });
  });

  it("accepts successful non-HTML without parsing anchors", () => {
    expect(
      classifyPageResponse({
        status: 204,
        contentType: "application/json",
        redirected: false,
      }),
    ).toEqual({ ok: true, parseLinks: false, reason: null });
  });

  it("rejects HTTP errors with a bounded reason", () => {
    expect(
      classifyPageResponse({
        status: 404,
        contentType: "text/html",
        redirected: false,
      }),
    ).toEqual({ ok: false, parseLinks: false, reason: "HTTP 404" });
  });
});

describe("resolveSameOriginRedirect", () => {
  it("resolves a local relative redirect", () => {
    expect(
      resolveSameOriginRedirect({
        location: "/fr/about?from=redirect",
        currentUrl: `${origin}/about`,
        origin,
      }),
    ).toBe(`${origin}/fr/about?from=redirect`);
  });

  it.each(["https://example.com/about", "mailto:hello@example.com", "http://["])(
    "rejects unsafe redirect %s",
    (location) => {
      expect(
        resolveSameOriginRedirect({
          location,
          currentUrl: `${origin}/about`,
          origin,
        }),
      ).toBeNull();
    },
  );
});

describe("wouldExceedPageLimit", () => {
  it("allows the configured number of unique pages", () => {
    expect(wouldExceedPageLimit({ discoveredCount: 49, addedCount: 1, maxPages: 50 })).toBe(false);
  });

  it("rejects traversal that would truncate coverage", () => {
    expect(wouldExceedPageLimit({ discoveredCount: 50, addedCount: 1, maxPages: 50 })).toBe(true);
  });
});

describe("getLoopbackHttpTarget", () => {
  it.each([
    ["http://127.0.0.1:8001", { host: "127.0.0.1", port: 8001 }],
    ["http://localhost:9123/api", { host: "127.0.0.1", port: 9123 }],
  ])("accepts a non-privileged loopback API URL %s", (apiBaseUrl, expected) => {
    expect(getLoopbackHttpTarget(apiBaseUrl)).toEqual(expected);
  });

  it.each([
    "https://localhost:8001",
    "http://api.example.com:8001",
    "http://127.0.0.1:80",
    "not a URL",
  ])("rejects a target the checker must not bind %s", (apiBaseUrl) => {
    expect(getLoopbackHttpTarget(apiBaseUrl)).toBeNull();
  });
});
