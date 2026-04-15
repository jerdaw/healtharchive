"use client";

import { useEffect } from "react";

type ArchiveFiltersAutoscrollProps = {
  targetId: string;
  focusParam?: string;
};

export function ArchiveFiltersAutoscroll({ targetId, focusParam }: ArchiveFiltersAutoscrollProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const focusKey = focusParam ?? targetId;
    const shouldScroll =
      window.location.hash === `#${targetId}` || url.searchParams.get("focus") === focusKey;
    if (!shouldScroll) return;

    const el = document.getElementById(targetId);
    if (!el) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handle = window.setTimeout(() => {
      const headerEl = document.querySelector<HTMLElement>(".ha-shell-header");
      const headerHeight = headerEl?.getBoundingClientRect().height ?? 0;
      // The header includes a decorative gradient "shadow" (::after) that
      // extends below the header box. Add a little extra offset so the target
      // card isn't partially obscured.
      const padding = 40;
      const targetTop = el.getBoundingClientRect().top + window.scrollY - headerHeight - padding;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      url.searchParams.delete("focus");
      url.hash = "";
      window.history.replaceState(null, "", url.toString());
    }, 0);

    return () => window.clearTimeout(handle);
  }, [targetId, focusParam]);

  return null;
}
