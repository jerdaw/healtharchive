import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ImpactPage from "@/app/[locale]/impact/page";

vi.mock("@/lib/api", () => ({
  fetchArchiveStats: vi.fn(),
  fetchUsageMetrics: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import { fetchArchiveStats, fetchUsageMetrics } from "@/lib/api";

const mockFetchArchiveStats = vi.mocked(fetchArchiveStats);
const mockFetchUsageMetrics = vi.mocked(fetchUsageMetrics);

describe("/impact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the monthly impact report sections", async () => {
    mockFetchArchiveStats.mockResolvedValue({
      snapshotsTotal: 120,
      pagesTotal: 80,
      sourcesTotal: 3,
      latestCaptureDate: "2025-12-21",
      latestCaptureAgeDays: 2,
    });
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

    const ui = await ImpactPage();
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: /Monthly impact report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Coverage snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Usage snapshot/i)).toBeInTheDocument();
  });
});
