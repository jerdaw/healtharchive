import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});
