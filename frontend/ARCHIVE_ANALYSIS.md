# Archive Page Analysis

**File:** `src/app/[locale]/archive/page.tsx`
**Date:** 2026-02-24
**Lines:** 1,144

---

## Recent Deduplication Work (Already Done)

- `formatDate` has been moved to the shared `@/lib/format` module and is correctly imported from there — no local duplicate.
- The main two-column layout wrapper uses `ha-content-section-lead` (not `ha-home-hero`), confirming that class has already been updated from the old name.

---

## Observations

### Messaging

1. ✅ **Page title and eyebrow use `getArchiveCopy(locale)`** — locale-specific copy is centralized in a helper rather than scattered inline; eyebrow "Archive explorer" / "Explorateur d'archives" is clear and useful.
2. ✅ **Description prose pulls from `getSiteCopy`** — `siteCopy.workflow.archiveSummary`, `limitations`, and `forCurrent` are reused from the canonical copy store rather than duplicated.
3. ✅ **Callout box repeats the disclaimer** — the "Important note" callout at the top of the results area restates the archive summary and links to the Methods page, giving users critical context before they interact with results.
4. 🔧 **`getArchiveCopy` is a file-local helper but belongs in `siteCopy` or `homeCopy`** — the `eyebrow`, `title`, and `description` strings it produces are page-level copy that would be more discoverable and reusable if moved to `getSiteCopy(locale)` or a dedicated `getArchivePageCopy(locale)` in `src/lib/siteCopy.ts`, consistent with how other pages work.
5. 🔧 **"Early release" footer note is hardcoded inline** — the disclaimer at line 1138–1141 (`"Early release: coverage and features are still expanding."`) is not drawn from `getSiteCopy`. If the project leaves early release, this string would need to be hunted down rather than updated centrally.
6. ⚠️ **Result count noun pluralization is only partially locale-aware** — English uses `"page"/"pages"` and `"snapshot"/"snapshots"` correctly. French uses `"page"/"pages"` and `"capture"/"captures"`, but the pluralization logic at lines 393–409 treats `totalResults === 1` as singular without applying any French-specific plural rules (French pluralization edge cases: 0 is typically singular in French, but the code treats `0` as plural since `totalResults === 1` is false).
7. ✅ **Source card date formatting uses `formatDate(locale, …)`** — deferred to the shared formatter for consistency.
8. 🔧 **`resultCountText` does not include the date-range summary** — when `fromDate`/`toDate` are set the count text in the filter header shows the date range, but the result count (`N pages matching "q"`) shown at the top of the filter panel does not mention dates, which can be confusing when the page count looks unexpectedly small.
9. 🔧 **"Browse archived sites" section heading only appears when `sourceSummaries.length > 0`** — the source carousel is gated on backend data being available. When the backend is down, users see no source overview at all, with no fallback messaging indicating that source browsing exists but is temporarily unavailable.
10. ✅ **Inline "per-page" show/hide for `includeDuplicates`** — the checkbox only renders when `view === "snapshots"`, avoiding confusion for users in pages mode.

---

### Layout

