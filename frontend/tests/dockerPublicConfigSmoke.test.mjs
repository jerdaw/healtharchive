import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  MAX_HTML_BYTES,
  PUBLIC_CONFIG_ROUTES,
  classifyHtmlResponse,
  inspectCompiledReplayOrigin,
  probeRoute,
  readBoundedHtml,
  runDockerPublicConfigSmoke,
  waitForReadiness,
} from "../scripts/docker-public-config-smoke.mjs";

function htmlResponse(body, { status = 200, contentType = "text/html; charset=utf-8" } = {}) {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

function expectedHtml(path) {
  const route = PUBLIC_CONFIG_ROUTES.find((item) => item.path === path);
  const markers = {
    "/exports": "Exports overview Export manifest",
    "/fr/exports": "Aperçu des exports Manifeste des exports",
    "/status": "Current status Per-source coverage",
    "/fr/status": "Statut actuel Couverture par source",
  }[path];
  const archiveLink =
    route.kind === "replay"
      ? `<a href="${route.expected}/job/1">${path.startsWith("/fr/") ? "Voir le site archivé" : "View archived site"}</a>`
      : "";
  return `<html>${markers}<script>${route.expected}/api/check</script>${archiveLink}</html>`;
}

async function createCompiledBundleFixture({ chunkText, unrelatedChunkText } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "healtharchive-public-config-"));
  const serverRoot = path.join(directory, "server");
  const routeBundle = "app/[locale]/archive/page.js";
  const chunkRef = "chunks/ssr/archive-route.js";
  await mkdir(path.dirname(path.join(serverRoot, routeBundle)), { recursive: true });
  await mkdir(path.join(serverRoot, "chunks/ssr"), { recursive: true });
  await writeFile(
    path.join(serverRoot, "app-paths-manifest.json"),
    JSON.stringify({ "/[locale]/archive/page": routeBundle }),
  );
  await writeFile(path.join(serverRoot, routeBundle), `require("${chunkRef}");`);
  await writeFile(path.join(serverRoot, chunkRef), chunkText ?? "");
  if (unrelatedChunkText !== undefined) {
    await writeFile(path.join(serverRoot, "chunks/ssr/unrelated.js"), unrelatedChunkText);
  }
  return { directory, serverRoot };
}

