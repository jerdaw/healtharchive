import { SITE_BASE_URL } from "@/lib/metadata";

export function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HealthArchive.ca",
    url: SITE_BASE_URL,
    description:
      "Independent archive of Canadian public health information from federal and provincial government sources",
    sameAs: [
      "https://github.com/jerdaw/healtharchive-backend",
      "https://github.com/jerdaw/healtharchive-frontend",
      "https://github.com/jerdaw/healtharchive-datasets",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
