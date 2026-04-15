# Archive Page Improvement Plan

**Page:** `src/app/[locale]/archive/page.tsx`
**Date:** 2026-02-24
**Status notes:** `formatDate` dedup and `ha-home-hero` swap are already done.

---

## Phase 1: Copy / Messaging Improvements

### 1.1 Collapse the "Important note" callout into the PageShell intro

The `ha-callout` block at the top of the page repeats copy that already exists in `getArchiveCopy()`. The `PageShell` `intro` prop is currently suppressed (`hideHeaderVisually`), so users arriving via the hero CTA see no orienting text before the filters.

**Recommendation:** Remove the standalone `ha-callout` section and instead supply a shorter, punchy intro to `PageShell` (one sentence — the `siteCopy.workflow.archiveSummary` fragment is already perfect). Keep the "Methods & coverage" link as a separate `<p>` below the filters panel or as a footer note, so it is still findable without occupying premium real estate above the fold.

```tsx
// getArchiveCopy – tighten description to one sentence for the PageShell intro
description: (siteCopy.workflow.archiveSummary,
  (
    // Remove this entire block from the JSX:
    // <section className="mb-4">
    //   <div className="ha-callout">…</div>
    // </section>

    // Add a one-line link below the filter form instead:
    <p className="mt-2 text-xs text-[var(--muted)]">
      <Link href="/methods" className="font-medium text-ha-accent">
        {locale === "fr" ? "Méthodes et couverture →" : "Methods & coverage →"}
      </Link>
    </p>
  ));
```

### 1.2 Sharpen the "early release" footer note

The footer `<p>` at line 1137 reads identically in every context (active search, no results, browse). When the user has 10,000+ results in front of them the caveat feels like boilerplate. Consider hiding it when a successful live-backend search is in progress, or converting it to an inline badge on the source cards:

```tsx
{
  !hasActiveSearch && (
    <p className="text-xs leading-relaxed text-ha-muted">
      {locale === "fr"
        ? "Version préliminaire : la couverture et les fonctionnalités sont encore en expansion."
        : "Early release: coverage and features are still expanding."}
    </p>
  );
}
```

### 1.3 Empty-state messaging is too terse

The zero-results card (lines 1047–1057) gives three generic suggestions. Add a context-sensitive hint: if `source` is set but `qForSearch` is empty, suggest broadening the source; if a date range is set, suggest widening the window.

```tsx
const emptyHint = source && !qForSearch
  ? locale === "fr"
    ? "Essayez de sélectionner « Toutes les sources »."
    : "Try selecting "All sources"."
  : fromDate || toDate
    ? locale === "fr"
      ? "Essayez d'élargir la plage de dates."
      : "Try widening the date range."
    : null;
```

### 1.4 Source card stat line: surface capture span, not just latest date

Currently the stat line reads "1,234 snapshots · latest Jan 1, 2025". Archival users care about the full date range. Change to:

```
1,234 snapshots · Jan 2020 – Jan 2025
```

```tsx
// Replace the existing stat <p> inside the source card
<p className="mt-1 whitespace-nowrap text-xs text-ha-muted">
  {new Intl.NumberFormat(localeToLanguageTag(locale)).format(summary.recordCount)}{" "}
  {locale === "fr"
    ? `capture${summary.recordCount === 1 ? "" : "s"}`
    : `snapshot${summary.recordCount === 1 ? "" : "s"}`}{" "}
  · {formatDate(locale, summary.firstCapture)} – {formatDate(locale, summary.lastCapture)}
</p>
```

### 1.5 Tooltip copy for "pages vs snapshots" is duplicated

The same tooltip text appears in two places (the filter-header info button at line 712 and the advanced-options info button at line 871). Extract to a locale-keyed constant to keep them in sync:

```ts
// In getArchiveCopy or a local helper:
const pageVsSnapshotTooltip = {
  pages:
    locale === "fr"
      ? "La vue Pages affiche la dernière capture pour chaque URL."
      : "Pages view shows the latest capture for each URL.",
  snapshots:
    locale === "fr"
      ? "La vue Captures affiche chaque capture, y compris plusieurs captures de la même URL."
      : "Snapshots view shows every capture, including multiple captures of the same URL.",
};
```

---

## Phase 2: Layout / Structure Refinements

