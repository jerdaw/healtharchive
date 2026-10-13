import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SearchResultCard,
  type SearchResultCardRecord,
} from "@/components/archive/SearchResultCard";

const record: SearchResultCardRecord = {
  id: "42",
  title: "Vaccination guidance",
  sourceCode: "hc",
  sourceName: "Santé Canada",
  language: "fr",
  captureDate: "2025-01-02",
  originalUrl: "https://example.ca/guidance",
  pageSnapshotsCount: 3,
};

describe("SearchResultCard", () => {
  it("renders French result and fallback copy from the archive catalog", () => {
    render(<SearchResultCard record={record} view="pages" query="" locale="fr" />);

    expect(screen.getByLabelText("Métadonnées du résultat")).toHaveTextContent("Dernière capture");
    expect(
      screen.getByText("Aucun résumé n’est encore disponible pour cette capture."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Détails" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Toutes les captures" })).toBeInTheDocument();
    expect(screen.getByText("URL d’origine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copier l’URL d’origine" })).toBeInTheDocument();
  });

  it("builds a replay link from the configured replay origin", () => {
    vi.stubEnv("NEXT_PUBLIC_REPLAY_BASE_URL", "https://replay.healtharchive.ca");
    try {
      render(
        <SearchResultCard
          record={{
            ...record,
            jobId: 17,
            captureTimestamp: "2025-01-02T03:04:05Z",
          }}
          view="pages"
          query=""
          locale="en"
        />,
      );

      expect(screen.getByRole("link", { name: "Vaccination guidance" })).toHaveAttribute(
        "href",
        "https://replay.healtharchive.ca/job-17/20250102030405/https://example.ca/guidance#ha_snapshot=42",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
