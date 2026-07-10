import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import BrowseBySourcePage from "@/app/[locale]/archive/browse-by-source/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  fetchSourcesLocalized: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import { fetchSources, fetchSourcesLocalized } from "@/lib/api";
const mockFetchSources = vi.mocked(fetchSources);
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);

describe("/archive/browse-by-source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backend source summaries", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        baseUrl: "https://www.canada.ca/en/public-health.html",
        description: "PHAC",
        recordCount: 1234,
        firstCapture: "2024-01-01",
        lastCapture: "2024-02-01",
        latestRecordId: 10,
        entryRecordId: 9,
        entryBrowseUrl:
          "https://replay.healtharchive.ca/job-1/https://www.canada.ca/en/public-health.html",
        entryPreviewUrl: "/api/sources/phac/preview?jobId=1",
      },
    ]);

    const ui = await BrowseBySourcePage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    expect(screen.getByText(/Important note/i)).toBeInTheDocument();
    expect(screen.getByText(/not current guidance or medical advice/i)).toBeInTheDocument();

    expect(screen.getByText("Showing 1 source.")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "PHAC" })).toBeInTheDocument();
    expect(screen.getByText("PHAC")).toBeInTheDocument();
    expect(screen.getByText(/1,234 snapshots captured/)).toBeInTheDocument();
  });

  it("renders an empty state when filtering removes every backend source", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "test",
        sourceName: "Test source",
        baseUrl: null,
        description: null,
        recordCount: 0,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-01",
        latestRecordId: null,
        entryRecordId: null,
        entryBrowseUrl: null,
        entryPreviewUrl: null,
      },
    ]);

    const ui = await BrowseBySourcePage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    expect(screen.getByText("Showing 0 sources.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No sources available" })).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("renders localized French empty-state copy", async () => {
    mockFetchSourcesLocalized.mockResolvedValue([]);

    const ui = await BrowseBySourcePage({ params: Promise.resolve({ locale: "fr" }) });
    render(ui);

    expect(screen.getByText("Affichage de 0 sources.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aucune source disponible" })).toBeInTheDocument();
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
        lastCapture: "2024-02-01",
        latestRecordId: 10,
        entryRecordId: 9,
        entryBrowseUrl:
          "https://replay.healtharchive.ca/job-1/https://www.canada.ca/en/health-canada.html",
        entryPreviewUrl: "/api/sources/hc/preview?jobId=1",
      },
    ]);

    const ui = await BrowseBySourcePage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    const img = screen.getByAltText("Health Canada preview");
    expect(img).toHaveAttribute("src", "https://api.example.test/api/sources/hc/preview?jobId=1");
  });

  it("shows fallback notice when backend fails", async () => {
    mockFetchSources.mockRejectedValue(new Error("API down"));
    const ui = await BrowseBySourcePage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    expect(screen.getByText(/Live API unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing [1-9][0-9]* sources?\./)).toBeInTheDocument();
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  });
});
