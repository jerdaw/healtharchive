import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import SnapshotDetailsPage from "@/app/[locale]/snapshot/[id]/page";

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
  searchSnapshots: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

vi.mock("@/data/demo-records", () => ({
  getRecordById: vi.fn().mockReturnValue(null),
}));

import {
  fetchSnapshotDetail,
  fetchSnapshotLatest,
  fetchSnapshotTimeline,
  type SnapshotDetail,
  type SnapshotLatest,
  type SnapshotTimeline,
} from "@/lib/api";

const mockFetchSnapshotDetail = vi.mocked(fetchSnapshotDetail);
const mockFetchSnapshotLatest = vi.mocked(fetchSnapshotLatest);
const mockFetchSnapshotTimeline = vi.mocked(fetchSnapshotTimeline);

describe("/snapshot/[id] (details)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a details page with View + prefilling links", async () => {
    const detail: SnapshotDetail = {
      id: 45,
      title: "COVID-19: Current situation - Canada.ca",
      sourceCode: "hc",
      sourceName: "Health Canada",
      language: "en",
      captureDate: "2025-04-17",
      captureTimestamp: "2025-04-17T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://www.canada.ca/en/public-health/services/diseases/covid.html",
      snippet: "Summary",
      rawSnapshotUrl: "/api/snapshots/raw/45",
      browseUrl:
        "https://replay.healtharchive.ca/job-1/20250417000000/https://www.canada.ca/en/public-health/services/diseases/covid.html#ha_snapshot=45",
      mimeType: "text/html",
      statusCode: 200,
    };
    const latest: SnapshotLatest = {
      found: true,
      snapshotId: 46,
      captureTimestamp: "2025-04-18T00:00:00+00:00",
      mimeType: "text/html",
    };
    const timeline: SnapshotTimeline = {
      sourceCode: "hc",
      sourceName: "Health Canada",
      normalizedUrlGroup: "https://www.canada.ca/en/public-health/services/diseases/covid.html",
      snapshots: [
        {
          snapshotId: 45,
          captureDate: "2025-04-17",
          captureTimestamp: "2025-04-17T00:00:00+00:00",
          jobId: 1,
          jobName: "legacy-hc-2025-04-21",
          title: "COVID-19: Current situation - Canada.ca",
          statusCode: 200,
          compareFromSnapshotId: 44,
          browseUrl:
            "https://replay.healtharchive.ca/job-1/20250417000000/https://www.canada.ca/en/public-health/services/diseases/covid.html#ha_snapshot=45",
        },
        {
          snapshotId: 44,
          captureDate: "2025-04-10",
          captureTimestamp: "2025-04-10T00:00:00+00:00",
          jobId: 1,
          jobName: "legacy-hc-2025-04-21",
          title: "COVID-19: Current situation - Canada.ca",
          statusCode: 200,
          compareFromSnapshotId: null,
          browseUrl:
            "https://replay.healtharchive.ca/job-1/20250410000000/https://www.canada.ca/en/public-health/services/diseases/covid.html#ha_snapshot=44",
        },
      ],
    };

    mockFetchSnapshotDetail.mockResolvedValue(detail);
    mockFetchSnapshotLatest.mockResolvedValue(latest);
    mockFetchSnapshotTimeline.mockResolvedValue(timeline);

    const ui = await SnapshotDetailsPage({ params: Promise.resolve({ id: "45" }) });
    render(ui);

    const viewLinks = screen.getAllByRole("link", { name: "View" });
    expect(
      viewLinks.some(
        (link) =>
          link.getAttribute("href") ===
          "https://replay.healtharchive.ca/job-1/20250417000000/https://www.canada.ca/en/public-health/services/diseases/covid.html#ha_snapshot=45",
      ),
    ).toBe(true);

    expect(screen.getByRole("link", { name: "Cite" })).toHaveAttribute("href", "/cite?snapshot=45");

    expect(screen.getByRole("link", { name: "View diff" })).toHaveAttribute(
      "href",
      "/compare-live?to=46",
    );

    expect(screen.getByRole("heading", { name: "Other snapshots" })).toBeInTheDocument();
  });

  it("calls notFound when no snapshot exists", async () => {
    mockFetchSnapshotDetail.mockRejectedValue(new Error("not found"));
    const ui = await SnapshotDetailsPage({ params: Promise.resolve({ id: "9999" }) });
    render(ui);
    expect(notFoundMock).toHaveBeenCalled();
  });
});
