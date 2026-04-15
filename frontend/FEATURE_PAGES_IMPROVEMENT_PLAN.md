# Feature Pages Improvement Plan

Date: 2026-02-24

Improvements are grouped by workstream and then by whether they are shared across multiple pages or page-specific. Items within each workstream are ordered roughly by effort (low to high). Cross-references to the analysis document are noted where helpful.

Pages in scope: browse-by-source, changes, compare, compare-live, status, impact.
Pages out of scope: archive search, snapshot viewer (tracked separately).
Already completed: `formatDate`/`formatNumber` dedup, `ha-home-hero` class swaps.

---

## Workstream A — Code / Shared Utilities

These are pure TypeScript/utility changes with no visual impact. They reduce duplication and improve consistency.

### A1. Extract `formatPercent` to `src/lib/format.ts` [shared: compare, compare-live]

Both `/compare` and `/compare-live` define an identical local `formatPercent(value)` function that rounds a `number | null | undefined` to a whole-number percentage string. Neither calls the other, so the implementation is duplicated verbatim.

**Action:** Add `export function formatPercent(locale: Locale, value: number | null | undefined): string` to `src/lib/format.ts`. Remove the two local implementations and import the shared helper. The `locale` parameter is a no-op for now (percentages are not locale-formatted differently today) but follows the established pattern of passing locale through format helpers for future flexibility.

Files: `src/lib/format.ts`, `src/app/[locale]/compare/page.tsx`, `src/app/[locale]/compare-live/page.tsx`.

### A2. Extract `formatSnapshotCount(locale, count)` to `src/lib/format.ts` [browse-by-source]

The browse-by-source card template contains inlined French plural/gender logic for "capturée" / "capturées" alongside the record count. This is duplicated in two JSX branches (EN and FR) inside the same map callback.

**Action:** Add a `formatSnapshotCount(locale: Locale, count: number): string` helper to `src/lib/format.ts` that returns the full localised count string (e.g., "1 snapshot captured between …" or "3 captures capturées entre le …"). The date range parameters can be passed through or the helper can return just the count noun, with the calling site still appending the date range. Either approach is acceptable; the key win is removing the duplicated inline branch.

Files: `src/lib/format.ts`, `src/app/[locale]/archive/browse-by-source/page.tsx`.

### A3. Replace inline `new Intl.NumberFormat` with `formatNumber` [browse-by-source]

The browse-by-source page calls `new Intl.NumberFormat(localeToLanguageTag(locale)).format(source.recordCount)` in two places inside the card template. The `formatNumber(locale, n)` helper in `src/lib/format.ts` already wraps this exact call and handles `null` guarding.

**Action:** Replace both raw `new Intl.NumberFormat(...)` calls with `formatNumber(locale, source.recordCount)`. Remove the `localeToLanguageTag` import if it is no longer needed after this change (check other usages on the same page first).

Files: `src/app/[locale]/archive/browse-by-source/page.tsx`.

### A4. Extract shared `CoverageSnapshot` and `UsageSnapshot` server components [status, impact]

The coverage snapshot grid (three cards: sources tracked, snapshots, unique pages) and usage snapshot grid (four cards: search requests, snapshot detail views, raw snapshot views, reports submitted) are structurally identical — same classes, same layout, same field names — across `/status` and `/impact`. Any change to one must be manually mirrored to the other.

**Action:** Create `src/components/metrics/CoverageSnapshot.tsx` and `src/components/metrics/UsageSnapshot.tsx` as server-compatible async components (they can be pure presentational components that accept the pre-fetched data as props). Import them into both `status/page.tsx` and `impact/page.tsx`.

Files (new): `src/components/metrics/CoverageSnapshot.tsx`, `src/components/metrics/UsageSnapshot.tsx`.
Files (edit): `src/app/[locale]/status/page.tsx`, `src/app/[locale]/impact/page.tsx`.

---

## Workstream B — Copy & Labels

Textual changes: label improvements, user-facing messaging corrections, heading clarity. No structural JSX changes.

### B1. Rename "Scope" section heading on changes page [changes]

The section heading "Scope" / "Portée" above the source/edition form is too terse for a first-time user. It does not describe what the controls do.

**Action:** Change the heading to "Filter by source & edition" (EN) / "Filtrer par source et édition" (FR).

Files: `src/app/[locale]/changes/page.tsx`.

### B2. Replace developer-facing usage callout on status page [status]

The callout rendered when usage metrics are disabled reads: "Enable aggregated usage counts in the backend to display this section." This is developer-facing configuration guidance that is meaningless to a public user.

