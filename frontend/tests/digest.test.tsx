import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import DigestPage from "@/app/[locale]/digest/page";

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  fetchSourcesLocalized: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
  resolveReplayUrl: vi.fn(),
}));

import { fetchSources, fetchSourcesLocalized } from "@/lib/api";

const mockFetchSources = vi.mocked(fetchSources);
const mockFetchSourcesLocalized = vi.mocked(fetchSourcesLocalized);

const source = {
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
};

describe("/digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the digest page with RSS links", async () => {
    mockFetchSources.mockResolvedValue([source]);

    const ui = await DigestPage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    expect(screen.getByText(/Change digest/i)).toBeInTheDocument();
    expect(screen.getByText(/Global RSS feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Canada/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Feeds by source" })).toBeInTheDocument();
  });

  it("labels the French source-specific RSS feeds", async () => {
    mockFetchSourcesLocalized.mockResolvedValue([
      { ...source, sourceName: "Santé Canada", description: "Description française" },
    ]);

    const ui = await DigestPage({ params: Promise.resolve({ locale: "fr" }) });
    render(ui);

    expect(screen.getByRole("heading", { level: 3, name: "Flux par source" })).toBeInTheDocument();
    expect(screen.getByText("Santé Canada")).toBeInTheDocument();
  });
});
