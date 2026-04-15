# Homepage Improvement Plan — HealthArchive.ca

> Post-implementation polish and refinement roadmap.
> Date: 2026-02-24

---

## Current state

The major homepage improvements are complete. All planned components exist and are wired into the page:

| Component                                              | File                                      | Status |
| ------------------------------------------------------ | ----------------------------------------- | ------ |
| Hero with animated typing, inline search, metrics card | `src/app/[locale]/page.tsx`               | Done   |
| `HowItWorks`                                           | `src/components/home/HowItWorks.tsx`      | Done   |
| `AudienceSection` (inline)                             | `src/app/[locale]/page.tsx`               | Done   |
| `FeaturedSources`                                      | `src/components/home/FeaturedSources.tsx` | Done   |
| `ChangeShowcase`                                       | `src/components/home/ChangeShowcase.tsx`  | Done   |
| `ExampleStory` (inline)                                | `src/app/[locale]/page.tsx`               | Done   |
| `RecentActivity`                                       | `src/components/home/RecentActivity.tsx`  | Done   |
| `FAQ`                                                  | `src/components/home/FAQ.tsx`             | Done   |
| `BottomCta` (inline)                                   | `src/app/[locale]/page.tsx`               | Done   |
| `ScrollReveal`                                         | `src/components/home/ScrollReveal.tsx`    | Done   |
| `HomeSearch`                                           | `src/components/home/HomeSearch.tsx`      | Done   |
| Centralized copy                                       | `src/lib/homeCopy.ts`                     | Done   |

Page section order (as rendered):

1. Hero — eyebrow, animated H1, lede, `HomeSearch`, CTAs, side metrics card
2. `HowItWorks` — 3-step capture/index/cite flow
3. `AudienceSection` — 3 audience cards with icons and CTAs
4. `FeaturedSources` — API-backed source cards
5. `ChangeShowcase` — curated diff demo
6. `ExampleStory` — mpox callout with snapshot link
7. `RecentActivity` — live change feed (renders only when API returns results)
8. `FAQ` — 6-item accordion
9. `BottomCta` — closing CTA band

---

## Known remaining issues

The following are the concrete gaps identified in the current implementation, grouped by phase.

### Phase A issues (quick polish — no new components)

**A1. FeaturedSources link hover state is invisible**

- The "Browse →" link and "See all sources →" link both use `text-ha-accent hover:text-ha-accent`, which produces no visual change on hover.
- Fix: Replace `hover:text-ha-accent` with `hover:underline` or introduce a `hover:text-[var(--accent-hover)]` token so the hover state is distinct.
- File: `src/components/home/FeaturedSources.tsx`, `src/app/globals.css`
- The same pattern appears on audience card CTAs in `src/app/[locale]/page.tsx` and the ExampleStory CTA.

**A2. Audience card hover state lacks visual feedback**

- `.ha-audience-card` has no hover transition. Users on desktop get no indication the card is interactive (it contains a CTA link, so the card area reads as clickable).
- Fix: Add a subtle lift + border-colour transition to `.ha-audience-card:hover` in `globals.css`.

**A3. FeaturedSources cards have no hover state either**

- The source cards (`.ha-card` inside `FeaturedSources`) show no hover affordance despite containing a browse link.
- Fix: A small box-shadow lift, consistent with `ha-audience-card:hover`, applied via the existing `.ha-card` hover or a modifier class on those cards.

**A4. `RecentActivity` section is conditionally rendered only when the API is reachable**

- When the API is offline, the section silently disappears. This is correct fallback behaviour, but the surrounding `ScrollReveal` wrapper is also dropped, which can cause a layout jump when the page re-renders on client hydration.
- Fix: Keep the `ScrollReveal` wrapper outside the condition, or suppress the section with `hidden` rather than removing it from the tree.
- File: `src/app/[locale]/page.tsx` lines 181–189.

**A5. Secondary sections still wrap content in `ha-home-hero ha-home-hero-plain`**