describe("Docker public URL smoke contract", () => {
  it("checks only the archive route's manifest-referenced server chunks", async () => {
    const fixture = await createCompiledBundleFixture({
      chunkText: 'const replayBase="https://replay.healtharchive.ca";',
      unrelatedChunkText: 'const decoy="https://replay-sentinel.invalid";',
    });
    try {
      const result = await inspectCompiledReplayOrigin({ serverRoot: fixture.serverRoot });

      expect(result).toMatchObject({
        result: "pass",
        chunksChecked: 1,
        expectedOriginRefs: 1,
        sentinelOriginRefs: 0,
        runtimeEnvRefs: 0,
      });
      expect(JSON.stringify(result)).not.toContain(fixture.directory);
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it("rejects a sentinel replay origin in a manifest-referenced server chunk", async () => {
    const fixture = await createCompiledBundleFixture({
      chunkText: 'const replayBase="https://replay-sentinel.invalid";',
    });
    try {
      await expect(
        inspectCompiledReplayOrigin({ serverRoot: fixture.serverRoot }),
      ).resolves.toMatchObject({
        result: "fail",
        reason: "replay-sentinel-origin-present",
      });
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it("rejects a server chunk that leaves the public replay variable unresolved", async () => {
    const fixture = await createCompiledBundleFixture({
      chunkText:
        'const replayBase=process.env.NEXT_PUBLIC_REPLAY_BASE_URL??"https://replay.healtharchive.ca";',
    });
    try {
      await expect(
        inspectCompiledReplayOrigin({ serverRoot: fixture.serverRoot }),
      ).resolves.toMatchObject({
        result: "fail",
        reason: "replay-origin-not-compiled",
        runtimeEnvRefs: 1,
      });
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it("fails closed when the archive page is unmapped or escapes the server root", async () => {
    const fixture = await createCompiledBundleFixture();
    try {
      await writeFile(
        path.join(fixture.serverRoot, "app-paths-manifest.json"),
        JSON.stringify({ "/[locale]/archive/page": "../../outside.js" }),
      );
      await expect(
        inspectCompiledReplayOrigin({ serverRoot: fixture.serverRoot }),
      ).resolves.toMatchObject({
        result: "fail",
        reason: "archive-route-invalid",
      });
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it.each(PUBLIC_CONFIG_ROUTES)("accepts the production origin on $path", ({ path }) => {
    const route = PUBLIC_CONFIG_ROUTES.find((item) => item.path === path);
    const result = classifyHtmlResponse({
      path,
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: expectedHtml(path),
    });

    expect(result.result).toBe("pass");
    expect(result[route.kind === "api" ? "apiRefs" : "replayRefs"]).toBeGreaterThan(0);
    if (route.kind === "replay") expect(result.expectedOriginRequired).toBe(true);
  });

  it("accepts status pages without API-backed archive links when the backend is unavailable", () => {
    const result = classifyHtmlResponse({
      path: "/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: "<html>Current status Per-source coverage Live metrics unavailable</html>",
    });

    expect(result.result).toBe("pass");
    expect(result.archiveLinkLabels).toBe(0);
    expect(result.expectedOriginRequired).toBe(false);
  });

  it.each([
    ["English", "/status", "/browse/42", "View archived site"],
    ["French", "/fr/status", "/fr/browse/42", "Voir le site archivé"],
  ])("accepts the canonical %s internal browse fallback", (_locale, path, href, label) => {
    const markers =
      path === "/status"
        ? "Current status Per-source coverage"
        : "Statut actuel Couverture par source";
    const result = classifyHtmlResponse({
      path,
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: `<html>${markers}<a href="${href}">${label}</a></html>`,
    });

    expect(result.result).toBe("pass");
    expect(result.archiveLinkLabels).toBe(1);
    expect(result.internalBrowseFallbackCount).toBe(1);
    expect(result.externalReplayLinkCount).toBe(0);
    expect(result.expectedOriginRequired).toBe(false);
  });

  it("accepts a French internal fallback alongside a valid external replay link", () => {
    const result = classifyHtmlResponse({
      path: "/fr/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: `<html>Statut actuel Couverture par source
        <a href="/fr/browse/42">Voir le site archivé</a>
        <a href="https://replay.healtharchive.ca/job-1/20250101000000/https://example.ca">Voir le site archivé</a>
      </html>`,
    });

    expect(result.result).toBe("pass");
    expect(result.internalBrowseFallbackCount).toBe(1);
    expect(result.externalReplayLinkCount).toBe(1);
    expect(result.expectedOriginRequired).toBe(true);
  });

  it("rejects a valid internal fallback when another external replay link is wrong", () => {
    const result = classifyHtmlResponse({
      path: "/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: `<html>Current status Per-source coverage
        <a href="/browse/42">View archived site</a>
        <a href="https://wrong-replay.example.invalid/job/2">View archived site</a>
      </html>`,
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("archive-link-origin-invalid");
    expect(result.internalBrowseFallbackCount).toBe(1);
    expect(result.externalReplayLinkCount).toBe(0);
    expect(result.invalidArchiveHrefCount).toBe(1);
  });

  it.each([
    ["wrong locale prefix", "/fr/browse/42"],
    ["default English prefix", "/en/browse/42"],
    ["zero identifier", "/browse/0"],
    ["query suffix", "/browse/42?source=health"],
    ["encoded identifier", "/browse/%34%32"],
    ["unrelated relative path", "/archive/42"],
  ])("rejects a noncanonical English internal browse fallback: %s", (_case, href) => {
    const result = classifyHtmlResponse({
      path: "/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: `<html>Current status Per-source coverage <a href="${href}">View archived site</a></html>`,
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("archive-link-origin-invalid");
    expect(result.internalBrowseFallbackCount).toBe(0);
    expect(result.invalidArchiveHrefCount).toBe(1);
  });

  it("rejects an arbitrary HTML fallback without the canonical status-page structure", () => {
    const result = classifyHtmlResponse({
      path: "/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: "<html><h1>Temporary page</h1></html>",
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("page-shape");
  });

  it("requires the production replay origin whenever status renders an archived-site link", () => {
    const result = classifyHtmlResponse({
      path: "/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: '<html>Current status Per-source coverage <a href="https://other-replay.example.invalid/job/1">View archived site</a></html>',
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("archive-link-origin-invalid");
    expect(result.expectedOriginRequired).toBe(true);
  });

  it("rejects a mixed status page when any archived-site anchor has the wrong origin", () => {
    const result = classifyHtmlResponse({
      path: "/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: `${expectedHtml("/status")}<a href="https://wrong-replay.example.invalid/job/2">View archived site</a>`,
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("archive-link-origin-invalid");
    expect(result.archiveLinkLabels).toBe(2);
    expect(result.invalidArchiveHrefCount).toBe(1);
  });

  it.each([
    ["missing", "<a>View archived site</a>"],
    ["empty", '<a href="">View archived site</a>'],
    ["malformed", '<a href="http://[::1">View archived site</a>'],
    ["wrong host", '<a href="https://wrong-replay.example.invalid/job/2">View archived site</a>'],
    ["sentinel", '<a href="https://replay-sentinel.invalid/job/2">View archived site</a>'],
    ["localhost", '<a href="http://localhost:8090/job/2">View archived site</a>'],
  ])("rejects a %s archived-site href", (_kind, anchor) => {
    const result = classifyHtmlResponse({
      path: "/fr/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: `<html>Statut actuel Couverture par source ${anchor}</html>`,
    });

    expect(result.result).toBe("fail");
    expect(result.archiveLinkLabels).toBe(1);
    expect(result.invalidArchiveHrefCount + result.sentinelRefs).toBeGreaterThan(0);
  });

  it("accepts French archived-site links with HTML-encoded query delimiters", () => {
    const result = classifyHtmlResponse({
      path: "/fr/status",
      status: 200,
      contentType: "text/html; charset=utf-8",
      html: '<html>Statut actuel Couverture par source <a href="https://replay.healtharchive.ca/job-1/?a=1&amp;b=2">Voir le site archivé</a></html>',
    });

    expect(result.result).toBe("pass");
    expect(result.archiveLinkLabels).toBe(1);
    expect(result.invalidArchiveHrefCount).toBe(0);
  });

  it("fails when the expected public origin is absent or replaced by another origin", () => {
    const result = classifyHtmlResponse({
      path: "/exports",
      status: 200,
      contentType: "text/html",
      html: "<html>Exports overview Export manifest https://api.example.invalid/api/check</html>",
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("expected-origin-absent");
  });

  it.each([
    ["localhost", "http://localhost:8001/api/check"],
    ["loopback fallback", "http://127.0.0.1:8001/api/check"],
  ])("rejects the %s API fallback", (_name, origin) => {
    const result = classifyHtmlResponse({
      path: "/exports",
      status: 200,
      contentType: "text/html",
      html: `<html>Exports overview Export manifest ${origin}</html>`,
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("localhost-origin-present");
    expect(result.localhostRefs).toBeGreaterThan(0);
  });

  it("rejects sentinel build or runtime origins even when production references also appear", () => {
    const result = classifyHtmlResponse({
      path: "/exports",
      status: 200,
      contentType: "text/html",
      html: `${expectedHtml("/exports")} https://api-sentinel.invalid/api/check`,
    });

    expect(result.result).toBe("fail");
    expect(result.reason).toBe("sentinel-origin-present");
    expect(result.sentinelRefs).toBeGreaterThan(0);
  });

  it.each([301, 302, 307, 308, 503])(
    "rejects HTTP %s instead of following or accepting it",
    async (status) => {
      const fetchImpl = vi.fn(async () => htmlResponse("redirect or error", { status }));
      const result = await probeRoute({ path: "/exports", fetchImpl });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
      expect(result.status).toBe(status);
      expect(result.result).toBe("fail");
      expect(result.reason).toBe("http-status");
    },
  );

  it("rejects a non-HTML 200 response", async () => {
    const result = await probeRoute({
      path: "/exports",
      fetchImpl: async () =>
        htmlResponse(expectedHtml("/exports"), { contentType: "application/json" }),
    });

    expect(result.status).toBe(200);
    expect(result.reason).toBe("content-type");
    expect(result.result).toBe("fail");
  });

  it("reads HTML only up to the configured byte limit", async () => {
    const response = htmlResponse("x".repeat(MAX_HTML_BYTES + 1));

    await expect(readBoundedHtml(response)).rejects.toMatchObject({
      code: "response-too-large",
    });
  });

  it("reports an oversized route response without emitting its body", async () => {
    const result = await probeRoute({
      path: "/exports",
      maxHtmlBytes: 16,
      fetchImpl: async () => htmlResponse("x".repeat(32)),
    });

    expect(result.status).toBe(200);
    expect(result.reason).toBe("response-too-large");
    expect(JSON.stringify(result)).not.toContain("xxxxxxxx");
  });

  it("bounds request timeouts", async () => {
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            {
              once: true,
            },
          );
        }),
    );

    const result = await probeRoute({ path: "/exports", fetchImpl, requestTimeoutMs: 5 });

    expect(result.status).toBe("unavailable");
    expect(result.reason).toBe("request-timeout");
  });

  it("keeps the timeout active while reading the response body", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            pull: () => new Promise(() => {}),
          }),
          { headers: { "content-type": "text/html" } },
        ),
    );

    const result = await probeRoute({ path: "/exports", fetchImpl, requestTimeoutMs: 5 });

    expect(result.status).toBe(200);
    expect(result.reason).toBe("request-timeout");
  });

  it("fails readiness closed on a non-200 response and keeps the probe count bounded", async () => {
    let now = 0;
    const fetchImpl = vi.fn(async () => htmlResponse("starting", { status: 503 }));

    await expect(
      waitForReadiness({
        fetchImpl,
        readinessTimeoutMs: 10,
        requestTimeoutMs: 5,
        pollIntervalMs: 1,
        now: () => now,
        sleep: async (duration) => {
          now += duration;
        },
      }),
    ).rejects.toMatchObject({ code: "readiness-timeout-readiness-http-503" });
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(0);
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(120);
  });

  it("waits for a ready HTML route without following redirects", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("starting", { status: 503 }))
      .mockResolvedValueOnce(htmlResponse("ready"));

    await expect(
      waitForReadiness({
        fetchImpl,
        readinessTimeoutMs: 100,
        pollIntervalMs: 0,
        sleep: async () => {},
      }),
    ).resolves.toMatchObject({ attempts: 2 });
    expect(fetchImpl.mock.calls.every((call) => call[1].redirect === "manual")).toBe(true);
  });

  it("continues collecting route outcomes after individual failures", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith("/fr/exports")) return htmlResponse(expectedHtml("/fr/exports"));
      if (url.endsWith("/exports"))
        return htmlResponse(`${expectedHtml("/exports")} http://localhost:8001/api/check`);
      if (url.endsWith("/fr/status")) return htmlResponse(expectedHtml("/fr/status"));
      if (url.endsWith("/status")) return htmlResponse(expectedHtml("/status"));
      return htmlResponse("<html>unexpected path</html>");
    });

    const summary = await runDockerPublicConfigSmoke({
      fetchImpl,
      readinessTimeoutMs: 100,
      pollIntervalMs: 0,
      sleep: async () => {},
    });

    expect(summary.readiness).toBe("pass");
    expect(summary.result).toBe("fail");
    expect(summary.results).toHaveLength(4);
    expect(summary.results.map((result) => result.result)).toEqual([
      "fail",
      "pass",
      "pass",
      "pass",
    ]);
  });
});