### 2.1 Make the filter sidebar sticky on desktop

On long result lists the filter panel scrolls out of view. The layout already uses `lg:items-start`, so adding `lg:sticky lg:top-4` to the `<aside>` is low-risk and would keep controls accessible:

```tsx
// Line 682 – add sticky positioning
<aside
  id="archive-filters"
  className="ha-card ha-home-panel space-y-3 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start"
>
```

Test that the sticky `<aside>` does not exceed viewport height on small laptops; add `lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto` if needed.

### 2.2 Source cards: unify the two "preview unavailable" branches

Lines 546–562 repeat nearly identical markup for "no previewSrc + browseId" and "no previewSrc + no browseId". Extract a `SourceCardThumbnail` helper component (or at minimum a local function) to reduce duplication and make the logic testable:

```tsx
// src/components/archive/SourceCardThumbnail.tsx (new file)
// or a local function inside archive/page.tsx
function SourceCardThumbnail({ previewSrc, browseId, sourceName, locale }: ...) { … }
```

### 2.3 Pull source cards section into its own component

The source-card scroll carousel (lines 473–678) is ~200 lines of JSX inside an already large server component. Extracting a `SourceBrowseCarousel` server component to `src/components/archive/SourceBrowseCarousel.tsx` would:

- Reduce the cognitive load of `archive/page.tsx`
- Make the carousel independently testable
- Allow lazy-loading the carousel data in a future Suspense boundary

```tsx
// src/components/archive/SourceBrowseCarousel.tsx
export function SourceBrowseCarousel({
  summaries,
  locale,
  apiBaseUrl,
}: {
  summaries: SourceBrowseSummary[];
  locale: Locale;
  apiBaseUrl: string;
}) { … }
```

### 2.4 Collapse advanced filter options behind a disclosure

The "Show / Sort / Per page / Include errors / Include duplicates" control strip (lines 851–1003) is always expanded on desktop and can feel overwhelming for first-time users. Wrap in a `<details>` / `<summary>` element (or a `DisclosurePanel` client component) so the defaults handle 90% of use cases and power users can expand:

```tsx
<details open={hasActiveSearch || includeNon2xx || includeDuplicates}>
  <summary className="cursor-pointer text-xs font-medium text-ha-muted">
    {locale === "fr" ? "Options avancées" : "Advanced options"}
  </summary>
  <div className="mt-2 rounded-lg bg-[var(--surface-bg-soft)] py-2">
    {/* existing advanced controls */}
  </div>
</details>
```

### 2.5 Pagination: add a compact "page N of M" input for large corpora

When `pageCount` is large (e.g. 40+ pages) the First/Prev/Next/Last buttons require many clicks. A small `<input type="number">` alongside the page label would let users jump directly:

```tsx
// Lightweight client component wrapping a form submit on blur/Enter
// src/components/archive/PageJumpInput.tsx
```

---

## Phase 3: Interaction / Motion Enhancements

### 3.1 Scroll-restore after pagination

Currently, navigating to the next page lands the user at the top of the document. The `<ArchiveFiltersAutoscroll>` component handles `focus=results` but only scrolls to `#archive-results`. Consider firing a smooth scroll into the first result card on mount (client component) so users do not need to manually scroll past the filter panel.

```tsx
// In ArchiveFiltersAutoscroll or a sibling ResultsScrollAnchor component:
// On mount, if focusParam === "results", scroll to #archive-results
// with behavior: "smooth" and a short delay to allow SSR hydration.
```

### 3.2 Source card carousel: keyboard/swipe nav

The horizontal overflow carousel (lines 489–676) has no keyboard-accessible scroll controls. On mobile it is touch-scrollable, but on desktop keyboard-only users cannot reach cards beyond the viewport without a mouse. Add left/right scroll buttons that appear on hover/focus, similar to common carousels:

```tsx
// Wrap the overflow div in a client component SourceCarousel
// Add <button aria-label="Scroll left"> / <button aria-label="Scroll right">
// positioned absolutely at the edges, visible on :focus-within or :hover
// Use element.scrollBy({ left: ±256, behavior: "smooth" })
```

### 3.3 Animate the result count badge

When the result count changes (new search submitted), the transition is abrupt. A fade-in on `resultCountText` via a key-based CSS animation would reduce jarring layout shifts:

