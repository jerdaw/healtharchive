# Feature Pages Analysis

Date: 2026-02-24

Analysis of six feature pages (browse-by-source, changes, compare, compare-live, status, impact).
Pages covered exclude the main archive search and snapshot viewer, which are tracked separately.

Ratings key:

- ✅ Working well / no action needed
- 🔧 Minor improvement opportunity
- ⚠️ Notable gap or friction worth addressing

Note: `formatDate`/`formatNumber` deduplication and `ha-home-hero` class swaps are already completed and are not listed as improvements here.

---

## 1. Browse by Source (`/archive/browse-by-source`)

### Observations

1. ✅ Falls back gracefully to demo `getSourcesSummary()` data when the backend is unreachable.
2. ✅ Correctly filters out the `test` source code from live API results.
3. ✅ Sorts sources by `recordCount` descending, then alphabetically on tie — sensible default ordering.
4. ✅ Uses `ha-card ha-card-elevated` with `overflow-hidden p-0` for the thumbnail card layout.
5. ✅ Preview images use `loading="lazy" decoding="async"` and a gradient overlay for dark mode.
6. ✅ Bilingual source name and homepage URL resolution via `getLocalizedSourceName` / `getLocalizedSourceHomepage`.
7. ✅ Two distinct CTA paths: external `entryBrowseUrl` (via `<a>`) vs. internal `/browse/:id` (via `LocalizedLink`).
8. 🔧 The record-count string inside each card uses raw `new Intl.NumberFormat(...).format(...)` inline rather than `formatNumber(locale, ...)` from `@/lib/format`. This is an inconsistency — `formatNumber` is the project-standard helper and already handles the `null` guard and locale tag lookup.
9. 🔧 The plural/gender logic for French ("capturée" / "capturées") is inlined in JSX across two branches. A small helper (e.g., `formatSnapshotCount(locale, count)`) would centralise this and make the card template cleaner.
10. 🔧 The "Important note" callout and the "Live API unavailable" callout both use inline ternary locale strings rather than `getSiteCopy` or the local `getBrowseBySourceCopy` pattern used elsewhere in the file. The `siteCopy.workflow.archiveSummary` content is already wired, but the callout title ("Important note" / "Note importante") is not.
11. 🔧 Card `<h2>` uses `text-slate-900` directly. Other pages in the codebase use `ha-card-title` or inline Tailwind — the project does not currently define `.ha-card-title` as a CSS class, but the pattern `text-sm font-semibold text-slate-900` is repeated across every card on every page and is a candidate for extraction.
12. 🔧 The `previewSrc` placeholder block ("Preview unavailable") has no dark-mode background colour class — it uses `dark:bg-[#0b0c0d]` (a raw hex), matching the card body colour but bypassing the CSS variable system.
13. 🔧 No `<article>` `aria-label` ties the card to its source name, so screen reader users traversing landmark regions will encounter unlabelled articles.
14. ⚠️ The "View archived site" / "View latest snapshot" label difference is driven by `entryRecordId` being set, but there is no visual distinction between the two states — both render as `ha-btn-primary`. A user cannot tell at a glance whether they will land on the curated entry page or just the most recent snapshot.
15. ⚠️ The page has no record count summary ("N sources found") to orient users before they scroll into the grid, and no empty-state if `summaries` ends up empty after filtering.

### Top 5 Improvements

1. **Replace inline `Intl.NumberFormat` with `formatNumber`** — remove the two raw `new Intl.NumberFormat` calls in the card template and use `formatNumber(locale, source.recordCount)` consistently with the rest of the codebase.
2. **Add `aria-label` to each `<article>`** — e.g., `aria-label={source.sourceName}` to give screen reader users a navigable card landmark.
3. **Show a source count summary** — add a line above the grid (e.g., "Showing N sources") so users know the scope of coverage before scrolling.
4. **Distinguish entry-point vs. latest-snapshot CTA visually** — use a lighter or secondary style for "View latest snapshot" vs. the primary style for "View archived site" so intent is clear.
5. **Extract the French plural helper** — create `formatSnapshotCount(locale, count)` in `src/lib/format.ts` to replace the duplicated inline plural/gender string logic.

---

## 2. Changes (`/changes`)

### Observations

