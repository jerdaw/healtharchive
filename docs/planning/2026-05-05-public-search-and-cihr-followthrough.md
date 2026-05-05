# Public Search and CIHR Follow-Through Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Active - repo-side implementation in progress; deployment and live
verification pending
**Created:** 2026-05-05
**Primary incident:** [CIHR WARC-complete crawl resumed after ZIM build failure](../operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md)

## Goal

Close the remaining engineering and operator follow-through after the 2026 CIHR recovery:

- restore public `/api/search` latency to verifier-safe levels after the dataset grew to about 1.2M snapshots;
- deploy and use the improved public-surface verifier so raw snapshot and replay checks are not hidden by one slow search mode;
- implement recurrence prevention for the WARC-complete/ZIM-finalization failure mode;
- review the remaining CIHR failed URLs and record the coverage decision.

## Current Evidence

- 2026 annual campaign is search-ready and research-ready:
  - HC job `6`: `indexed`, `262567` pages.
  - PHAC job `7`: `indexed`, `121940` pages.
  - CIHR job `8`: `indexed`, `557972` pages.
- CIHR job `8` details:
  - `WARC files: 689`
  - `Manifest valid: True`
  - `Total size: 709.83 GB`
  - `Status: indexed`
  - annual report status: `research_ready`
- `ha-check` was clean at `2026-05-05T15:40:24Z` after restoring:
  - `healtharchive-worker.service`
  - `healtharchive-crawl-auto-recover.timer`
  - `/etc/healtharchive/crawl-auto-recover-enabled`
- Public search timing probes on 2026-05-05:
  - `/api/search?pageSize=1`: `69.042724s`, total `842375`
  - `/api/search?pageSize=1&view=pages`: `0.936025s`, total `63986`
  - `/api/search?pageSize=1&source=cihr`: `16.985176s`, total `485160`
  - `/api/search?pageSize=1&source=cihr&view=pages`: `0.342094s`, total `8409`
  - `/api/search?q=covid&pageSize=1`: `73.491396s`, total `104319`
  - `/api/search?q=covid&pageSize=1&view=pages`: `58.538124s`, total `7901`
- Local verifier change already exists but is not deployed until committed, pushed, and released:
  - `scripts/verify_public_surface.py` falls back to `view=pages` to obtain a snapshot id when default search fails.
  - `tests/test_ops_verify_public_surface_pages.py` covers the fallback.
- Local search-latency mitigation exists but is not deployed until committed,
  pushed, and released:
  - broad newest `view=snapshots` browse can skip the runtime window-function
    de-dup/count path when stored `Snapshot.deduplicated` already represents
    duplicate suppression.
  - Query/date/URL searches keep the existing runtime de-dup path until
    production plans justify broader changes.
- Local WARC-complete/ZIM-finalization recurrence prevention exists but is not
  deployed until committed, pushed, and released:
  - backend `run_persistent_job` accepts the observed `warc2zim` seed-record
    finalization failure only when final crawlStatus has `pending=0` and WARC
    discovery finds indexable WARCs.
  - the accepted condition is marked as
    `warc_complete_finalization_failed` and surfaced in operator rescue state.

## Architecture

The plan separates operator-visible recovery from code changes:

1. Preserve the already-recorded production evidence and deploy the verifier fallback.
2. Optimize `/api/search` without changing public API semantics unless a documented product decision says otherwise.
3. Make WARC-first annual completion explicit in the worker/reconciliation path so a successful WARC crawl is not blocked by an optional ZIM finalization failure.
4. Verify the actual public surface after deployment, including snapshot metadata, raw HTML, and replay browse URLs.

## Workstream A: Ship Current Evidence and Verifier Fallback

**Files:**

- `scripts/verify_public_surface.py`
- `tests/test_ops_verify_public_surface_pages.py`
- `docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md`
- `docs/operations/healtharchive-ops-roadmap.md`
- `docs/planning/roadmap.md`
- `docs/operations/incidents/README.md`
- `mkdocs.yml`

### Task A1: Re-run local verification for current changes

- [x] Run the focused verifier tests:

  ```bash
  .venv/bin/pytest -s tests/test_ops_verify_public_surface_pages.py -q
  ```

  Expected:

  ```text
  3 passed
  ```

- [x] Build docs:

  ```bash
  make docs-build
  ```

  Expected: build completes successfully. Existing MkDocs warnings may remain if they are unrelated to this change.

