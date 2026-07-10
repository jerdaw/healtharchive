# WARC Report Discovery Parity (Implemented 2026-07-10)

**Status:** Implemented | **Scope:** Align the read-only crawl content report
with indexing's canonical stable/temp/fallback WARC union.

## Outcomes

- Added a pure `discover_all_warcs_for_output_dir` helper that:
  - unions stable, state-tracked temp, and latest untracked fallback WARCs
  - prefers stable paths for hardlinked and manifest-copied duplicates
  - reports source and per-source count metadata
  - validates tracked paths without reading or writing crawl state
- Kept `discover_all_warcs_for_job` state-aware: it still uses
  `CrawlState.get_temp_dir_paths()` for existing validation and pruning before
  delegating to the pure helper.
- Replaced the crawl content report's stable-first discovery path with the
  shared helper while preserving its report schema and byte-for-byte read-only
  state behavior.
- Updated the architecture guide and historical discovery-consistency record.

## Tests Added

- Canonical-helper coverage for a mixed stable, tracked-temp, and latest
  untracked fallback layout.
- Report regression coverage for the same mixed layout, including an assertion
  that `.archive_state.json` remains unchanged.
- Existing stable-only, temp-only, fallback-only, hardlink, and copied-manifest
  discovery coverage remains the compatibility contract.

## Canonical Docs Updated

- `docs/architecture.md`
- `docs/planning/roadmap.md`
- `docs/planning/implemented/2026-01-29-warc-discovery-consistency.md`

## Remaining Follow-Through

Manifest status and error reporting remains explicit in the future roadmap.
Discovery should additively distinguish missing, valid, and malformed
consolidation manifests without breaking the existing boolean field.

## Historical Context

The approved design remains at
`docs/superpowers/specs/2026-07-10-warc-report-discovery-parity-design.md`.
Detailed red/green implementation steps are preserved in git history.