**Action:** Replace with user-appropriate copy such as "Usage data is not available for this reporting period." (EN) / "Les données d'utilisation ne sont pas disponibles pour cette période." (FR). The same message appears on `/impact` with slightly different wording — align the two to use the same string.

Files: `src/app/[locale]/status/page.tsx`, `src/app/[locale]/impact/page.tsx`.

### B3. Improve "Reliability notes" section on impact page [impact]

The "Reliability notes" section on `/impact` contains only a cross-link to `/status` with no substantive content. It reads as filler and wastes the section slot.

**Action:** Add at least one concrete reliability statement — for example: "Annual captures are scheduled for January 1 (UTC). Ad-hoc captures supplement the annual cycle when significant changes are anticipated." This is already public information (it appears in the metrics definitions on `/status`) and can be echoed here.

Files: `src/app/[locale]/impact/page.tsx`.

### B4. Differentiate the "Coverage snapshot" heading between status and impact [status, impact]

Both `/status` and `/impact` use "Coverage snapshot" / "Aperçu de la couverture" as a section heading. When a researcher has both tabs open, the identical heading creates confusion.

**Action:** On `/status`, change the heading to "Live coverage snapshot" / "Aperçu en direct de la couverture". On `/impact`, keep "Coverage snapshot" since it represents point-in-time data consistent with the report framing.

Files: `src/app/[locale]/status/page.tsx`.

### B5. Add a clarifying re-fetch note on compare-live results [compare-live]

The "Fetch live diff again" / "Recharger le diff" button re-runs an outbound HTTP fetch without a confirmation step. Users may not realise this triggers a new network request to the live source.

**Action:** Add a brief inline note adjacent to the button: "This will send a new request to the live URL." (EN) / "Cela enverra une nouvelle requête vers l'URL en direct." (FR). Use `text-ha-muted text-xs` styling to keep it low-profile.

Files: `src/app/[locale]/compare-live/page.tsx`.

---

## Workstream C — Layout & Navigation

Structural JSX changes affecting page flow, link positioning, and heading hierarchy.

### C1. Fix heading hierarchy in changes feed error states [changes]

Within the "Changes feed" section, the section itself uses an `<h2>` (`ha-section-heading`). The three conditional callouts below it (changes unavailable, tracking disabled, no results) also use `ha-callout-title` which renders as `<h2>`. This creates a flat heading tree where sibling states appear at the same level as the section.

**Action:** Change `<h2 className="ha-callout-title">` to `<h3 className="ha-callout-title">` for the three callout headings inside the "Changes feed" section. Verify that `ha-callout-title` does not rely on an element-type selector in globals.css (it does not — it is a class selector).

Files: `src/app/[locale]/changes/page.tsx`.

### C2. Add back-link to changes feed from compare page [compare]

Users who arrive at `/compare` via the "Compare captures" button on `/changes` have no return path in the UI other than the browser back button. A back-link would complete the navigation loop.

**Action:** Add a `<Link href="/changes" className="ha-btn-secondary text-xs">` back-link at the top of the compare page content, before the metadata grid. The text should be "Back to changes" (EN) / "Retour aux changements" (FR). If the originating source and job are not available as search params, a plain `/changes` link is sufficient.

Files: `src/app/[locale]/compare/page.tsx`.

### C3. Move action buttons below the capture metadata grid on compare page [compare]

The action button row ("Compare to live page", "View snapshot") appears above the two capture metadata cards and above the diff. A user reading top-to-bottom encounters the actions before they have seen any content to act on.

**Action:** Move the `<div className="flex flex-wrap gap-2">` action button group to below the `ha-grid-2` capture metadata cards and above the high-noise callout / diff card. Update any surrounding spacing classes accordingly.

Files: `src/app/[locale]/compare/page.tsx`.

### C4. Add a result count to the changes feed [changes]

The pagination row shows "Page N of M" but never the total number of changes. Users cannot gauge activity volume without doing arithmetic.

**Action:** Add a `<span>` showing the total count before the pagination controls: "{total} changes" / "{total} changements". Display this only when `changes?.enabled && hasResults`. Use `text-ha-muted text-xs` to keep it low-profile.

Files: `src/app/[locale]/changes/page.tsx`.

### C5. Add source count summary to browse-by-source page [browse-by-source]

The browse-by-source grid renders directly with no count summary, empty-state guard, or scope description. A user who loads the page while the API is returning a filtered or partial list has no indication of how many sources are shown.

