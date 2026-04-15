"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { getHomeCopy } from "@/lib/homeCopy";
import { localizeHref } from "@/lib/i18n";

export function HomeSearch({ ariaLabel }: { ariaLabel?: string } = {}) {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <form
      method="get"
      action={localizeHref(locale, "/archive")}
      className="ha-home-search"
      role="search"
      aria-label={ariaLabel}
    >
      <input
        type="text"
        name="q"
        placeholder={copy.search.placeholder}
        aria-label={copy.search.placeholder}
        className="ha-home-search-input"
      />
      <button type="submit" className="ha-btn-primary">
        {copy.search.button}
      </button>
    </form>
  );
}
