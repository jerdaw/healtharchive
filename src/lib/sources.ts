import type { Locale } from "@/lib/i18n";
import { pickLocalized, type Localized } from "@/lib/localized";

type SourceCatalogEntry = Readonly<{
  name: Localized<string>;
  homepage: Localized<string>;
}>;

const SOURCE_CATALOG: Readonly<Record<string, SourceCatalogEntry>> = {
  hc: {
    name: { en: "Health Canada", fr: "Santé Canada" },
    homepage: {
      en: "https://www.canada.ca/en/health-canada.html",
      fr: "https://www.canada.ca/fr/sante-canada.html",
    },
  },
  phac: {
    name: { en: "Public Health Agency of Canada", fr: "Agence de la santé publique du Canada" },
    homepage: {
      en: "https://www.canada.ca/en/public-health.html",
      fr: "https://www.canada.ca/fr/sante-publique.html",
    },
  },
  cihr: {
    name: {
      en: "Canadian Institutes of Health Research",
      fr: "Instituts de recherche en santé du Canada",
    },
    homepage: {
      en: "https://cihr-irsc.gc.ca/e/193.html",
      fr: "https://cihr-irsc.gc.ca/f/193.html",
    },
  },
};

function normalizeSourceCode(sourceCode: string): string {
  return sourceCode.trim().toLowerCase();
}

export function getLocalizedSourceName(
  locale: Locale,
  sourceCode: string,
  fallback: string,
): string {
  const entry = SOURCE_CATALOG[normalizeSourceCode(sourceCode)];
  if (!entry) return fallback;
  return pickLocalized(locale, entry.name);
}

export function getLocalizedSourceHomepage(
  locale: Locale,
  sourceCode: string,
  fallback: string | null,
): string | null {
  const entry = SOURCE_CATALOG[normalizeSourceCode(sourceCode)];
  if (!entry) return fallback;
  return pickLocalized(locale, entry.homepage);
}
