import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import SnapshotPage from "@/app/snapshot/[id]/page";

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

import { fetchSnapshotDetail, fetchSourceEditions } from "@/lib/api";
const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);
const mockFetchSourceEditions = vi.mocked(fetchSourceEditions);

describe("/snapshot/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backend snapshot and iframe", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
      id: 42,
      title: "Snapshot Title",
      sourceCode: "phac",
      sourceName: "PHAC",
      language: "en",
      captureDate: "2024-01-02",
      captureTimestamp: "2024-01-02T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://example.com",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/42",
      browseUrl: null,
      mimeType: "text/html",
      statusCode: 200,
    });

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "42" }) });
    render(ui);

    expect(screen.getAllByText(/Snapshot Title/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Browse full screen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Important note/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it("shows error overlay and links when iframe fails", async () => {
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

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "43" }) });
    render(ui);

    expect(screen.getByText(/Archived content unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Browse full screen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/View metadata JSON/i)).toBeInTheDocument();
  });

  it("handles backend metadata without raw snapshot URL", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
      id: 44,
      title: "Snapshot No Raw",
      sourceCode: "phac",
      sourceName: "PHAC",
      language: "en",
      captureDate: "2024-01-03",
      captureTimestamp: "2024-01-03T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://example.com",
      snippet: "Summary",
      rawSnapshotUrl: null,
      browseUrl: null,
      mimeType: "text/html",
      statusCode: 200,
    });

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "44" }) });
    render(ui);

    // Should render metadata title even when raw content is missing.
    expect(screen.getAllByText(/Snapshot No Raw/i).length).toBeGreaterThan(0);
  });

  it("prefers browseUrl when available", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
      id: 45,
      title: "Snapshot Replay",
      sourceCode: "hc",
      sourceName: "Health Canada",
      language: "en",
      captureDate: "2024-01-04",
      captureTimestamp: "2024-01-04T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://canada.ca/en/health-canada.html",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/45",
      browseUrl: "https://replay.healtharchive.ca/job-1/https://canada.ca/en/health-canada.html",
      mimeType: "text/html",
      statusCode: 200,
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

    expect(screen.getAllByText(/Browse full screen/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Open in replay/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Raw HTML/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Backup/i)).toBeInTheDocument();
  });

  it("calls notFound when no snapshot exists", async () => {
    mockFetchSnapshotDetail.mockRejectedValue(new Error("not found"));
    const ui = await SnapshotPage({ params: Promise.resolve({ id: "9999" }) });
    render(ui);
    expect(notFoundMock).toHaveBeenCalled();
  });
});
