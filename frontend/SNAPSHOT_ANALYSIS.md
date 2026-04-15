# Snapshot Detail Page Analysis

**File:** `src/app/[locale]/snapshot/[id]/page.tsx`
**Date:** 2026-02-24
**Lines:** 443

---

## Recent Deduplication Work (Already Done)

- `formatDate` and `formatUtcTimestamp` are both imported from `@/lib/format` — no local duplicate.
- No remaining `ha-home-hero` usage; section panels use `ha-card ha-home-panel` (the `ha-home-hero` class has been removed from this file).

---

## Observations

### Messaging

1. ✅ **Page title defaults gracefully** — the title falls through `snapshotMeta?.title ?? record?.title ?? (locale === "fr" ? "Capture" : "Snapshot")`, providing a sensible fallback in both locales rather than showing undefined or blank.
2. ✅ **`PageShell` eyebrow uses locale-aware "Details"/"Détails"** — consistent with how other detail pages label themselves.
3. ✅ **Independence disclaimer is shown inline** — the `siteCopy.whatThisSiteIs.forCurrent` disclaimer appears in the metadata card, meeting the safety requirement to show the non-affiliation notice on all content pages.
4. 🔧 **`PageShell` intro text is hardcoded inline** — `"Metadata and links for an archived snapshot."` / `"Métadonnées et liens pour une capture archivée."` at lines 188–190 is not drawn from `getSiteCopy` or a page-level helper. If this copy ever needs updating, it must be found and edited in the page file directly.
5. 🔧 **`getSnapshotDetailsMetadataCopy(locale)` is a file-local function returning strings used only in `generateMetadata`** — this small helper is appropriate for now, but its title (`"Snapshot details"` / `"Détails de la capture"`) does not match the `PageShell` eyebrow copy (`"Details"` / `"Détails"`), creating a subtle inconsistency between the browser tab and the page heading context.
6. ⚠️ **`sourceName` fallback strings are inline** — `(locale === "fr" ? "Source inconnue" : "Unknown source")` at line 107 is a fallback string for missing source metadata. This is reasonable but inconsistent with the pattern of using `getSiteCopy` for displayed text; a future translator would not find this string in the copy store.
7. ✅ **"Other snapshots" section distinguishes demo mode from real empty state** — different copy is shown when `!usingBackend` vs `timeline?.snapshots?.length === 0`, helping users understand why they see no history.
8. 🔧 **Timeline item "Edition capture" fallback copy is inline** — line 389–391 renders `item.jobName` if present, otherwise falls back to `"Edition capture"` / `"Capture d'édition"`. This inline string is not in `getSiteCopy`, making it harder to find if copy needs to change.
9. 🔧 **"View diff" button label is abbreviated** — `"Voir diff"` (French) and `"View diff"` (English) at lines 303–304 use developer shorthand. A more user-facing label such as `"Compare to live"` / `"Comparer avec la version actuelle"` would be clearer.
10. ✅ **"All snapshots" link is correctly labeled** — `"All snapshots"` / `"Toutes les captures"` links to the archive filtered by this page's URL and source, giving users a clear path to see the full timeline.

---

### Layout

11. ✅ **Three `<section>` elements provide logical grouping** — metadata card, other snapshots, and preview iframe are in separate semantic sections with their own headings.
12. ✅ **`<PageShell compact>` is used** — the `compact` prop is appropriate for a detail page that does not need the full-width hero treatment.
13. 🔧 **All three sections use `ha-card ha-home-panel`** — the "home panel" class is applied to sections on an inner detail page. While functionally correct, the class name carries misleading "home" semantics. A rename to `ha-panel` or use of plain `ha-card` with appropriate padding would be cleaner.
14. ✅ **Metadata `<dl>` uses consistent row structure** — each row is a `<div className="flex gap-2">` wrapping `<dt>` and `<dd>`, which is a clean pattern for definition lists.
15. 🔧 **`<dt>` width is fixed at `w-28` (7rem)** — some labels like "URL d'origine" (French) or "Horodatage" are longer than English equivalents and may not fit cleanly in 7rem on narrow viewports where text could visually collide with the `<dd>`.
16. 🔧 **Action buttons are in a `flex flex-wrap` row with no grouping or visual hierarchy** — the eight potential buttons (View, View diff, Raw HTML, Metadata JSON, Cite, Report issue, All snapshots, Copy URL) render as a flat wrapping row. On narrow screens this becomes a dense cluster with no clear primary action distinguished.
17. ⚠️ **The "View" button for `viewHref` uses `<a>` not `<Link>`** — `browseUrl` is an external replay service URL (absolute), so `<a>` is correct, but this is easy to accidentally change to `<Link>` since all other buttons in the row use `<Link>`. A comment noting that `viewHref` is always an external URL would prevent future regression.
18. ✅ **The preview section is conditionally rendered** — `{browseUrl || rawHtmlUrl ? (...) : null}` prevents an empty section from rendering when no viewable URL is available.
19. 🔧 **The preview iframe container section has no `id` attribute** — the metadata section and "Other snapshots" section also lack IDs, making them impossible to link to directly with fragment anchors (e.g., `#preview`, `#history`).
20. 🔧 **Timeline list reversal uses `.slice().reverse()`** — line 362 defensively copies the array before reversing to avoid mutating the original. This is correct but slightly verbose; could be written as `[...timeline.snapshots].reverse()` for consistency with common JS idiom.

