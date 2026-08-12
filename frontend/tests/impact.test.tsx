import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ImpactPage from "@/app/[locale]/impact/page";

vi.mock("@/lib/api", () => ({
  fetchArchiveStats: vi.fn(),
  fetchUsageMetrics: vi.fn(),
  resolveReplayUrl: vi.fn(),
  getApiBaseUrl: () => "https://api.example.test",
}));

import { fetchArchiveStats, fetchUsageMetrics } from "@/lib/api";

const mockFetchArchiveStats = vi.mocked(fetchArchiveStats);
const mockFetchUsageMetrics = vi.mocked(fetchUsageMetrics);

function mockImpactData() {
  mockFetchArchiveStats.mockResolvedValue({
    snapshotsTotal: 120,
    pagesTotal: 80,
    sourcesTotal: 3,
    latestCaptureDate: "2025-12-21",
    latestCaptureAgeDays: 2,
  });
  mockFetchUsageMetrics.mockResolvedValue({
    enabled: true,
    windowDays: 30,
    totals: {
      searchRequests: 12,
      snapshotDetailViews: 34,
      rawSnapshotViews: 56,
      reportSubmissions: 2,
    },
    daily: [],
  });
}

describe("/impact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the monthly impact report sections", async () => {
    mockImpactData();

    const ui = await ImpactPage({ params: Promise.resolve({ locale: "en" }) });
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: /Monthly impact report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Coverage snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Usage snapshot/i)).toBeInTheDocument();
  });

  it.each([
    {
      locale: "en",
      boundary:
        "Future expansion is not assumed and would require a separately authorized data-continuity decision.",
      focus:
        "Resolve release-governance and data-continuity decisions before any future coverage change.",
      obsolete: ["as the archive expands", "Expand coverage across additional"],
    },
    {
      locale: "fr",
      boundary:
        "Aucune extension future n’est présumée; elle nécessiterait une décision de continuité des données autorisée séparément.",
      focus:
        "Résoudre les décisions de gouvernance des publications et de continuité des données avant toute future modification de la couverture.",
      obsolete: ["à mesure que l’archive s’étend", "Étendre la couverture à d’autres"],
    },
  ] as const)(
    "keeps $locale impact coverage claims continuity-gated",
    async ({ locale, boundary, focus, obsolete }) => {
      mockImpactData();
      const ui = await ImpactPage({ params: Promise.resolve({ locale }) });
      const { container } = render(ui);

      expect(container).toHaveTextContent(boundary);
      expect(container).toHaveTextContent(focus);
      for (const claim of obsolete) {
        expect(container).not.toHaveTextContent(claim);
      }
    },
  );
});
