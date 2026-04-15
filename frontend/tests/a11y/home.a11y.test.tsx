import { render, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi } from "vitest";
import { expectNoA11yViolations } from "../a11y-helper";
import HomePage from "@/app/[locale]/page";

// Mock Next.js Image
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

// Mock API calls used by the homepage and its child components
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

describe("Home page accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchArchiveStats.mockResolvedValue({
      snapshotsTotal: 100,
      pagesTotal: 50,
      sourcesTotal: 3,
      latestCaptureDate: "2026-01-15",
      latestCaptureAgeDays: 2,
    });
    mockFetchChanges.mockResolvedValue({
      enabled: true,
      total: 0,
      page: 1,
      pageSize: 5,
      results: [],
    });
    mockFetchSources.mockResolvedValue([]);
  });

  it("should have no accessibility violations (English)", { timeout: 10000 }, async () => {
    const ui = await HomePage({ params: Promise.resolve({ locale: "en" }) });
    const { container } = render(ui);

    // Wait for any initial animations/state updates to complete
    await waitFor(() => {
      expect(container.querySelector("h1")).toBeInTheDocument();
    });

    await expectNoA11yViolations(container);
  });

  it("should have no accessibility violations (French)", { timeout: 10000 }, async () => {
    const ui = await HomePage({ params: Promise.resolve({ locale: "fr" }) });
    const { container } = render(ui);

    // Wait for any initial animations/state updates to complete
    await waitFor(() => {
      expect(container.querySelector("h1")).toBeInTheDocument();
    });

    await expectNoA11yViolations(container);
  });

  // Note: Heading hierarchy and skip links are covered by the axe a11y tests above
});