1. ✅ Uses `Promise.allSettled` for sources fetch so a sources API failure does not crash the page.
2. ✅ Wraps `fetchSourceEditions` and `fetchChanges` in try/catch with graceful `null` fallbacks.
3. ✅ Pagination is implemented with `currentPage` / `totalPages` and properly clamps page < 1.
4. ✅ The scope form's `<select>` elements use `defaultValue` correctly and the edition select is disabled when no editions are loaded.
5. ✅ `ha-callout` is used appropriately for the three distinct error/empty states (unavailable, disabled, no results).
6. ✅ Change events surface `changeType` and `highNoise` as `ha-tag` badges — visually clear.
7. 🔧 The Scope form section heading is "Scope" / "Portée" — a very terse label. "Filter by source & edition" would be more self-explanatory to a first-time user.
8. 🔧 The form submits via native GET (no `action` attribute), which means on locale `/fr/changes` the form will submit to the root `/changes` path and lose the locale. The `action` should be set to the localised path or the redirect logic should handle it.
9. 🔧 The "Update view" button is the only submit control but it looks like a primary action button while "View digest & RSS" is secondary — yet they sit side by side with no visual hierarchy. The digest link could move below the form.
10. 🔧 The edition `<select>` label says "Edition (latest by default)" but the label's `for` attribute is implicit via wrapping — the `<select>` itself has no `id` for explicit `<label htmlFor>` association. The current pattern is valid HTML but less robust for assistive technology.
11. 🔧 Pagination URL construction uses string template literals with `encodeURIComponent(selectedSource)` but does not encode `selectedEdition?.jobId` — a job ID that contained a special character would produce a malformed URL (unlikely today but fragile).
12. 🔧 The changes feed section heading "Changes feed" / "Fil des changements" uses `ha-section-heading` inside a `ha-content-section`, which is correct, but the `<h2>` for the feed and the `<h2>` for the callout below it ("Changes unavailable") are both `h2` — the callout heading should be `h3` for correct hierarchy since it is a sub-state of the section.
13. 🔧 Change event cards use `ha-card` with no elevated variant — they are visually flat in a way that makes them harder to scan in a long list. `ha-card-elevated` or a subtle left-border treatment would improve scannability.
14. ⚠️ The form relies on a full page reload (server component navigation) each time the user selects a different source or edition. There is no progressive enhancement, loading indicator, or hint that the page will reload — a user who changes the source dropdown may not realize they need to click "Update view."
15. ⚠️ Total result count is never surfaced. The pagination row shows "Page N of M" but never "N changes total" — users cannot gauge the volume of activity for a given edition without doing math.

### Top 5 Improvements

1. **Surface total result count** — show "N changes" above or inside the pagination row so users understand volume without arithmetic.
2. **Fix form locale routing** — add `action` attribute pointing to the locale-aware path (e.g., `/fr/changes` for French) so form submissions do not drop the locale prefix.
3. **Correct heading hierarchy in error states** — demote the `ha-callout-title` `<h2>` within the feed section to `<h3>` since the section already has an `<h2>`.
4. **Rename section heading from "Scope"** — use "Filter by source & edition" / "Filtrer par source et édition" for clarity to new users.
5. **Encode edition job ID in pagination URLs** — wrap `selectedEdition?.jobId` in `encodeURIComponent` for defensive correctness.

---

## 3. Compare (`/compare`)

### Observations