11. ✅ **Two-column layout uses `ha-content-section-lead` with a responsive grid** — `lg:grid-cols-[minmax(0,280px),minmax(0,1fr)]` gives filters a fixed 280px max with the results column taking remaining space, which is appropriate.
12. ✅ **Filters panel uses `<aside>` with `id="archive-filters"`** — semantically correct landmark element for a filter sidebar.
13. 🔧 **The source cards carousel uses an unconstrained horizontal scroller** — `overflow-x-auto px-1 pt-0 pb-4` with `flex gap-3` works but produces a content area with `pb-4` bottom padding for the scrollbar, which is effective but fragile. A thin scrollbar with custom styling would be more polished.
14. 🔧 **Source card preview images have a fixed height of `4.5rem`** — this is very short and may clip logos or meaningful content in the preview. A slightly taller default (e.g., `6rem` or `7rem`) would give more visual context.
15. ⚠️ **Source card "actions" row uses a 3-column grid** — the `grid-cols-3` layout at line 625 (`View` left, `View ↗` center, `Search` right) assumes exactly three action slots. When `entryBrowseUrl` is absent, the center slot is empty, leaving asymmetric spacing with no `null` rendering guard in the center slot to collapse the gap.
16. ✅ **Pagination control is only rendered when `pageCount > 1`** — no empty pagination bar when there is only a single page of results.
17. 🔧 **Pagination block uses `ha-card ha-home-panel`** — `ha-home-panel` is semantically a home-page panel class. For internal page panels, a more generic approach (or a dedicated `ha-panel` variant) would be cleaner and not carry "home" naming into an archive-specific context.
18. ✅ **Empty results state is handled** — when `totalResults === 0`, a card with a reset link is shown rather than leaving the results column blank.
19. 🔧 **Results area (`id="archive-results"`) and filters area (`id="archive-filters"`) are separate `<section>` / `<aside>` elements** — this is good, but neither has a visible or screen-reader-only heading label that describes the overall search layout, which would help screen readers navigate between the two landmark regions.
20. 🔧 **The "Browse all sources →" link sits to the right of the section heading** — this inline heading-plus-link pattern is a common design but can be easily missed. A more prominent CTA placement (below the carousel or as a dedicated button) would improve discoverability.

---

### Interaction

21. ✅ **URL canonicalization via `redirect()` handles three edge cases** — (a) `within` set but `q` empty, (b) `q` set and `within` explicitly cleared to empty, and (c) `includeDuplicates` in non-snapshots view. This keeps shareable URLs clean.
22. ✅ **Form uses `method="get"` with native HTML form submission** — no client JavaScript needed for a search submit; degrades gracefully.
23. ✅ **`ArchiveFiltersAutoscroll` handles scroll-to-anchor on form submit** — uses focus params to trigger smooth scrolling to the relevant panel after navigation.
24. ⚠️ **Three separate `redirect()` calls each manually reconstruct the full query string** — the pattern at lines 117–131, 133–146, and 171–184 repeats the same set of `qs.set(...)` calls with minor variation. Extracting a shared `buildCanonicalParams(params, overrides)` helper would reduce the risk of omitting a parameter in one branch.
25. ✅ **`parsePositiveInt` and `parseBoolean` helpers are tested-safe** — the helpers correctly handle `NaN`, negative, and falsy string values.
26. 🔧 **`pageSize` is clamped server-side (`Math.min(rawPageSize, MAX_PAGE_SIZE)`) but no client-side validation** — a user who manually edits the URL to `pageSize=999` will see it silently clamped to 50; adding a visible note or normalizing the URL (redirect to clamped value) would keep the URL honest.
27. ✅ **`page` is clamped to `pageCount` when backend detects an out-of-range page** — the double-fetch logic at lines 321–328 refetches the last valid page rather than showing an empty results column.
28. 🔧 **`replayReturnPath` is built using a full URL constructor with a dummy `https://example.org` base** — this is a correct but slightly surprising way to manipulate a relative path's query string. A utility function or comment explaining the pattern would aid maintainability.
29. ✅ **`within` filter is preserved as a hidden input on form submit** — when a "search within results" refinement query is active, it is preserved correctly across form resubmits.
30. ⚠️ **"Apply" button is present alongside "Search" but the two have different scopes** — "Search" (line 800) submits only the keyword+source+date fields, while "Apply" (line 992) is inside the advanced options block. There is no visual grouping or explanation of why there are two submit buttons, which can confuse users.

---

### Styling

