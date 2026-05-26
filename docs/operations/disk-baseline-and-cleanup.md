# Disk Baseline and Automated Cleanup

**Last Updated**: 2026-05-24
**VPS**: Hetzner 75GB single-VPS production

## Current Baseline

**Normal operating disk usage**: ~46-55% after the 2026-05-24 cleanup.
**Available space**: ~34-41GB
**Alert thresholds**:
- Root warning: >80% for 30m
- Root critical: >88% for 10m
- Generic filesystem warning: >85% for 30m
- Generic filesystem critical: >92% for 10m
- Local DB backup cache warning: >8GiB for 30m
- Frontend Docker writable-layer warning: >1GiB for 30m
- Frontend Next.js fetch-cache warning: >4GiB for 30m

## Why the baseline changed

The VPS uses a **tiered storage architecture**:
- **Local disk (75GB)**: System, Docker, logs, temp crawl data
- **Storagebox (1TB)**: Final WARCs, ZIMs, large job data via SSHFS mounts

The earlier 74-82% baseline was caused by accumulated local DB dumps, oversized
rotated syslogs, and a large Next.js runtime fetch cache in the live frontend
container. After cleanup, expected root usage is closer to the mid-40% range
with a single local DB dump retained.

## Automated Cleanup

### 1. Docker Cleanup (Weekly)

**Timer**: `docker-cleanup.timer` (weekly)
**Script**: `/usr/local/bin/docker-cleanup.sh`
**Actions**:
```bash
docker image prune -a -f  # Remove unused images
docker system prune -f    # Remove stopped containers, networks
```

**Expected impact**: Frees 2-4GB per week

### 2. Log Rotation

**Journald** (`/etc/systemd/journald.conf`):
- `SystemMaxUse=500M` - Cap journal size
- `SystemKeepFree=2G` - Ensure 2GB always free
- `MaxFileSec=1week` - Rotate weekly

**Docker container logs** (`/etc/docker/daemon.json`):
- `max-size: 10m` - Max 10MB per log file
- `max-file: 3` - Keep 3 rotations (30MB total per container)

**Rsyslog** (`/etc/logrotate.d/rsyslog`):
- Include `su root syslog` inside the log block when `/var/log` is
  `root:syslog` and group-writable. Without it, logrotate skips syslog files
  with an "insecure permissions" warning.

**Expected impact**: Prevents runaway log growth, keeps logs <2GB

### 3. Manual Cleanup Commands

When disk >85%, run these manually:

```bash
# Clean Docker
docker image prune -a -f
docker system prune -f

# Rotate logs
sudo journalctl --vacuum-size=500M

# Truncate large container logs
sudo truncate -s 0 /var/lib/docker/containers/*/CONTAINER-json.log

# Check what's consuming space
sudo du -xsh /* 2>/dev/null | sort -hr | head -10
```

### 4. DB Backup Cache

The repo-managed `healtharchive-db-backup.timer` uses
`scripts/vps-db-backup.sh`. It writes each `pg_dump -Fc` to
`/srv/healtharchive/backups` as a short local cache, mirrors successful dumps
to `/srv/healtharchive/storagebox/backups/db`, then prunes local dumps down to
the newest successful dump on the current 75G VPS.

If `/srv/healtharchive/backups` grows unexpectedly:

```bash
sudo du -sh /srv/healtharchive/backups /srv/healtharchive/storagebox/backups/db
sudo find /srv/healtharchive/backups -maxdepth 1 -type f -printf '%TY-%Tm-%Td %10s %p\n' | sort | tail -40
sudo systemctl status healtharchive-db-backup.service --no-pager
```

Do not keep 14 days of database dumps on the root filesystem. Retained copies
belong on the Storage Box mirror and any external NAS/offsite pull target.

### 5. Frontend Next.js Fetch Cache

The frontend deploy helper mounts `/app/.next/cache` as a named Docker volume
by default. This keeps Next.js runtime cache files out of the Docker writable
layer. The cache still consumes root disk space, so the VPS also has:

- `healtharchive-docker-runtime-metrics.timer` for writable-layer and cache-path
  metrics;