**Action:** Add a `<p className="text-ha-muted text-sm">` above the `ha-grid-2` grid showing "Showing N sources" (EN) / "Affichage de N sources" (FR). When `summaries` is empty (post-filter), replace the grid with an `ha-callout` explaining that no sources were found.

Files: `src/app/[locale]/archive/browse-by-source/page.tsx`.

### C6. Add a link to `/digest` or RSS from status page [status]

Users visiting the status page who want to track ongoing changes have no signposted path to the digest or RSS feed. The impact report cross-link is present but the change-notification path is missing.

**Action:** Add a link to `/digest` (or `/changes`) alongside the impact report callout at the bottom of the page, with text "Subscribe to change digest" / "S'abonner au bulletin de changements".

Files: `src/app/[locale]/status/page.tsx`.

### C7. Add narrative delta to impact page [impact]

The impact page is labelled as a "report" but contains no editorial content — only the same metrics available on `/status`. Adding even one auto-generated sentence about coverage change would fulfil the report framing.

**Action:** If the API provides enough data to compute a period delta (e.g., snapshot count this period vs. a prior reference), surface it. If not, add a static "Coverage expands regularly as new captures are indexed." placeholder sentence until the delta computation is available. Place this as a `<p>` immediately below the coverage snapshot grid.

Files: `src/app/[locale]/impact/page.tsx`.

---

## Workstream D — Styling & Accessibility

Visual and accessibility improvements that do not require API or copy changes.

### D1. Colour-code the status label on the status page [status]

The "Operational" / "Degraded" / "Unavailable" label renders as a plain `ha-tag` with no colour differentiation. All three states look identical until read.

**Action:** Conditionally apply a colour modifier to the tag:

- Operational: `ha-tag` with a green accent (e.g., `bg-emerald-50 text-emerald-800 border-emerald-200` in light mode, adapting for dark mode via CSS variables if a semantic token exists).
- Degraded: amber tinting (consistent with the existing high-noise callout style: `bg-amber-50 text-amber-800`).
- Unavailable: muted/grey (default `ha-tag`).

Avoid hardcoding one-off Tailwind classes if the project adds semantic status tokens to globals.css; otherwise inline Tailwind is acceptable for this isolated use case.

Files: `src/app/[locale]/status/page.tsx`.

### D2. Add `aria-label` to source cards on browse-by-source [browse-by-source]

Each source card is an `<article>` element. Without an accessible name, screen reader users traversing landmarks encounter a sequence of unlabelled articles.

**Action:** Add `aria-label={source.sourceName}` to each `<article key={source.sourceCode}>`. This gives each card a meaningful landmark name in the accessibility tree.

Files: `src/app/[locale]/archive/browse-by-source/page.tsx`.

### D3. Add `<time dateTime>` to status page "Last checked" [status]

The "Last checked" value is rendered as a localised string but is not wrapped in a `<time>` element with a machine-readable `dateTime` attribute.

**Action:** Capture the raw `Date` object before formatting and use it to generate an ISO string for the `dateTime` attribute:

```tsx
const checkedAt = new Date();
const lastChecked = checkedAt.toLocaleString(...);
// In JSX:
<time dateTime={checkedAt.toISOString()}>{lastChecked}</time>
```

Files: `src/app/[locale]/status/page.tsx`.

### D4. Standardise `text-[11px]` to `text-xs` in compare-live [compare-live]

Two amber disclaimer paragraphs in `compare-live/page.tsx` use `text-[11px]` (an arbitrary Tailwind size). `text-xs` (12px) is the project standard for small supplementary text and is used consistently elsewhere.

**Action:** Replace `text-[11px]` with `text-xs` in both occurrences. Adjust `font-medium` if the weight no longer achieves the desired visual emphasis at `text-xs`.

Files: `src/app/[locale]/compare-live/page.tsx`.

### D5. Style change stats as visually distinct items on compare page [compare]

The change statistics row (sections changed, added, removed, added/removed lines, change ratio) renders as a flat sequence of `<span>` elements inside a flex container. On narrow viewports the spans wrap without any visual separation.

**Action:** Wrap each non-null stat in a `ha-tag` span, or add a `·` separator between spans. Either approach gives the row visual structure. Prefer `ha-tag` if the stats are meant to be scannable at a glance; prefer separators if the inline prose flow is intentional.

Files: `src/app/[locale]/compare/page.tsx`.

### D6. Replace `ha-home-panel` with `ha-card ha-card-elevated` on compare-live confirmation card [compare-live]

