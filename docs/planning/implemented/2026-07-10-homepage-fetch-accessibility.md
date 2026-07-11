# Homepage Fetch And Source-Link Accessibility (Implemented 2026-07-10)

**Status:** Implemented | **Scope:** Started the homepage's independent data
requests concurrently and gave featured-source links unique localized
accessible names without changing visible copy, destinations, or fallbacks.

## Outcomes

- The homepage starts `fetchArchiveStats()`, `fetchSources()`, and
  `fetchChanges({ pageSize: 5 })` together with `Promise.all`.
- Each request keeps its own `.catch(() => null)` guard, so a single rejected
  request cannot discard successful data returned by the other endpoints.
- Existing statistics, source-summary, and recent-activity fallback behavior
  remains unchanged.
- `HomeCopy.featuredSources` now supplies a source-specific accessible-name
  function in both English and French.
- Featured-source links expose `Browse {sourceName}` or
  `Parcourir {sourceName}` to assistive technology.
- Visible `Browse →` / `Parcourir →` text, localized destinations, card
  layout, and the existing six-source limit remain unchanged.
- Focused server-component tests prove all three requests start before any one
  resolves and preserve successful statistics and sources when changes fail.
- English and French accessibility tests cover unique link names, visible
  text, localized destinations, and the existing axe checks.
- The homepage analysis now records F4 and E8 as complete.
- The stale B7/F7 five-card finding now records the existing
  `sources.slice(0, 6)` behavior as already good.

## Validation

- Focused homepage data and accessibility suites cover the concurrent-start,
  isolated-failure, and bilingual link contracts.
- Frontend formatting, lint, type checking, unit tests, and production build
  run through the standard frontend parity commands.
- Contract parity, strict documentation coverage/build, and the repository
  pre-push gate are part of the completed implementation workflow.
- Localized narrow and desktop browser inspection remains a final verification
  step; it is not inferred from automated checks.

## Canonical Docs Updated

- `frontend/HOMEPAGE_ANALYSIS.md`
- `frontend/docs/implementation-guide.md`
- `docs/planning/README.md`
- `docs/planning/implemented/README.md`

## Decisions Created

- The approved design is recorded in
  `docs/superpowers/specs/2026-07-10-homepage-fetch-accessibility-design.md`.
- No separate architecture decision record was required for this route-local
  performance and accessibility change.

## Historical Context

The detailed test-first steps, requested checks, and commit sequence are
preserved in git history. This compressed record keeps the delivered contract
and verification expectations discoverable without retaining an active plan.
