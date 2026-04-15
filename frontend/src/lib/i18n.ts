export const supportedLocales = ["en", "fr"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

export function localeToLanguageTag(locale: Locale): string {
  switch (locale) {
    case "fr":
      return "fr-CA";
    case "en":
    default:
      return "en-CA";
  }
}

export function localePrefix(locale: Locale): "" | "/fr" {
  return locale === "fr" ? "/fr" : "";
}

function isExternalHref(href: string): boolean {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export function localizeHref(locale: Locale, href: string): string {
  if (!href) return href;
  if (!href.startsWith("/")) return href;
  if (href.startsWith("/api/") || href === "/api") return href;
  if (href.startsWith("/_next/")) return href;
  if (isExternalHref(href)) return href;

  const pathOnly = href.split(/[?#]/)[0] ?? href;
  if (/\.[a-z0-9]+$/i.test(pathOnly)) return href;

  const prefix = localePrefix(locale);
  if (!prefix) return href;
  if (href === "/") return prefix;
  if (href.startsWith(prefix + "/") || href === prefix) return href;
  return `${prefix}${href}`;
}
