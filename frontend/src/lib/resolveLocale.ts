import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

export async function resolveLocale(params?: Promise<{ locale?: string }>): Promise<Locale> {
  if (!params) return defaultLocale;
  const { locale } = await params;
  return typeof locale === "string" && isLocale(locale) ? locale : defaultLocale;
}
