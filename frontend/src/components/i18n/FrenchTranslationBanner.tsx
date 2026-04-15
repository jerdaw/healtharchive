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
    <div className="ha-container pt-6">
      <div className="ha-callout border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-500 dark:bg-transparent dark:text-amber-100">
        <p className="text-xs leading-snug">
          <strong>Le français est une traduction alpha automatisée.</strong> Pour le texte officiel,
          consultez la{" "}
          <NextLink href={englishHref} className="ha-link underline">
            version anglaise
          </NextLink>
          .
        </p>
      </div>
    </div>
  );
}