```tsx
<span
  key={resultCountText} // forces remount, triggers animation
  className="animate-fade-in ml-auto text-right text-xs text-ha-muted"
>
  {resultCountText}…
</span>
```

Add `.animate-fade-in { animation: fadeIn 0.2s ease; }` to `globals.css` (already has similar patterns for other animations).

### 3.4 Show / Sort / Per-page selects: auto-submit on change

Currently, changing View or Sort requires clicking "Apply". Since these selects appear in a server-rendered form, adding `onChange="this.form.submit()"` (or a thin client wrapper) would feel more responsive and matches how most search UIs behave:

```tsx
// Wrap the advanced controls strip in a minimal client island
// "use client";
// Attach onChange={e => e.currentTarget.form?.requestSubmit()} to each select
```

Be careful to only do this for the View/Sort/PageSize selects, not the date inputs (where partial input is common).

### 3.5 Highlight active filter state in the sidebar header

When `hasActiveSearch` is true, the sidebar `<h2>` already switches to "Page search results". A subtle visual indicator (a colored dot or `ha-badge` count showing how many non-default filters are active) would help users understand at a glance why results may be narrowed:

```tsx
{
  hasActiveSearch && (
    <span className="ha-badge ml-1 text-[10px]">
      {[q, source, fromDate, toDate, includeNon2xx, includeDuplicates].filter(Boolean).length}
    </span>
  );
}
```

---

## Phase 4: Styling / Responsive Polish

### 4.1 Source cards: increase thumbnail height on wider breakpoints

The `h-[4.5rem]` thumbnail (lines 510, 531) is quite short — government homepage screenshots have a lot of vertical content. On `md` and above, a taller thumbnail (e.g. `h-24` / `h-[6rem]`) would show more of the captured page and help users orient to the source.

```tsx
className =
  "border-ha-border relative block h-[4.5rem] md:h-24 overflow-hidden border-b bg-[var(--card-bg)]";
```

### 4.2 Source card action row: distinguish primary from secondary links

The three-column action row at lines 625–671 uses plain `text-ha-accent` links with no visual weight difference between "View", "View ↗" (external), and "Search". "View" is the primary CTA; give it a subtle button treatment (e.g., `ha-btn-primary text-xs py-0.5 px-2`) while keeping "View ↗" and "Search" as text links.

### 4.3 Filter form inputs: consistent height with the select controls

The keyword `<input>` (line 798) has `py-2` padding producing ~40px height. The source `<select>` (line 816) has explicit `h-10`. On some browsers this mismatches. Set `h-10` on both inputs for visual alignment:

```tsx
className = "border-ha-border h-10 min-w-0 flex-1 rounded-lg border …";
```

### 4.4 Pagination: hide "First" / "Last" on mobile to reduce clutter

On narrow screens the four pagination buttons wrap awkwardly. On `<sm` screens, show only Prev/Next; on `sm+` show all four:

```tsx
<Link href={buildPageHref(1)} … className={`ha-btn-secondary text-xs hidden sm:inline-flex …`}>
  {locale === "fr" ? "« Première" : "« First"}
</Link>
```

### 4.5 Offline-sample warning: use `ha-callout-warning` class

Line 1038 uses a bare `ha-callout-warning` class but wraps it in a `<div>` inside the results section. Make sure it matches the same styling as the `ha-callout-warning` used for the backend error (line 1008) — currently the two are visually identical in class name but the outer `<div>` and inline `font-medium` may cause minor spacing differences. Audit against `globals.css` lines 1887–1896 to ensure both states render consistently.

### 4.6 Dark-mode review: source card thumbnail overlay

When source preview images load slowly in dark mode, the placeholder `bg-[var(--card-bg)]` is correct, but the "Preview unavailable" text at lines 556 and 560 could benefit from a dimmed icon (e.g., a camera-slash SVG) to make the empty state feel intentional rather than broken. This is a low-priority cosmetic touch.

```tsx
// Replace text-only placeholder with icon + text
<div className="flex h-[4.5rem] flex-col items-center justify-center gap-1 border-b border-ha-border bg-[var(--card-bg)] px-4 text-xs text-ha-muted md:h-24">
  {/* inline SVG camera-slash, 16x16 */}
  <span>{locale === "fr" ? "Aperçu indisponible" : "Preview unavailable"}</span>
</div>
```
