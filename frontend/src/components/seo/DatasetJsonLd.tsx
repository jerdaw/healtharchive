import { getApiBaseUrl } from "@/lib/api";
import { SITE_BASE_URL } from "@/lib/metadata";

export function DatasetJsonLd() {
  const apiBase = getApiBaseUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "HealthArchive.ca Metadata Exports",
    description:
      "Metadata-only exports of Canadian public health website snapshots. Includes snapshot metadata (URLs, timestamps, titles, language) and change events (diffs, comparisons) for research and reproducibility. Does not include raw HTML or full diff bodies.",
    url: `${SITE_BASE_URL}/exports`,
    creator: {
      "@type": "Organization",
      name: "HealthArchive.ca",
      url: SITE_BASE_URL,
    },
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${apiBase}/api/exports`,
        description: "Export manifest listing available formats and limits",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/x-ndjson",
        contentUrl: `${apiBase}/api/exports/snapshots?format=jsonl`,
        description: "Newline-delimited JSON export of snapshot metadata",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${apiBase}/api/exports/snapshots?format=csv`,
        description: "CSV export of snapshot metadata",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/x-ndjson",
        contentUrl: `${apiBase}/api/exports/changes?format=jsonl`,
        description: "Newline-delimited JSON export of change events",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${apiBase}/api/exports/changes?format=csv`,
        description: "CSV export of change events",
      },
    ],
    temporalCoverage: "2025-04-10/2026-05-03",
    spatialCoverage: {
      "@type": "Place",
      name: "Canada",
    },
    keywords: [
      "public health",
      "web archiving",
      "government websites",
      "Canada",
      "metadata",
      "change tracking",
      "snapshots",
      "WARC",
    ],
    isAccessibleForFree: true,
    includedInDataCatalog: {
      "@type": "DataCatalog",
      name: "HealthArchive.ca Datasets",
      url: "https://github.com/jerdaw/healtharchive-datasets/releases",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
