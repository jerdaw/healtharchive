# Crawl Operability - Locks, Writability, and Retry Controls (Implemented 2026-04-14)

**Status:** Implemented | **Scope:** Hardened job locking, annual output-dir health visibility, and retry-budget recovery UX in repo, then completed the production lock-dir cutover during the 2026-04-14 maintenance window.

## Outcomes

- Job locks no longer force `/tmp`-style `1777` semantics on dedicated lock directories; production now uses `HEALTHARCHIVE_JOB_LOCK_DIR=/srv/healtharchive/ops/locks/jobs`.
- Added annual queued/retryable output-dir writability probes to `scripts/vps-crawl-metrics-textfile.py`, plus `HealthArchiveAnnualOutputDirNotWritable` alert coverage.
- Added audited `ha-backend reset-retry-count` CLI support for operator-safe retry-budget resets.
- Added `scripts/vps-job-lock-dir-cutover.sh` and systemd deployment guidance for staged rollout and rollback.
- Completed the production lock-dir cutover on 2026-04-14 by restarting the API and worker with `/etc/healtharchive/backend.env` already pointing at `/srv/healtharchive/ops/locks/jobs`.

## Canonical Docs Updated

- `docs/deployment/systemd/README.md`
- `docs/reference/cli-commands.md`
- `docs/operations/monitoring-and-alerting.md`
- `docs/operations/thresholds-and-tuning.md`
- `docs/operations/healtharchive-ops-roadmap.md`

## Historical Context

Full implementation detail is preserved in git history. The remaining storage mount-topology work lives in `../2026-02-06-hotpath-staleness-root-cause-investigation.md`; this plan's lock-dir cutover is complete.
