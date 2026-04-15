# Runbook: Crawl Temp Dirs High

**Alert Name:** `HealthArchiveCrawlTempDirsHigh`
**Severity:** Warning

## Trigger

This alert fires when a running crawl has more than 100 tracked `.tmp*`
directories for at least 1 hour and that count has grown by at least 5 over the
last 12 hours:

- `healtharchive_crawl_running_job_temp_dirs_count > 100`
- `max_over_time(temp_dirs_count[12h]) - min_over_time(temp_dirs_count[12h]) >= 5`

The metric comes from `temp_dirs_host_paths` in the job's `.archive_state.json`,
so this is real crawl-stage churn, not just a loose filesystem glob. The
growth guard is there to suppress stale warnings when a long-lived crawl has a
historically high temp-dir count that is no longer climbing.

## Meaning

The job has created an unusually large number of crawl-phase temp directories.
Common causes are:

- repeated adaptive container restarts
- repeated resume or new-crawl phases after failures
- storage or permission instability on the output path
- a long-running crawl that is still making progress but is thrashing on a
  subset of URLs

Do not treat this alert as an instruction to delete `.tmp*` during the crawl.
Those directories may still contain WARCs and resume state needed by the active
job.

## Quick Diagnosis

Start with a read-only snapshot on the VPS:

```bash
cd /opt/healtharchive-backend

./scripts/vps-crawl-status.sh --year 2026 --job-id <JOB_ID> --recent-lines 20000
./scripts/vps-crawl-content-report.py --job-id <JOB_ID>

curl -s http://127.0.0.1:9100/metrics | rg 'healtharchive_crawl_running_job_(temp_dirs_count|container_restarts_done|last_progress_age_seconds|stalled|crawl_rate_ppm|output_dir_ok|output_dir_errno|log_probe_ok|log_probe_errno|state_file_ok|state_parse_ok|new_crawl_phase_count|resume_crawl_count)\{job_id="<JOB_ID>"'

set -a; source /etc/healtharchive/backend.env; set +a
/opt/healtharchive-backend/.venv/bin/ha-backend show-job --id <JOB_ID>
sudo journalctl -u healtharchive-worker.service -n 400 --no-pager
```

If the content report is still expensive on a large live job, keep it bounded:

```bash
timeout 120 ./scripts/vps-crawl-content-report.py \
  --job-id <JOB_ID> \
  --max-log-files 1 \
  --max-log-bytes 262144 \
  --max-warc-files 3
```

Then inspect the job directory directly:

```bash
JOBDIR="/srv/healtharchive/jobs/<source>/<JOB_DIR>"
find "${JOBDIR}" -maxdepth 1 -type d -name '.tmp*' | wc -l
LOG="$(ls -t "${JOBDIR}"/archive_*.combined.log | head -n 1)"

rg -n '"context":"crawlStatus"' "${LOG}" | tail -n 10
rg -n 'Attempting adaptive container restart|Resume Crawl|New Crawl Phase|Navigation timeout|Page load timed out|Transport endpoint is not connected|Permission denied|No space left on device' "${LOG}" | tail -n 200
find "${JOBDIR}" -name '*.warc.gz' -printf '%TY-%Tm-%Td %TT %p\n' 2>/dev/null | sort | tail -n 10
```

Classify the incident:

- **Still progressing:** `crawlStatus.crawled` is moving and recent WARCs are
  still appearing. The alert is an early warning; do not clean up yet.
- **Storage / permission instability:** `output_dir_errno=107`, unreadable
  logs/state, `Permission denied`, or stale-mount symptoms.
- **Restart / timeout thrash:** restarts, resume phases, or repeated timeout
  errors dominate the recent log window.
- **State drift:** DB still says `running`, but there is no active crawl
  container and no recent progress.

## Safety Checks

Before any recovery command:

- If the proposed remediation depends on a repo change, commit it, push it,
  deploy it on the VPS, and verify the live checkout contains that change
  before recovering the job.
- Do not run `ha-backend cleanup-job` against a `running` job.
- For terminal jobs, prefer `cleanup-job --mode temp-nonwarc`. Use legacy
  `--mode temp` only when you intentionally want to discard WARCs/replay data.

## Recovery

### Running job branch

If the job is still `running`, do not delete `.tmp*`.

- If the evidence shows `Errno 107` or stale mount symptoms, follow:
  `docs/operations/playbooks/storage/storagebox-sshfs-stale-mount-recovery.md`
- If the job is no longer making progress, follow:
  `docs/operations/playbooks/crawl/crawl-stalls.md`
- If the restart budget is nearly exhausted, also review:
  `docs/operations/runbooks/crawl-restart-budget-low.md`

This alert is a classifier. The action is usually recovery of the underlying
storage or crawl-thrash issue, not temp-dir deletion.

### Terminal job branch

If the job is `indexed` or `index_failed`, reclaim space safely with
`temp-nonwarc`:

```bash
set -a; source /etc/healtharchive/backend.env; set +a

/opt/healtharchive-backend/.venv/bin/ha-backend cleanup-job --id <JOB_ID> --mode temp-nonwarc --dry-run
/opt/healtharchive-backend/.venv/bin/ha-backend cleanup-job --id <JOB_ID> --mode temp-nonwarc
```

If you intentionally do not need replay retention and want destructive cleanup,
use `--mode temp` only after confirming that is acceptable for the job.

## Verification

For a recovered running job:

- the worker is active and recent `crawlStatus` lines show forward progress
- the per-job metrics no longer show flat progress or storage errors
- temp-dir count stops climbing abnormally fast

For a cleaned terminal job:

- `ha-backend show-job --id <JOB_ID>` shows `cleanupStatus` updated
- the job directory no longer contains the old `.tmp*` directories
- stable WARCs remain under `<output_dir>/warcs/` when `temp-nonwarc` was used

## References

- `docs/operations/playbooks/crawl/crawl-stalls.md`
- `docs/operations/runbooks/crawl-restart-budget-low.md`
- `docs/operations/playbooks/storage/storagebox-sshfs-stale-mount-recovery.md`
- `docs/operations/playbooks/crawl/cleanup-automation.md`
