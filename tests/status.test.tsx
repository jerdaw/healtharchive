import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import StatusPage from "@/app/status/page";

vi.mock("@/lib/api", () => ({
  fetchHealth: vi.fn(),
  fetchArchiveStats: vi.fn(),
  fetchSources: vi.fn(),
  fetchUsageMetrics: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import {
  fetchArchiveStats,
  fetchHealth,
  fetchSources,
  fetchUsageMetrics,
} from "@/lib/api";

const mockFetchHealth = vi.mocked(fetchHealth);
const mockFetchArchiveStats = vi.mocked(fetchArchiveStats);
const mockFetchSources = vi.mocked(fetchSources);
const mockFetchUsageMetrics = vi.mocked(fetchUsageMetrics);

describe("/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders status, coverage, and usage sections", async () => {
    mockFetchHealth.mockResolvedValue({ status: "ok" });
    mockFetchArchiveStats.mockResolvedValue({
      snapshotsTotal: 120,
      pagesTotal: 80,
      sourcesTotal: 3,
      latestCaptureDate: "2025-12-21",
      latestCaptureAgeDays: 2,
    });
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "hc",
        sourceName: "Health Canada",
        baseUrl: "https://www.canada.ca/en/health-canada.html",
        description: null,
        recordCount: 50,
        firstCapture: "2024-01-01",
        lastCapture: "2025-12-21",
        latestRecordId: 10,
        entryRecordId: 10,
        entryBrowseUrl: null,
      },
    ]);
    mockFetchUsageMetrics.mockResolvedValue({
      enabled: true,
      windowDays: 30,
      totals: {
        searchRequests: 12,
        snapshotDetailViews: 34,
        rawSnapshotViews: 56,
        reportSubmissions: 2,
      },
      daily: [],
    });

    const ui = await StatusPage();
    render(ui);

    expect(screen.getByText(/Status & metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/Coverage snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Usage snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Canada/i)).toBeInTheDocument();
  });

  it("shows an unavailable message when the backend is unreachable", async () => {
    const failure = new Error("Backend unreachable");
    mockFetchHealth.mockRejectedValue(failure);
    mockFetchArchiveStats.mockRejectedValue(failure);
    mockFetchSources.mockRejectedValue(failure);
    mockFetchUsageMetrics.mockRejectedValue(failure);

    const ui = await StatusPage();
    render(ui);

    expect(screen.getByText(/Live metrics unavailable/i)).toBeInTheDocument();
  });
});
