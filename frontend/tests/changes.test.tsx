import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ChangesPage from "@/app/[locale]/changes/page";

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  fetchSourcesLocalized: vi.fn(),
  fetchSourceEditions: vi.fn(),
  fetchChanges: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
  resolveReplayUrl: vi.fn(),
}));

import { fetchChanges, fetchSourceEditions, fetchSources, fetchSourcesLocalized } from "@/lib/api";

const mockFetchSources = vi.mocked(fetchSources);
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);
const mockFetchSourceEditions = vi.mocked(fetchSourceEditions);
const mockFetchChanges = vi.mocked(fetchChanges);

const englishSource = {
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
  entryPreviewUrl: null,
};

const frenchSource = {
  ...englishSource,
  sourceName: "Santé Canada",
  baseUrl: "https://www.canada.ca/fr/sante-canada.html",
};

const edition = {
  jobId: 1,
  jobName: "hc-20250101",
  recordCount: 10,
  firstCapture: "2025-01-01",
  lastCapture: "2025-01-01",
  entryBrowseUrl: null,
};

const changeEvent = {
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
};

function mockEnglishPrerequisites() {
  mockFetchSources.mockResolvedValue([englishSource]);
  mockFetchSourceEditions.mockResolvedValue([edition]);
}

describe("/changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the change feed for the latest edition", async () => {
    mockEnglishPrerequisites();
    mockFetchChanges.mockResolvedValue({
      enabled: true,
      total: 1,
      page: 1,
      pageSize: 20,
      results: [changeEvent],
    });

    const ui = await ChangesPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByText(/Change tracking/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Health Canada/i })).toBeInTheDocument();
    expect(screen.getByText(/1 sections changed/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare captures/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Filter by source & edition" })).toBeInTheDocument();
    expect(screen.getByText("1 change found.")).toBeInTheDocument();
  });

  it("renders the result total for a successful empty change feed", async () => {
    mockEnglishPrerequisites();
    mockFetchChanges.mockResolvedValue({
      enabled: true,
      total: 0,
      page: 1,
      pageSize: 20,
      results: [],
    });

    const ui = await ChangesPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByText("0 changes found.")).toBeInTheDocument();
    expect(screen.getByText(/No changes found for this edition yet/i)).toBeInTheDocument();
  });

  it("renders French result orientation and pagination", async () => {
    mockFetchSourcesLocalized.mockResolvedValue([frenchSource]);
    mockFetchSourceEditions.mockResolvedValue([edition]);
    mockFetchChanges.mockResolvedValue({
      enabled: true,
      total: 21,
      page: 1,
      pageSize: 20,
      results: [
        {
          ...changeEvent,
          summary: "1 section modifiée; 1 ajoutée",
          sourceName: "Santé Canada",
        },
      ],
    });

    const ui = await ChangesPage({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Filtrer par source et édition" }),
    ).toBeInTheDocument();
    expect(screen.getByText("21 changements trouvés.")).toBeInTheDocument();
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
  });

  it("does not claim zero changes when the feed is unavailable", async () => {
    mockEnglishPrerequisites();
    mockFetchChanges.mockRejectedValue(new Error("backend unavailable"));

    const ui = await ChangesPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByRole("heading", { name: "Changes unavailable" })).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ changes? found\.$/)).not.toBeInTheDocument();
  });

  it("does not show a result total when change tracking is disabled", async () => {
    mockEnglishPrerequisites();
    mockFetchChanges.mockResolvedValue({
      enabled: false,
      total: 0,
      page: 1,
      pageSize: 20,
      results: [],
    });

    const ui = await ChangesPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(
      screen.getByText("Change tracking is currently disabled on the backend."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ changes? found\.$/)).not.toBeInTheDocument();
  });
});
