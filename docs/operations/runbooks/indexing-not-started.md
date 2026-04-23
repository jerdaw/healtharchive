# Runbook: HealthArchiveIndexingNotStarted

**Alert Name:** `HealthArchiveIndexingNotStarted`
**Severity:** `warning`
**Trigger:** `healtharchive_indexing_pending_job_max_age_seconds > 3600` while
`healtharchive_crawl_running_jobs == 0` for 15 minutes.

## Description

A job has stayed in `status="completed"` for over an hour after crawl
completion, indexing has not started, and no crawl jobs are currently running.

This alert is intentionally suppressed while any crawl jobs remain `running`.
During an active annual campaign, a completed job can be intentionally left in
`awaiting-index` until the remaining crawls finish.

## Diagnosis

1. Confirm the pending-index job and overall annual state.

   ```bash
   cd /opt/healtharchive
   set -a; source /etc/healtharchive/backend.env; set +a
   HA=/opt/healtharchive/.venv/bin/healtharchive

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
   will use.

   ```bash
   OUT=/srv/healtharchive/jobs/<source>/<job-dir>

   findmnt -T "$OUT" -o TARGET,SOURCE,FSTYPE,OPTIONS
   sudo ls -ld "$OUT" "$OUT/warcs" "$OUT/provenance" 2>/dev/null
   sudo find "$OUT/warcs" -maxdepth 1 -type f \
     \( -name '*.warc' -o -name '*.warc.gz' -o -name 'manifest.json' \) \
     -printf '%M %u:%g %s %TY-%Tm-%Td %TH:%TM %p\n' 2>/dev/null | sort
   ```

   If the hot path is missing `warcs/` but the Storage Box cold path has them,
   fix the tiering/bind-mount drift before retrying indexing.

## Mitigation

1. If the job is still `completed` and WARCs are visible on the hot path, run:

   ```bash
   cd /opt/healtharchive
   set -a; source /etc/healtharchive/backend.env; set +a
   /opt/healtharchive/.venv/bin/healtharchive index-job --id <JOB_ID>
   ```

2. If the job is `index_failed` after a transient issue and the WARCs are
   healthy, move it back to `completed` and retry indexing:

   ```bash
   cd /opt/healtharchive
   set -a; source /etc/healtharchive/backend.env; set +a
   /opt/healtharchive/.venv/bin/healtharchive retry-job --id <JOB_ID>
   /opt/healtharchive/.venv/bin/healtharchive index-job --id <JOB_ID>
   ```

3. Re-check the result:

   ```bash
   "$HA" show-job --id <JOB_ID>
   "$HA" annual-status --year <YEAR>
   ```

## Notes

- Large indexing runs can take hours and may not show intermediate committed
  progress from a second shell.
- A negative page-group count in older logs (for example `Rebuilt -2 page
  group(s)`) was a rowcount/reporting bug, not negative real work. Newer code
  formats that case as `unknown`.
