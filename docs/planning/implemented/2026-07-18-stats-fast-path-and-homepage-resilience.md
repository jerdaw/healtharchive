# Stats fast path and homepage resilience

**Status:** Implemented in the repository on 2026-07-18; production deployment
and post-deploy latency verification remain operator follow-through.

## Trigger

Read-only production sampling showed that `/api/stats` returned correct data
but took about 11–15 seconds. The frontend intentionally stops waiting after
eight seconds, so the homepage and status page could fall back to zero or blank
aggregate metrics while health, sources, search, and snapshot routes remained
available.

## Outcome

- `/api/stats` keeps the authoritative `Snapshot` row count, but uses the
  maintained `pages` rollup for unique-page, source, snapshot-sum, and latest
  capture aggregates when rollup coverage exactly matches that count.
- Missing, partial, or stale rollups fall back to an exact
  `Snapshot`-derived query using the canonical URL grouping expression.
- The homepage now uses live source totals when the stats request alone times
  out. It omits the unavailable unique-page total and communicates the
  partial-live state in English and French.
- Architecture and frontend implementation documentation describe both the
  coverage guard and the partial-live fallback.

## Verification

- Backend stats regression tests cover complete rollups, stale-rollup fallback,
  and canonical URL grouping.
- Backend fast suite: 405 passed.
- Full backend suite: 904 passed; critical-module coverage reached 82.32%, and
  pre-commit plus static security checks passed.
- API contract/concurrency subset: 46 passed.
- Backend formatting, lint, and type checking passed.
- Frontend `npm run check`: 47 test files and 187 tests passed, production
  build succeeded, and 78 internal routes passed link validation.
- Documentation strict build passed.
- Aggregate integrity-report module: 16 passed.
- Python CI-policy audit and npm production-dependency audit reported no known
  vulnerabilities.

Production sampling on 2026-07-18 returned HTTP 200 for all twelve selected
public API routes. Eleven completed in about 0.45–1.84 seconds; only
`/api/stats` exceeded the frontend budget at about 11.15 seconds.

## Operator follow-through

After deploying this change:

1. Verify `https://api.healtharchive.ca/api/stats` repeatedly completes
   within the frontend's eight-second request budget.
2. Revalidate the English and French homepage/status aggregate metrics after
   cache revalidation.
3. If rollup coverage is deliberately incomplete during maintenance, confirm
   the exact fallback remains correct before rebuilding the rollup.

No production access, deployment, or private operations changes were performed
as part of this repository implementation.
