import { describe, expect, it } from "vitest";

import { getArchiveCopy } from "@/lib/archiveCopy";

describe("archive copy", () => {
  it("provides locale-complete parameterized source copy", () => {
    const en = getArchiveCopy("en");
    const fr = getArchiveCopy("fr");

    expect(en.browseBySource.sourceSummary("1", 1)).toBe("Showing 1 source.");
    expect(en.browseBySource.sourceSummary("2", 2)).toBe("Showing 2 sources.");
    expect(fr.browseBySource.sourceSummary("1", 1)).toBe("Affichage de 1 source.");
    expect(fr.browseBySource.sourceSummary("2", 2)).toBe("Affichage de 2 sources.");
  });

  it("formats capture ranges without English-oriented concatenation", () => {
    const values = {
      formattedCount: "2",
      count: 2,
      formattedFirstCapture: "1 janv. 2025",
      formattedLastCapture: "2 févr. 2025",
    };

    expect(getArchiveCopy("en").browseBySource.captureRange(values)).toBe(
      "2 snapshots captured between 1 janv. 2025 and 2 févr. 2025.",
    );
    expect(getArchiveCopy("fr").browseBySource.captureRange(values)).toBe(
      "2 captures capturées entre le 1 janv. 2025 et le 2 févr. 2025.",
    );
  });

  it("keeps source-specific accessible labels localized", () => {
    expect(getArchiveCopy("en").sourceBrowser.previewAlt("Health Canada")).toBe(
      "Health Canada preview",
    );
    expect(getArchiveCopy("fr").sourceBrowser.previewAlt("Santé Canada")).toBe(
      "Aperçu : Santé Canada",
    );
  });

  it("keeps component copy available in both locales", () => {
    const en = getArchiveCopy("en");
    const fr = getArchiveCopy("fr");

    expect(en.searchResult.copyOriginalUrl).toBe("Copy original URL");
    expect(fr.searchResult.copyOriginalUrl).toBe("Copier l’URL d’origine");
    expect(en.searchWithin.placeholder).toContain("narrow");
    expect(fr.searchWithin.placeholder).toContain("affiner");
    expect(en.clipboard.copiedStatus).toBe("Copied to clipboard.");
    expect(fr.clipboard.copiedStatus).toBe("Copié dans le presse-papiers.");
    expect(en.apiHealth.betweenSettings).toContain("backend's");
    expect(fr.apiHealth.betweenSettings).toContain("paramètre");
  });
});
