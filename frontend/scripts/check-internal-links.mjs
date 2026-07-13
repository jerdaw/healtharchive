import {
  classifyPageResponse,
  extractInternalPaths,
  getLoopbackHttpTarget,
  resolveSameOriginRedirect,
  wouldExceedPageLimit,
} from "./internal-link-check-lib.mjs";
import {
  LOOPBACK_HOST,
  findAvailablePort,
  prepareStandaloneAssets,
  startFailFastApiStub as startSharedApiStub,
  startStandaloneFrontend,
  stopChildProcess,
  stopHttpServer,
  waitForServer as waitForSharedServer,
} from "./local-production-server-lib.mjs";

const HOST = LOOPBACK_HOST;
const MAX_PAGES = readPositiveInteger("HEALTHARCHIVE_LINK_CHECK_MAX_PAGES", 100);
const REQUEST_TIMEOUT_MS = readPositiveInteger(
  "HEALTHARCHIVE_LINK_CHECK_REQUEST_TIMEOUT_MS",
  15_000,
);
const STARTUP_TIMEOUT_MS = readPositiveInteger(
  "HEALTHARCHIVE_LINK_CHECK_STARTUP_TIMEOUT_MS",
  60_000,
);
const MAX_REDIRECTS = 10;

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

async function startFailFastApiStub() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8001";
  const target = getLoopbackHttpTarget(apiBaseUrl);
  if (target === null) {
    throw new Error(
      "link checking requires NEXT_PUBLIC_API_BASE_URL to use non-privileged loopback HTTP",
    );
  }

  try {
    return await startSharedApiStub({ ...target, purpose: "link-check" });
  } catch (error) {
    if (error?.code === "EADDRINUSE") return null;
    throw error;
  }
}

async function startFrontend(port) {
  await prepareStandaloneAssets();
  return startStandaloneFrontend({ port });
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function waitForServer(origin, child) {
  return waitForSharedServer({
    origin,
    child,
    startupTimeoutMs: STARTUP_TIMEOUT_MS,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
  });
}

async function fetchSameOrigin(startUrl, origin) {
  let url = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchWithTimeout(url, { redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: url, redirected: redirectCount > 0 };
    }

    const location = response.headers.get("location");
    const nextUrl =
      location === null ? null : resolveSameOriginRedirect({ location, currentUrl: url, origin });
    if (nextUrl === null) {
      throw new Error(`HTTP ${response.status} redirect left the local origin or had no location`);
    }
    await response.body?.cancel();
    url = nextUrl;
  }

  throw new Error(`more than ${MAX_REDIRECTS} redirects`);
}

function boundedError(error) {
  const message = error instanceof Error ? error.message : "unknown error";
  return message.replaceAll(/\s+/g, " ").slice(0, 240);
}

async function crawl(origin) {
  const seeds = ["/", "/fr"];
  const discovered = new Set(seeds);
  const queue = seeds.map((path) => ({ path, foundOn: "seed" }));
  const failures = [];
  let visitedCount = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    visitedCount += 1;

    try {
      const { response, finalUrl, redirected } = await fetchSameOrigin(
        new URL(current.path, origin).href,
        origin,
      );
      const result = classifyPageResponse({
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        redirected,
      });
      if (!result.ok) {
        failures.push({ ...current, reason: result.reason });
        continue;
      }
      if (!result.parseLinks) {
        continue;
      }

      const html = await response.text();
      const finalPath = new URL(finalUrl).pathname;
      const newPaths = extractInternalPaths(html, {
        currentPath: finalPath,
        origin,
      }).filter((path) => !discovered.has(path));

      if (
        wouldExceedPageLimit({
          discoveredCount: discovered.size,
          addedCount: newPaths.length,
          maxPages: MAX_PAGES,
        })
      ) {
        throw new Error(
          `page limit ${MAX_PAGES} would truncate links discovered on ${current.path}`,
        );
      }

      for (const path of newPaths) {
        discovered.add(path);
        queue.push({ path, foundOn: current.path });
      }
    } catch (error) {
      failures.push({ ...current, reason: boundedError(error) });
    }
  }

  return { discoveredCount: discovered.size, failures, visitedCount };
}

async function stopFrontend(child) {
  return stopChildProcess(child);
}

async function stopApiStub(server) {
  return stopHttpServer(server);
}

async function main() {
  const port = await findAvailablePort();
  const origin = `http://${HOST}:${port}`;
  const server = await startFrontend(port);
  let apiStub = null;

  const stopOnSignal = () => {
    void Promise.all([stopFrontend(server.child), stopApiStub(apiStub)]).finally(() =>
      process.exit(1),
    );
  };
  process.once("SIGINT", stopOnSignal);
  process.once("SIGTERM", stopOnSignal);

  try {
    apiStub = await startFailFastApiStub();
    await waitForServer(origin, server.child);
    const result = await crawl(origin);
    if (result.failures.length > 0) {
      console.error(
        `Internal link check failed for ${result.failures.length} of ${result.visitedCount} visited routes:`,
      );
      for (const failure of result.failures) {
        console.error(`- ${failure.path} (found on ${failure.foundOn}): ${failure.reason}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Internal link check passed: ${result.visitedCount} routes visited from English and French seeds.`,
    );
  } catch (error) {
    console.error(`Internal link check could not run: ${boundedError(error)}`);
    const logs = server.getLogs().trim();
    if (logs !== "") {
      console.error(`Bounded Next server output:\n${logs}`);
    }
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", stopOnSignal);
    process.removeListener("SIGTERM", stopOnSignal);
    await Promise.all([stopFrontend(server.child), stopApiStub(apiStub)]);
  }
}

await main();
