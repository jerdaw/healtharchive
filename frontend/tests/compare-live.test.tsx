import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CompareLivePage from "@/app/[locale]/compare-live/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  fetchSnapshotCompareLive: vi.fn(),
  searchSnapshots: vi.fn(),
}));

import { searchSnapshots, type SearchResponse, type SnapshotSummary } from "@/lib/api";

const mockSearchSnapshots = vi.mocked(searchSnapshots);

describe("/compare-live url fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves url=... to the newest page snapshot", async () => {
    const result: SnapshotSummary = {
      id: 77,
      title: null,
      sourceCode: "hc",
      sourceName: "Health Canada",
      language: "en",
      captureDate: "2025-04-17",
      captureTimestamp: "2025-04-17T00:00:00+00:00",
      jobId: 1,
      originalUrl: "https://example.org/page",
      snippet: null,
      rawSnapshotUrl: null,
      browseUrl: null,
    };
    const response: SearchResponse = {
      results: [result],
      total: 1,
      page: 1,
      pageSize: 1,
    };
    mockSearchSnapshots.mockResolvedValue({
      ...response,
    });

    const ui = await CompareLivePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ url: "https://example.org/page" }),
    });
    render(ui);

    expect(screen.getByRole("link", { name: "Fetch live diff" })).toHaveAttribute(
      "href",
      "/compare-live?to=77&run=1",
    );
  });

  it("shows an unavailable message when url=... cannot be resolved", async () => {
    const response: SearchResponse = {
      results: [],
      total: 0,
      page: 1,
      pageSize: 1,
    };
    mockSearchSnapshots.mockResolvedValue(response);

    const ui = await CompareLivePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ url: "https://example.org/page" }),
    });
    render(ui);

    expect(screen.getByText("No snapshots were found for that URL.")).toBeInTheDocument();
  });
});
