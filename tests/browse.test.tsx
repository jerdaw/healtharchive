import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import BrowseSnapshotPage from "@/app/browse/[id]/page";

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
  getApiBaseUrl: () => "https://api.example.test",
}));

vi.mock("@/data/demo-records", () => ({
  getRecordById: vi.fn().mockReturnValue(null),
}));

vi.mock("@/components/SnapshotFrame", () => ({
  SnapshotFrame: ({
    src,
    title,
  }: {
    src: string;
    title: string;
  }) => (
    <div>
      <div>SnapshotFrame mock: {title}</div>
      <div>src: {src}</div>
    </div>
  ),
}));

import { fetchSnapshotDetail, fetchSourceEditions } from "@/lib/api";
const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);
const mockFetchSourceEditions = vi.mocked(fetchSourceEditions);

describe("/browse/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders browse view using replay browseUrl when available", async () => {
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

    const ui = await BrowseSnapshotPage({ params: Promise.resolve({ id: "45" }) });
    render(ui);

    expect(screen.getByText(/Browsing archived site/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Canada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Switch backup/i)).toBeInTheDocument();
    expect(screen.getByText(/Open in replay/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /src: https:\/\/replay\.healtharchive\.ca\/job-1\/20240104123456\//i,
      ),
    ).toBeInTheDocument();
  });

  it("calls notFound when no snapshot exists", async () => {
    mockFetchSnapshotDetail.mockRejectedValue(new Error("not found"));
    const ui = await BrowseSnapshotPage({ params: Promise.resolve({ id: "9999" }) });
    render(ui);
    expect(notFoundMock).toHaveBeenCalled();
  });
});
