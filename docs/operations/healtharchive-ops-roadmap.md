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

## Current status (as of 2026-04-14)

- 2026 annual campaign is still active on the VPS:
  - `hc` is running.
  - `cihr` is running on a new maintenance-window restart that began at
    `2026-04-14T04:00:10Z`.
  - `phac` is failed/parked pending deeper repo-side runtime diagnosis.
- CIHR scope/content-cost follow-through is complete:
  - bounded content reporting on 2026-03-27 and 2026-04-14 showed CIHR-specific
    media-heavy frontier waste (`.mp4`, `asl-video/...`, and HTML query
    variants such as `?wbdisable=false`) rather than a live stall.
  - the 2026-04-14 maintenance window deployed `95f7e06`, reconciled job `8`
    from `scopeType=host` to source-managed custom scope, reset the
    poisoned resume/temp frontier while preserving historical WARCs, and
    allowed auto-recover to restart the job cleanly.
  - live verification on the new combined log confirmed:
    - Browsertrix launched with `--scopeType custom` plus the intended
      include/exclude regexes.
    - the live frontier shrank from roughly `25.6k` URLs to `7.2k`.
    - recent `crawlStatus` entries now show clean depth-3 HTML pages without
      live `wbdisable=false`, `asl-video`, `.mp4`, or `.pdf` frontier churn.
  - preserved historical WARCs still dominate total CIHR bytes; do not treat
    that historical storage footprint as evidence that the new scope failed.
- Job lock-dir cutover is complete:
  - `/etc/healtharchive/backend.env` points at `/srv/healtharchive/ops/locks/jobs`
  - API and worker were both restarted during the 2026-04-14 maintenance
    window, so the env change is now live in production.
- Annual output-dir mount topology is still unexpected for the active 2026 jobs:
  - direct `sshfs` mounts remain in place instead of bind mounts.
  - conversion remains intentionally deferred until a future maintenance window
    after the annual crawl is idle or during an explicitly accepted
    interruption.
- PHAC annual crawl repo-side control-plane fixes remain deployed and verified,
  but the source still needs deeper runtime investigation before another live
  retry.
- Alerting/report hygiene from the recent crawl work is deployed:
  - bounded content reporting is now the preferred operator diagnostic for live
    crawl cost/failure classification.
  - stale historical crawl warnings are reduced; investigate throughput/churn
    trends in Grafana rather than via direct throughput pages.

## Current priority order

Treat the following as the current ops execution order:

1. PHAC repo-side mitigation and verification.
2. Annual output-dir bind-mount conversion during the next acceptable
   maintenance window.
3. Routine quarterly ops and evidence collection.

## Current ops tasks (implementation already exists; enable/verify)

- PHAC follow-up is now deeper repo-side investigation, not another mitigation
  deploy or blind live restart.
  - Current state: job `7` (`phac-20260101`) is failed/parked after the
    controlled 2026-03-23 investigation.
  - Settled findings from the investigation:
    - the earlier HC/PHAC `--extraChromeArgs --disable-http2` CLI passthrough
      was invalid for the deployed zimit image and is no longer the active
      failure mode
    - fresh/new PHAC launches now correctly use a managed Browsertrix config
      file via zimit `--config`
    - resumed PHAC launches now correctly preserve that Browsertrix override by
      merging it into `.zimit_resume.yaml`
    - the backend now auto-detects the known poisoned-resume signature and
      falls back to a new crawl phase with consolidation instead of blindly
      resuming the same queue again
    - despite that corrected plumbing, resumed PHAC attempts still collapse into
      `crawled=0 total=2 failed=2` with empty/unprocessable WARC output
  - Diagnostic update (2026-03-23): the content-cost report plus direct log
    review still point to PHAC HTML/runtime friction rather than broad
    binary/media frontier waste.
    - Across the sampled PHAC combined logs, repeated failures remained
      concentrated under `en/public-health/services` and
      `fr/sante-publique/services`.
    - Concrete repeated pathological targets include the travel-health
      artesunate page pair, the English NACI subtree, the English CCDR subtree,
      and the English Canadian Immunization Guide subtree.
    - Sampled WARC bytes remained dominated by normal pages/render assets rather
      than `.mp4`/dataset/document classes.
  - Next steps:
    - deploy the latest repo changes before the next HC/PHAC retry so
      fresh-only policy, stale-state reset, and bounded fallback promotion are
      all active on the VPS
    - determine whether PHAC still reproduces the same failure from a truly
      fresh phase after resume state is reset automatically
    - diagnose the remaining canada.ca runtime issue only if fresh Browsertrix
      phases still fail before the fallback budget can help
    - revisit the temporary `public-health-notices` exclusion only after the
      deeper PHAC runtime/state issue is understood
  - Do not do further blind PHAC recover/restart attempts from the VPS.
- CIHR follow-through is now monitoring-only, not another planned intervention.
  - Current state: job `8` is running under the source-managed custom scope
    deployed on 2026-04-14.
  - Settled live evidence from the restarted run:
    - the startup log shows `--scopeType custom` with the intended include and
      exclude regexes
    - recent `crawlStatus` lines show clean HTML pages at depth `3`
    - spot checks on the new combined log no longer show live
      `wbdisable=false`, `asl-video`, `.mp4`, or `.pdf` frontier churn beyond
      the startup config lines
  - Next steps:
    - keep monitoring the current CIHR run while progress remains healthy
    - intervene only if progress stalls again, restart budget starts climbing,
      or the excluded families reappear in the live frontier
    - do not treat preserved historical WARCs or consolidated temp-WARC bytes
      as proof that the repaired scope regressed
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

## IRL / external validation (active; runs in parallel with ops)

External validation work is **not blocked** by the PHAC investigation or remaining maintenance-window items. PHAC is parked; the bind-mount conversion is deferred to a later window. Outreach and scholarly output can proceed independently on any day.

The active plan is:

- **`../planning/2026-02-admissions-strengthening-plan.md`** — phases, effort, and sequence for all external/IRL work.

Current status as of 2026-04-14:

- Phase 1 items (outreach, uptime monitoring, portfolio page, ethics/governance update) are **not yet started**.
- The plan was created 2026-02-25; 4 weeks have elapsed, placing the timeline in Phase 1–2 territory.
- The mentions log remains empty (zero confirmed partners, verifiers, or citations).
- **The single highest-leverage unblocking action is: send the first outreach batch** (5–10 contacts, using existing templates at `../operations/outreach-templates.md` and the playbook at `playbooks/external/outreach-and-verification.md`).

Treat external outreach as a parallel track to daily ops — not something to start "once ops settles." Ops will not fully settle before application deadlines.