### Task A2: Commit, push, and deploy current docs/verifier changes

- [ ] Review the diff:

  ```bash
  git diff -- docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md \
    docs/operations/incidents/README.md \
    docs/operations/healtharchive-ops-roadmap.md \
    docs/planning/roadmap.md \
    mkdocs.yml \
    scripts/verify_public_surface.py \
    tests/test_ops_verify_public_surface_pages.py
  ```

- [ ] Commit the current evidence and verifier fallback:

  ```bash
  git add docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md \
    docs/operations/incidents/README.md \
    docs/operations/healtharchive-ops-roadmap.md \
    docs/planning/roadmap.md \
    mkdocs.yml \
    scripts/verify_public_surface.py \
    tests/test_ops_verify_public_surface_pages.py
  git commit -m "ops: record cihr recovery follow-through"
  ```

- [ ] Push and deploy using the standard pinned-ref deployment helper.

  Guardrail: do not ask the operator to run the VPS-side verifier until the deployed checkout includes the `verify_public_surface.py` fallback change.

### Task A3: Re-run public-surface verifier after deployment

- [ ] On the VPS, verify the deployed checkout contains the fallback:

  ```bash
  cd /opt/healtharchive
  rg -n "view=pages|api search fallback" scripts/verify_public_surface.py
  ```

  Expected: matches in `scripts/verify_public_surface.py`.

- [ ] Run the public verifier:

  ```bash
  cd /opt/healtharchive
  set -a; source /etc/healtharchive/backend.env; set +a

  ./scripts/verify_public_surface.py \
    --api-base https://api.healtharchive.ca \
    --frontend-base https://healtharchive.ca \
    --timeout-seconds 60 \
    --raw-timeout-seconds 300
  ```

  Expected before search optimization: default `api search` may still fail or be slow, but the fallback should allow `/api/snapshot`, raw HTML, and replay URL checks to run.

## Workstream B: Diagnose and Fix `/api/search` Latency

**Files likely touched:**

- `src/ha_backend/api/routes_public.py`
- `src/ha_backend/models.py`
- `alembic/versions/0016_search_performance_indexes.py` or equivalent next revision
- `tests/test_api_search_and_snapshot.py`
- `tests/test_api_contracts.py`
- `docs/api-consumer-guide.md`
- `docs/architecture.md`
- `docs/operations/healtharchive-ops-roadmap.md`
- `docs/planning/roadmap.md`

### Task B1: Capture production query plans read-only

- [ ] On the VPS, run read-only timing and `EXPLAIN` for the slow paths:

  ```bash
  cd /opt/healtharchive
  set -a; source /etc/healtharchive/backend.env; set +a

  ./.venv/bin/python - <<'PY'
  from sqlalchemy import text
  from ha_backend.db import get_session

  statements = {
      "count_default_snapshots": """
          SELECT count(*) FROM (
              SELECT DISTINCT
                  snapshots.source_id,
                  snapshots.url,
                  COALESCE(snapshots.content_hash, snapshots.id::text)::text AS content_key,
                  date(timezone('UTC', snapshots.capture_timestamp)) AS capture_day
              FROM snapshots
              JOIN sources ON sources.id = snapshots.source_id
              WHERE sources.code NOT IN ('test')
                AND (snapshots.status_code IS NULL OR (snapshots.status_code >= 200 AND snapshots.status_code < 300))
                AND snapshots.deduplicated IS FALSE
          ) AS distinct_items
      """,
      "items_default_snapshots": """
          SELECT snapshots.id
          FROM snapshots
          JOIN sources ON sources.id = snapshots.source_id
          WHERE sources.code NOT IN ('test')
            AND (snapshots.status_code IS NULL OR (snapshots.status_code >= 200 AND snapshots.status_code < 300))
            AND snapshots.deduplicated IS FALSE
          ORDER BY
            CASE
              WHEN snapshots.status_code IS NULL THEN 0
              WHEN snapshots.status_code >= 200 AND snapshots.status_code < 300 THEN 2
              WHEN snapshots.status_code >= 300 AND snapshots.status_code < 400 THEN 1
              ELSE -1
            END DESC,
            snapshots.capture_timestamp DESC,
            snapshots.id DESC
          LIMIT 1
      """,
  }

  with get_session() as session:
      for name, sql in statements.items():
          print(f"== {name} ==")
          for (line,) in session.execute(text("EXPLAIN (ANALYZE, BUFFERS, VERBOSE) " + sql)):
              print(line)
  PY
  ```

