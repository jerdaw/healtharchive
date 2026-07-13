# Snapshot Metadata Mobile Layout (Implemented 2026-07-10)

**Status:** Implemented | **Scope:** Prevent snapshot metadata labels and
values from clipping or overflowing on 320–360px screens without changing
route behavior, copy, data fetching, or semantic markup.

## Outcomes

- Added one shared metadata-label class contract:
  `text-ha-muted w-20 shrink-0 sm:w-28`.
- Added one shared metadata-value class contract:
  `min-w-0 flex-1 break-all`.
- Applied both contracts to every `<dt>/<dd>` pair while preserving the
  existing `<dl>` semantics and row order.
- Added a regression test that requires all nine backend-backed metadata rows
  to use the responsive classes.
- Closed duplicate mobile-overflow items 2.2 and 4.6 in the snapshot-page
  improvement plan.
- Verified localized English and French demo renderings at 320px and 360px:
  document and metadata widths stayed within their containers, long URLs
  wrapped, and all metadata values fit their columns.

## Canonical Docs Updated

- `frontend/SNAPSHOT_IMPROVEMENT_PLAN.md`
- `docs/planning/README.md`
- `docs/planning/implemented/README.md`

## Validation

- Focused test: `npm test -- tests/snapshotDetails.test.tsx` (2 passed).
- Frontend parity: `npm run check` and `make frontend-ci` (38 files,
  107 tests, production build passed).
- API contract synchronization: `make contract-sync` produced no tracked
  changes.
- Documentation: `make docs-coverage-strict` and `make docs-build-strict`
  passed.
- Browser geometry checks: English and French at 320px and 360px, with no
  horizontal overflow.

## Remaining Work

Other independently scoped recommendations in
`frontend/SNAPSHOT_IMPROVEMENT_PLAN.md` remain backlog items; this batch only
completed sections 2.2 and 4.6.
