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
  getApiBaseUrl: () => "https://api.example.test",
}));

vi.mock("@/data/demo-records", () => ({
  getRecordById: vi.fn().mockReturnValue(null),
}));

vi.mock("@/components/SnapshotFrame", () => ({
  SnapshotFrame: ({
    src,
    title,
    rawLink,
    apiLink,
  }: {
    src: string;
    title: string;
    rawLink?: string;
    apiLink?: string;
  }) => (
    <div>
      <div>SnapshotFrame mock: {title}</div>
      <div>src: {src}</div>
      <div>raw: {rawLink}</div>
      <div>api: {apiLink}</div>
      <div>Archived content unavailable</div>
      <a href={rawLink}>Open raw snapshot</a>
      {apiLink && <a href={apiLink}>View metadata JSON</a>}
    </div>
  ),
}));

import { fetchSnapshotDetail } from "@/lib/api";
const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);

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
      topics: [{ slug: "covid-19", label: "COVID-19" }],
      captureDate: "2024-01-02",
      originalUrl: "https://example.com",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/42",
      mimeType: "text/html",
      statusCode: 200,
    });

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "42" }) });
    render(ui);

    expect(screen.getAllByText(/Snapshot Title/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Open raw snapshot/i).length).toBeGreaterThan(0);
  });

  it("shows error overlay and links when iframe fails", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
      id: 43,
      title: "Snapshot Error",
      sourceCode: "phac",
      sourceName: "PHAC",
      language: "en",
      topics: [{ slug: "covid-19", label: "COVID-19" }],
      captureDate: "2024-01-02",
      originalUrl: "https://example.com",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/43",
      mimeType: "text/html",
      statusCode: 200,
    });

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "43" }) });
    render(ui);

    expect(screen.getByText(/Archived content unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Open raw snapshot/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/View metadata JSON/i)).toBeInTheDocument();
  });

  it("handles backend metadata without raw snapshot URL", async () => {
    mockFetchSnapshotDetail.mockResolvedValue({
      id: 44,
      title: "Snapshot No Raw",
      sourceCode: "phac",
      sourceName: "PHAC",
      language: "en",
      topics: [{ slug: "covid-19", label: "COVID-19" }],
      captureDate: "2024-01-03",
      originalUrl: "https://example.com",
      snippet: "Summary",
      rawSnapshotUrl: null,
      mimeType: "text/html",
      statusCode: 200,
    });

    const ui = await SnapshotPage({ params: Promise.resolve({ id: "44" }) });
    render(ui);

    // Should render metadata title even when raw content is missing.
    expect(screen.getAllByText(/Snapshot No Raw/i).length).toBeGreaterThan(0);
  });

  it("calls notFound when no snapshot exists", async () => {
    mockFetchSnapshotDetail.mockRejectedValue(new Error("not found"));
    const ui = await SnapshotPage({ params: Promise.resolve({ id: "9999" }) });
    render(ui);
    expect(notFoundMock).toHaveBeenCalled();
  });
});
