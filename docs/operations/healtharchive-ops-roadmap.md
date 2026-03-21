# HealthArchive ops roadmap (internal)

This file tracks the current ops roadmap/todo items only. Keep it short and current.

For historical roadmaps and upgrade context, see:

- `docs/planning/README.md` (backend repo)

Keep the two synced copies of this file aligned:

- Backend repo: `docs/operations/healtharchive-ops-roadmap.md`
- Optional local working copy (non-git): if you keep a separate ops checklist outside the repo, keep it in sync with this canonical file.

## Recurring ops (non-IRL, ongoing)

- **Quarterly:** run a restore test and record a public-safe log entry in `/srv/healtharchive/ops/restore-tests/`.
- **Quarterly:** add an adoption signals entry in `/srv/healtharchive/ops/adoption/` (links + aggregates only).
- **Quarterly:** confirm dataset release exists and passes checksum verification (`sha256sum -c SHA256SUMS`).
- **Quarterly:** confirm core timers are enabled and succeeding (recommended: on the VPS run `cd /opt/healtharchive-backend && ./scripts/verify_ops_automation.sh`; then spot-check `journalctl -u <service>`).
- **Quarterly:** docs drift skim: re-read the production runbook + incident response and fix any drift you notice (keep docs matching reality).

## Current status (as of 2026-03-21)

- 2026 annual crawl is actively running on the VPS (jobs: `hc`/`phac`/`cihr`; see `./scripts/vps-crawl-status.sh --year 2026`).
- Deploy-lock suppression is cleared (the stale `/tmp/healtharchive-backend-deploy.lock` was removed; auto-recover apply actions are no longer skipped due to deploy lock).
- Job lock-dir cutover is **staged** (non-disruptive) but not fully complete:
  - `/etc/healtharchive/backend.env` now sets `HEALTHARCHIVE_JOB_LOCK_DIR=/srv/healtharchive/ops/locks/jobs`
  - `/srv/healtharchive/ops/locks/jobs` exists with intended perms
  - Maintenance-window restart of services is still required to pick up the env change.
- Annual output-dir mount topology is currently **unexpected** (direct `sshfs` mounts instead of bind mounts) for the active 2026 jobs.
  - We are intentionally deferring conversion to bind mounts until a maintenance window to avoid interrupting in-progress crawls.
- PHAC annual crawl job 7 is currently deferred to a maintenance window after a live HTTP/2 failure loop on `public-health-notices` URLs.
  - Storage and worker health are intact; the current problem is crawler churn on that subtree, not mount instability.
- Alerting noise-reduction tuning is deployed and verified:
  - Alertmanager routing is severity-aware (`critical` keeps resolved notifications, non-critical suppresses resolved and repeats less often).
  - Crawl alerting is now automation-first and dashboard-driven:
    - Crawl-rate/churn notifications were removed (tracked in Grafana instead).
    - `Errno 107` job-level unreadable/writability symptom alerts are split out so storage watchdog alerts are the primary stale-mount signal.
    - Worker-down alerting waits for the worker auto-start watchdog window and suppresses during active deploy locks.
    - Watchdog freshness alerts were added for worker auto-start and crawl auto-recover timers.

## Current ops tasks (implementation already exists; enable/verify)

- Maintenance window: recover and relaunch the stuck 2026 PHAC annual crawl after the current safe-stop point.
  - Context: as of 2026-03-21, job `7` (`phac-20260101`) is a live failure loop, not a storage incident.
  - Observed symptom: `crawled` flat at `267` while `failed` keeps rising on `https://www.canada.ca/en/public-health/services/public-health-notices/...` URLs with repeated `net::ERR_HTTP2_PROTOCOL_ERROR`.
  - Why defer: recovering PHAC still requires stopping `healtharchive-worker.service`, which can interrupt any other active crawl (notably CIHR if still running).
  - During the maintenance window:
    - Stop the worker.
    - Recover PHAC without the extra no-progress guard:
      - `/opt/healtharchive-backend/.venv/bin/ha-backend recover-stale-jobs --older-than-minutes 5 --apply --source phac --limit 1`
    - Reconcile annual tool options so the PHAC retry picks up the current canonical scope/tuning:
      - Dry-run: `/opt/healtharchive-backend/.venv/bin/ha-backend reconcile-annual-tool-options --year 2026 --sources phac`
      - Apply: `/opt/healtharchive-backend/.venv/bin/ha-backend reconcile-annual-tool-options --year 2026 --sources phac --apply`
    - Start the worker and re-check:
      - `./scripts/vps-crawl-status.sh --year 2026 --job-id 7 --recent-lines 20000`
