import { vi } from "vitest";
import BrowseSnapshotPage from "@/app/[locale]/browse/[id]/page";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/lib/api", () => ({
  fetchSnapshotDetail: vi.fn(),
}));

vi.mock("@/data/demo-records", () => ({
  getRecordById: vi.fn().mockReturnValue(null),
}));

import { fetchSnapshotDetail, type SnapshotDetail } from "@/lib/api";
const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);

describe("/browse/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the replay service when browseUrl is available", async () => {
    const detail: SnapshotDetail = {
      id: 45,
      title: "Snapshot Replay",
      sourceCode: "hc",
      sourceName: "Health Canada",
      language: "en",
      captureDate: "2024-01-04",
      captureTimestamp: "2024-01-04T12:34:56+00:00",
      jobId: 1,
      originalUrl: "https://canada.ca/en/health-canada.html",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/45",
      browseUrl:
        "https://replay.healtharchive.ca/job-1/20240104123456/https://canada.ca/en/health-canada.html#ha_snapshot=45",
      mimeType: "text/html",
      statusCode: 200,
    };
    mockFetchSnapshotDetail.mockResolvedValue(detail);

    await expect(async () => {
      await BrowseSnapshotPage({ params: Promise.resolve({ id: "45" }) });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith(
      "https://replay.healtharchive.ca/job-1/20240104123456/https://canada.ca/en/health-canada.html#ha_snapshot=45",
    );
  });

  it("falls back to the details page when browseUrl is missing", async () => {
    const detail: SnapshotDetail = {
      id: 45,
      title: "Snapshot Replay",
      sourceCode: "hc",
      sourceName: "Health Canada",
      language: "en",
      captureDate: "2024-01-04",
      captureTimestamp: "2024-01-04T12:34:56+00:00",
      jobId: 1,
      originalUrl: "https://canada.ca/en/health-canada.html",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/45",
      browseUrl: null,
      mimeType: "text/html",
      statusCode: 200,
    };
    mockFetchSnapshotDetail.mockResolvedValue(detail);

    await expect(async () => {
      await BrowseSnapshotPage({ params: Promise.resolve({ id: "45", locale: "fr" }) });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/fr/snapshot/45");
  });
});
