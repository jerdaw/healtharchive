# Post-Reboot Annual Job Tiering Verification

**Type**: Validation Runbook
**Category**: Operations / Storage Tiering
**Last updated**: 2026-04-17

## Purpose

After a VPS reboot or rescue/maintenance window, verify that annual crawl jobs
are safe to resume:

1. the Storage Box base mount is healthy
2. annual job output dirs are tiered and readable
3. the worker user can write to queued/retryable annual output dirs
4. annual metadata/config drift has not broken tiering/automation assumptions
5. only then should retries or worker restarts happen

**When to use this**: After any reboot, rescue boot, or storage maintenance
during annual campaign season.

## Preconditions

- You are on the VPS.
- Backend checkout is at `/opt/healtharchive`.
- Backend env file is `/etc/healtharchive/backend.env`.
- Prefer a maintenance window with `healtharchive-worker.service` stopped while
  mounts are being repaired.

## 1) Load Env And Capture Read-Only State

```bash
cd /opt/healtharchive
YEAR=2026
HA=/opt/healtharchive/.venv/bin/healtharchive

set -a; source /etc/healtharchive/backend.env; set +a

./scripts/vps-crawl-status.sh --year "$YEAR"
"$HA" annual-status --year "$YEAR"
"$HA" check-db
systemctl status postgresql.service --no-pager -l
```

Expected:

- `check-db` succeeds
- `annual-status` returns normally
- you have a fresh snapshot of job ids, statuses, and output dirs before making
  changes

If `check-db` fails, stop here and fix DB/env first.

## 2) Verify Storage Box Base Mount

```bash
findmnt /srv/healtharchive/storagebox
ls -ld /srv/healtharchive/storagebox
ls /srv/healtharchive/storagebox/jobs >/dev/null
```

Expected:

- `findmnt` shows the Storage Box mount
- directory listing works without `Transport endpoint is not connected`

If this fails, repair the base Storage Box mount before touching any annual job.

## 3) Verify Per-Job Output Dirs

For each annual job you care about:

```bash
JOB_ID=7
"$HA" show-job --id "$JOB_ID"
OUT_DIR="$("$HA" show-job --id "$JOB_ID" | awk -F': +' '/^Output dir:/ {print $2}')"
findmnt -T "$OUT_DIR" -o TARGET,SOURCE,FSTYPE,OPTIONS
ls -ld "$OUT_DIR"
```

Optional worker-user writability probe for queued/retryable annual jobs:

```bash
WORKER_USER="$(systemctl show -p User --value healtharchive-worker.service)"
sudo -u "$WORKER_USER" test -w "$OUT_DIR" && echo "OK: writable" || echo "BAD: not writable"
```

Expected:

- `OUT_DIR` exists and is readable
- `findmnt -T "$OUT_DIR"` shows the path is mounted from the Storage Box tier,
  not left on `/dev/sda1`
- the worker user can write the output dir for queued/retryable jobs

If `ls` or `findmnt` hits `Errno 107`, treat it as stale-mount recovery, not a
retry-budget problem.

## 4) Verify Annual Metadata / Config Drift

Dry-run the annual reconciliation command before restarting the worker:

```bash
"$HA" reconcile-annual-tool-options --year "$YEAR" --sources hc phac cihr
```

Expected:

- `UNCHANGED` for jobs already carrying canonical annual metadata and source
  profiles
- `WOULD UPDATE` if a job is missing annual metadata
  (`campaign_kind/year/date/date_utc/scheduler_version`) or has source-profile
  drift

If reconciliation reports drift, apply it before retrying the job:

```bash
"$HA" reconcile-annual-tool-options --year "$YEAR" --sources hc phac cihr --apply
```

This is the preferred app-local fix for annual metadata/config drift.

## 5) Run Annual Output Tiering Dry-Run