---

### Interaction

21. ✅ **Graceful fallback from backend to demo record** — the two-stage resolution (numeric ID → backend API → demo record lookup, with a search bridge for demo URL matching) is well-structured and handles all realistic scenarios.
22. ✅ **`notFound()` is called when neither backend nor demo record resolves** — returns a proper 404 rather than rendering an error state.
23. ✅ **`canCompareLive` gating is MIME-type aware** — the "View diff" button only appears for HTML snapshots (`isHtmlMimeType(snapshotMeta?.mimeType)`), preventing a diff being offered for PDFs or other binary types.
24. ⚠️ **Three independent sequential `await` calls in the happy path** — `fetchSnapshotDetail`, `fetchSnapshotLatest`, and `fetchSnapshotTimeline` (lines 69, 138, 176) are each awaited in sequence. `fetchSnapshotLatest` and `fetchSnapshotTimeline` are independent of each other and could be run in parallel with `Promise.allSettled`, reducing total server response time.
25. 🔧 **The demo URL bridge search at lines 81–95 makes two network calls** — `searchSnapshots` followed by `fetchSnapshotDetail` for the demo URL case. This is only triggered when the numeric ID lookup fails and there is a demo record, so it is not a hot path, but the sequential await could be noted.
26. ✅ **`citeHref` has three fallback levels** — prefers `snapshotMeta.id`, falls back to `originalUrl`, then falls back to `/cite` bare, so the Cite button is always rendered with a meaningful target.
27. ✅ **`reportHref` requires both `originalUrl` and `usingBackend && snapshotMeta?.id`** — the report link is enriched only when both conditions are met, preventing partially-filled report URLs.
28. 🔧 **`allSnapshotsHref` appends `&focus=results`** — actually it does not append `focus=results`, it sets `focus=results` only in `replayReturnPath` (archive page). The `allSnapshotsHref` sets `&focus=results` via a separate string build. Looking at line 167–172, `allSnapshotsHref` does not include `focus=results`, so the archive results panel will not auto-scroll on navigation back. This is minor but inconsistent with the archive page's own behavior when navigating from search results.
29. 🔧 **`compareLiveSnapshotId` resolution silently falls back to current snapshot ID on error** — line 143 falls back to `snapshotMeta.id` when `fetchSnapshotLatest` fails, which means the "View diff" compares the snapshot to itself. This should arguably hide the diff button on error rather than offering a misleading same-snapshot diff.
30. ✅ **Timeline snapshot list renders a "current" highlight** — `isCurrent` check at line 364 adds `ha-snapshot-current` styling when the displayed snapshot matches the current page, giving users visual orientation in the timeline.

---

### Styling

