# Incident: Root disk filled by local DB backup cache (2026-05-23)

Status: resolved

## Metadata

- Date (UTC): 2026-05-23
- Severity: sev1
- Environment: production
- Primary area: storage / database
- Owner: Jeremy Dawson
- Start (UTC): before 2026-05-23T11:36:06Z
- End (UTC): 2026-05-23T12:22:35Z

---

## Summary

The production VPS root filesystem reached 100% usage after nightly PostgreSQL
dumps accumulated under `/srv/healtharchive/backups`. PostgreSQL then failed
temp-file writes and later could not accept application connections while
startup/recovery was blocked by the full filesystem.

Operators copied the local backup cache to the Storage Box, verified file names
and sizes matched, deleted the local root-disk copies, restarted PostgreSQL, and
confirmed the 2026 annual campaign was still search-ready.

## Impact

- User-facing impact:
  - API/search reliability was degraded while PostgreSQL was unavailable.
  - Crawl/search status checks failed until the database recovered.
- Internal impact:
  - `ha-check`, `annual-status`, and `list-jobs` failed with PostgreSQL
    connection errors.
  - Worker was stopped during recovery to avoid DB/crawl churn.
- Data impact:
  - No crawl data loss was observed.
  - Existing 2026 annual indexed state was preserved.
  - Several zero-byte backup files showed failed backup attempts after disk
    pressure began.

## Detection

`ha-check` showed:

- `annual-status` and `list-jobs` failing with PostgreSQL operational errors.
- PostgreSQL reporting `the database system is not yet accepting connections`.
- `/dev/sda1` at `100%` usage.

Follow-up inspection showed:

- `/srv/healtharchive/backups` used about `20G` on root.
- PostgreSQL logs contained repeated `No space left on device` errors for
  `base/pgsql_tmp/...`.

## Root cause

The production backup posture retained too many nightly `pg_dump -Fc` artifacts
under `/srv/healtharchive/backups`, which lives on the root filesystem. This
consumed all remaining root headroom. PostgreSQL temp-file writes then failed,
and the database could not recover cleanly until root space was freed.

## Resolution

Recovery steps completed:

1. Stopped `healtharchive-worker.service`.
2. Copied `/srv/healtharchive/backups/` to
   `/srv/healtharchive/storagebox/root-disk-rescue/backups-20260523/`.
3. Verified local and Storage Box backup file names and sizes matched.
4. Deleted local files under `/srv/healtharchive/backups`.
5. Confirmed root filesystem recovered to `74%` usage with about `20G` free.
6. Restarted `postgresql@16-main`; `pg_lsclusters` reported `online`.
7. Restarted the HealthArchive worker.
8. Confirmed `ha-check` returned `OK: snapshot complete` and
   `annual-status --year 2026 --sources hc phac cihr` reported:
   - `Ready for search: YES`
   - `indexed=3`
   - `errors=0`

## Recurrence prevention

Repo-side follow-up implemented:

- Added repo-managed `scripts/vps-db-backup.sh`.
- Added `healtharchive-db-backup.service` and
  `healtharchive-db-backup.timer` templates.
- Changed the documented backup posture so `/srv/healtharchive/backups` is only
  a short local cache; retained dumps live under
  `/srv/healtharchive/storagebox/backups/db`.
- Added Prometheus alerts for:
  - root filesystem >80% warning
  - root filesystem >88% critical
  - local backup cache >8GiB
  - failed repo-managed DB backup runs

Production follow-up completed:

- Deployed pinned ref `231597f2`.
- Installed updated systemd templates and applied Prometheus alerting.
- Enabled `healtharchive-db-backup.timer`.
- Ran `healtharchive-db-backup.service` successfully at
  `2026-05-23T14:05:05Z`.
- Verified the successful dump was mirrored to
  `/srv/healtharchive/storagebox/backups/db/`.
- Verified backup metrics were exported with
  `healtharchive_db_backup_last_success 1`.
- Confirmed root usage was stable at `77%` after the backup run.
- Confirmed `ha-check` still reported `Ready for search: YES`,
  `indexed=3`, and `OK: snapshot complete`.

## Action items

- [x] Free root disk and restore PostgreSQL.
- [x] Verify annual campaign remains search-ready.
- [x] Add repo-managed backup short-cache flow.
- [x] Add root/backup-cache alert rules.
- [x] Deploy the repo change to production.
- [x] Install/update systemd units and enable the repo-managed backup timer.
- [x] Confirm the next backup writes metrics and keeps
  `/srv/healtharchive/backups` small.
