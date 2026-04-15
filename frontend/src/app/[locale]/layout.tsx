import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "../globals.css";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { FrenchTranslationBanner } from "@/components/i18n/FrenchTranslationBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { isLocale, localeToLanguageTag, supportedLocales } from "@/lib/i18n";
import { SITE_BASE_URL } from "@/lib/metadata";
import { buildMetaDescription } from "@/lib/siteCopy";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

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
        ? "HealthArchive.ca – Archive indépendante d'information de santé publique au Canada"
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
    alternates: {
      types: {
        "application/rss+xml": `${SITE_BASE_URL}/api/changes/rss`,
      },
    },
  };
}

export function generateStaticParams(): Array<{ locale: string }> {
  return supportedLocales.map((locale) => ({ locale }));
}

import { Libre_Baskerville } from "next/font/google";

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
});

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
    <html lang={localeToLanguageTag(locale)} suppressHydrationWarning>
      <body className={`antialiased ${libreBaskerville.variable}`}>
        <JsonLd />
        <Script
          id="ha-theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var storageKey='ha-theme';var stored=window.localStorage.getItem(storageKey);var root=document.documentElement;var prefersDark=false;try{prefersDark=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}catch(e){}if(stored==='dark'||(!stored&&prefersDark)){root.setAttribute('data-theme','dark');}else{root.removeAttribute('data-theme');}}catch(e){}})();`,
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-slate-900 focus:shadow-lg"
        >
          {locale === "fr" ? "Passer au contenu principal" : "Skip to main content"}
        </a>
        <LocaleProvider locale={locale}>
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            className="pt-[calc(var(--ha-shell-header-height,5.5rem)+0.75rem)] pb-10 sm:pb-12"
          >
            <Suspense fallback={null}>
              <FrenchTranslationBanner />
            </Suspense>
            {children}
          </main>
          <Footer locale={locale} />
        </LocaleProvider>
      </body>
    </html>
  );
}
