import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ArchivePage from "@/app/archive/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  fetchSources: vi.fn(),
  fetchTopics: vi.fn(),
  searchSnapshots: vi.fn(),
}));

import { fetchSources, fetchTopics, searchSnapshots } from "@/lib/api";
const mockFetchSources = vi.mocked(fetchSources);
const mockFetchTopics = vi.mocked(fetchTopics);
const mockSearchSnapshots = vi.mocked(searchSnapshots);

describe("/archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backend search results with pagination", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        recordCount: 2,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-02",
        topics: [{ slug: "covid-19", label: "COVID-19" }],
        latestRecordId: 1,
      },
    ]);
    mockFetchTopics.mockResolvedValue([
      { slug: "covid-19", label: "COVID-19" },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [
        {
          id: 101,
          title: "Test Snapshot",
          sourceCode: "phac",
          sourceName: "PHAC",
          language: "en",
          topics: [{ slug: "covid-19", label: "COVID-19" }],
          captureDate: "2024-01-02",
          originalUrl: "https://example.com",
          snippet: "Summary",
          rawSnapshotUrl: "/api/snapshots/raw/101",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ q: "test", source: "phac", topic: "covid-19" }),
    });
    render(ui);

    expect(screen.getByText(/Search results/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /test snapshot/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 snapshot/)).toBeInTheDocument();
  });

  it("passes topic slug through to backend search", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        recordCount: 1,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-01",
        topics: [{ slug: "covid-19", label: "COVID-19" }],
        latestRecordId: 1,
      },
    ]);
    mockFetchTopics.mockResolvedValue([
      { slug: "covid-19", label: "COVID-19" },
    ]);
    mockSearchSnapshots.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ topic: "covid-19" }),
    });
    render(ui);

    expect(mockSearchSnapshots).toHaveBeenCalledTimes(1);
    const args = mockSearchSnapshots.mock.calls[0][0];
    expect(args.topic).toBe("covid-19");

    // Ensure the topic dropdown includes the backend-provided label.
    expect(
      screen.getByRole("option", { name: "COVID-19" }),
    ).toBeInTheDocument();
  });

  it("uses /api/topics to build topic dropdown when backend topics are available", async () => {
    mockFetchSources.mockResolvedValue([
      {
        sourceCode: "phac",
        sourceName: "PHAC",
        recordCount: 1,
        firstCapture: "2024-01-01",
        lastCapture: "2024-01-01",
        topics: [],
        latestRecordId: 1,
      },
    ]);
    mockFetchTopics.mockResolvedValue([
      { slug: "covid-19", label: "COVID-19" },
      { slug: "harm-reduction", label: "Harm reduction" },
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

    const covidOption = screen.getByRole("option", { name: "COVID-19" }) as HTMLOptionElement;
    const harmOption = screen.getByRole("option", { name: "Harm reduction" }) as HTMLOptionElement;

    expect(covidOption).toBeInTheDocument();
    expect(harmOption).toBeInTheDocument();
    expect(covidOption.value).toBe("covid-19");
    expect(harmOption.value).toBe("harm-reduction");
  });

  it("falls back to demo data when backend search fails", async () => {
    mockFetchSources.mockRejectedValue(new Error("API down"));
    mockFetchTopics.mockRejectedValue(new Error("API down"));
    mockSearchSnapshots.mockRejectedValue(new Error("API down"));

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ topic: "harm-reduction" }),
    });
    render(ui);

    expect(
      screen.getByText(/Backend unavailable; showing demo data/i),
    ).toBeInTheDocument();

    // Demo dataset includes a Naloxone record tagged with "Harm reduction",
    // which slugifies to "harm-reduction".
    expect(
      screen.getByText(/Naloxone: Information for Canadians/i),
    ).toBeInTheDocument();
  });
});