- `AudienceSection`, `FeaturedSources`, `RecentActivity`, and `ExampleStory` all use `ha-home-hero ha-home-hero-plain` as their outer wrapper. This is correct per the design system, but some sections (particularly `ExampleStory`) use it as a plain content container where a lighter `ha-home-panel` may produce better visual separation.
- Review each section and decide whether `ha-home-hero-plain` or `ha-home-panel` better suits the content density.

**A6. Dark mode spot-check needed**

- The hero gradient (`--page-bg-decoration`) has been updated for dark mode, but the secondary sections have not been explicitly verified for contrast in dark mode. Areas of concern:
  - `.ha-audience-icon` fill colour in dark mode.
  - `.ha-example-story` callout background (`--callout-bg` / `--callout-border`).
  - Diff highlight colours in `ChangeShowcase` (red/green may clash against `--card-bg: #181c22`).
- No code changes identified yet; requires visual inspection.

**A7. `ExampleStory` snapshot link is a hard-coded demo path**

- `href="/snapshot/phac-2024-07-10-mpox-update"` references a demo record ID. This should either be validated against `src/data/demo-records.ts` or replaced with an ID that is confirmed to exist in the demo dataset.
- File: `src/app/[locale]/page.tsx` line ~293.

**A8. Copy tightening opportunities**

The following copy strings in `src/lib/homeCopy.ts` can be shortened without changing meaning:

- `howItWorks.subtitle` (EN): "HealthArchive uses modern web-archiving tools to capture, index, and replay public health pages." — the word "replay" is jargon. Consider: "HealthArchive captures public health pages on a regular schedule, indexes them for search, and lets you view them exactly as they appeared."
- `featuredSources.subtitle` (EN): "Federal public health websites currently being archived." — add a count hint when live data is available, e.g. "Federal and provincial public health websites currently being archived."
- `projectSnapshot.liveSubtext` (EN): "Live metrics from the archive backend." — this is engineering language. Consider: "Updated from the live archive." or simply drop it and rely on the "View live status" link below.
- `bottomCta.subheading` (EN): Slightly redundant with the hero lede. Consider replacing with something action-specific: "Browse by source, search by keyword, or view a page as it appeared on a specific date."

---

### Phase B issues (enhanced interactivity — requires component changes)

**B1. HomeSearch has no autocomplete or query hints**

- The current `HomeSearch` is a plain HTML form that redirects to `/archive?q=…` on submit. There is no debounced suggestion or hint to help users understand what's searchable.
- Proposed enhancement: Add a small set of static example queries shown as chips below the input ("e.g. COVID-19 vaccines, mpox, naloxone") that pre-fill the input on click. This is client-side only, requires no API call, and gives users a concrete starting point.
- File: `src/components/home/HomeSearch.tsx`
- Copy keys to add in `src/lib/homeCopy.ts`: `search.exampleQueries: string[]`

**B2. FeaturedSources cards lack a direct "view in archive" CTA linking to browse-by-source detail**

- The "Browse →" link points to `/archive?source={sourceCode}`, which is a search-filtered list. There is no link to a dedicated source detail page (if one exists at `/archive/browse-by-source/{sourceCode}` or similar).
- Check whether a per-source detail route exists. If it does, add it as a secondary link on each card. If it does not, this is a no-op until that route is built.
- File: `src/components/home/FeaturedSources.tsx`, `src/app/[locale]/page.tsx`

**B3. Metric card progress bars are capped at arbitrary maxima**

- `AnimatedMetric` receives `barPercent` computed against fixed denominators: `200_000` for snapshots, `100_000` for pages, `20` for sources.
- These produce misleading bars when actual counts are low (e.g. 5 sources gives 25% fill, implying 75% of the target is missing).
- Consider: Remove the bar entirely for low-count metrics, or switch to a logarithmic scale, or surface the raw count more prominently than the bar.
- File: `src/app/[locale]/page.tsx` lines 116–138.

