import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";
import { notFound } from "next/navigation";

import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { FrenchTranslationBanner } from "@/components/i18n/FrenchTranslationBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { isLocale, localeToLanguageTag } from "@/lib/i18n";
import { SITE_BASE_URL } from "@/lib/metadata";
import { buildMetaDescription } from "@/lib/siteCopy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const normalizedLocale = isLocale(locale) ? locale : "en";

  return {
    metadataBase: new URL(SITE_BASE_URL),
    title:
      normalizedLocale === "fr"
        ? "HealthArchive.ca – Archive indépendante d’information de santé publique au Canada"
        : "HealthArchive.ca – Independent archive of Canadian public health information",
    description: buildMetaDescription(normalizedLocale),
    icons: {
      icon: "/healtharchive-favicon.png",
    },
    robots:
      normalizedLocale === "fr"
        ? {
            index: false,
            follow: true,
          }
        : undefined,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <html lang={localeToLanguageTag(locale)} data-theme="light" suppressHydrationWarning>
      <body className="antialiased">
        <Script
          id="ha-theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var storageKey='ha-theme';var stored=window.localStorage.getItem(storageKey);var theme='light';if(stored==='light'||stored==='dark'){theme=stored;}document.documentElement.dataset.theme=theme;}catch(e){}})();`,
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-slate-900 focus:shadow-lg"
        >
          {locale === "fr" ? "Passer au contenu principal" : "Skip to main content"}
        </a>
        <LocaleProvider locale={locale}>
          <Header />
          <main id="main-content" className="pt-20 pb-10 sm:pt-24 sm:pb-12">
            <FrenchTranslationBanner />
            {children}
          </main>
          <Footer locale={locale} />
        </LocaleProvider>
      </body>
    </html>
  );
}