```bash
/opt/healtharchive/.venv/bin/python3 \
  /opt/healtharchive/scripts/vps-annual-output-tiering.py \
  --year "$YEAR"
```

Expected:

- annual jobs show `OK`
- or the script prints a bounded reason such as `STALE`, `WARN ...
  unexpected_mount_type`, or `UNHEALTHY`

If the script reports stale or unexpected mounts, repair them before retrying.

## 6) Repair Tiering / Mounts If Needed

Stop the worker first:

```bash
sudo systemctl stop healtharchive-worker.service
```

Repair stale annual output-dir mounts:

```bash
sudo /opt/healtharchive/.venv/bin/python3 \
  /opt/healtharchive/scripts/vps-annual-output-tiering.py \
  --year "$YEAR" \
  --apply \
  --repair-stale-mounts \
  --allow-repair-running-jobs
```

If the script reported `unexpected_mount_type`, use:

```bash
sudo /opt/healtharchive/.venv/bin/python3 \
  /opt/healtharchive/scripts/vps-annual-output-tiering.py \
  --year "$YEAR" \
  --apply \
  --repair-unexpected-mounts \
  --allow-repair-running-jobs
```

Then re-run steps 3 and 5.

## 7) Only Then Touch Retry State

If the job is `failed` or has exhausted retry budget after storage/config are
healthy:

```bash
"$HA" reset-retry-count --id 7
"$HA" reset-retry-count --id 7 --apply --reason "post-reboot annual recovery"
"$HA" retry-job --id 7
```

Expected:

- dry-run shows the intended retry-count change
- apply sets `retry_count` back to `0`
- `retry-job` moves a `failed` crawl back to `retryable`

Do not reset retries before mount/writability/config checks pass.

## 8) Reset Crawl State Only If Resume State Is The Remaining Problem

Use this only when storage/writability/metadata are already healthy and the job
still shows the known poisoned resume/temp pattern:

- repeated resume churn with no useful progress
- known empty/unprocessable-WARC tail
- stale `.tmp*`, `.archive_state.json`, or `.zimit_resume.yaml`

Dry-run first:

```bash
"$HA" reset-crawl-state --id 7
```

Apply only for a non-running job:

```bash
"$HA" reset-crawl-state --id 7 --apply
```

For current HC/PHAC annual profiles, this should be a fallback tool, not the
first recovery step; their canonical execution policy already prefers fresh-only
runs with automatic poisoned-state reset.

## 9) Restart Worker And Verify Pickup

```bash
sudo systemctl start healtharchive-worker.service
sudo journalctl -u healtharchive-worker.service -n 200 --no-pager
./scripts/vps-crawl-status.sh --year "$YEAR"
```

Expected:

- no root-device guardrail error
- no `Errno 107`/permission-denied output-dir failure
- the intended job moves to `running` or remains cleanly `retryable` with a
  bounded next action

## Common Failure Modes

### Database/env drift

Symptom:

- `healtharchive` commands fail with connection errors or SQLite fallback

Fix:

```bash
set -a; source /etc/healtharchive/backend.env; set +a
"$HA" check-db
```

### Output dir still on root disk

Symptom:

- worker refuses to start an annual job because the output dir is still on
  `/dev/sda1`

Fix:

1. verify Storage Box base mount
2. re-run annual tiering apply
3. confirm `findmnt -T "$OUT_DIR"` points at the Storage Box path

### Stale annual hot path (`Errno 107`)

Symptom:

- `ls`, `findmnt`, or tiering probes hit `Transport endpoint is not connected`

Fix:

1. stop the worker
2. run `vps-annual-output-tiering.py --apply --repair-stale-mounts`
3. re-check the job output dir before retrying

## See Also

- [Production Single VPS Deployment](../../../deployment/production-single-vps.md)
- [Storage Box / sshfs stale mount recovery](../storage/storagebox-sshfs-stale-mount-recovery.md)
- [WARC Storage Tiering](../storage/warc-storage-tiering.md)