**B4. `ChangeShowcase` uses only static/curated data**

- The component exists but it is unclear whether it fetches from `/api/changes` or renders a hardcoded diff example. Verify the data source and, if static, add a note in a code comment explaining the intent (curated for stability vs. live feed).
- If the intent is to show a live recent change, wire it to the `fetchChanges` call already present at the page level (a result is already fetched into `recentChanges` for `RecentActivity`). Pass the most recent change with a diff payload into `ChangeShowcase` rather than duplicating the fetch.
- File: `src/components/home/ChangeShowcase.tsx`, `src/app/[locale]/page.tsx`

**B5. No accessibility annotation on the FAQ accordion**

- The `FAQ` component uses `<details>/<summary>` for zero-JS fallback. Verify that:
  - Each `<summary>` has a visible focus outline consistent with the site's `:focus-visible` styles.
  - The expanded/collapsed state is conveyed to screen readers (native `<details>` handles this, but any enhancement layer should not override the `aria-expanded` semantics).
- File: `src/components/home/FAQ.tsx`, `src/app/globals.css`

---

## Implementation order (recommended)

Within Phase A, tackle in this order (each is self-contained):

1. **A1 + A2 + A3** — Fix hover states on links and cards. Touch `globals.css` and `FeaturedSources.tsx` together in one pass to avoid repeated CSS edits.
2. **A7** — Validate or replace the hard-coded snapshot link (quick, prevents a broken link in production).
3. **A4** — Stabilise the `RecentActivity` conditional render to prevent layout shift.
4. **A8** — Copy edits in `homeCopy.ts` (EN first, then sync FR).
5. **A5 + A6** — Section wrapper review and dark mode visual check (do together since both require visual inspection).

Within Phase B, tackle in this order:

1. **B4** — Clarify `ChangeShowcase` data source and deduplicate API calls. Low risk, improves code clarity.
2. **B1** — Add example query chips to `HomeSearch`. Modest effort, meaningful UX improvement.
3. **B5** — FAQ accessibility pass.
4. **B3** — Revisit metric bar scaling after reviewing real production counts.
5. **B2** — Add per-source detail CTA once the browse-by-source detail route existence is confirmed.

---

## Files likely touched per phase

**Phase A:**

| File                                      | Changes                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css`                     | Hover states for `.ha-audience-card`, `.ha-card` source cards; potential dark mode fixes                   |
| `src/components/home/FeaturedSources.tsx` | Link hover class fix                                                                                       |
| `src/app/[locale]/page.tsx`               | Fix audience/ExampleStory link hover classes; stabilise `RecentActivity` condition; validate snapshot link |
| `src/lib/homeCopy.ts`                     | Copy tightening on 3–4 EN strings + FR sync                                                                |

**Phase B:**

| File                                     | Changes                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| `src/components/home/HomeSearch.tsx`     | Add example query chips                                     |
| `src/lib/homeCopy.ts`                    | Add `search.exampleQueries` key (EN + FR)                   |
| `src/components/home/ChangeShowcase.tsx` | Confirm/document data source; optionally wire live data     |
| `src/app/[locale]/page.tsx`              | Pass change payload to `ChangeShowcase` if wiring live data |
| `src/components/home/FAQ.tsx`            | Focus/accessibility audit                                   |
| `src/app/globals.css`                    | FAQ focus styles if missing                                 |

---

## Out of scope for this plan

The following were considered but are deferred pending a broader product decision:

- Sticky mobile CTA bar (requires a client component with scroll detection; low priority given the inline search is already in the hero).
- Per-source detail route (`/archive/browse-by-source/{sourceCode}`) — blocked until that route exists in the frontend router.
- Homepage-level ISR / `React.cache()` tuning — deferred until real traffic data reveals a need.
- Additional homepage tests beyond what is already in `tests/a11y/home.a11y.test.tsx` — should follow any interactive changes from Phase B rather than precede them.