1. ✅ Handles the missing `to` param gracefully with a dedicated "Compare unavailable" state.
2. ✅ Handles a missing `from` param (first capture) with a clear prose explanation rather than an error.
3. ✅ Fetches the latest snapshot ID via `fetchSnapshotLatest` to ensure the "Compare to live page" link is not stale.
4. ✅ `formatPercent` is a clean, local helper that rounds to whole-number percentage — appropriate for the summary stats context.
5. ✅ High-noise callout uses amber styling (`border-amber-300 bg-amber-50 text-amber-900`) — distinct and recognisable.
6. ✅ `dangerouslySetInnerHTML` for `diffHtml` is used in the `ha-diff` container, consistent with `compare-live` and existing diff conventions.
7. ✅ `rel="nofollow"` on the "Compare to live page" link correctly signals that the live comparison is transient.
8. 🔧 The capture metadata cards ("Earlier capture" / "Later capture") expose "ID {snapshotId}" as raw text. For researchers, this is useful, but it is presented without any label or context — it looks like a debug artifact. Wrapping it as "Snapshot ID: {n}" or using a `ha-tag` would be cleaner.
9. 🔧 The action buttons row (View snapshot / Compare to live page) is placed above the metadata grid and the diff. This means the user has to scroll past actions to reach the actual content. Moving actions below the metadata cards or after the diff would improve reading flow.
10. 🔧 `formatPercent` is defined locally here and also in `compare-live/page.tsx` — two identical implementations. Should be extracted to `src/lib/format.ts`.
11. 🔧 The metadata cards repeat the same `<Link href={/snapshot/...} className="ha-btn-secondary text-xs">` "View snapshot" button twice (once per card). The "to" snapshot already has a top-level "View snapshot" button — the per-card buttons add UI noise. The "from" card button is useful; the "to" card one is redundant.
12. 🔧 Change stats (added/removed lines, change ratio) are shown without visual grouping — they render as a flat row of `<span>` elements that bleed together, especially on mobile. A `ha-tag` or separator treatment between stats would improve readability.
13. 🔧 There is no back-link to the `/changes` feed that originated the comparison. Users who arrive from the changes feed have no breadcrumb or return path other than the browser back button.
14. ⚠️ The page title is always "Compare archived captures" regardless of which specific pages are being compared. For researchers who open multiple tabs, a more specific title like "Compare: [source name] — [date A] vs [date B]" would be far more useful.
15. ⚠️ The diff section has no table of contents or section jump links for long diffs. A very large diff renders as a single scrollable block with no way to navigate to changed sections.

### Top 5 Improvements

1. **Extract `formatPercent` to `src/lib/format.ts`** — remove the duplicated local implementations from both compare pages and import from the shared module.
2. **Improve page title specificity** — populate `<title>` with source name and capture dates when available, e.g., "Compare: [Source] — [date] vs [date]".
3. **Add back-link to the changes feed** — include a "Back to changes" / "Return to /changes" link at the top of the page, using the originating source/job params if available.
4. **Move action buttons below the capture metadata grid** — place the "View snapshot" and "Compare to live" actions after the metadata cards and before the diff, not above the metadata.
5. **Style change stats as distinct tags or with separators** — avoid the undifferentiated `<span>` run; use `ha-tag` or a pipe separator so each stat is visually distinct.

---

## 4. Compare Live (`/compare-live`)

### Observations

1. ✅ `export const dynamic = "force-dynamic"` prevents stale caching of live-fetch results.
2. ✅ `robots: { index: false, follow: false }` correctly suppresses indexing of transient live comparison pages.
3. ✅ URL resolution fallback: if no `to` snapshot ID is provided but a `url` param is, it searches for the most recent snapshot for that URL.
4. ✅ Two-step flow (confirmation screen → fetch) prevents accidental slow outbound fetches from page load.
5. ✅ Text scope toggle (main content vs. full-page) is exposed as two `ha-tag` links with a `ring-1 ring-blue-700` active indicator.
6. ✅ Falls back from `CompareLiveDiffPanel` to raw `dangerouslySetInnerHTML` when the render object is absent — defensive and correct.
7. ✅ Redirect detection shown inline ("Redirected from …") is helpful context for researchers.
8. 🔧 `formatPercent` is defined locally for the third time (also in `compare/page.tsx`). This is the most obvious cross-page duplication in the codebase — needs extraction to `src/lib/format.ts`.
9. 🔧 `formatUtcTimestamp` is a local helper that partially duplicates `formatDate` — it handles a different output format (ISO-8601 string) but shares the null/parse guard logic. A note in `format.ts` about when to use each would reduce future re-implementation.
10. 🔧 The confirmation card uses `ha-card ha-home-panel` — `ha-home-panel` is semantically a homepage section style. For a feature page interaction card, a plain `ha-card` with `ha-card-elevated` would be more appropriate and consistent with the rest of the feature pages.
11. 🔧 The amber disclaimer text uses `text-[11px]` (an arbitrary Tailwind size), not `text-xs`. This is inconsistent with the rest of the app and would be better expressed as `text-xs` with `font-medium` if the visual weight matters.
12. 🔧 The live fetch metadata block in the results state shows raw HTTP status code, content type, and byte count inline in a single `<p>` — useful debugging information but visually cluttered. A small definition list (`<dl>`) or separated lines would be easier to parse.
13. 🔧 The "Fetch live diff again" / "Recharger le diff" button in the results state leads back to `runHref` with `run=1`, meaning clicking it immediately re-fetches without a confirmation step. This is the right behaviour but not explained to the user.
14. ⚠️ The text-scope toggle (main / full-page) resets to "main" any time the URL changes (e.g., after a re-fetch), because the mode is only read from `modeParam`. If the user selected "full" and then clicks "Fetch live diff again", the re-fetch respects the mode — but if they navigate using the mode links on the confirmation screen, the selected mode is not remembered across the confirmation→run transition unless the user explicitly picks it again.
15. ⚠️ There is no expiry or freshness indicator on the comparison result. The `fetchedAt` timestamp is shown, but there is no guidance on when a live comparison is considered outdated or should be re-run. For researchers, a "fetched N minutes ago" relative timestamp would be more useful than the raw UTC ISO string.

