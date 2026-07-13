"use strict";

const AUDIT_PATHS = ["/", "/archive?q=health", "/snapshot/phac-2025-02-15-covid-epi"];

function requireLoopbackOrigin(rawOrigin) {
  let origin;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new Error("HEALTHARCHIVE_LIGHTHOUSE_ORIGIN must be a valid URL");
  }
  if (
    origin.protocol !== "http:" ||
    origin.username !== "" ||
    origin.password !== "" ||
    (origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") ||
    origin.pathname !== "/" ||
    origin.search !== "" ||
    origin.hash !== ""
  ) {
    throw new Error(
      "HEALTHARCHIVE_LIGHTHOUSE_ORIGIN must be an uncredentialed loopback HTTP origin",
    );
  }
  return origin.origin;
}

function createLighthouseConfig(rawOrigin) {
  const origin = requireLoopbackOrigin(rawOrigin);
  return {
    ci: {
      collect: {
        numberOfRuns: 3,
        url: AUDIT_PATHS.map((path) => new URL(path, `${origin}/`).href),
        settings: {
          chromeFlags: "--no-sandbox --disable-dev-shm-usage --force-prefers-reduced-motion",
          preset: "desktop",
        },
      },
      assert: {
        aggregationMethod: "median-run",
        assertions: {
          "categories:accessibility": ["error", { minScore: 0.9 }],
          "categories:best-practices": ["error", { minScore: 0.9 }],
          "categories:performance": ["error", { minScore: 0.75 }],
          "categories:seo": ["error", { minScore: 0.9 }],
          "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
          "first-contentful-paint": ["error", { maxNumericValue: 3_000 }],
          "largest-contentful-paint": ["error", { maxNumericValue: 4_000 }],
          "resource-summary:script:size": ["error", { maxNumericValue: 500_000 }],
          "total-blocking-time": ["error", { maxNumericValue: 600 }],
          "total-byte-weight": ["error", { maxNumericValue: 1_500_000 }],
        },
      },
      upload: {
        outputDir: ".lighthouseci",
        reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
        target: "filesystem",
      },
    },
  };
}

module.exports = { AUDIT_PATHS, createLighthouseConfig, requireLoopbackOrigin };