The confirmation card and results summary card in `compare-live/page.tsx` use `ha-card ha-home-panel`. The `ha-home-panel` class is defined as a homepage section style with a specific background gradient treatment. Its use inside a feature page is semantically mismatched and may produce unintended visual differences when the homepage panel styles are updated.

**Action:** Replace `ha-home-panel` with `ha-card-elevated` (already used on browse-by-source cards) on the two instances in `compare-live/page.tsx`. Verify the visual result in both light and dark mode.

Files: `src/app/[locale]/compare-live/page.tsx`.

### D7. Distinguish entry-point vs. latest-snapshot CTA on browse-by-source [browse-by-source]

Both "View archived site" (entry point) and "View latest snapshot" (fallback to `latestRecordId`) render as `ha-btn-primary`. Users cannot tell from the button style whether they will reach a curated entry page or just the most recent capture.

**Action:** Render "View latest snapshot" (the fallback state) as `ha-btn-secondary` rather than `ha-btn-primary`, reserving the primary style for the curated entry-point path. This creates a clear visual hierarchy: primary = intended entry, secondary = fallback.

Files: `src/app/[locale]/archive/browse-by-source/page.tsx`.

---

## Workstream E — Performance & Caching

Server-side rendering hints with no visual impact.

### E1. Add ISR revalidation to impact page [impact]

The impact page re-fetches `fetchArchiveStats()` and `fetchUsageMetrics()` on every request. For a page framed as a "monthly report," re-fetching on every hit is unnecessary and increases backend load.

**Action:** Export `export const revalidate = 3600;` (one hour) at the top of `impact/page.tsx`. Adjust the window if hourly freshness is too stale given the expected crawl cadence.

Files: `src/app/[locale]/impact/page.tsx`.

### E2. Add ISR revalidation to status page [status]

Same issue as impact — four API calls fire on every page request. A short revalidation window (60 seconds) would keep the status fresh without hitting the API on every user load.

**Action:** Export `export const revalidate = 60;` at the top of `status/page.tsx`.

Files: `src/app/[locale]/status/page.tsx`.

---

## Shared Improvements Summary

The following improvements apply to two or more pages and should be coordinated so they are consistent:

| Improvement                                                 | Pages affected                 |
| ----------------------------------------------------------- | ------------------------------ |
| A1: Extract `formatPercent` to `format.ts`                  | compare, compare-live          |
| A4: Extract `CoverageSnapshot` / `UsageSnapshot` components | status, impact                 |
| B2: Replace developer-facing usage callout                  | status, impact                 |
| B4: Differentiate "Coverage snapshot" heading               | status (change), impact (keep) |
| D3/E1/E2: ISR revalidation                                  | status, impact                 |

When implementing A4 (shared components), implement B2 and B4 in the same pass to avoid editing the component files twice.

---

## Implementation Order Recommendation

If tackling incrementally, the suggested order balances visible user impact against risk:

1. **A3** (inline Intl → formatNumber) — zero-risk, one file, immediate consistency win.
2. **A1** (extract formatPercent) — low-risk, removes obvious duplication.
3. **C1** (heading hierarchy in changes) — HTML correctness fix, no visual change.
4. **D2** (aria-label on source cards) — accessibility, no visual change.
5. **D4** (text-[11px] → text-xs) — trivial, one file.
6. **B1** (rename "Scope" heading) — copy change, very low risk.
7. **B2** (fix usage callout copy) — two files, coordinate.
8. **D7** (entry vs. fallback CTA style) — one-line change, clear UX improvement.
9. **D1** (colour-code status label) — moderate CSS, visible improvement.
10. **C4** (total count in changes feed) — small JSX addition.
11. **C5** (source count summary) — small JSX addition.
12. **C2** (back-link on compare) — one link addition.
13. **C3** (move action buttons on compare) — JSX reordering.
14. **D5** (style stats as tags on compare) — visual polish.
15. **A2** (formatSnapshotCount helper) — moderate, touches format.ts + browse-by-source.
16. **A4 + B4** (shared metric components) — larger refactor, do as one PR.
17. **C6** (digest link on status) — content addition.
18. **C7** (narrative delta on impact) — content addition, depends on API capability.
19. **B3** (improve reliability notes on impact) — copy improvement.
20. **B5** (re-fetch note on compare-live) — small copy addition.
21. **D3** (time dateTime on status) — minor semantic improvement.
22. **D6** (ha-home-panel → ha-card-elevated on compare-live) — visual, verify dark mode.
23. **E1 + E2** (ISR revalidation) — do together as a single commit.
