import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SnapshotReplayClient } from "@/components/replay/SnapshotReplayClient";

vi.mock("@/components/SnapshotFrame", () => ({
  SnapshotFrame: ({ src }: { src: string }) => <div>SnapshotFrame mock: {src}</div>,
}));

vi.mock("@/lib/api", () => ({
  resolveReplayUrl: vi.fn(),
}));

import { resolveReplayUrl } from "@/lib/api";

describe("SnapshotReplayClient edition replay cache handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      <SnapshotReplayClient
        title="Snapshot Replay"
        initialSrc="https://replay.healtharchive.ca/job-1/20240104123456/https://example.org/page"
        browseUrl="https://replay.healtharchive.ca/job-1/20240104123456/https://example.org/page"
        rawHtmlUrl={null}
        apiLink="https://api.example.test/api/snapshot/45"
        initialJobId={1}
        initialCaptureTimestamp="2024-01-04T12:34:56+00:00"
        initialOriginalUrl="https://example.org/page"
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
    expect(screen.queryByText(/job-2\//)).not.toBeInTheDocument();
  });
});
