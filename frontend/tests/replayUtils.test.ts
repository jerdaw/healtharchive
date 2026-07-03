import { describe, expect, it } from "vitest";

import {
  buildReplayUrlForReadyEdition,
  sanitizeReplayTopUrl,
} from "@/components/replay/replayUtils";

describe("sanitizeReplayTopUrl", () => {
  const replayOrigin = "https://replay.healtharchive.ca";

  it("accepts same-origin replay job URLs and strips fragments", () => {
    expect(
      sanitizeReplayTopUrl(
        "https://replay.healtharchive.ca/job-1/20260101000000/https://example.ca/#section",
        replayOrigin,
      ),
    ).toBe("https://replay.healtharchive.ca/job-1/20260101000000/https://example.ca/");
  });

  it("accepts relative same-origin replay job URLs", () => {
    expect(sanitizeReplayTopUrl("/job-1/20260101000000/https://example.ca/", replayOrigin)).toBe(
      "https://replay.healtharchive.ca/job-1/20260101000000/https://example.ca/",
    );
  });

  it.each([
    "https://evil.example/job-1/20260101000000/https://example.ca/",
    "javascript:alert(1)",
    "/login",
  ])("rejects unsafe replay URL %s", (value) => {
    expect(sanitizeReplayTopUrl(value, replayOrigin)).toBeNull();
  });
});

describe("buildReplayUrlForReadyEdition", () => {
  const replayOrigin = "https://replay.healtharchive.ca";

  it("builds a timegate fallback only when the edition has a replay-ready entry URL", () => {
    const url = buildReplayUrlForReadyEdition(
      replayOrigin,
      {
        jobId: 17,
        jobName: "hc-2026",
        recordCount: 10,
        firstCapture: "2026-01-01",
        lastCapture: "2026-01-31",
        entryBrowseUrl: "https://replay.healtharchive.ca/job-17/https://example.ca/",
      },
      null,
      "https://example.ca/page#section",
    );

    expect(url).toBe("https://replay.healtharchive.ca/job-17/https://example.ca/page");
  });

  it("does not synthesize a replay URL when the selected edition is not replay-ready", () => {
    const url = buildReplayUrlForReadyEdition(
      replayOrigin,
      {
        jobId: 18,
        jobName: "hc-cold-only",
        recordCount: 10,
        firstCapture: "2026-01-01",
        lastCapture: "2026-01-31",
        entryBrowseUrl: null,
      },
      "20260101000000",
      "https://example.ca/page",
    );

    expect(url).toBeNull();
  });
});
