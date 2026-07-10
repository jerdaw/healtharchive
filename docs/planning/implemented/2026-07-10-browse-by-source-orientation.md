# Browse-by-Source Orientation and Accessibility (Implemented 2026-07-10)

**Status:** Implemented | **Scope:** Added localized result orientation,
accessible card landmark names, and an explicit empty result to the bilingual
browse-by-source page without changing its backend-first loading contract.

## Outcomes

- Added a localized source-count sentence before the results grid, using the
  shared `formatNumber(locale, value)` helper.
- Named each source-card `<article>` with `aria-labelledby` from its visible
  source heading.
- Added localized English and French empty-state callouts for successful API
  responses that contain no public sources after filtering.
- Preserved demo summaries for API failures only; successful empty API results
  remain empty.
- Preserved source filtering and sorting, preview images, and CTA destinations.
- Added focused component coverage for English number formatting and article
  names, filtered-empty results, French empty-state copy, and API-failure demo
  fallback.

## Canonical Docs Updated

- [Frontend feature-page analysis](https://github.com/jerdaw/healtharchive/blob/main/frontend/FEATURE_PAGES_ANALYSIS.md)
- [Frontend implementation guide](https://github.com/jerdaw/healtharchive/blob/main/frontend/docs/implementation-guide.md)

## Validation

Validated on 2026-07-10 with:

1. `npm test -- tests/browse-by-source.test.tsx`
2. `npm run check`
3. `make contract-sync`
4. `make frontend-ci`
5. `make docs-coverage-strict`
6. `make docs-build-strict`
7. `git diff --check`

## Remaining Follow-Through

- The visual hierarchy between curated entry-point and latest-snapshot CTAs
  remains open.
- A shared French snapshot-count helper remains open.

## Historical Context

The detailed test-first implementation plan and task-by-task validation history
are preserved in git history.