31. ⚠️ **`ha-home-panel` used for all three sections on a detail page** — as noted above, the "home" class name is semantically misplaced on an inner page. The class should be renamed or a detail-page-specific variant introduced.
32. ✅ **`ha-btn-primary` and `ha-btn-secondary` are used correctly** — the "View" primary action is `ha-btn-primary`; all secondary actions use `ha-btn-secondary`.
33. 🔧 **All action buttons are `text-xs`** — on desktop, `text-xs` (12px) buttons in a flex-wrap row are quite small. A `text-sm` size for the primary "View" button would help establish a visual hierarchy among the actions.
34. ✅ **`break-all` is applied to URL fields** — `originalUrl` and `browseUrl` display fields correctly use `break-all` to prevent overflow on narrow viewports.
35. 🔧 **`text-ha-warning` is used for the disclaimer paragraph** — the independence notice uses the warning color, which is yellow-toned. This may be appropriate for emphasis but could also be read as a "warning state" rather than an informational notice. A neutral muted color or a dedicated `text-ha-notice` token would be more semantically precise.
36. ✅ **`ha-snapshot-current` class is applied via conditional string concatenation** — the template literal `${isCurrent ? "ha-snapshot-current rounded-lg px-2 py-1.5" : ""}` is readable and concise.
37. 🔧 **`text-ha-accent hover:text-ha-accent` on links has a redundant hover state** — `text-ha-accent hover:text-ha-accent` applies the same color on hover as on rest, which means there is no hover feedback on the links in the metadata card. A different shade or underline on hover would provide clearer interactive feedback.
38. 🔧 **`iframeClassName="h-[90vh] w-full border-0 sm:h-[96vh]"`** — the iframe height is 90/96vh, which is nearly the full viewport. On mobile, this leaves little room for the browser chrome and on-screen keyboard; `80vh` on mobile might be more practical.
39. ✅ **`SnapshotFrame` is a dedicated component** — the iframe sandboxing and security attributes are encapsulated in the shared `SnapshotFrame` component rather than inlined.
40. 🔧 **Timeline list uses `border-b` dividers with `last:border-b-0`** — this is a clean divider pattern, but the outer container uses `space-y-2` which adds vertical space between items even when `border-b` provides the visual separator, resulting in double-spaced appearance.

---

### Accessibility

41. ⚠️ **No `aria-label` or `aria-labelledby` on the metadata `<section>`** — the first `<section>` at line 193 has no accessible name. While it contains a `<dl>`, the section itself is not identifiable as a region for screen reader landmark navigation.
42. ⚠️ **No `aria-label` on the action button cluster** — the `<div className="flex flex-wrap ...">` container holding all action buttons at line 290 has no accessible grouping label, so screen reader users land in a flat list of buttons with no context for why they are grouped.
43. 🔧 **`CopyButton` receives both a `label` and a `children` prop** — the `CopyButton` at line 336–344 receives `label="Copy original URL"`, `ariaLabel="Copy URL (original)"`, and `children="Copy URL"`. The distinction between `label` and `ariaLabel` should be clarified in the component interface; it is unclear from the call site which one becomes the button's accessible name.
44. ✅ **External links use `rel="noreferrer noopener"`** — `originalUrl`, `browseUrl`, `rawHtmlUrl`, and `apiLink` all include correct rel attributes.
45. 🔧 **`target="_blank"` on external links is not announced for screen readers** — while technically accessible (the link text includes `↗` on some buttons), a visually-hidden " (opens in new tab)" suffix would be clearer for screen reader users who may not interpret `↗`.
46. ✅ **`formatUtcTimestamp` is applied to the raw timestamp display** — the timestamp field shows a human-readable UTC string rather than an ISO blob, improving readability.
47. 🔧 **Timeline "current" item has `ha-snapshot-current rounded-lg px-2 py-1.5` as the only visible indicator** — there is no `aria-current="true"` or screen-reader-only text marking this as the currently viewed snapshot in the timeline list.
48. 🔧 **"Other snapshots" section has an `id="other-snapshots"` but no corresponding in-page anchor link** — the ID exists but is not referenced from anywhere on the page, so it cannot be used for skip navigation or fragment linking.
49. ✅ **`SnapshotFrame` receives a `title` prop** — the iframe has a meaningful title attribute for screen readers.
50. 🔧 **Preview section heading is `text-sm font-semibold`** — the section headings ("Other snapshots", "Archived page preview") use `text-sm` without a semantic heading level attribute beyond `<h2>`. The heading level is correct given the page hierarchy, but the visual size (`text-sm`) is very small for a section heading, which may make the page feel visually flat and harder to scan.

---

### Code

