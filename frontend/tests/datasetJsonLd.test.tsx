import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DatasetJsonLd } from "@/components/seo/DatasetJsonLd";
import { getApiBaseUrl } from "@/lib/api";

describe("DatasetJsonLd", () => {
  it("renders valid JSON-LD script with Dataset schema", () => {
    const { container } = render(<DatasetJsonLd />);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    if (script) {
      const jsonContent = JSON.parse(script.textContent || "{}");

      // Verify Schema.org structure
      expect(jsonContent["@context"]).toBe("https://schema.org");
      expect(jsonContent["@type"]).toBe("Dataset");

      // Verify required properties
      expect(jsonContent.name).toBe("HealthArchive.ca Metadata Exports");
      expect(jsonContent.description).toContain("Metadata-only exports");
      expect(jsonContent).not.toHaveProperty("license");
      expect(jsonContent.isAccessibleForFree).toBe(true);

      // Verify distribution formats
      expect(jsonContent.distribution).toBeInstanceOf(Array);
      expect(
        jsonContent.distribution.map(({ contentUrl }: { contentUrl: string }) => contentUrl),
      ).toEqual([
        `${getApiBaseUrl()}/api/exports`,
        `${getApiBaseUrl()}/api/exports/snapshots?format=jsonl`,
        `${getApiBaseUrl()}/api/exports/snapshots?format=csv`,
        `${getApiBaseUrl()}/api/exports/changes?format=jsonl`,
        `${getApiBaseUrl()}/api/exports/changes?format=csv`,
      ]);
      expect(
        jsonContent.distribution.every(
          (distribution: { "@type": string }) => distribution["@type"] === "DataDownload",
        ),
      ).toBe(true);

      // Verify coverage
      expect(jsonContent.temporalCoverage).toBe("2025-04-10/2026-05-03");
      expect(jsonContent.spatialCoverage).toHaveProperty("@type", "Place");
      expect(jsonContent.spatialCoverage).toHaveProperty("name", "Canada");

      // Verify keywords
      expect(jsonContent.keywords).toBeInstanceOf(Array);
      expect(jsonContent.keywords).toContain("public health");
      expect(jsonContent.keywords).toContain("web archiving");
    }
  });
});
