import { render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import StatusPage from "@/app/[locale]/status/page";

vi.mock("@/lib/api", () => ({
  fetchHealth: vi.fn(),
  fetchArchiveStats: vi.fn(),
  fetchSources: vi.fn(),
  fetchSourcesLocalized: vi.fn(),
  fetchUsageMetrics: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import {
  fetchArchiveStats,
  fetchHealth,
  fetchSources,
  fetchSourcesLocalized,
  fetchUsageMetrics,
} from "@/lib/api";

const mockFetchHealth = vi.mocked(fetchHealth);
const mockFetchArchiveStats = vi.mocked(fetchArchiveStats);
const mockFetchSources = vi.mocked(fetchSources);
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);
const mockFetchUsageMetrics = vi.mocked(fetchUsageMetrics);

describe("/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders status, coverage, and usage sections", async () => {
    const checkedAt = new Date("2026-01-02T15:04:05.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(checkedAt);
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

    const ui = await StatusPage({ params: Promise.resolve({ locale: "en" }) });
    const { container } = render(ui);

    expect(screen.getByText(/Status & metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/Coverage snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Usage snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Canada/i)).toBeInTheDocument();
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", checkedAt.toISOString());
    expect(time).toHaveTextContent(
      checkedAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }),
    );
  });

  it("shows an unavailable message when the backend is unreachable", async () => {
    const failure = new Error("Backend unreachable");
    mockFetchHealth.mockRejectedValue(failure);
    mockFetchArchiveStats.mockRejectedValue(failure);
    mockFetchSources.mockRejectedValue(failure);
    mockFetchUsageMetrics.mockRejectedValue(failure);

    const ui = await StatusPage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    expect(screen.getByText(/Live metrics unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText("Usage data is not available for this reporting period."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Enable aggregated usage counts/i)).not.toBeInTheDocument();
  });

  it("uses public French copy when usage reporting is disabled", async () => {
    mockFetchHealth.mockResolvedValue({ status: "ok" });
    mockFetchArchiveStats.mockRejectedValue(new Error("Archive stats unavailable"));
    mockFetchSourcesLocalized.mockResolvedValue([]);
    mockFetchUsageMetrics.mockResolvedValue({
      enabled: false,
      windowDays: 30,
      totals: {
        searchRequests: 0,
        snapshotDetailViews: 0,
        rawSnapshotViews: 0,
        reportSubmissions: 0,
      },
      daily: [],
    });

    const ui = await StatusPage({ params: Promise.resolve({ locale: "fr" }) });
    render(ui);

    expect(
      screen.getByText(
        "Les données d’utilisation ne sont pas disponibles pour cette période de rapport.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Activez les décomptes agrégés/i)).not.toBeInTheDocument();
  });
});
