import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n";
import { buildMetaDescription } from "@/lib/siteCopy";

export const SITE_BASE_URL = "https://www.healtharchive.ca";

function normalizePath(path: string): string {
  if (!path) return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  if (withLeading.length > 1 && withLeading.endsWith("/")) {
    return withLeading.slice(0, -1);
  }
  return withLeading;
}

export function buildPageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description?: string,
): Metadata {
  const normalizedPath = normalizePath(path);
  const englishPath = normalizedPath;
  const frenchPath = normalizedPath === "/" ? "/fr" : `/fr${normalizedPath}`;
  const canonicalPath = locale === "fr" ? frenchPath : englishPath;

  return {
    title,
    description: description ?? buildMetaDescription(locale),
    alternates: {
      canonical: canonicalPath,
      languages: {
        "en-CA": englishPath,
        "fr-CA": frenchPath,
      },
    },
  };
}