- [ ] Save the output into the incident note or a new ops report if it changes the diagnosis.

### Task B2: Write regression tests for the intended behavior

- [x] Add tests in `tests/test_api_search_and_snapshot.py` that preserve current API semantics:
  - default `view` remains `snapshots`;
  - `includeDuplicates=false` continues hiding same-day same-content duplicates;
  - broad `view=pages` continues using the page fast path;
  - the optimized default path returns the same top item and total as the pre-change logic for a small fixture.

- [x] Run:

  ```bash
  .venv/bin/pytest -s tests/test_api_search_and_snapshot.py -q
  ```

  Result: the new SQL-shape test failed before implementation and passed after
  the storage-dedup optimization was added.

### Task B3: Implement the least contract-changing optimization

Preferred order of fixes:

1. Keep default `view=snapshots` semantics.
2. Avoid the runtime window-function/dedup path when `Snapshot.deduplicated` already represents same-day same-content duplicate suppression.
3. Add targeted Postgres indexes only if query plans show they are needed.
4. Only change default public browse behavior to `view=pages` after a documented product/API decision.

- [x] In `src/ha_backend/api/routes_public.py`, introduce a small internal predicate for the broad newest snapshot path:

  ```python
  def _can_use_storage_dedup_only_for_snapshots(
      *,
      effective_view: SearchView,
      includeDuplicates: bool,
      raw_q: str | None,
      boolean_query: BoolNode | None,
      url_search_targets: list[str] | None,
      range_start: datetime | None,
      range_end_exclusive: datetime | None,
      effective_sort: SearchSort,
  ) -> bool:
      return (
          effective_view == SearchView.snapshots
          and not includeDuplicates
          and raw_q is None
          and boolean_query is None
          and not url_search_targets
          and range_start is None
          and range_end_exclusive is None
          and effective_sort == SearchSort.newest
      )
  ```

- [x] Use that predicate to skip `compute_total()`'s expensive distinct subquery and `apply_snapshot_dedup()` only for the broad newest path, while retaining the existing dedup path for query/date/url searches until tests and production evidence justify more.

- [ ] If production `EXPLAIN` or post-deploy timings still show a sort/scan bottleneck, add the next Alembic migration with a partial index for the default newest browse path. Use a concurrent index only if the migration environment supports it safely:

  ```python
  """add search browse performance indexes

  Revision ID: 0016_search_performance_indexes
  Revises: 0015_annual_editions_and_capture_provenance
  """

  from alembic import op

  revision = "0016_search_performance_indexes"
  down_revision = "0015_annual_editions_and_capture_provenance"
  branch_labels = None
  depends_on = None


  def upgrade() -> None:
      op.create_index(
          "ix_snapshots_public_newest_nondedup",
          "snapshots",
          ["source_id", "capture_timestamp", "id"],
          unique=False,
          postgresql_where="deduplicated IS FALSE AND (status_code IS NULL OR (status_code >= 200 AND status_code < 300))",
      )


  def downgrade() -> None:
      op.drop_index("ix_snapshots_public_newest_nondedup", table_name="snapshots")
  ```

- [x] No SQLAlchemy model index declaration change is needed for this pass
  because no migration/index was added. Revisit this if production timings
  require a new index.

### Task B4: Verify search performance locally and after deploy

- [x] Run focused backend tests:

  ```bash
  .venv/bin/pytest -s tests/test_api_search_and_snapshot.py tests/test_api_contracts.py -q
  ```

- [x] Run backend CI if the change touches migrations/query semantics:

  ```bash
  make backend-ci
  ```

- [ ] After commit/push/deploy, run the same public timing probes:

  ```bash
  base="https://api.healtharchive.ca"

  for qs in \
    "pageSize=1" \
    "pageSize=1&view=pages" \
    "pageSize=1&source=cihr" \
    "pageSize=1&source=cihr&view=pages" \
    "q=covid&pageSize=1" \
    "q=covid&pageSize=1&view=pages"
  do
    echo "== $qs =="
    curl -fsS -o /tmp/ha-search.json \
      -w 'http=%{http_code} time=%{time_total}s size=%{size_download}\n' \
      --max-time 120 \
      "$base/api/search?$qs" || echo "FAILED"
    python3 - <<'PY'
  import json
  try:
      p=json.load(open("/tmp/ha-search.json"))
      print("total=", p.get("total"), "first_id=", (p.get("results") or [{}])[0].get("id"))
  except Exception as e:
      print("json_error=", e)
  PY
  done
  ```

  Target: default broad search should return comfortably below the verifier timeout. Use 10s as the initial engineering target and keep `view=pages` below 2s.

