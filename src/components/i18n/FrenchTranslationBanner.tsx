"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useLocale } from "@/components/i18n/LocaleProvider";

function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|fr)(?=\/|$)/, "");
  return stripped || "/";
}

export function FrenchTranslationBanner() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  if (locale !== "fr") return null;

  const canonicalPath = stripLocalePrefix(pathname);
  const englishHref = queryString ? `${canonicalPath}?${queryString}` : canonicalPath;

  return (
    <div className="ha-container pt-4">
      <div className="ha-callout border-amber-300 bg-amber-50 text-amber-900">
        <h2 className="ha-callout-title">Version française (alpha)</h2>
        <p className="mt-2 text-xs leading-relaxed sm:text-sm">
          La version française est une traduction automatisée, fournie à titre informatif seulement,
          et peut contenir des erreurs. La version anglaise fait foi.
        </p>
        <p className="mt-3 text-xs leading-relaxed sm:text-sm">
          <NextLink href={englishHref} className="text-ha-accent font-medium hover:text-blue-700">
            Passer à la version anglaise de cette page
          </NextLink>
          .
        </p>
      </div>
    </div>
  );
}
