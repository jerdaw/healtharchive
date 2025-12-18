"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HoverGlowButton } from "@/components/home/HoverGlowButton";

type SearchWithinResultsProps = {
  q: string;
  source: string;
  fromDate: string;
  toDate: string;
  sort: string;
  view: string;
  includeNon2xx: boolean;
  pageSize: number;
  defaultSort: string;
  defaultView: string;
};

export function SearchWithinResults({
  q,
  source,
  fromDate,
  toDate,
  sort,
  view,
  includeNon2xx,
  pageSize,
  defaultSort,
  defaultView,
}: SearchWithinResultsProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    // Let layout settle before focusing so the input is reliably visible.
    const handle = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(handle);
  }, [open]);

  const handleToggle = () => {
    setOpen(true);
  };

  return (
    <form
      id={formId}
      method="get"
      className="flex items-center gap-2"
      aria-label="Search within results"
    >
      <div
        className={`min-w-0 flex-1 overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
          open ? "max-w-[640px] opacity-100" : "max-w-0 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <label className="sr-only" htmlFor={`${formId}-q-within`}>
          Search within results
        </label>
        <input
          ref={inputRef}
          id={`${formId}-q-within`}
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Add keywords to narrow the current list…"
          className="h-10 w-full rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#11588f] focus:ring-2 focus:ring-[#11588f]"
        />
      </div>

      {/* Keep filters in sync */}
      <input type="hidden" name="source" value={source} />
      {fromDate && <input type="hidden" name="from" value={fromDate} />}
      {toDate && <input type="hidden" name="to" value={toDate} />}
      {sort !== defaultSort && <input type="hidden" name="sort" value={sort} />}
      {view !== defaultView && <input type="hidden" name="view" value={view} />}
      {includeNon2xx && (
        <input type="hidden" name="includeNon2xx" value="true" />
      )}
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={String(pageSize)} />

      {/* Collapsed: link-like affordance. Expanded: morph into primary button. */}
      <div className="grid flex-shrink-0 grid-cols-1 grid-rows-1 items-center">
        <button
          type="button"
          onClick={handleToggle}
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
          className={`col-start-1 row-start-1 py-2 text-xs font-medium text-ha-accent hover:text-blue-700 transition-all duration-300 ${
            open
              ? "pointer-events-none opacity-0 translate-x-2"
              : "opacity-100 translate-x-0"
          }`}
        >
          Search within results →
        </button>

        <HoverGlowButton
          type="submit"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          disabled={!open}
          className={`col-start-1 row-start-1 ha-btn-primary text-xs whitespace-nowrap transition-all duration-300 !px-4 !py-2 ${
            open
              ? "opacity-100 translate-x-0 pointer-events-auto"
              : "opacity-0 -translate-x-2 pointer-events-none"
          }`}
        >
          Search within results
        </HoverGlowButton>
      </div>
    </form>
  );
}
