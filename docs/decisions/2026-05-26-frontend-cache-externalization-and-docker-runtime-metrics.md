# Decision: Frontend Cache Externalization and Docker Runtime Metrics (2026-05-26)

Status: accepted

## Context

The 2026-05-23 root-disk incident follow-up found that the live
`healtharchive-frontend` container had accumulated about `22G` under
`/app/.next/cache/fetch-cache` in the Docker writable layer. Clearing that
runtime cache restored root disk headroom, but the same growth pattern could
return unless the deploy and monitoring model changed.

The production frontend remains a direct Docker container on the shared VPS,
behind host Caddy. The deployment helper is the canonical place to encode
container runtime defaults; shared VPS inventory remains in `platform-ops`.

## Decision

- The frontend deploy helper mounts `/app/.next/cache` as a named Docker
  volume by default, using a volume derived from the container name.
- The repo exports Docker runtime metrics through the node_exporter textfile
  collector, including container writable-layer bytes and selected runtime
  cache path sizes.
- A sentinel-gated frontend cache maintenance timer clears
  `/app/.next/cache/fetch-cache` and restarts the frontend only when the cache
  exceeds the configured threshold.

## Rationale

Moving the Next.js runtime cache out of the container writable layer keeps
`docker ps --size` and overlay growth from becoming a silent root-disk risk.
The cache can still grow on the host filesystem, so textfile metrics and a
thresholded maintenance job are needed as a second guardrail. The maintenance
job is sentinel-gated because it may restart the public frontend container.

## Alternatives considered

- Disable the Next.js cache entirely — rejected because there is no stable
  production setting that preserves current behavior while disabling only the
  runtime fetch cache.
- Use tmpfs for `/app/.next/cache` — rejected for now because bounded memory
  pressure could turn cache growth into frontend request failures.
- Keep manual cleanup only — rejected because the incident showed the growth is
  easy to miss until root disk pressure is material.

## Consequences

### Positive

- Frontend writable-layer growth is visible and alertable.
- Runtime cache growth is moved to a named Docker volume and can be pruned by a
  dedicated, tested maintenance script.
- The deployment helper makes the safer cache posture the default for future
  frontend redeploys.

### Negative / risks

- Existing live containers keep their current writable-layer posture until the
  frontend is redeployed with the updated helper.
- The named volume still consumes root disk space; metrics and maintenance
  remain required.
- The maintenance job restarts the frontend when it clears the cache, so it is
  gated by `/etc/healtharchive/frontend-cache-maintenance-enabled`.

## Verification / rollout

- Deploy a pinned repo ref that includes this decision and the updated frontend
  helper.
- Install systemd templates with `sudo ./scripts/vps-install-systemd-units.sh --apply`.
- Enable `healtharchive-docker-runtime-metrics.timer`.
- Redeploy the frontend with `frontend/scripts/deploy-vps-proof.sh`; verify the
  output includes `next_cache_volume=healtharchive-frontend-next-cache`.
- Enable the cache maintenance sentinel and timer after a dry-run:
  `sudo touch /etc/healtharchive/frontend-cache-maintenance-enabled`.
- Verify:
  - `docker inspect healtharchive-frontend` shows a mount at `/app/.next/cache`;
  - `curl -s http://127.0.0.1:9100/metrics | grep '^healtharchive_docker_'`
    returns fresh metrics;
  - public frontend/API health checks still return `200`.

Rollback: redeploy the frontend with `NEXT_CACHE_MOUNT=none` and disable the
cache maintenance timer/sentinel.

## References

- Related incident note:
  `../operations/incidents/2026-05-23-root-disk-full-db-backup-cache.md`
- Related runbook:
  `../operations/disk-baseline-and-cleanup.md`
- Related deployment docs:
  `../deployment/systemd/README.md`