## Workstream C: WARC-Complete/ZIM-Finalization Recurrence Prevention

**Files likely touched:**

- `src/ha_backend/worker/main.py`
- `src/ha_backend/jobs.py`
- `src/ha_backend/annual_editions.py`
- `src/ha_backend/crawl_rescue_status.py`
- `src/archive_tool/**` only if the finalization failure is better classified there
- `tests/test_worker.py`
- `tests/test_jobs_persistent.py`
- `tests/test_cli_annual_status.py`
- `docs/operations/playbooks/core/annual-crawl-recovery.md` or the closest existing crawl recovery playbook
- `docs/architecture.md`

### Task C1: Confirm where optional ZIM failure should be classified

- [x] Inspect the current crawl result handling in `src/ha_backend/jobs.py` and `src/ha_backend/worker/main.py`.
- [x] Identify the exact condition from the incident:
  - crawl pending reached `0`;
  - stable/discovered WARCs are present and openable;
  - ZIM/finalization failed after WARC capture;
  - backend status ended at `completed` only after manual operator acceptance and reconciliation.
- [x] Decide whether automatic handling belongs in:
  - archive tool result classification;
  - backend worker success/failure interpretation;
  - annual reconciliation watchdog.

  Decision: classify in backend `run_persistent_job`, where the job row,
  combined log, and backend WARC discovery are all available. The worker then
  sees crawl success-with-warning and starts indexing through its existing
  success path.

### Task C2: Write failing tests for WARC-first completion

- [x] Add a worker-level test in `tests/test_worker.py`:
  - fake crawl returns a finalization failure classification;
  - fake WARC discovery returns non-empty stable WARCs;
  - worker indexes the job instead of leaving it as a failed/retry loop;
  - `crawler_stage` records a clear value such as `warc_complete_finalization_failed`.

- [x] Add a CLI/status test in `tests/test_cli_annual_status.py`:
  - a WARC-complete finalization-failed job that indexed successfully appears as `search-ready`, not `awaiting-index`.

- [x] Run:

  ```bash
  .venv/bin/pytest -s tests/test_worker.py tests/test_cli_annual_status.py -q
  ```

  Result: the direct classification and operator-status tests failed before
  implementation and passed after implementation. The worker test covers the
  worker success path for the accepted stage.

### Task C3: Implement WARC-first finalization handling

- [x] Add an explicit stage/status constant or clearly documented string for the condition:

  ```python
  WARC_COMPLETE_FINALIZATION_FAILED = "warc_complete_finalization_failed"
  ```

- [x] In the selected backend result-handling path, when WARC completion is proven and finalization failed:
  - set `crawler_status = "success"` or a distinct success-with-warning value that existing dashboards can interpret;
  - set `crawler_stage = WARC_COMPLETE_FINALIZATION_FAILED`;
  - set `crawler_exit_code` to the original exit code for auditability if needed;
  - call `index_job(job_id)` once;
  - do not restart the crawl solely to retry optional ZIM finalization.

- [x] Preserve failure behavior when WARC completion is not proven.

### Task C4: Add operator-visible observability

- [x] Update `annual-status`, `show-job`, and relevant status surfaces so operators can distinguish:
  - normal crawl success;
  - fallback/rescue success;
  - WARC-complete finalization failure accepted for search-readiness.

- [x] Add or update tests to assert the operator label/note.

### Task C5: Update docs and deploy

- [x] Update the incident note’s recurrence-prevention section from “not implemented” to the exact repo-side change and deployment caveat.
- [x] Update architecture/job lifecycle docs to state that annual search readiness is WARC-first and ZIM output is optional.
- [x] Run:

  ```bash
  make backend-ci
  make docs-build
  ```

- [ ] Commit, push, deploy, and verify the deployed checkout includes the new classification.

## Workstream D: Raw Snapshot and Replay Verification

**Files likely touched:**