### Top 5 Improvements

1. **Extract `formatPercent` to `src/lib/format.ts`** — third copy of an identical function; consolidate immediately.
2. **Replace `ha-home-panel` on the confirmation card with `ha-card ha-card-elevated`** — `ha-home-panel` is a homepage-specific style not intended for feature page interaction cards.
3. **Standardise `text-[11px]` to `text-xs`** — replace the two occurrences of the arbitrary size with the standard utility for consistency.
4. **Add a relative "fetched N minutes ago" label** — surface how long ago the live fetch occurred so researchers can judge staleness without parsing an ISO string.
5. **Clarify the re-fetch flow** — add a brief note ("This will fetch the live page again") next to the "Fetch live diff again" button so users understand they are triggering a new outbound request.

---

## 5. Status (`/status`)

### Observations

1. ✅ Uses `Promise.allSettled` for all four data fetches — the page never hard-fails regardless of API availability.
2. ✅ `statusLabel` ternary covers three states cleanly: Unavailable / Operational / Degraded.
3. ✅ `lastChecked` uses `toLocaleString` with `dateStyle/timeStyle` options — locale-aware and readable.
4. ✅ `formatNumber` and `formatDate` from `@/lib/format` are used consistently (no inline `Intl.*` calls).
5. ✅ Per-source coverage cards mirror the browse-by-source layout, giving users a familiar scanning pattern.
6. ✅ The "Monthly impact report" callout at the bottom cross-links to `/impact` — good navigation link.
7. ✅ Metrics definitions section is clear, plain-language, and covers the key concepts (snapshots vs. pages, capture time vs. update time).
8. 🔧 The "Current status" section uses a plain `ha-tag` for the status label with no colour coding. "Operational" and "Degraded" look identical at a glance. Adding colour — green for operational, amber/red for degraded — would make the status immediately scannable.
9. 🔧 `siteCopy.whatThisSiteIs.is` and `siteCopy.whatThisSiteIs.isNot` are concatenated inline in the status card with a `<span>` "Not:" separator. This is a fragile prose pattern; a `<dl>` or two separate `<p>` elements would be clearer and more accessible.
10. 🔧 "Coverage snapshot" / "Aperçu de la couverture" is used as a section heading on both `/status` and `/impact`. The heading is identical on both pages, which is confusing if a user has both open. `/status` could say "Live coverage snapshot" to differentiate.
11. 🔧 The per-source coverage grid (`ha-grid-2`) is purely informational duplicates of browse-by-source cards — but it also includes CTA buttons ("View archived site", "Browse records"). These CTAs make sense on a browse page but feel noisy on a status/metrics page. Consider a leaner card for this context (name + dates + snapshot count, no action buttons).
12. 🔧 The "Usage snapshot" section conditionally renders nothing (beyond a callout) when usage is disabled. The callout message "Enable aggregated usage counts in the backend to display this section" is clearly developer-facing copy, not appropriate for public users who have no ability to change backend settings.
13. 🔧 The status page has no `<time>` element with a `dateTime` attribute for the "Last checked" value. Assistive technologies and machine consumers would benefit from a structured timestamp.
14. ⚠️ The page re-validates data entirely on load (server component, no caching hint). For a status page, `revalidate = 60` (or a short ISR window) would reduce backend load while keeping data reasonably fresh.
15. ⚠️ There is no link from `/status` to the RSS feed or digest for change notifications — the "Monthly impact report" link is present, but users interested in ongoing status changes have no directed path to `/digest`.

### Top 5 Improvements

