# WARC Discovery Consistency Improvements (Partial, Updated 2026-07-10)

**Status:** Partially Implemented | **Scope:** Keep WARC discovery and WARC counts coherent across status output, indexing, reporting, and cleanup.

## Outcomes (Implemented)

- Added an operator-facing manifest verification command (and associated tests):
  - Plan: `2026-01-29-warc-manifest-verification.md`
- Added `WarcDiscoveryResult` with source and per-source count metadata.
- Unified indexing discovery across stable, state-tracked temp, and latest
  untracked fallback WARCs with stable-path duplicate preference.
- Aligned status/CLI consumers and the read-only crawl content report with the
  canonical union implementation.
  - Plan: `2026-07-10-warc-report-discovery-parity.md`

## Deferred / Follow-Through

One follow-through item remains:

- Improve manifest status, error handling, and reporting. Missing, valid, and
  malformed manifests should be distinguished additively, rather than
  overloading the existing fallback-oriented `manifest_valid` behavior.

Backlog tracker:

- `../roadmap.md` (WARC discovery consistency follow-through)

## Historical Context

Detailed analysis and proposed changes are preserved in git history.
