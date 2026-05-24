# Decision: DB backup retention and NAS ingest path (2026-05-24)

Status: accepted

## Context

On 2026-05-23, the production VPS root filesystem reached 100% usage after
nightly PostgreSQL dumps accumulated under `/srv/healtharchive/backups`.
PostgreSQL temp-file writes failed, API health degraded, and crawl/search
operator checks failed until root space was recovered.

The production VPS has a 75GB root filesystem and a mounted Storage Box for
large retained artifacts. The homelab NAS has a protected plain-file service
backup ingest convention under `/volume1/automated-backup-ingest/...`.

## Decision

- Keep only the newest successful PostgreSQL dump in the VPS local root-disk
  cache at `/srv/healtharchive/backups`.
- Mirror successful dumps to the VPS-mounted Storage Box path
  `/srv/healtharchive/storagebox/backups/db/`.
- Pull retained DB dumps from the Storage Box mirror into the NAS protected
  ingest path
  `/volume1/automated-backup-ingest/service-backups/healtharchive/logical-dumps/`.
- Do not use `/volume1/nobak/healtharchive/backups/db/` for HealthArchive DB
  dumps.

## Rationale

The root filesystem is too small to hold multiple weeks of custom-format
database dumps safely. A one-dump local cache preserves immediate rollback
convenience while keeping root headroom. Storage Box is the durable VPS-side
mirror, and the NAS protected ingest path keeps the homelab backup convention
consistent with other automated service backups.

## Alternatives considered

- Keep 14 days of dumps on root: rejected because it already caused a sev1
  production incident.
- Keep two local dumps by default: rejected after the next scheduled run left
  root above the warning threshold on the 75GB VPS.
- Pull from `/srv/healtharchive/backups`: rejected because that path is now a
  short cache, not the durable retained set.
- Use `/volume1/nobak/...` on the NAS: rejected because it is not the NASD
  protected service-backup ingest convention.

## Consequences

### Positive

- Root disk usage remains below warning thresholds after normal backup runs.
- VPS, Storage Box, and NAS backup responsibilities are clearly separated.
- The NAS DSM task can stay as a stable launcher while repo-managed defaults
  own source/destination changes.

### Negative / risks

- Operators should not rely on the VPS root cache for older restore points.
- Manual deletion of local dumps can make exported backup byte metrics stale
  until the next scheduled backup run.

## Verification / rollout

- `healtharchive-db-backup.service` completed successfully on 2026-05-24.
- VPS local cache retained one dump after manual pruning.
- Storage Box contained the May 23 and May 24 dumps.
- NASD dry-run and real wrapped backup task succeeded after the homelab launcher
  was updated.
- Final VPS health checks showed `df -h /` at 46%, public API health `db: ok`,
  and `ha-check` ending with `OK: snapshot complete`.

Rollback, if needed: increase `HEALTHARCHIVE_BACKUP_LOCAL_KEEP_SUCCESSFUL` in
`/etc/healtharchive/backend.env`, but only after confirming root headroom and
alert thresholds.

## References

- Related runbook: `../deployment/production-single-vps.md`
- Related disaster recovery doc: `../deployment/disaster-recovery.md`
- Related cleanup doc: `../operations/disk-baseline-and-cleanup.md`
- Related incident: `../operations/incidents/2026-05-23-root-disk-full-db-backup-cache.md`