51. ✅ **`formatDate` and `formatUtcTimestamp` are both imported from `@/lib/format`** — confirmed; no local duplicate formatters.
52. ✅ **Next.js 16 App Router convention is respected** — `params` is typed as `Promise<{ id: string; locale?: string }>` and awaited correctly; no legacy synchronous params pattern.
53. ✅ **`resolveLocale` is used for locale extraction** — consistent with how other pages extract locale from route params.
54. ⚠️ **`snapshotMeta` and `usingBackend` are `let` variables declared outside `try` blocks** — the mutable pair at lines 60–61 is reassigned across two separate `try/catch` blocks (lines 66–75, 79–95). This is clear but the mutation pattern makes the data-flow harder to follow at a glance; a single resolution function returning `{ snapshotMeta, usingBackend }` would encapsulate the logic.
55. ⚠️ **`fetchSnapshotLatest` and `fetchSnapshotTimeline` are awaited sequentially** — lines 138 and 176 are in separate `try/catch` blocks but both run after `snapshotMeta` is resolved. They are independent and could be parallelized with `Promise.allSettled([fetchSnapshotLatest(...), fetchSnapshotTimeline(...)])` for a meaningful latency reduction on slow connections.
56. 🔧 **`compareLiveSnapshotId` initialization pattern is verbose** — lines 134–145 use a `let` variable initialized to `snapshotMeta.id` then conditionally updated from `fetchSnapshotLatest`. This could be expressed more cleanly as a single `const` with `await` inside a helper or an IIFE.
57. ✅ **`isHtmlMimeType` is imported from `@/lib/mime`** — logic is not inlined; shared utility is used.
58. ✅ **`getSiteCopy` is used for the disclaimer text** — the `siteCopy.whatThisSiteIs.forCurrent` field is drawn from the canonical copy store.
59. 🔧 **`getSnapshotDetailsMetadataCopy(locale)` returns both title and description but only `title` has a meaningful difference between locales** — the description is also locale-specific, which is correct, but this small function at lines 24–37 is boilerplate that could be folded into `buildPageMetadata` if that function ever gains locale-aware copy support.
60. ✅ **`buildPageMetadata` is used for SEO metadata generation** — consistent with other pages; no hand-rolled `<Head>` management.

---

## Top 10 Improvements

| #   | Improvement                                                                                                                                                                                                           | Category                | Rating |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| 1   | Run `fetchSnapshotLatest` and `fetchSnapshotTimeline` in parallel using `Promise.allSettled` instead of sequential awaits, reducing server response time by one round-trip                                            | Code / Interaction      | ⚠️     |
| 2   | Add `aria-label` to the metadata `<section>` and an accessible group label to the action button cluster so screen reader users can navigate the page by landmark                                                      | Accessibility           | ⚠️     |
| 3   | Add `aria-current="true"` and a visually-hidden "current" label to the timeline list item for the currently-viewed snapshot                                                                                           | Accessibility           | ⚠️     |
| 4   | Hide the "View diff" button when `fetchSnapshotLatest` fails (rather than silently comparing the snapshot to itself), and surface a fallback label like "Compare versions" when the latest cannot be determined       | Interaction / Messaging | ⚠️     |
| 5   | Rename `ha-home-panel` references to a semantically appropriate class for inner/detail pages; "home panel" styling on a snapshot detail page is misleading and harder to maintain                                     | Styling                 | ⚠️     |
| 6   | Encapsulate the two-stage snapshot resolution logic (`fetchSnapshotDetail` → demo record fallback → URL bridge search) into a standalone async helper function to reduce the cognitive load of reading `SnapshotPage` | Code                    | 🔧     |
| 7   | Move `PageShell` intro text and `getSnapshotDetailsMetadataCopy` strings into `getSiteCopy` or a `getSnapshotPageCopy(locale)` helper so all user-visible copy is in one place                                        | Messaging / Code        | 🔧     |
| 8   | Change `"View diff"` / `"Voir diff"` to a clearer label such as `"Compare to live"` / `"Comparer avec la version actuelle"` so non-technical users understand what the action does                                    | Messaging               | 🔧     |
| 9   | Add `aria-hidden="true"` and a visually-hidden " (opens in new tab)" suffix on external link buttons that use `target="_blank"` so screen reader users are informed of the new-tab behavior                           | Accessibility           | 🔧     |
| 10  | Fix `text-ha-accent hover:text-ha-accent` redundant hover color on metadata card links — add a visible hover state (underline or slightly darker accent) so links have clear interactive feedback                     | Styling                 | 🔧     |