1. **Colour-code the status label** — apply green/amber/red tinting to the status `ha-tag` based on the value (operational / degraded / unavailable) for immediate visual recognition.
2. **Replace the developer-facing usage callout** — rewrite "Enable aggregated usage counts in the backend…" as user-appropriate copy ("Usage data is not available for this reporting period.").
3. **Add a link to `/digest` or RSS** — surface the change notifications feed from the status page for users who want to track ongoing changes.
4. **Use `<time dateTime="...">` for the "Last checked" timestamp** — structured timestamp improves accessibility and machine readability.
5. **Add a short ISR revalidation hint** — export `revalidate = 60` (or similar) to avoid re-fetching all four API endpoints on every page request during stable periods.

---

## 6. Impact (`/impact`)

### Observations

1. ✅ Page title is dynamically generated with the current month/year label — the `getImpactCopy` helper uses `toLocaleDateString` to produce the month label, which is locale-aware.
2. ✅ `Promise.allSettled` for stats and usage — page never hard-fails.
3. ✅ `formatNumber` and `formatDate` used consistently.
4. ✅ "Near-term focus" section (expanding coverage, JS-heavy replay, bilingual support) sets clear public expectations and humanises the project.
5. ✅ Cross-links to `/status` and `/changelog` are present — good navigation continuity.
6. ✅ "Project updates" section references the changelog and avoids duplicating its contents.
7. 🔧 The coverage snapshot grid (sources, snapshots, unique pages in `ha-grid-3`) is pixel-for-pixel identical to the same section in `/status/page.tsx`. This is the most obvious structural duplication across feature pages — it is a natural candidate for a shared `<CoverageSnapshot>` server component or even just a shared async helper that both pages call.
8. 🔧 The usage snapshot grid (four cards: search requests, snapshot detail views, raw views, reports submitted) is also pixel-for-pixel identical to `/status`. Same consolidation opportunity.
9. 🔧 The "How to interpret usage" section is page-specific copy, but the underlying concept (aggregate daily totals, no PII) is already in the metrics definitions section on `/status`. The two explanations risk drifting out of sync over time.
10. 🔧 The "Reliability notes" section says "Live service health and coverage metrics are available on the status page" — which is true, but it is the only factual content in the section. It reads as filler. Adding a sentence about current uptime or the cadence of scheduled crawls would make it useful.
11. 🔧 The page title includes the current month as a dynamic string (e.g., "Monthly impact report — February 2026"), but there is no historical navigation — no way to see last month's impact data. If the intent is always "current month only," the title implies persistence that does not exist.
12. 🔧 The "Near-term focus" bullet list uses `list-disc text-ha-muted` — the bullets are muted, which reduces their visual weight. For priorities that communicate project roadmap, a slightly more prominent style (e.g., using `ha-tag` badges inline or `text-slate-700`) would match their importance.
13. 🔧 `getSiteCopy` is not imported or used on this page, unlike every other feature page. If the page needs to add a disclaimer or workflow summary later, it will require adding the import at that point. Low urgency but worth noting.
14. ⚠️ The "Monthly impact report" framing implies a human-curated report, but the page is entirely auto-generated from API data. There is no editorial content, no narrative summary, no month-over-month comparison. Without those, the "report" label is misleading — users expect interpretation, not just the same metrics they can see on `/status`.
15. ⚠️ The impact page has no `revalidate` export, so it re-fetches stats and usage on every request. For a "monthly" report, a revalidation window of several hours would be appropriate and would reduce unnecessary API calls.

### Top 5 Improvements

1. **Extract shared `<CoverageSnapshot>` and `<UsageSnapshot>` components** — the two identical stat grids on `/status` and `/impact` should live in a single shared component (e.g., `src/components/metrics/CoverageSnapshot.tsx`) imported by both pages.
2. **Add a short narrative or month-over-month delta** — even a single auto-generated sentence ("Coverage grew by N snapshots since last month") would fulfil the "report" promise and differentiate `/impact` from `/status`.
3. **Add ISR revalidation** — export `revalidate = 3600` (or a few hours) to avoid re-fetching on every request for a "monthly" page.
4. **Reconsider the page title or add context** — either clarify that the page always shows current-period data ("Live coverage summary") or add a historical archive link so the "monthly report" framing is justified.
5. **Improve "Reliability notes" section content** — replace the pure cross-link sentence with at least one concrete reliability fact (e.g., cadence of annual captures, expected replay fidelity range) so the section provides actual information.
