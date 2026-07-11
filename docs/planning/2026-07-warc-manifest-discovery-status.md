# WARC Manifest Discovery Status Implementation Plan

**Status:** Ready to implement

**Goal:** Correct manifest validity semantics and expose bounded parsing status
consistently without changing discovery results or performing expensive
integrity verification.

**Design:** `../superpowers/specs/2026-07-10-warc-manifest-discovery-status-design.md`

## Task 1: Add failing canonical status tests

**File:** `tests/test_warc_discovery.py`

1. Update fallback-without-manifest to expect valid/missing rather than false.
2. Add valid and malformed JSON/shape cases with explicit status/error codes.
3. Add an unreadable read-path case using a narrow mock rather than host
   permission assumptions.
4. Run the focused tests and record the expected missing-field/incorrect
   fallback failures.

## Task 2: Implement bounded manifest metadata

**File:** `src/ha_backend/indexing/warc_discovery.py`

1. Add the status literal and internal parse-result type.
2. Parse only the structure required for manifest-source deduplication.
3. Preserve valid-entry deduplication while marking a partially malformed
   entries list invalid.
4. Set `manifest_valid` from status for both empty and non-empty results.
5. Keep `verify-warc-manifest` as the separate full integrity path.
6. Run canonical discovery tests until green.

## Task 3: Surface status in CLI and content reports

**Files:**

- Modify: `src/ha_backend/cli.py`
- Modify: `scripts/vps-crawl-content-report.py`
- Modify: `tests/test_ops_crawl_content_report.py`
- Modify/add closest CLI tests if required

1. Add status/error to `list-warcs --json`; preserve plain path output.
2. Add status/error to `show-job --warc-details`.
3. Add a detailed read-only report helper while preserving the existing
   two-value discovery helper.
4. Add status/error to report JSON metadata and human summary.
5. Add regressions for malformed manifest reporting and no raw error/path leak.

## Task 4: Close documentation and roadmap truth

**Files:**

- Modify: `docs/architecture.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Move/archive this plan under `docs/planning/implemented/`

Document lightweight parse status versus full verification clearly. Move WARC
discovery consistency out of the active backlog once operator consumers expose
the shared union and manifest status; do not claim that routine discovery
performs presence/size/hash verification.

## Task 5: Verify, review, and publish

Run focused discovery/report/CLI tests, Ruff check/format, mypy, strict docs,
base-to-head whitespace and public-boundary checks, and one appropriately
bounded backend parity command. Record any environmental limitation exactly.

Commit in reviewable units, push, and open a stacked PR against
`fix/content-report-warc-union`. Read back base/head/body/mergeability/checks and
link PR #129 explicitly.

## Completion Record

Pending implementation.