- `scripts/verify_public_surface.py`
- `tests/test_ops_verify_public_surface_pages.py`
- `docs/operations/healtharchive-ops-roadmap.md`
- `docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md`

### Task D1: Complete public verifier run

- [ ] After Workstream A deploys, rerun the public verifier with the fallback enabled.
- [ ] Record:
  - `/api/snapshot/{id}` status;
  - `/api/snapshots/raw/{id}` status and latency;
  - replay `browseUrl` status and latency.

### Task D2: Investigate raw/replay timeout if it persists

- [ ] If raw snapshot still times out at 300s, capture the snapshot id and WARC path:

  ```bash
  cd /opt/healtharchive
  set -a; source /etc/healtharchive/backend.env; set +a

  ./.venv/bin/python - <<'PY'
  from ha_backend.db import get_session
  from ha_backend.models import Snapshot

  snapshot_id = 1319121
  with get_session() as s:
      snap = s.get(Snapshot, snapshot_id)
      print("id=", snap.id if snap else None)
      print("url=", snap.url if snap else None)
      print("warc_path=", snap.warc_path if snap else None)
      print("warc_record_id=", snap.warc_record_id if snap else None)
  PY
  ```

- [ ] Decide whether the issue is:
  - WARC read latency from large remote storage;
  - missing/invalid `warc_record_id`;
  - replay-service latency;
  - API worker timeout/proxy timeout mismatch.

- [ ] If needed, split follow-up into a new replay performance plan. Do not mix a large replay-storage redesign into the search fix unless the diagnosis proves they share a root cause.

## Workstream E: Review CIHR Failed URLs

**Files likely touched:**

- `docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md`
- `docs/operations/healtharchive-ops-roadmap.md`
- `docs/planning/roadmap.md`
- Possibly `src/ha_backend/job_registry.py` if source config needs adjustment.
- Possibly source-specific coverage report JSON on the VPS only; do not commit generated production JSON unless the repo already tracks it.

### Task E1: Export failed URL evidence

- [ ] On the VPS, inspect the generated CIHR annual report:

  ```bash
  cd /opt/healtharchive
  jq '.failedUrls // .failed_urls // .coverageSummary // .' \
    /srv/healtharchive/jobs/editions/cihr/2026/coverage-report.json | head -200
  ```

- [ ] If the report schema needs a helper command, add one locally rather than using ad hoc JSON parsing forever.

### Task E2: Classify failed URLs

- [ ] Classify each failed URL as:
  - acceptable excluded/non-HTML/media/document path;
  - transient crawler miss but low research impact;
  - source configuration bug;
  - replay/indexing bug.

- [ ] Record the decision in the incident note.

### Task E3: Implement config fix only if needed

- [ ] If failed URLs reveal a real CIHR scope/config bug, update `src/ha_backend/job_registry.py` and `tests/test_job_registry.py`.
- [ ] Run:

  ```bash
  .venv/bin/pytest -s tests/test_job_registry.py -q
  make backend-ci
  ```

## Completion Criteria

This plan is complete when:

- current incident evidence and verifier fallback are committed, pushed, and deployed;
- public verifier reaches and records snapshot metadata, raw HTML, and replay checks;
- broad `/api/search?pageSize=1` returns below the chosen verifier-safe latency target on production;
- WARC-complete/ZIM-finalization failures no longer require manual DB acceptance before indexing;
- CIHR failed URLs have been reviewed and either accepted or converted into source config fixes;
- `docs/operations/incidents/2026-05-03-cihr-warc-complete-zim-build-resume-loop.md`, `docs/operations/healtharchive-ops-roadmap.md`, and `docs/planning/roadmap.md` reflect the final state.

## Execution Order

1. Workstream A: ship current evidence and verifier fallback.
2. Workstream B: fix search latency, because it is currently the public-surface blocker.
3. Workstream D: rerun public verifier and investigate raw/replay only if still failing.
4. Workstream C: implement recurrence prevention for WARC-complete finalization failures.
5. Workstream E: review CIHR failed URLs and close or convert them into source config work.

## Notes for Production Commands

Production commands in this plan are operator-run commands. From a normal local repo session, assistants should not SSH into the VPS or directly modify `/opt/healtharchive`.

When a VPS command depends on local code in this plan, first commit, push, and deploy the code. Then verify the deployed checkout contains the expected change before running the dependent remediation or verification command.
