# Decision: DB backup retention and NAS ingest path (2026-05-24)

Status: accepted; current mirror naming superseded by generic cold-archive
configuration

## Context

On 2026-05-23, the production VPS root filesystem reached 100% usage after
nightly PostgreSQL dumps accumulated under `<service-data-root>/backups`.
PostgreSQL temp-file writes failed, API health degraded, and crawl/search
operator checks failed until root space was recovered.

The production host has a bounded root filesystem and a configured cold mirror
for large retained artifacts. The homelab NAS has a protected plain-file
service backup ingest convention under a private NAS ingest root.

## Decision

- Keep only the newest successful PostgreSQL dump in the production host's local root-disk
  cache at `<service-data-root>/backups`.
- Mirror successful dumps to the configured cold mirror directory, using
  `HEALTHARCHIVE_BACKUP_COLD_MIRROR_DIR` or
  `HEALTHARCHIVE_BACKUP_COLD_MIRROR_ROOT`.
- Pull retained DB dumps from the mirror into the NAS protected ingest path
  `<nas-backup-ingest-root>/logical-dumps/`.
- Do not use an unprotected NAS scratch path for HealthArchive DB dumps.
- Publish only value-free cache/cold-archive status through
  `scripts/vps-cache-cold-archive-status.py`; the private operations runbook
  supplies the production output path and must not record NAS topology or
  credentials.
- Treat direct raw WARC reads as a local cache path. If the direct WARC bytes
  are absent from the VPS cache but a replay collection is available, the raw
  snapshot endpoint should redirect to replay instead of exposing local
  filesystem details or depending on a live cold-archive mount.
- Treat replay edition URLs as local-cache availability signals. API resolver
  responses and frontend edition switching should not synthesize replay URLs
  for editions whose replay collection is not locally available.

## Rationale

The root filesystem is too small to hold multiple weeks of custom-format
database dumps safely. A one-dump local cache preserves immediate rollback
convenience while keeping root headroom. The configured cold mirror is the
durable production-host-side copy, and the NAS protected ingest path keeps the
homelab backup convention consistent with other automated service backups.

## Alternatives considered

- Keep 14 days of dumps on root: rejected because it already caused a sev1
  production incident.
- Keep two local dumps by default: rejected after the next scheduled run left
  root above the warning threshold on the 75GB VPS.
- Pull from `<service-data-root>/backups`: rejected because that path is now a
  short cache, not the durable retained set.
- Use an unprotected NAS scratch path: rejected because it is not the NASD
  protected service-backup ingest convention.

## Consequences

### Positive

- Root disk usage remains below warning thresholds after normal backup runs.
- Production-host local cache, mounted remote storage, and NAS backup
  responsibilities are clearly separated.
- The NAS DSM task can stay as a stable launcher while repo-managed defaults
  own source/destination changes.
- Public raw-snapshot behavior can degrade to replay for cached collections
  without requiring all retained WARC bytes to stay on the VPS root filesystem.
- Public replay navigation avoids claiming cold-only editions are immediately
  replayable when the local replay collection is absent.

### Negative / risks

- Operators should not rely on the production host's root cache for older
  restore points.
- Manual deletion of local dumps can make exported backup byte metrics stale
  until the next scheduled backup run.

## Verification / rollout

- `healtharchive-db-backup.service` completed successfully on 2026-05-24.
- Production-host local cache retained one dump after manual pruning.
- The then-configured remote mirror contained the May 23 and May 24 dumps.
- NASD dry-run and real wrapped backup task succeeded after the homelab launcher
  was updated.
- Final host health checks showed `df -h /` at 46%, public API health
  `db: ok`, and `ha-check` ending with `OK: snapshot complete`.

Rollback, if needed: increase `HEALTHARCHIVE_BACKUP_LOCAL_KEEP_SUCCESSFUL` in
`/etc/healtharchive/backend.env`, but only after confirming root headroom and
alert thresholds.

## References

- Related runbook: `../deployment/production-single-vps.md`
- Related disaster recovery doc: `../deployment/disaster-recovery.md`
- Related cleanup doc: `../operations/disk-baseline-and-cleanup.md`
- Related incident: `../operations/incidents/2026-05-23-root-disk-full-db-backup-cache.md`
