import type { Locale } from "@/lib/i18n";
import { localeToLanguageTag } from "@/lib/i18n";

/**
 * Format an ISO date string (YYYY-MM-DD) or full ISO timestamp for display.
 * Handles both plain date strings (splitting on "-") and full timestamps
 * (via Date constructor) for maximum compatibility with API responses.
 */
export function formatDate(locale: Locale, value: string | null | undefined): string {
  if (!value) return locale === "fr" ? "Inconnu" : "Unknown";

  const tag = localeToLanguageTag(locale);
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

  // Try YYYY-MM-DD split first (avoids timezone-shift issues for date-only strings)
  const parts = value.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr?.split("T")[0]);
    if (year && month && day) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(tag, opts);
      }
    }
  }

  // Fallback: try full Date parse (for ISO timestamps, etc.)
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(tag, opts);
  }

  return value;
}

/**
 * Format a number for locale-appropriate display (e.g. 1,234 vs 1 234).
 */
export function formatNumber(locale: Locale, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(localeToLanguageTag(locale)).format(value);
}

/**
 * Normalize an ISO timestamp to a compact UTC form (removing .000Z → Z).
 * Returns empty string for null/undefined input.
 */
export function formatUtcTimestamp(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().replace(".000Z", "Z");
  }
  return value;
}

/**
 * Format a decimal value as a rounded percentage (e.g. 0.85 → "85%").
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "";
  const rounded = Math.round(value * 100);
  return `${rounded}%`;
}