- `healtharchive-frontend-cache-maintenance.timer` for sentinel-gated cleanup
  when `/app/.next/cache/fetch-cache` exceeds the configured threshold.

Verify the live container is using the named cache volume:

```bash
sudo docker inspect healtharchive-frontend \
  --format '{{range .Mounts}}{{println .Type .Name .Destination}}{{end}}' \
  | grep '/app/.next/cache'
```

Inspect metrics:

```bash
curl -s http://127.0.0.1:9100/metrics | grep '^healtharchive_docker_'
curl -s http://127.0.0.1:9100/metrics | grep '^healtharchive_frontend_cache_'
```

If Docker reports a large writable layer for `healtharchive-frontend`, inspect
the Next.js cache and writable-layer metrics before removing anything:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Size}}' | grep healtharchive-frontend
sudo docker exec healtharchive-frontend sh -lc 'du -xhd1 /app/.next/cache 2>/dev/null | sort -h'
```

If `/app/.next/cache/fetch-cache` is the large path, it can be cleared as a
runtime cache:

```bash
sudo docker exec healtharchive-frontend sh -lc 'find /app/.next/cache/fetch-cache -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
sudo docker restart healtharchive-frontend
curl -I https://healtharchive.ca/
curl -i https://api.healtharchive.ca/api/health
```

Prefer the repo-managed maintenance helper when it is present:

```bash
cd /opt/healtharchive
/usr/bin/python3 scripts/vps-frontend-cache-maintenance.py
sudo /usr/bin/python3 scripts/vps-frontend-cache-maintenance.py --apply
```

## Worker Pre-Crawl Disk Check

**Threshold**: 85%
**Behavior**: Worker skips job selection if disk >85%

This prevents starting crawls that would fail mid-flight due to disk pressure.

## Monitoring

**Metrics**: `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`
**Dashboard**: Grafana "HealthArchive - Infrastructure"
**Status command**: `healtharchive status` (shows disk usage with color coding)

## Troubleshooting

### Disk >85% Sustained

1. Check Docker images: `docker system df`
2. Check logs: `sudo du -sh /var/log`
3. Check local backup cache: `sudo du -sh /srv/healtharchive/backups`
4. Check frontend Docker runtime/cache metrics:
   `curl -s http://127.0.0.1:9100/metrics | grep '^healtharchive_docker_'`
5. Check temp crawl dirs: `du -xsh /srv/healtharchive/jobs/*/`
6. Run manual cleanup (see above)

### Disk >92% (Critical)

1. **Stop active crawls** if necessary: `docker ps` → `docker stop <id>`
2. Run all cleanup commands
3. Consider truncating container logs
4. If still critical, investigate filesystem accounting with `sudo du -xsh /`

### False Alarm: du Reports >100GB

If `du -sh /srv/healtharchive/jobs/*` reports huge sizes (>100GB), it's traversing SSHFS mounts and reporting remote storagebox data.

**Fix**: Use `du -xsh` to stay on local filesystem only:
```bash
sudo du -xsh /srv/healtharchive/jobs/*
```

Or just use `df -h /` for filesystem truth.

## History

- **2026-02-01**: Established 82% baseline after Docker/log cleanup freed 5.4GB
- **2026-01-31**: Disk pressure incident (89% → cleanup → 82%)
- **2026-01-24**: Automated tiering for annual jobs deployed
- **2026-05-23**: Root reached 100% after local DB dumps accumulated under
  `/srv/healtharchive/backups`; moved retained dumps to Storage Box and added
  repo-managed short-cache backup flow plus root/backup-cache alerts.
- **2026-05-24**: Confirmed scheduled backup and NASD pull, set local DB dump
  retention to one successful dump, fixed rsyslog logrotate `su root syslog`,
  and cleared a 22GB frontend Next.js fetch cache. Root recovered to 46%.
- **2026-05-26**: Added frontend cache externalization in the Docker deploy
  helper, Docker runtime/cache textfile metrics, alerts, and a sentinel-gated
  frontend cache maintenance timer.
