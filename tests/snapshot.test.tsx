import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import SnapshotPage from "@/app/[locale]/snapshot/[id]/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const notFoundMock = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("@/lib/api", () => ({
  fetchSnapshotDetail: vi.fn(),
  fetchSnapshotLatest: vi.fn(),
  fetchSnapshotTimeline: vi.fn(),
  fetchSourceEditions: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

vi.mock("@/data/demo-records", () => ({
  getRecordById: vi.fn().mockReturnValue(null),
}));

vi.mock("@/components/SnapshotFrame", () => ({
  SnapshotFrame: ({
    src,
    title,
    browseLink,
    rawLink,
    apiLink,
  }: {
    src: string;
    title: string;
    browseLink?: string;
    rawLink?: string;
    apiLink?: string;
  }) => (
    <div>
      <div>SnapshotFrame mock: {title}</div>
      <div>src: {src}</div>
      <div>browse: {browseLink}</div>
      <div>raw: {rawLink}</div>
      <div>api: {apiLink}</div>
      <div>Archived content unavailable</div>
      {browseLink && <a href={browseLink}>Open archived page</a>}
      {rawLink && <a href={rawLink}>Open raw HTML</a>}
      {apiLink && <a href={apiLink}>View metadata JSON</a>}
    </div>
  ),
}));

import { fetchSnapshotDetail, fetchSnapshotLatest, fetchSourceEditions } from "@/lib/api";
const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);
const mockFetchSnapshotLatest = vi.mocked(fetchSnapshotLatest);
const mockFetchSourceEditions = vi.mocked(fetchSourceEditions);

describe("/snapshot/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to browse mode with details collapsed", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
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
        "https://replay.healtharchive.ca/job-1/20240104123456/https://canada.ca/en/health-canada.html",
      mimeType: "text/html",
      statusCode: 200,
    });
    mockFetchSnapshotLatest.mockResolvedValue({
      found: true,
      snapshotId: 46,
      captureTimestamp: "2024-02-02T00:00:00+00:00",
      mimeType: "text/html",
    });
    mockFetchSourceEditions.mockResolvedValue([
      {
        jobId: 1,
        jobName: "legacy-hc-older",
        recordCount: 123,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-02",
      },
      {
        jobId: 2,
        jobName: "legacy-hc-newer",
        recordCount: 456,
        firstCapture: "2024-02-01",
        lastCapture: "2024-02-02",
      },
    ]);

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "45" }) });
    render(ui);

    expect(screen.getByText(/Browsing archived site/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Canada/i)).toBeInTheDocument();
    expect(screen.getByText(/Snapshot details/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /How to cite/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Compare to the live page/i })).toHaveAttribute(
      "href",
      "/compare-live?to=46&run=1",
    );
  });

  it("opens the details section when view=details", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
      id: 43,
      title: "Snapshot Error",
      sourceCode: "phac",
      sourceName: "PHAC",
      language: "en",
      captureDate: "2024-01-02",
      captureTimestamp: "2024-01-02T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://example.com",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/43",
      browseUrl: null,
      mimeType: "text/html",
      statusCode: 200,
    });
    mockFetchSnapshotLatest.mockResolvedValue({
      found: true,
      snapshotId: 43,
      captureTimestamp: "2025-01-01T00:00:00+00:00",
      mimeType: "text/html",
    });

    const ui = await SnapshotPage({
      params: Promise.resolve({ id: "43" }),
      searchParams: Promise.resolve({ view: "details" }),
    });
    render(ui);

    expect(screen.getByText(/Snapshot details/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Snapshot Error/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /How to cite/i })).toHaveAttribute("href", "/cite");
  });

  it("calls notFound when no snapshot exists", async () => {
    mockFetchSnapshotDetail.mockRejectedValue(new Error("not found"));
    const ui = await SnapshotPage({ params: Promise.resolve({ id: "9999" }) });
    render(ui);
    expect(notFoundMock).toHaveBeenCalled();
  });
});
