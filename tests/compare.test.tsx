import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ComparePage from "@/app/[locale]/compare/page";

vi.mock("@/lib/api", () => ({
  fetchChangeCompare: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import { fetchChangeCompare } from "@/lib/api";

const mockFetchChangeCompare = vi.mocked(fetchChangeCompare);

describe("/compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a helpful message when no snapshot is selected", async () => {
    const ui = await ComparePage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByText(/Compare unavailable/i)).toBeInTheDocument();
  });

  it("renders a comparison when data is available", async () => {
    mockFetchChangeCompare.mockResolvedValue({
      event: {
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
      fromSnapshot: {
        snapshotId: 10,
        title: "Old guidance",
        captureDate: "2024-01-01",
        captureTimestamp: "2024-01-01T00:00:00+00:00",
        originalUrl: "https://www.canada.ca/en/health-canada/covid19.html",
        jobId: 1,
        jobName: "hc-20240101",
      },
      toSnapshot: {
        snapshotId: 11,
        title: "New guidance",
        captureDate: "2025-01-01",
        captureTimestamp: "2025-01-01T00:00:00+00:00",
        originalUrl: "https://www.canada.ca/en/health-canada/covid19.html",
        jobId: 1,
        jobName: "hc-20250101",
      },
      diffFormat: "html",
      diffHtml: "<div>diff</div>",
      diffTruncated: false,
      diffVersion: "v1",
      normalizationVersion: "v1",
    });

    const ui = await ComparePage({
      searchParams: Promise.resolve({ from: "10", to: "11" }),
    });
    render(ui);

    expect(screen.getByText(/Compare archived captures/i)).toBeInTheDocument();
    expect(screen.getByText(/Old guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/New guidance/i)).toBeInTheDocument();
  });
});
