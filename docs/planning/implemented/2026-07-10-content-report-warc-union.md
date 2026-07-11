# Content Report WARC Union Implementation Plan

**Status:** Ready to implement

**Goal:** Align the read-only crawl content-cost report with canonical stable,
tracked-temp, and fallback WARC union semantics without changing indexing or
production state.

**Design:** `../superpowers/specs/2026-07-10-content-report-warc-union-design.md`

## Task 1: Add the failing report regression

**File:** `tests/test_ops_crawl_content_report.py`

1. Create stable, state-tracked temp, and newer untracked fallback WARC files.
2. Call `discover_warcs_read_only` with the tracked temp path in state data.
3. Assert the result contains all three resolved paths and source `mixed`.
4. Run only the new test and record the expected stable-only failure.

## Task 2: Extract canonical output-directory discovery

**File:** `src/ha_backend/indexing/warc_discovery.py`

1. Extract the current stable/temp/fallback grouping, deduplication, source
   counting, and result construction into
   `discover_all_warcs_for_output_dir`.
2. Accept explicit tracked temp directories and preserve `allow_fallback`.
3. Make `discover_all_warcs_for_job` load `CrawlState` temp directories and
   delegate.
4. Export the new helper without changing existing function signatures.
5. Run `tests/test_warc_discovery.py` to prove canonical behavior remains green.

## Task 3: Delegate the read-only report

**File:** `scripts/vps-crawl-content-report.py`

1. Remove the duplicate stable-first discovery helpers/imports.
2. Validate and resolve tracked temp directories from the already-loaded state
   snapshot.
3. Call `discover_all_warcs_for_output_dir` and return its paths/source.
4. Run the new regression and the full content-report test module until green.

## Task 4: Reconcile documentation and roadmap truth

**Files:**

- Modify: `docs/architecture.md`
- Modify: `docs/planning/roadmap.md`
- Move: `docs/planning/2026-07-content-report-warc-union.md` to
  `docs/planning/implemented/2026-07-10-content-report-warc-union.md`

1. Describe the output-directory union helper, deduplication, and consumer
   ownership accurately.
2. Record content-report and `vps-crawl-status.sh` alignment as delivered.
3. Leave only concrete manifest validation/error-reporting follow-through in
   the active WARC-discovery backlog.
4. Add exact red/green and validation evidence to the archived plan.

## Task 5: Verify, review, and publish

Run:

```bash
.venv/bin/pytest tests/test_ops_crawl_content_report.py tests/test_warc_discovery.py -q
.venv/bin/ruff check \
  src/ha_backend/indexing/warc_discovery.py \
  scripts/vps-crawl-content-report.py \
  tests/test_ops_crawl_content_report.py
.venv/bin/ruff format --check \
  src/ha_backend/indexing/warc_discovery.py \
  scripts/vps-crawl-content-report.py \
  tests/test_ops_crawl_content_report.py
.venv/bin/mypy \
  src/ha_backend/indexing/warc_discovery.py \
  scripts/vps-crawl-content-report.py
make backend-ci
make docs-coverage-strict docs-build-strict VENV=.venv
git diff origin/main --check
```

If a broad command is unavailable or fails for a pre-existing environmental
reason, record the exact result and continue with focused checks. Review the
complete diff for behavior drift, duplicate discovery logic, public/private
boundary violations, and roadmap over-claiming. Commit, push, open a PR against
`main`, and read back its body and hosted checks.

## Completion Record

Pending implementation.
