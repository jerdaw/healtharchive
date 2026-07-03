import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrowseReplayClient } from "@/components/replay/BrowseReplayClient";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/SnapshotFrame", () => ({
  SnapshotFrame: ({ src }: { src: string }) => <div>SnapshotFrame mock: {src}</div>,
}));

vi.mock("@/lib/api", () => ({
  resolveReplayUrl: vi.fn(),
  fetchSnapshotLatest: vi.fn(),
  fetchSnapshotTimeline: vi.fn(),
}));

import { fetchSnapshotLatest, resolveReplayUrl } from "@/lib/api";

describe("BrowseReplayClient compare-live follow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the compare-live link when a newer snapshot is resolvable and HTML", async () => {
    const mockResolveReplayUrl = vi.mocked(resolveReplayUrl);
    const mockFetchSnapshotLatest = vi.mocked(fetchSnapshotLatest);
    mockResolveReplayUrl.mockResolvedValue({
      found: true,
      snapshotId: 999,
      captureTimestamp: "2024-01-04T12:34:56+00:00",
      resolvedUrl: "https://example.org/other",
      browseUrl: null,
      mimeType: "text/html",
    });
    mockFetchSnapshotLatest.mockResolvedValue({
      found: true,
      snapshotId: 1000,
      captureTimestamp: "2025-01-01T00:00:00+00:00",
      mimeType: "text/html",
    });

    render(
      <BrowseReplayClient
        snapshotId="45"
        title="Snapshot Replay"
        language="en"
        sourceName="Health Canada"
        captureDate="2024-01-04"
        captureTimestamp="2024-01-04T12:34:56+00:00"
        jobId={1}
        originalUrl="https://example.org/page"
        browseUrl={null}
        rawHtmlUrl="https://api.example.test/api/snapshots/raw/45"
        apiLink="https://api.example.test/api/snapshot/45"
        canCompareLive
      />,
    );

    expect(screen.getByRole("link", { name: /View diff/i })).toHaveAttribute(
      "href",
      "/compare-live?to=45",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("link", { name: /View diff/i })).toHaveAttribute(
      "href",
      "/compare-live?to=1000",
    );
  });

  it("hides the compare-live link when the resolved page is not HTML", async () => {
    const mockResolveReplayUrl = vi.mocked(resolveReplayUrl);
    mockResolveReplayUrl.mockResolvedValue({
      found: true,
      snapshotId: 999,
      captureTimestamp: "2024-01-04T12:34:56+00:00",
      resolvedUrl: "https://example.org/file.pdf",
      browseUrl: null,
      mimeType: "application/pdf",
    });

    render(
      <BrowseReplayClient
        snapshotId="45"
        title="Snapshot Replay"
        language="en"
        sourceName="Health Canada"
        captureDate="2024-01-04"
        captureTimestamp="2024-01-04T12:34:56+00:00"
        jobId={1}
        originalUrl="https://example.org/page"
        browseUrl={null}
        rawHtmlUrl="https://api.example.test/api/snapshots/raw/45"
        apiLink="https://api.example.test/api/snapshot/45"
        canCompareLive
      />,
    );

    expect(screen.getByRole("link", { name: /View diff/i })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.queryByRole("link", { name: /View diff/i })).not.toBeInTheDocument();
  });

  it("does not synthesize replay URLs for cold-only editions", async () => {
    const mockResolveReplayUrl = vi.mocked(resolveReplayUrl);
    mockResolveReplayUrl.mockResolvedValue({
      found: false,
      snapshotId: null,
      captureTimestamp: null,
      resolvedUrl: null,
      browseUrl: null,
      mimeType: null,
    });

    render(
      <BrowseReplayClient
        snapshotId="45"
        title="Snapshot Replay"
        language="en"
        sourceName="Health Canada"
        captureDate="2024-01-04"
        captureTimestamp="2024-01-04T12:34:56+00:00"
        jobId={1}
        originalUrl="https://example.org/page"
        browseUrl="https://replay.healtharchive.ca/job-1/20240104123456/https://example.org/page"
        rawHtmlUrl={null}
        apiLink="https://api.example.test/api/snapshot/45"
        editions={[
          {
            jobId: 1,
            jobName: "hot-cache",
            recordCount: 1,
            firstCapture: "2024-01-04",
            lastCapture: "2024-01-04",
            entryBrowseUrl:
              "https://replay.healtharchive.ca/job-1/20240104123456/https://example.org/page",
          },
          {
            jobId: 2,
            jobName: "cold-only",
            recordCount: 1,
            firstCapture: "2024-02-04",
            lastCapture: "2024-02-04",
            entryBrowseUrl: null,
          },
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Edition"), { target: { value: "2" } });
    });

    expect(mockResolveReplayUrl).toHaveBeenCalledWith({
      jobId: 2,
      url: "https://example.org/page",
      timestamp14: "20240104123456",
    });
    expect(
      screen.getByText(
        "SnapshotFrame mock: https://replay.healtharchive.ca/job-1/20240104123456/https://example.org/page",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Replay for the selected edition is not available in the local cache yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/job-2\\/)).not.toBeInTheDocument();
  });
});
