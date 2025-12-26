import { act, render, screen } from "@testing-library/react";
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
}));

import { resolveReplayUrl } from "@/lib/api";

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
    mockResolveReplayUrl.mockResolvedValue({
      found: true,
      snapshotId: 999,
      captureTimestamp: "2024-01-04T12:34:56+00:00",
      resolvedUrl: "https://example.org/other",
      browseUrl: null,
      mimeType: "text/html",
    });

    render(
      <BrowseReplayClient
        snapshotId="45"
        title="Snapshot Replay"
        sourceCode="hc"
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

    expect(screen.getByRole("link", { name: /Compare to the live page/i })).toHaveAttribute(
      "href",
      "/compare-live?to=45",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("link", { name: /Compare to the live page/i })).toHaveAttribute(
      "href",
      "/compare-live?to=999",
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
        sourceCode="hc"
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

    expect(screen.getByRole("link", { name: /Compare to the live page/i })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(
      screen.queryByRole("link", { name: /Compare to the live page/i }),
    ).not.toBeInTheDocument();
  });
});
