# Durable Indexing Progress Heartbeats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implemented 2026-07-10

**Goal:** Persist consolidation and indexing liveness outside the atomic snapshot transaction and expose it through operator status commands and metrics.

**Architecture:** A dedicated one-row-per-job progress table is updated by a throttled, best-effort reporter using short independent transactions. Consolidation and indexing emit bounded callbacks into that reporter; operator surfaces read the row without changing snapshot transaction semantics.

**Tech Stack:** Python 3.11+, SQLAlchemy 2, Alembic, PostgreSQL/SQLite, pytest, Prometheus textfile metrics.

## Verification Results

- Focused pytest command: `60 passed, 1 warning in 21.65s`
- `make backend-ci`: Ruff format/check passed; mypy passed for 170 source
  files; `388 passed, 1 warning in 119.80s`
- `make docs-coverage-strict docs-build-strict`: strict coverage check passed;
  OpenAPI and `llms.txt` generation completed; strict MkDocs build completed
- `git diff --check`: passed

## Global Constraints

- Keep snapshot deletion/replacement and final job status in the existing atomic transaction.
- Persist only WARC basenames, never full filesystem paths, in progress rows and metric labels.
- Use a separate progress table so heartbeat commits cannot expose partial snapshot data.
- Progress persistence is best-effort and must never fail the underlying indexing operation.
- Throttle same-phase counter heartbeats to one short transaction per ten seconds.
- Write immediately on phase or current-WARC changes.
- Retain a `failed` row after handled failure; clear the row only after successful indexing commits.
- Do not add an alert, deploy, run a live reindex, or change checkpoint semantics in this batch.

---

### Task 1: Add Durable Progress Persistence

**Files:**
- Create: `tests/test_indexing_progress.py`
- Create: `alembic/versions/0016_archive_job_indexing_progress.py`
- Create: `src/ha_backend/indexing/progress.py`
- Modify: `src/ha_backend/models.py`

**Interfaces:**
- Produces: `ArchiveJobIndexingProgress`
- Produces: `IndexingProgressReporter.update(...)`, `.mark_failed()`, and `.clear()`
- Produces: `indexing_progress_payload(progress, now_utc=...)`

- [x] **Step 1: Write failing model/reporter tests**

Add tests that create one job and assert:

```python
reporter = IndexingProgressReporter(
    job_id,
    heartbeat_interval_seconds=10,
    monotonic=clock.monotonic,
    now_utc=clock.now_utc,
)
reporter.update(phase="discover", warc_total=2)
reporter.update(phase="discover", records_processed=10)
clock.advance(10)
reporter.update(phase="discover", records_processed=20)

with get_session() as session:
    progress = session.get(ArchiveJobIndexingProgress, job_id)
    assert progress is not None
    assert progress.phase == "discover"
    assert progress.warc_total == 2
    assert progress.records_processed == 20
```

Also assert a phase/current-WARC change bypasses throttling, payload age and
elapsed values are non-negative, `mark_failed()` retains the row, and `clear()`
removes it.

- [x] **Step 2: Run the tests and observe RED**

Run:

```bash
python -m pytest -q tests/test_indexing_progress.py
```

Expected: collection fails because the progress model/module does not exist.

- [x] **Step 3: Add the model and migration**

Create revision `0016_indexing_progress` after `0015_annual_editions` with table
`archive_job_indexing_progress` and these columns:

```text
job_id INTEGER PRIMARY KEY REFERENCES archive_jobs(id) ON DELETE CASCADE
phase VARCHAR(50) NOT NULL
current_warc VARCHAR(255) NULL
warc_index INTEGER NOT NULL DEFAULT 0
warc_total INTEGER NOT NULL DEFAULT 0
records_processed BIGINT NOT NULL DEFAULT 0
bytes_processed BIGINT NOT NULL DEFAULT 0
bytes_total BIGINT NOT NULL DEFAULT 0
started_at TIMESTAMPTZ NOT NULL
last_progress_at TIMESTAMPTZ NOT NULL
```

Mirror the table in `models.py` with non-null integer defaults.

- [x] **Step 4: Implement the reporter and serializer**

Implement a reporter that remembers its last phase, WARC, and monotonic write
time. `update()` writes when forced, when phase/WARC changes, or after the
interval. It upserts by `job_id`, preserving `started_at` until a new reporter's
first update resets the row. Catch persistence exceptions, log one warning, and
disable later writes for that instance.

Return payload keys:

```python
{
    "phase": progress.phase,
    "currentWarc": progress.current_warc,
    "warcIndex": progress.warc_index,
    "warcTotal": progress.warc_total,
    "recordsProcessed": progress.records_processed,
    "bytesProcessed": progress.bytes_processed,
    "bytesTotal": progress.bytes_total,
    "startedAt": progress.started_at.isoformat(),
    "lastProgressAt": progress.last_progress_at.isoformat(),
    "elapsedSeconds": max(0.0, (now - progress.started_at).total_seconds()),
    "lastProgressAgeSeconds": max(
        0.0, (now - progress.last_progress_at).total_seconds()
    ),
}
```

