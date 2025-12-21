import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import DigestPage from "@/app/digest/page";

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
  resolveReplayUrl: vi.fn(),
}));

import { fetchSources } from "@/lib/api";

const mockFetchSources = vi.mocked(fetchSources);

describe("/digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the digest page with RSS links", async () => {
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

    const ui = await DigestPage();
    render(ui);

    expect(screen.getByText(/Change digest/i)).toBeInTheDocument();
    expect(screen.getByText(/Global RSS feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Canada/i)).toBeInTheDocument();
  });
});
