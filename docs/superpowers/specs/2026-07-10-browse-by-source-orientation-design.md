# Browse-by-Source Orientation And Accessibility Design

**Date:** 2026-07-10

## Context

The frontend feature-page analysis identifies three related gaps on
`/archive/browse-by-source`:

- cards are unlabelled `<article>` landmarks;
- the page does not summarize how many sources are displayed;
- an empty backend result, including a result emptied by filtering the `test`
  source, renders a blank grid with no explanation.

The same analysis also notes that card counts bypass the shared
`formatNumber()` helper. All four concerns sit on the same source-summary
rendering path and can be addressed without changing API behavior.

## Goal

Make the source list easier to orient and navigate for sighted and screen
reader users while preserving its current backend-first, demo-fallback data
flow.

## Non-goals

- Adding per-source detail routes or changing CTA destinations.
- Restyling entry-point versus latest-snapshot actions.
- Refactoring all localized page copy into global `siteCopy`.
- Changing source sorting, filtering, preview images, or API contracts.
- Adding client-side state or live announcements to this server-rendered page.

## Approaches Considered

### 1. Orientation and accessibility contract (selected)

Add a localized source-count summary, label each card from its visible source
heading, add a localized empty state, and use `formatNumber()` for count output.

This is the smallest cohesive user-facing batch: the summary and empty state
share the same list-count branch, while the card label makes the resulting
list navigable as named article landmarks.

### 2. Add only article labels

This would close the narrow accessibility finding but leave the explicitly
documented blank-empty-state and list-orientation gaps untouched. It is too
small for the documented problem.

### 3. Implement all five feature-analysis recommendations

Including CTA hierarchy and a snapshot-count copy helper would mix semantic
behavior, visual design, and copy refactoring. Those items are independently
reviewable and do not need to land with the empty-state fix.

## User Interface Contract

The page will render a short paragraph immediately before the grid:

- English: `Showing N source(s).`
- French: `Affichage de N source(s).`

`N` uses `formatNumber(locale, count)`. The paragraph is ordinary server-
rendered text, not an `aria-live` region, because the list does not update in
place.

Each card heading receives a stable ID derived from `sourceCode`. Its enclosing
`<article>` uses `aria-labelledby` to reference that visible heading. This
avoids duplicating the source name in an `aria-label` and keeps the accessible
name synchronized with visible content.

When the final `summaries` array is empty, the page renders a localized
callout instead of an empty grid:

- English title: `No sources available`
- French title: `Aucune source disponible`
- Body copy explains that no archive sources are available in this view yet.

## Data And Error Behavior

The existing data flow remains authoritative:

1. Initialize summaries from the bundled demo dataset.
2. Prefer the localized or English public sources endpoint.
3. Filter the reserved `test` source and sort live results.
4. On API failure, retain demo summaries and show the existing fallback notice.

A successful API response containing no public sources is not an error and
must not silently substitute demo data. It renders `Showing 0 sources` plus the
empty-state callout. An API failure continues to render the fallback notice,
the demo-source count, and demo cards.

## Copy And Formatting

Page-specific strings stay in `getBrowseBySourceCopy()` with English and French
added together. Card snapshot totals and the new source total both use the
shared `formatNumber()` helper; the now-unused direct locale-tag formatting
import is removed.

## Test Strategy

Focused route tests will prove:

- a backend result renders the correct source summary;
- an article is discoverable by role and visible source name;
- large record counts use the shared locale formatting behavior;
- a live result emptied by filtering renders zero sources and the empty state;
- French empty-state and source-summary copy are present;
- API failure still renders the fallback notice and demo cards.

The final branch will run the focused Vitest file, full frontend checks and
production build, monorepo contract/frontend parity, strict documentation
gates, and narrow/desktop browser inspection in English and French.

## Documentation Closeout

After implementation, update `frontend/FEATURE_PAGES_ANALYSIS.md` so completed
items 8, 13, and 15—and top improvements 1 through 3—are not selected again.
Update the canonical frontend implementation guide with the source-summary,
named-card, and empty-state behavior, then archive the implementation plan.

## Risk And Rollback

Risk is limited to incorrect plural copy, inaccessible ID wiring, or changing
fallback semantics. Route tests cover each branch, and rollback is confined to
the page, its focused test file, and documentation updates.