31. ✅ **`.ha-content-section-lead` is used for the two-column wrapper** — correct; the old `ha-home-hero` usage has been replaced.
32. ⚠️ **`ha-home-panel` appears four times in this file** — lines 682, 1047, 1073, and inside the source card implicit panel. The class carries "home" semantics and was intended for home-page inset cards. A rename to `ha-panel` or use of `ha-card` alone would be more semantically honest for an archive/inner page context.
33. ✅ **`ha-callout` and `ha-callout-warning` are used from the design system** — no inline recreation of callout styling.
34. 🔧 **`ha-home-panel-gradient` and `ha-home-panel-gradient-compact` used for the source carousel** — these are home-page-specific class names applied to the archive browse section. If the carousel is ever reused on other pages, the naming mismatch would cause confusion.
35. ✅ **Search input uses design system focus ring pattern** — `focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]` is consistent with other inputs across the site.
36. 🔧 **Source card name text is `text-[13px]`** — using a non-standard pixel size bypasses the type scale. Prefer `text-sm` (14px) or `text-xs` (12px) to stay within the Tailwind scale and make responsive adjustments easier.
37. 🔧 **Source card count text uses `whitespace-nowrap`** — this is pragmatic for the narrow card, but for very long source names combined with high snapshot counts, the count line could overflow on small viewports. Consider `truncate` or explicit max-width.
38. ✅ **`ha-select` and `ha-select-sm` are used for dropdowns** — consistent with the design system rather than custom inline classes.
39. 🔧 **Filter checkbox inputs have no custom focus style** — the native browser checkbox at lines 927–933, 960–967 inherits default browser focus indicators, which may not meet contrast requirements in all themes. A consistent `focus-visible` style applied via the design system would improve consistency.
40. ✅ **Result cards are rendered via `<SearchResultCard>` component** — the display logic is encapsulated in a shared component rather than inlined in the page.

---

### Accessibility

41. ✅ **Filter panel uses `<aside>` landmark** — semantically correct for a complementary filter region.
42. ✅ **Source card preview images have `alt` text** — e.g., `"${summary.sourceName} preview"` / `"Aperçu : ${summary.sourceName}"`.
43. ⚠️ **Tooltip buttons use a plain `"i"` text character as the button content** — the four `<button type="button">` tooltip triggers at lines 700, 860, 941, 974 contain only the letter `"i"` as visible content. While `aria-label` is provided, the visual affordance is very small (16×16px with no icon) and the letter `"i"` is not a recognized icon in all cultures. Consider using an SVG info icon.
44. ⚠️ **Tooltip popups are CSS `opacity` transitions triggered by `group-hover`/`group-focus-within`** — the tooltips at lines 711, 870, 949, 983 are `pointer-events-none` and not in the tab order. Screen reader users who tab to the `<button>` will trigger `group-focus-within` and make the tooltip visible visually, but the tooltip text is not exposed via ARIA (no `role="tooltip"` or `aria-describedby` linking button to tooltip text).
45. 🔧 **`aria-disabled` on pagination links does not prevent keyboard activation** — `aria-disabled={effectivePage <= 1}` sets the semantic state but `pointer-events-none` only prevents mouse interaction. Keyboard users pressing Enter or Space on a focused "First" link will still trigger navigation. Use `tabIndex={-1}` or convert to `<button>` when disabled.
46. ✅ **`<form>` does not use `autocomplete="off"`** — the browser can offer search suggestions from history, which helps power users.
47. 🔧 **The result count text (`resultCountText`) is not announced to screen readers on update** — because this is a server-rendered page, a new request replaces the whole page, so screen readers will re-read the heading anyway. However, if this page ever gains client-side filtering, a live region (`aria-live="polite"`) around the count would be needed.
48. 🔧 **Source cards use both `<Link>` and `<a>` for the card name depending on whether `browseId` is set** — when there is a `browseId`, the name renders as a link via `<Link>`; otherwise it renders as an `<h3>`. This is correct but produces an inconsistent heading hierarchy (sometimes the source name is an `<h3>`, sometimes it is not a heading at all).
49. ✅ **`<label>` elements are properly associated with form controls** — all `<input>`, `<select>` elements have explicit `htmlFor`-linked labels.
50. ✅ **`rel="noreferrer noopener"` is set on external links** — the `baseUrl` and other external links within source cards use correct rel attributes.

---

### Code

