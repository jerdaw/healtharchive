import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DatasetJsonLd } from "@/components/seo/DatasetJsonLd";

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
      expect(jsonContent.license).toBe("https://creativecommons.org/licenses/by/4.0/");
      expect(jsonContent.isAccessibleForFree).toBe(true);

      // Verify distribution formats
      expect(jsonContent.distribution).toBeInstanceOf(Array);
      expect(jsonContent.distribution.length).toBeGreaterThan(0);

      const firstDistribution = jsonContent.distribution[0];
      expect(firstDistribution["@type"]).toBe("DataDownload");
      expect(firstDistribution.encodingFormat).toBeTruthy();
      expect(firstDistribution.contentUrl).toBeTruthy();

      // Verify coverage
      expect(jsonContent.temporalCoverage).toBe("2024/..");
      expect(jsonContent.spatialCoverage).toHaveProperty("@type", "Place");
      expect(jsonContent.spatialCoverage).toHaveProperty("name", "Canada");

      // Verify keywords
      expect(jsonContent.keywords).toBeInstanceOf(Array);
      expect(jsonContent.keywords).toContain("public health");
      expect(jsonContent.keywords).toContain("web archiving");
    }
  });
});
