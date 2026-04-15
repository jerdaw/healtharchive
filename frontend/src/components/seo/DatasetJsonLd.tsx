import { SITE_BASE_URL } from "@/lib/metadata";

export function DatasetJsonLd() {
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
    license: "https://creativecommons.org/licenses/by/4.0/",
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE_BASE_URL}/api/exports`,
        description: "Export manifest listing available formats and limits",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/x-ndjson",
        contentUrl: `${SITE_BASE_URL}/api/snapshots/export`,
        description: "Newline-delimited JSON export of snapshot metadata",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_BASE_URL}/api/snapshots/export?format=csv`,
        description: "CSV export of snapshot metadata",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/x-ndjson",
        contentUrl: `${SITE_BASE_URL}/api/changes/export`,
        description: "Newline-delimited JSON export of change events",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_BASE_URL}/api/changes/export?format=csv`,
        description: "CSV export of change events",
      },
    ],
    temporalCoverage: "2024/..",
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
