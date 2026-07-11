# WARC Manifest Discovery Status Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Correct manifest validity semantics and expose bounded parsing status
consistently without changing discovery results or performing expensive
integrity verification.

**Design:** `../../superpowers/specs/2026-07-10-warc-manifest-discovery-status-design.md`

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

- Canonical RED: `tests/test_warc_discovery.py` produced eight failures. The
  fallback/no-manifest result was false instead of true, the result lacked
  status/error fields, malformed roots could crash or report valid, and
  unreadable/malformed JSON was silently treated as valid.
- Corrected one test-placement mistake before implementation: the hardlink-only
  case has no manifest and therefore expects `missing`, while the copy-fallback
  manifest case expects `valid`.
- Added bounded `missing`, `valid`, `invalid`, and `unreadable` status with
  `read-error`, `invalid-json`, `invalid-root`, `invalid-entries`, and
  `invalid-entry` error codes. Raw exception/path text is not stored.
- Preserved the compatibility boolean: `missing`/`valid` are true and
  `invalid`/`unreadable` are false. Fallback discovery no longer changes
  manifest validity.
- Consumer RED: the content report and JSON/show-job CLI checks produced three
  failures because status/error output was absent; the plain path-only
  `list-warcs` compatibility check already passed.
- Consumer GREEN: status/error now appears in `list-warcs --json`, `show-job
  --warc-details`, and content-report JSON/human output. Plain `list-warcs`
  output remains path-only.
- Self-review aligned `{}` with the established full verifier: a missing
  `entries` key is a valid empty list; a present non-list or malformed entry is
  invalid.
- Complete-diff review moved the new defaulted fields after `source_counts` so
  the legacy sixth positional constructor argument remains compatible, then
  added a regression for that constructor shape.
- Discovery/report/new CLI/full manifest-verifier tests passed 52 checks after
  implementation. After full-mypy test-signature fixes, the affected suite plus
  existing CLI admin coverage passed 57 tests in 10.75 seconds.
- Repository-wide Ruff format checked 222 files; repository-wide Ruff lint
  passed. Full mypy initially found three new test typing errors, then passed
  all 169 source/test files after the narrow signature/fixture fixes. Existing
  unchecked-body notes remained informational.
- `make test-fast` passed 389 tests in 125.77 seconds with one existing
  Starlette/httpx deprecation warning.
- `make docs-coverage-strict docs-build-strict` passed strict coverage,
  OpenAPI/LLM generation, and strict MkDocs; documentation built in 6.98
  seconds.
- Commit hooks passed whitespace, EOF, YAML/TOML, large-file, private-key,
  Ruff, mypy, and gitleaks checks for the implementation commit.
- Architecture distinguishes lightweight parse status from full
  `verify-warc-manifest` presence/size/hash checks. The completed plans index
  links this record, and the now-complete WARC discovery consistency item was
  removed from the not-yet-implemented roadmap.
- Final affected discovery/report/CLI/admin verification passed 58 tests in
  9.71 seconds after the positional-compatibility regression was added.
- Base PR [#129](https://github.com/jerdaw/healtharchive/pull/129) is mergeable
  and fully green across backend test/API-health/E2E, frontend
  contract/lint-test/Docker smoke, and platform integration checks.
- Stacked PR [#130](https://github.com/jerdaw/healtharchive/pull/130) is open
  and mergeable against `fix/content-report-warc-union`. Its body/base/head and
  compatibility/safety evidence were read back intact. No hosted checks were
  attached at the first readback, so the recorded local broad/focused gates are
  the current validation evidence for the stacked diff.