- [x] **Step 5: Run focused schema/reporter tests and observe GREEN**

```bash
python -m pytest -q \
  tests/test_indexing_progress.py \
  tests/test_ci_migration_guard.py \
  tests/test_ci_schema_parity.py
```

- [x] **Step 6: Commit persistence**

```bash
git add alembic/versions/0016_archive_job_indexing_progress.py \
  src/ha_backend/models.py src/ha_backend/indexing/progress.py \
  tests/test_indexing_progress.py
git commit -m "feat: persist indexing progress heartbeats"
```

### Task 2: Emit Consolidation Byte Progress

**Files:**
- Modify: `tests/test_archive_storage.py`
- Modify: `src/ha_backend/archive_storage.py`

**Interfaces:**
- Produces: `WarcConsolidationProgress`
- Extends: `consolidate_warcs(..., progress_callback=None)`

- [x] **Step 1: Write failing consolidation callback tests**

Add a test with two small WARC files and capture callback events:

```python
events: list[WarcConsolidationProgress] = []
result = consolidate_warcs(
    output_dir=output_dir,
    source_warc_paths=[first, second],
    progress_callback=events.append,
)
assert result.created == 2
assert {(e.warc_index, e.warc_total) for e in events} >= {(1, 2), (2, 2)}
assert any(e.phase == "hash" and e.bytes_processed == e.bytes_total for e in events)
assert all(Path(e.warc_name).name == e.warc_name for e in events)
```

Cover reuse and copy fallback so their final byte counts are reported.

- [x] **Step 2: Run the callback test and observe RED**

```bash
python -m pytest -q tests/test_archive_storage.py -k progress
```

Expected: `consolidate_warcs` rejects `progress_callback`.

- [x] **Step 3: Implement progress callbacks**

Add a frozen dataclass with `phase`, `warc_name`, `warc_index`, `warc_total`,
`bytes_processed`, and `bytes_total`. Emit callbacks while copying and hashing,
plus final events for hardlink/reuse. Keep the argument optional and existing
results unchanged.

- [x] **Step 4: Run archive-storage tests and observe GREEN**

```bash
python -m pytest -q tests/test_archive_storage.py
```

- [x] **Step 5: Commit consolidation progress**

```bash
git add src/ha_backend/archive_storage.py tests/test_archive_storage.py
git commit -m "feat: report WARC consolidation progress"
```

### Task 3: Wire The Indexing Pipeline Lifecycle

**Files:**
- Modify: `tests/test_indexing_pipeline_infra.py`
- Modify: `src/ha_backend/indexing/pipeline.py`

**Interfaces:**
- Consumes: `IndexingProgressReporter`
- Consumes: `WarcConsolidationProgress`
- Preserves: `index_job(job_id: int) -> int`

- [x] **Step 1: Write failing lifecycle tests**

Use a fake reporter and assert ordered phase coverage:

```python
assert phases == [
    "starting",
    "consolidate_warcs",
    "discover",
    "verify",
    "read_warc",
    "read_warc",
    "finalize",
]
assert reporter.events[-3]["records_processed"] > 0
assert reporter.cleared is True
```

Add a failure case asserting `mark_failed()` is called and `clear()` is not.
Keep existing log assertions.

- [x] **Step 2: Run lifecycle tests and observe RED**

```bash
python -m pytest -q tests/test_indexing_pipeline_infra.py -k progress
```

Expected: the pipeline never constructs the reporter.

- [x] **Step 3: Refactor without changing indexing atomicity**

Keep `index_job(job_id)` as the public wrapper. Move the existing session body
into `_index_job_transaction(job_id, reporter)`. The wrapper writes `starting`,
waits for the transaction function to return and its session context to commit,
then clears on RC 0 or marks failed otherwise.

Pass a consolidation callback through `_ensure_stable_warcs_available`. Emit
forced phase/WARC transitions, throttled record counts inside the record loop,
and `finalize` before page/signal/storage post-processing.

- [x] **Step 4: Run pipeline and worker tests and observe GREEN**

```bash
python -m pytest -q \
  tests/test_indexing_pipeline_infra.py \
  tests/test_worker.py \
  tests/test_annual_editions.py
```

- [x] **Step 5: Commit pipeline lifecycle**

```bash
git add src/ha_backend/indexing/pipeline.py tests/test_indexing_pipeline_infra.py
git commit -m "feat: heartbeat long indexing phases"
```

### Task 4: Expose Progress In Operator Status

**Files:**
- Modify: `tests/test_cli_jobs_admin.py`
- Modify: `tests/test_cli_annual_status.py`
- Modify: `src/ha_backend/cli.py`

**Interfaces:**
- Consumes: `ArchiveJobIndexingProgress`
- Consumes: `indexing_progress_payload`
- Produces: `indexingProgress` in annual JSON job payloads

- [x] **Step 1: Write failing CLI tests**