51. ✅ **TypeScript types are explicit** — `ArchiveSearchParams`, `ArchiveListRecord`, `SourceBrowseSummary` are all declared as proper types rather than relying on inference.
52. ✅ **`formatDate` is imported from `@/lib/format`** — confirmed deduplicated; no local copy.
53. ⚠️ **Three redirect branches each manually enumerate all query parameters** — lines 117–131, 133–146, 171–184 each build a `URLSearchParams` object from scratch with nearly identical code. Any new parameter added to `ArchiveSearchParams` must be added to all three branches, creating a maintenance hazard. A helper `buildCanonicalQs(params, overrides)` would enforce completeness.
54. ✅ **`parsePositiveInt` and `parseBoolean` are pure functions with no side effects** — easy to unit test independently.
55. ✅ **Error handling distinguishes 422 (validation error) from other backend failures** — lines 356–381 treat 422 as a user-visible "invalid filters" condition rather than silently falling back to demo data, which gives users meaningful feedback.
56. ✅ **Backend fallback (demo records) is transparent** — the warning callout at line 1038 tells users they are seeing limited offline sample data when the live API is unavailable.
57. 🔧 **`sourceSummaries` is initialized as an empty array and is only populated from the backend** — but there is no code path in the current file that populates it from `fetchSources`. Looking at the surrounding code (lines 231, 442), `sourceSummaries` appears to be partially wired but the actual assignment of source summary data is not visible in the 1,144-line file. This suggests the section was partially scaffolded.
58. ⚠️ **`replayReturnPath` uses `new URL(raw, "https://example.org")` to manipulate a relative path** — this works but the dummy origin is surprising. A comment explaining this is a trick to use the URL API for relative path manipulation would help; alternatively, a small utility function could encapsulate this pattern.
59. 🔧 **`sort` and `sortUi` are separate variables with subtly different semantics** — `sortUi` reflects the user's selected value (for pre-filling the `<select>`), while `sort` applies the effective sort with query-aware defaulting. The naming is correct but adjacent definitions on lines 161–163 are easy to misread.
60. ✅ **`HoverGlowButton` is used only for the primary "Search" submit** — the glow effect is appropriately reserved for the most important CTA; secondary buttons use `ha-btn-secondary`.

---

## Top 10 Improvements

| #   | Improvement                                                                                                                                                                                                            | Category                | Rating |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| 1   | Extract the three `redirect()` branches into a single `buildCanonicalQs(params, overrides)` helper to eliminate copy-paste parameter enumeration and prevent future omission bugs                                      | Code                    | ⚠️     |
| 2   | Add `role="tooltip"` and `aria-describedby` to the four CSS tooltip elements so screen reader users who focus the "i" buttons receive the tooltip text via accessible means                                            | Accessibility           | ⚠️     |
| 3   | Replace `aria-disabled` + `pointer-events-none` on pagination links with `tabIndex={-1}` (or disabled button elements) so keyboard users cannot activate disabled pagination                                           | Accessibility           | ⚠️     |
| 4   | Fix French pluralization for 0 results — French treats 0 as singular (`0 capture` not `0 captures`) in the `resultCountText` calculation                                                                               | Messaging               | ⚠️     |
| 5   | Move `getArchiveCopy` to `src/lib/siteCopy.ts` alongside other page copy helpers so archive page strings are centrally managed and editable without opening the page file                                              | Code / Messaging        | 🔧     |
| 6   | Move `"ha-home-panel"` usages in the archive page to a semantically appropriate class (e.g., `ha-panel` or plain `ha-card`) — the "home" prefix is misleading on an inner page                                         | Styling                 | 🔧     |
| 7   | Replace the "i" letter tooltip triggers with SVG info icons with appropriate size and visual weight to improve discoverability and cultural clarity                                                                    | Accessibility / Styling | 🔧     |
| 8   | Add a fallback message in the "Browse archived sites" section when `sourceSummaries` is empty (backend down) so users know the section exists but is temporarily unavailable, rather than seeing it disappear silently | Messaging / Interaction | 🔧     |
| 9   | Normalize `pageSize` via redirect when it exceeds `MAX_PAGE_SIZE` (currently silently clamped), keeping the URL consistent with the rendered page state                                                                | Interaction             | 🔧     |
| 10  | Move the inline "Early release" footer note to `getSiteCopy` so it can be removed or updated centrally when the project matures beyond early release                                                                   | Messaging               | 🔧     |
