import type { Locale } from "@/lib/i18n";

export type Localized<T> = Readonly<{ en: T; fr: T }>;

export function pickLocalized<T>(locale: Locale, value: Localized<T>): T {
  return locale === "fr" ? value.fr : value.en;
}
