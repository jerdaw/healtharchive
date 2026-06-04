# Runbook: HealthArchiveIndexingNotStarted

**Alert Name:** `HealthArchiveIndexingNotStarted`
**Severity:** `warning`
**Trigger:** `healtharchive_indexing_pending_job_max_age_seconds > 3600` while
`healtharchive_crawl_running_jobs == 0` for 15 minutes.

## Description

A job has stayed in `status="completed"` for over an hour after crawl
completion, indexing has not started, and no crawl jobs are currently running.

The worker and `run-db-job` normally index completed jobs automatically. If this
alert fires, treat it as a reconciliation failure, not as an expected campaign
state.

## Diagnosis

1. Confirm the pending-index job and overall annual state.

   ```bash
   cd <deploy-root>
   set -a; source /etc/healtharchive/backend.env; set +a
   HA=<deploy-root>/.venv/bin/healtharchive

   "$HA" annual-status --year <YEAR>
   "$HA" show-job --id <JOB_ID>
   ```

2. Check whether indexing already started and then failed.

   ```bash
   sudo journalctl -u healtharchive-worker.service --since "6 hours ago" --no-pager \
     | grep -Ei "job <JOB_ID>|indexing"
   ```

   Look for:
   - `Starting indexing for job <JOB_ID>`
   - `Indexing for job <JOB_ID> failed: ...`

3. Verify that the job output dir exposes WARCs from the hot path the indexer
   will use. Current indexer discovery unions stable `warcs/`, readable temp
   WARCs, and fallback WARCs; operators should inspect all three when a count
   looks wrong.

   ```bash
   OUT=<service-data-root>/jobs/<source>/<job-dir>

   findmnt -T "$OUT" -o TARGET,SOURCE,FSTYPE,OPTIONS
   sudo ls -ld "$OUT" "$OUT/warcs" "$OUT/provenance" 2>/dev/null
   sudo find "$OUT" -path '*/warcs/*' -type f \
     \( -name '*.warc' -o -name '*.warc.gz' -o -name 'manifest.json' \) \
     -printf '%M %u:%g %s %TY-%Tm-%Td %TH:%TM %p\n' 2>/dev/null | sort
   ```

   If the hot path is missing `warcs/` but the Storage Box cold path has them,
   fix the tiering/bind-mount drift before retrying indexing.

## Mitigation

1. If the job is still `completed` and WARCs are visible on the hot path, run
   the idempotent reconciler first. On production, always source the backend
   environment first so the CLI uses PostgreSQL rather than falling back to the
   repo-local SQLite default:

   ```bash
   cd <deploy-root>
   set -a; source /etc/healtharchive/backend.env; set +a
   <deploy-root>/.venv/bin/healtharchive reconcile-completed-indexing --limit 5
   ```

   For a large single source/job, prefer a detached run with a captured log:

   ```bash
   cd <deploy-root>
   set -a; source /etc/healtharchive/backend.env; set +a
   mkdir -p <service-data-root>/ops/manual-runs
   ts="$(date -u +%Y%m%dT%H%M%SZ)"
   nohup ./.venv/bin/healtharchive reconcile-completed-indexing --source <source> --limit 1 \
     > "<service-data-root>/ops/manual-runs/<source>-reindex-${ts}.log" 2>&1 &
   echo "pid=$! log=<service-data-root>/ops/manual-runs/<source>-reindex-${ts}.log"
   renice +10 -p "$!"
   ```

   If you need to target one job only, use `index-job --id <JOB_ID>` after
   confirming it is still safe to index.

   Jobs that reached a WARC-complete crawl state but failed optional
   finalization, such as a Zimit `warc2zim` seed-record failure, may appear with
   the operator rescue state `warc-complete-finalization-failed`. Treat that as
   eligible for indexing only when `show-job --warc-details` shows discoverable
   WARCs and the final crawlStatus has no pending URLs. Do not restart the crawl
   solely to retry optional finalization when the backend search/replay path
   only needs WARCs.

2. If the job is `index_failed` after a transient issue and the WARCs are
   healthy, move it back to `completed` and retry indexing:

   ```bash
   cd <deploy-root>
   set -a; source /etc/healtharchive/backend.env; set +a
   <deploy-root>/.venv/bin/healtharchive retry-job --id <JOB_ID>
   <deploy-root>/.venv/bin/healtharchive index-job --id <JOB_ID>
   ```

3. Re-check the result:

   ```bash
   "$HA" show-job --id <JOB_ID>
   "$HA" annual-status --year <YEAR>
   ```

## Notes

- Large indexing runs can take hours and may not show intermediate committed
  progress from a second shell.
- During a healthy long indexing run, high CPU plus increasing
  `/proc/<pid>/io` `rchar` means the process is still reading/parsing WARC
  records. Avoid starting duplicate reconciles for the same source/job.
- If the indexing client process exits unexpectedly and the job did not commit,
  check `pg_stat_activity` for stale `idle in transaction` backends and
  blockers before terminating anything. Terminate only the abandoned backend
  after confirming there is no live reconcile process and the job remains
  unindexed.
- A negative page-group count in older logs (for example `Rebuilt -2 page
  group(s)`) was a rowcount/reporting bug, not negative real work. Newer code
  formats that case as `unknown`.