- Post-scope-fix long-window reassessment (2026 annual campaign):
  - Context: HC/PHAC scopeIncludeRx was narrowed on 2026-02-28 to exclude binary-heavy DAM targets from the crawl queue (while still allowing embedded subresource capture).
  - Action: run a 6-24 hour observation window before any further restart decisions.
  - Evaluate: `healtharchive_crawl_running_job_crawl_rate_ppm`, `last_progress_age_seconds`, `stalled`, and recent timeout/binary counts in latest combined logs.
  - Decision gate: if rates remain flat at degraded levels after the long window, run a controlled fresh-phase restart for HC/PHAC (preserve WARCs, reset crawl frontier safely).
- Maintenance window: complete the job lock-dir cutover by restarting services that read `/etc/healtharchive/backend.env`.
  - This must wait until crawls are idle unless you explicitly accept interrupting them.
  - Plan + commands: `../planning/2026-02-06-crawl-operability-locks-and-retry-controls.md` (Phase 4)
- Maintenance window (after 2026 annual crawl is idle): convert annual output dirs from direct `sshfs` mounts to bind mounts.
  - Why defer: unmount/re-mount of a live job output dir can interrupt in-progress crawls; benefit is reduced Errno 107 blast radius,
    but not worth forced interruption mid-campaign.
  - Detection (crawl-safe): `python3 /opt/healtharchive-backend/scripts/vps-annual-output-tiering.py --year 2026`
  - Repair (maintenance only): stop the worker and ensure crawl containers are stopped, then:
    - `sudo python3 /opt/healtharchive-backend/scripts/vps-annual-output-tiering.py --year 2026 --apply --repair-unexpected-mounts --allow-repair-running-jobs`
- After any reboot/rescue/maintenance where mounts may drift:
  - Verify Storage Box mount is active (`healtharchive-storagebox-sshfs.service`).
  - Re-apply annual output tiering for the active campaign year and confirm job output dirs are on Storage Box (see incident: `incidents/2026-02-04-annual-crawl-output-dirs-on-root-disk.md`).
- After deploying new crawl tuning defaults (or if an annual campaign was started before the change):
  - Reconcile already-created annual job configs so retries/restarts adopt the new per-source profiles:
    - Dry-run: `ha-backend reconcile-annual-tool-options --year <YEAR>`
    - Apply: `ha-backend reconcile-annual-tool-options --year <YEAR> --apply`
- Verify the new Docker resource limit environment variables are set appropriately on VPS if defaults need adjustment:
  - `HEALTHARCHIVE_DOCKER_MEMORY_LIMIT` (default: 4g)
  - `HEALTHARCHIVE_DOCKER_CPU_LIMIT` (default: 1.5)
- Post-deploy follow-through (alerting):
  - Review notification volume and alert outcomes after 7 days (firing + resolved counts by alertname/severity).
  - Confirm crawl throughput/churn investigations are being done via Grafana (`HealthArchive - Pipeline Health`) and not missed due to notification removal.
  - Consider a future composite crawl-degradation alert only if dashboard review repeatedly reveals actionable issues that are not otherwise alerted.

## IRL / external validation (pending)

Track external validation/outreach work (partner, verifier, mentions/citations log) in:

- `../planning/roadmap.md`
