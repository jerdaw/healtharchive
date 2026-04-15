import type { MetadataRoute } from "next";

import { SITE_BASE_URL } from "@/lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/about",
    "/archive",
    "/browse",
    "/changes",
    "/cite",
    "/compare",
    "/contact",
    "/digest",
    "/exports",
    "/governance",
    "/impact",
    "/methods",
    "/privacy",
    "/report",
    "/researchers",
    "/status",
    "/terms",
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    // English version (canonical, unprefixed)
    sitemapEntries.push({
      url: `${SITE_BASE_URL}${page}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: page === "" ? 1.0 : 0.8,
      alternates: {
        languages: {
          "en-CA": `${SITE_BASE_URL}${page}`,
          "fr-CA": `${SITE_BASE_URL}/fr${page === "" ? "" : page}`,
        },
      },
    });
  }

  return sitemapEntries;
}