Seed a progress row and assert `show-job` contains phase, WARC position,
records, byte position, elapsed seconds, last-progress timestamp, and age.
Assert annual JSON includes the serializer payload and text includes:

```text
indexing: phase=read_warc warc=2/5 current=warc-000002.warc.gz records=1234 last_progress_age_seconds=30
```

- [x] **Step 2: Run CLI tests and observe RED**

```bash
python -m pytest -q \
  tests/test_cli_jobs_admin.py \
  tests/test_cli_annual_status.py \
  -k progress
```

- [x] **Step 3: Add bounded CLI output**

Load progress inside existing job queries. Use the serializer for JSON and a
single compact text line. Print `-` for absent current WARC; preserve all
existing output and summary semantics when no row exists.

- [x] **Step 4: Run complete CLI test files and observe GREEN**

```bash
python -m pytest -q tests/test_cli_jobs_admin.py tests/test_cli_annual_status.py
```

- [x] **Step 5: Commit operator status**

```bash
git add src/ha_backend/cli.py tests/test_cli_jobs_admin.py tests/test_cli_annual_status.py
git commit -m "feat: show durable indexing progress"
```

### Task 5: Expose Active Progress Metrics

**Files:**
- Modify: `tests/test_ops_crawl_metrics_textfile_state.py`
- Modify: `scripts/vps-crawl-metrics-textfile.py`

**Interfaces:**
- Consumes: non-failed `ArchiveJobIndexingProgress` rows joined to source/job
- Produces: `healtharchive_indexing_progress_*` gauges

- [x] **Step 1: Write the failing metrics test**

Seed one active and one failed progress row. Assert only the active job emits:

```text
healtharchive_indexing_progress_last_update_age_seconds
healtharchive_indexing_progress_warc_index
healtharchive_indexing_progress_warc_total
healtharchive_indexing_progress_records_processed
healtharchive_indexing_progress_bytes_processed
healtharchive_indexing_progress_bytes_total
```

Assert labels are exactly `source`, `job_id`, and `phase`, with no WARC value.

- [x] **Step 2: Run the metrics test and observe RED**

```bash
python -m pytest -q \
  tests/test_ops_crawl_metrics_textfile_state.py::test_metrics_emits_active_indexing_progress
```

- [x] **Step 3: Emit the gauges**

Query progress rows in the existing database block, convert timestamps to UTC,
clamp age to zero, reset the collection in the existing DB-exception path, and
emit all six gauges for phases other than `failed`.

- [x] **Step 4: Run metrics tests and observe GREEN**

```bash
python -m pytest -q \
  tests/test_ops_crawl_metrics_textfile_state.py \
  tests/test_ops_metrics_textfile_scripts.py
```

- [x] **Step 5: Commit metrics**

```bash
git add scripts/vps-crawl-metrics-textfile.py \
  tests/test_ops_crawl_metrics_textfile_state.py
git commit -m "feat: export indexing progress metrics"
```

### Task 6: Document And Close The Delivered Roadmap Slice

**Files:**
- Modify: `docs/operations/monitoring-and-alerting.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-10-indexing-progress-heartbeats.md`

**Interfaces:**
- Consumes: implemented progress contract
- Produces: accurate public observability and remaining backlog state

- [x] **Step 1: Update canonical docs**

Document durable consolidation/indexing progress as a dashboard/operator
signal, including heartbeat age and the no-alert-yet posture. In the roadmap,
mark persistence plus `show-job`, `annual-status`, `ha-check` consumption, and
metrics complete. Retain checkpoint/transaction-policy, stale-transaction
guidance, and detached-run wrapper work.

- [x] **Step 2: Mark this plan complete**

Change `**Status:** Active` to `**Status:** Implemented 2026-07-10` and add a
short verification-results section with actual command outputs only.

- [x] **Step 3: Run focused validation**

```bash
python -m pytest -q \
  tests/test_indexing_progress.py \
  tests/test_archive_storage.py \
  tests/test_indexing_pipeline_infra.py \
  tests/test_cli_jobs_admin.py \
  tests/test_cli_annual_status.py \
  tests/test_ops_crawl_metrics_textfile_state.py \
  tests/test_ops_metrics_textfile_scripts.py \
  tests/test_ci_migration_guard.py \
  tests/test_ci_schema_parity.py
```

- [x] **Step 4: Run complete validation**

```bash
make backend-ci VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv
make docs-coverage-strict docs-build-strict \
  VENV=/home/jer/repos/vps/healtharchive/healtharchive/.venv
git diff --check
```

- [x] **Step 5: Commit documentation closeout**

```bash
git add docs/operations/monitoring-and-alerting.md docs/planning/roadmap.md \
  docs/superpowers/plans/2026-07-10-indexing-progress-heartbeats.md
git commit -m "docs: close indexing progress heartbeat backlog"
```

- [x] **Step 6: Verify the clean committed tree**

Repeat Steps 3 and 4, then confirm `git status --short --branch` is clean before
push and PR creation.
