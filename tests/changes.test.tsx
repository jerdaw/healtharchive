import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ChangesPage from "@/app/changes/page";

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  fetchSourceEditions: vi.fn(),
  fetchChanges: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
  resolveReplayUrl: vi.fn(),
}));

import { fetchChanges, fetchSourceEditions, fetchSources } from "@/lib/api";

const mockFetchSources = vi.mocked(fetchSources);
const mockFetchSourceEditions = vi.mocked(fetchSourceEditions);
const mockFetchChanges = vi.mocked(fetchChanges);

describe("/changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the change feed for the latest edition", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "hc",
        sourceName: "Health Canada",
        baseUrl: "https://www.canada.ca/en/health-canada.html",
        description: null,
        recordCount: 10,
        firstCapture: "2024-01-01",
        lastCapture: "2025-01-01",
        latestRecordId: 10,
        entryRecordId: 10,
        entryBrowseUrl: null,
      },
    ]);
    mockFetchSourceEditions.mockResolvedValue([
      {
        jobId: 1,
        jobName: "hc-20250101",
        recordCount: 10,
        firstCapture: "2025-01-01",
        lastCapture: "2025-01-01",
        entryBrowseUrl: null,
      },
    ]);
    mockFetchChanges.mockResolvedValue({
      enabled: true,
      total: 1,
      page: 1,
      pageSize: 20,
      results: [
        {
          changeId: 1,
          changeType: "updated",
          summary: "1 sections changed; 1 added",
          highNoise: false,
          diffAvailable: true,
          sourceCode: "hc",
          sourceName: "Health Canada",
          normalizedUrlGroup: "https://www.canada.ca/en/health-canada/covid19.html",
          fromSnapshotId: 10,
          toSnapshotId: 11,
          fromCaptureTimestamp: "2024-01-01T00:00:00+00:00",
          toCaptureTimestamp: "2025-01-01T00:00:00+00:00",
          fromJobId: 1,
          toJobId: 1,
          addedSections: 1,
          removedSections: 0,
          changedSections: 1,
          addedLines: 3,
          removedLines: 1,
          changeRatio: 0.4,
        },
      ],
    });

    const ui = await ChangesPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByText(/Change tracking/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Health Canada/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 sections changed/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare captures/i)).toBeInTheDocument();
  });
});
