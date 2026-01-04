import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ArchivePage from "@/app/[locale]/archive/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  fetchSourcesLocalized: vi.fn(),
  searchSnapshots: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
  resolveReplayUrl: vi.fn(),
}));

import { fetchSources, fetchSourcesLocalized, searchSnapshots } from "@/lib/api";
const mockFetchSources = vi.mocked(fetchSources);
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);
const mockSearchSnapshots = vi.mocked(searchSnapshots);

describe("/archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canonicalizes within-only searches to q", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    await expect(async () => {
      await ArchivePage({
        searchParams: Promise.resolve({ q: "", within: "covid", source: "hc" }),
      });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("?q=covid&source=hc");
  });

  it("drops empty within param instead of persisting it", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    await expect(async () => {
      await ArchivePage({
        searchParams: Promise.resolve({ q: "influenza", within: "" }),
      });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("?q=influenza");
  });

  it("drops includeDuplicates when it has no effect (pages view)", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    await expect(async () => {
      await ArchivePage({
        searchParams: Promise.resolve({
          q: "test",
          view: "pages",
          includeNon2xx: "true",
          includeDuplicates: "true",
          page: "3",
          pageSize: "20",
        }),
      });
    }).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith(
      "?q=test&view=pages&includeNon2xx=true&page=3&pageSize=20",
    );
  });

  it("orders browse source cards by snapshot count", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "cihr",
        sourceName: "CIHR",
        baseUrl: "https://cihr-irsc.gc.ca/",
        description: "CIHR",
        recordCount: 10,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-02",
        latestRecordId: 2,
        entryRecordId: 2,
        entryBrowseUrl: "https://replay.healtharchive.ca/job-2/https://cihr-irsc.gc.ca/",
      },
      {
        sourceCode: "hc",
        sourceName: "Health Canada",
        baseUrl: "https://www.canada.ca/en/health-canada.html",
        description: "HC",
        recordCount: 100,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-02",
        latestRecordId: 1,
        entryRecordId: 1,
        entryBrowseUrl:
          "https://replay.healtharchive.ca/job-1/https://www.canada.ca/en/health-canada.html",
      },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-testid^="archive-source-"]'),
    );
    const ids = nodes.map((node) => node.dataset.testid);

    expect(ids).toEqual(["archive-source-hc", "archive-source-cihr"]);
  });

  it("renders cached preview images when available", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "hc",
        sourceName: "Health Canada",
        baseUrl: "https://www.canada.ca/en/health-canada.html",
        description: "HC",
        recordCount: 100,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-02",
        latestRecordId: 1,
        entryRecordId: 1,
        entryBrowseUrl:
          "https://replay.healtharchive.ca/job-1/https://www.canada.ca/en/health-canada.html",
        entryPreviewUrl: "/api/sources/hc/preview?jobId=1",
      },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByText(/Important note/i)).toBeInTheDocument();
    expect(screen.getByText(/not current guidance or medical advice/i)).toBeInTheDocument();

    const img = screen.getByAltText("Health Canada preview");
    expect(img).toHaveAttribute("src", "https://api.example.test/api/sources/hc/preview?jobId=1");
  });

  it("renders backend search results with pagination", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        baseUrl: "https://www.canada.ca/en/public-health.html",
        description: "PHAC",
        recordCount: 2,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-02",
        latestRecordId: 1,
        entryRecordId: 1,
        entryBrowseUrl: null,
      },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [
        {
          id: 101,
          title: "Test Snapshot",
          sourceCode: "phac",
          sourceName: "PHAC",
          language: "en",
          captureDate: "2024-01-02",
          captureTimestamp: null,
          jobId: null,
          originalUrl: "https://example.com",
          snippet: "Summary",
          rawSnapshotUrl: "/api/snapshots/raw/101",
          browseUrl: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "test", source: "phac" }),
    });
    render(ui);

    expect(screen.getByText(/Important note/i)).toBeInTheDocument();
    expect(screen.getByText(/not current guidance or medical advice/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /test snapshot/i })).toBeInTheDocument();
    expect(screen.getByText(/1 page/)).toBeInTheDocument();
  });

  it("renders a view link when browseUrl is available", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [
        {
          id: 101,
          title: "Test Snapshot",
          sourceCode: "phac",
          sourceName: "PHAC",
          language: "en",
          captureDate: "2024-01-02",
          captureTimestamp: null,
          jobId: 1,
          originalUrl: "https://example.com",
          snippet: "Summary",
          rawSnapshotUrl: "/api/snapshots/raw/101",
          browseUrl:
            "https://replay.healtharchive.ca/job-1/20240102000000/https://example.com#ha_snapshot=101",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "test", view: "pages" }),
    });
    const { container } = render(ui);

    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "https://replay.healtharchive.ca/job-1/20240102000000/https://example.com#ha_snapshot=101&ha_return=%2Farchive%3Fq%3Dtest%26focus%3Dresults",
    );

    const actions = container.querySelector(".ha-result-actions");
    expect(actions).toBeTruthy();
    const actionLabels = Array.from(actions!.querySelectorAll("a")).map((a) =>
      (a.textContent ?? "").trim(),
    );
    expect(actionLabels).toEqual(["View", "Details", "All snapshots"]);
  });

  it("renders the view link label in French", async () => {
    mockFetchSourcesLocalized.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [
        {
          id: 101,
          title: "Test Snapshot",
          sourceCode: "phac",
          sourceName: "PHAC",
          language: "fr",
          captureDate: "2024-01-02",
          captureTimestamp: null,
          jobId: 1,
          originalUrl: "https://example.com/fr",
          snippet: "Summary",
          rawSnapshotUrl: "/api/snapshots/raw/101",
          browseUrl:
            "https://replay.healtharchive.ca/job-1/20240102000000/https://example.com/fr#ha_snapshot=101",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve({ q: "test", view: "pages" }),
    });
    render(ui);

    expect(screen.getByRole("link", { name: "Voir" })).toBeInTheDocument();
  });

  it("passes source through to backend search", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        baseUrl: "https://www.canada.ca/en/public-health.html",
        description: "PHAC",
        recordCount: 1,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-01",
        latestRecordId: 1,
        entryRecordId: 1,
        entryBrowseUrl: null,
      },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ source: "phac" }),
    });
    render(ui);

    expect(mockSearchSnapshots).toHaveBeenCalledTimes(1);
    const args = mockSearchSnapshots.mock.calls[0][0];
    expect(args.source).toBe("phac");
  });

  it("passes includeNon2xx through to backend search and pagination links", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [
        {
          id: 101,
          title: "Test Snapshot",
          sourceCode: "phac",
          sourceName: "PHAC",
          language: "en",
          captureDate: "2024-01-02",
          captureTimestamp: null,
          jobId: null,
          originalUrl: "https://example.com",
          snippet: "Summary",
          rawSnapshotUrl: "/api/snapshots/raw/101",
          browseUrl: null,
        },
      ],
      total: 11,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "test", includeNon2xx: "true" }),
    });
    render(ui);

    expect(mockSearchSnapshots).toHaveBeenCalledTimes(1);
    const args = mockSearchSnapshots.mock.calls[0][0];
    expect(args.includeNon2xx).toBe(true);
    expect(args.includeDuplicates).toBeUndefined();

    expect(screen.getByLabelText("Include errors")).toBeChecked();
    expect(screen.getByRole("link", { name: "Next →" })).toHaveAttribute(
      "href",
      "/archive?q=test&includeNon2xx=true&page=2",
    );
  });

  it("passes includeDuplicates only in snapshots view", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "test", view: "snapshots", includeDuplicates: "true" }),
    });
    render(ui);

    expect(mockSearchSnapshots).toHaveBeenCalledTimes(1);
    const args = mockSearchSnapshots.mock.calls[0][0];
    expect(args.view).toBe("snapshots");
    expect(args.includeDuplicates).toBe(true);

    expect(screen.getByLabelText("Include duplicates")).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Info about including duplicates" }),
    ).toBeInTheDocument();
  });

  it("combines q and within into an AND query for backend search", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockResolvedValue({
      results: [
        {
          id: 101,
          title: "Influenza and covid",
          sourceCode: "hc",
          sourceName: "Health Canada",
          language: "en",
          captureDate: "2024-01-02",
          captureTimestamp: null,
          jobId: null,
          originalUrl: "https://example.com/influenza",
          snippet: "covid influenza",
          rawSnapshotUrl: "/api/snapshots/raw/101",
          browseUrl: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "influenza", within: "covid" }),
    });
    render(ui);

    expect(mockSearchSnapshots).toHaveBeenCalledTimes(1);
    const args = mockSearchSnapshots.mock.calls[0][0];
    expect(args.q).toBe("(influenza) AND (covid)");

    expect(screen.getByText("Influenza")).toBeInTheDocument();
    expect(screen.getAllByText("covid", { selector: "mark" }).length).toBeGreaterThan(0);
  });

  it("passes date range through to backend search", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        baseUrl: "https://www.canada.ca/en/public-health.html",
        description: "PHAC",
        recordCount: 1,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-01",
        latestRecordId: 1,
        entryRecordId: 1,
        entryBrowseUrl: null,
      },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({
        from: "2024-01-01",
        to: "2024-01-31",
      }),
    });
    render(ui);

    expect(mockSearchSnapshots).toHaveBeenCalledTimes(1);
    const args = mockSearchSnapshots.mock.calls[0][0];
    expect(args.from).toBe("2024-01-01");
    expect(args.to).toBe("2024-01-31");

    expect(screen.getByLabelText("From")).toHaveValue("2024-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2024-01-31");
  });

  it("shows a validation message when backend rejects filters", async () => {
    mockFetchSources.mockResolvedValue([]);
    mockSearchSnapshots.mockRejectedValue({
      status: 422,
      detail: "Invalid date range: 'from' must be <= 'to'.",
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({
        from: "2025-03-01",
        to: "2025-02-01",
      }),
    });
    render(ui);

    expect(screen.getByText("Invalid date range: 'from' must be <= 'to'.")).toBeInTheDocument();
    expect(
      screen.queryByText(/Live API unavailable; showing a limited offline sample/i),
    ).not.toBeInTheDocument();
  });

  it("falls back to offline sample when backend search fails", async () => {
    mockFetchSources.mockRejectedValue(new Error("API down"));
    mockSearchSnapshots.mockRejectedValue(new Error("API down"));

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "naloxone" }),
    });
    render(ui);

    expect(
      screen.getByText(/Live API unavailable; showing a limited offline sample/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Information for Canadians/i })).toBeInTheDocument();
  });

  it("supports URL queries in offline sample mode", async () => {
    mockFetchSources.mockRejectedValue(new Error("API down"));
    mockSearchSnapshots.mockRejectedValue(new Error("API down"));

    const ui = await ArchivePage({
      searchParams: Promise.resolve({
        q: "https://www.canada.ca/en/public-health/services/diseases/monkeypox.html",
      }),
    });
    render(ui);

    expect(
      screen.getByRole("link", { name: /Mpox \(monkeypox\): Situation update/i }),
    ).toBeInTheDocument();
  });
});
