import type { MetadataRoute } from "next";

import { SITE_BASE_URL } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/compare-live", "/fr/compare-live"],
    },
    sitemap: `${SITE_BASE_URL}/sitemap.xml`,
  };
}
