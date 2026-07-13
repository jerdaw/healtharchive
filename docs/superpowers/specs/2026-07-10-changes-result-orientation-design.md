# Changes Result Orientation Design

**Date:** 2026-07-10

## Context

The frontend feature-page analysis identifies two related orientation gaps on
`/changes`:

- the filter section heading is the terse “Scope” / “Portée”;
- the API response total is used for pagination but is not shown to users, so
  a single-page result gives no indication of the result volume.

The page already receives `total`, handles enabled/disabled/unavailable states,
and uses a local bilingual copy helper. The gaps can be closed without changing
the API or introducing client state.

## Goal

Make the change feed’s filtering purpose and result volume immediately clear
in English and French, including successful zero-result responses.

## Non-goals

- Changing source or edition selection behavior.
- Adding client-side filtering, loading state, or live announcements.
- Changing the form action, pagination URLs, page size, or API calls.
- Restyling the update and digest actions.
- Changing change-card styling or compare/snapshot destinations.

## Approaches Considered

### 1. Result orientation contract (selected)

Rename the filter heading and show a localized result total for every
successful enabled response.

These changes form one cohesive orientation batch: the heading explains how
to narrow the feed, and the total explains the scope of the resulting feed.

### 2. Add only the result total

This is smaller, but it leaves the adjacent explicitly documented clarity gap
open even though both strings belong in the same local copy contract.

### 3. Implement all five feature-analysis recommendations

This would mix result orientation with pagination hardening, control hierarchy,
and other unrelated semantics. Several observations are already stale or low
value, so they should not be bundled into this change.

## User Interface Contract

The filter section heading becomes:

- English: `Filter by source & edition`
- French: `Filtrer par source et édition`

Immediately below the existing “Changes feed” heading, a successful enabled
response renders:

- English: `Showing N change(s).`
- French: `Affichage de N changement(s).`

`N` uses `formatNumber(locale, total)`. Singular is used only when `total ===
1`; zero and all other values use the plural. The summary is ordinary server-
rendered text, not an `aria-live` region, because the page navigates rather than
updating in place.

## Data And Error Behavior

The result summary renders only when `changes` exists and `changes.enabled` is
true:

- enabled with results: show the total before the cards;
- enabled with zero results: show zero before the existing empty callout;
- disabled: show the existing disabled message without a misleading total;
- unavailable or failed request: show the existing unavailable callout without
  claiming zero changes.

Pagination continues to derive from the same API `total` and `pageSize` values.

## Copy And Formatting

Page-specific strings stay in `getChangesCopy()` so English and French remain
co-located. The page imports the existing shared `formatNumber()` helper beside
`formatDate()`; no new shared copy or formatting abstraction is needed.

## Test Strategy

Focused route tests will prove:

- one English result renders the clearer filter heading and singular total;
- a successful enabled empty result renders `Showing 0 changes.` and retains
  the existing empty-state copy;
- a French multi-result response renders the French filter heading, localized
  plural total, and pagination copy;
- unavailable/disabled states do not render a misleading result summary.

The branch will also run frontend format/lint/type/build checks, strict docs
coverage/build, and the repository’s relevant parity gates. Browser inspection
will cover English and French at narrow and desktop widths when the local
runtime is available; component tests remain the authoritative branch evidence
for mocked zero/one/many API totals.

## Documentation Closeout

After implementation, mark the `/changes` total-count and filter-heading
findings complete in `frontend/FEATURE_PAGES_ANALYSIS.md`, update the canonical
frontend implementation guide, and archive the implementation plan so the work
is not selected again.

## Risk And Rollback

Risk is limited to incorrect pluralization or displaying zero when the feed is
actually unavailable. Focused tests cover both boundaries. Rollback is confined
to the route, its focused tests, and documentation.
