import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/[locale]/page";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

vi.mock("@/lib/api", () => ({
  fetchArchiveStats: vi.fn(),
  fetchChanges: vi.fn(),
  fetchSources: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import { fetchArchiveStats, fetchChanges, fetchSources } from "@/lib/api";

const mockFetchArchiveStats = vi.mocked(fetchArchiveStats);
const mockFetchChanges = vi.mocked(fetchChanges);
const mockFetchSources = vi.mocked(fetchSources);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const statsFixture: Awaited<ReturnType<typeof fetchArchiveStats>> = {
  snapshotsTotal: 321,
  pagesTotal: 123,
  sourcesTotal: 1,
  latestCaptureDate: "2026-07-09",
  latestCaptureAgeDays: 1,
};

const sourcesFixture: Awaited<ReturnType<typeof fetchSources>> = [
  {
    sourceCode: "parallel",
    sourceName: "Parallel Test Source",
    baseUrl: null,
    description: null,
    recordCount: 12,
    firstCapture: "2026-01-01",
    lastCapture: "2026-07-09",
    latestRecordId: 11,
    entryRecordId: null,
    entryBrowseUrl: null,
    entryPreviewUrl: null,
  },
];

const changesFixture: Awaited<ReturnType<typeof fetchChanges>> = {
  enabled: true,
  total: 0,
  page: 1,
  pageSize: 5,
  results: [],
};

describe("Home page data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts all independent homepage requests before awaiting results", async () => {
    const stats = deferred<Awaited<ReturnType<typeof fetchArchiveStats>>>();
    const sources = deferred<Awaited<ReturnType<typeof fetchSources>>>();
    const changes = deferred<Awaited<ReturnType<typeof fetchChanges>>>();

    mockFetchArchiveStats.mockReturnValue(stats.promise);
    mockFetchSources.mockReturnValue(sources.promise);
    mockFetchChanges.mockReturnValue(changes.promise);

    const pagePromise = HomePage({ params: Promise.resolve({ locale: "en" }) });
    let callCounts: number[] = [];

    try {
      await waitFor(() => expect(mockFetchArchiveStats).toHaveBeenCalledTimes(1));
      callCounts = [
        mockFetchArchiveStats.mock.calls.length,
        mockFetchSources.mock.calls.length,
        mockFetchChanges.mock.calls.length,
      ];
    } finally {
      stats.resolve(statsFixture);
      sources.resolve(sourcesFixture);
      changes.resolve(changesFixture);
      await pagePromise;
    }

    expect(callCounts).toEqual([1, 1, 1]);
    expect(mockFetchChanges).toHaveBeenCalledWith({ pageSize: 5 });
  });

  it("keeps successful homepage data when the changes request fails", async () => {
    mockFetchArchiveStats.mockResolvedValue(statsFixture);
    mockFetchSources.mockResolvedValue(sourcesFixture);
    mockFetchChanges.mockRejectedValue(new Error("changes unavailable"));

    const ui = await HomePage({ params: Promise.resolve({ locale: "en" }) });
    render(<LocaleProvider locale="en">{ui}</LocaleProvider>);

    expect(screen.getByText("Live metrics from the archive backend.")).toBeInTheDocument();
    expect(screen.getByText("Parallel Test Source")).toBeInTheDocument();
    expect(mockFetchChanges).toHaveBeenCalledWith({ pageSize: 5 });
  });

  it("keeps accurate partial live metrics when only archive stats fail", async () => {
    mockFetchArchiveStats.mockRejectedValue(new Error("stats unavailable"));
    mockFetchSources.mockResolvedValue(sourcesFixture);
    mockFetchChanges.mockRejectedValue(new Error("changes unavailable"));

    const ui = await HomePage({ params: Promise.resolve({ locale: "en" }) });
    render(<LocaleProvider locale="en">{ui}</LocaleProvider>);

    expect(
      screen.getByText(
        "Live source totals loaded; the unique-page total is temporarily unavailable.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Archived snapshots")).toBeInTheDocument();
    expect(screen.getByText("Sources tracked")).toBeInTheDocument();
    expect(screen.queryByText("Unique pages")).not.toBeInTheDocument();
    expect(screen.getByText("Parallel Test Source")).toBeInTheDocument();
  });
});
