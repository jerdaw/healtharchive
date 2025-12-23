"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HoverGlowButton } from "@/components/home/HoverGlowButton";

import { useLocale } from "@/components/i18n/LocaleProvider";

type SearchWithinResultsProps = {
  q: string;
  within: string;
  source: string;
  fromDate: string;
  toDate: string;
  sort: string;
  view: string;
  includeNon2xx: boolean;
  includeDuplicates: boolean;
  pageSize: number;
  defaultSort: string;
  defaultView: string;
};

export function SearchWithinResults({
  q,
  within,
  source,
  fromDate,
  toDate,
  sort,
  view,
  includeNon2xx,
  includeDuplicates,
  pageSize,
  defaultSort,
  defaultView,
}: SearchWithinResultsProps) {
  const locale = useLocale();
  const label = locale === "fr" ? "Rechercher dans les résultats" : "Search within results";
  const placeholder =
    locale === "fr"
      ? "Ajouter des mots-clés pour affiner la liste actuelle…"
      : "Add keywords to narrow the current list…";
  const [open, setOpen] = useState(Boolean(within));
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocusOnOpenRef = useRef(false);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    if (!shouldFocusOnOpenRef.current) return;
    shouldFocusOnOpenRef.current = false;
    const handle = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => window.clearTimeout(handle);
  }, [open]);

  const handleToggle = () => {
    shouldFocusOnOpenRef.current = true;
    setOpen(true);
  };

  return (
    <form
      id={formId}
      method="get"
      className={`flex w-full items-start transition-[padding] duration-300 ease-out ${
        open ? "gap-2 py-2" : "gap-0 py-0"
      }`}
      aria-label={label}
    >
      <div
        className={`min-w-0 flex-1 transition-[max-width,max-height] duration-300 ease-out ${
          open ? "max-h-12 max-w-[640px] overflow-visible" : "max-h-0 max-w-0 overflow-hidden"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`transition-opacity duration-150 ease-out ${
            open ? "opacity-100 delay-150" : "opacity-0"
          }`}
        >
          <label className="sr-only" htmlFor={`${formId}-q-within`}>
            {label}
          </label>
          <input
            ref={inputRef}
            id={`${formId}-q-within`}
            name="within"
            type="search"
            defaultValue={within}
            placeholder={placeholder}
            className="border-ha-border w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-0 outline-none placeholder:text-slate-400 focus:z-10 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
          />
        </div>
      </div>

      <input type="hidden" name="q" value={q} />
      <input type="hidden" name="focus" value="filters" />

      {/* Keep filters in sync */}
      <input type="hidden" name="source" value={source} />
      {fromDate && <input type="hidden" name="from" value={fromDate} />}
      {toDate && <input type="hidden" name="to" value={toDate} />}
      {sort !== defaultSort && <input type="hidden" name="sort" value={sort} />}
      {view !== defaultView && <input type="hidden" name="view" value={view} />}
      {includeNon2xx && <input type="hidden" name="includeNon2xx" value="true" />}
      {includeDuplicates && <input type="hidden" name="includeDuplicates" value="true" />}
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={String(pageSize)} />

      {/* Collapsed: link-like affordance. Expanded: morph into primary button. */}
      <div className="grid flex-shrink-0 grid-cols-1 grid-rows-1 items-center">
        <button
          type="button"
          onClick={handleToggle}
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
          className={`text-ha-accent col-start-1 row-start-1 text-left text-xs font-medium underline-offset-2 transition-all duration-300 hover:text-blue-700 hover:underline ${
            open ? "pointer-events-none translate-x-2 opacity-0" : "translate-x-0 opacity-100"
          }`}
        >
          {label} →
        </button>

        <HoverGlowButton
          type="submit"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          disabled={!open}
          className={`ha-btn-primary col-start-1 row-start-1 overflow-hidden text-xs whitespace-nowrap transition-[opacity,transform,max-height,padding,border-width] duration-300 ${
            open
              ? "pointer-events-auto max-h-12 translate-x-0 !px-4 !py-2 opacity-100"
              : "pointer-events-none max-h-0 -translate-x-2 !border-0 !px-0 !py-0 opacity-0"
          }`}
        >
          {label}
        </HoverGlowButton>
      </div>
    </form>
  );
}
