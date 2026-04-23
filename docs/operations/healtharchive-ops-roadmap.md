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
- **Quarterly:** confirm core timers are enabled and succeeding (recommended: on the VPS run `cd /opt/healtharchive && ./scripts/verify_ops_automation.sh`; then spot-check `journalctl -u <service>`).
- **Quarterly:** docs drift skim: re-read the production runbook + incident response and fix any drift you notice (keep docs matching reality).

## Current status (as of 2026-04-23)

- 2026 annual campaign is still active on the VPS:
  - `hc` completed successfully after the rescue-policy rollout, had its hot
    path rebound to the Storage Box tier on 2026-04-22, and was indexed
    successfully on 2026-04-23.
    - Current operator state is now `search-ready` with `262567` indexed pages.
  - `phac` is still running on the 2026-04-20 fallback recovery path.
    - The immediate post-reboot problem was storage-tier drift: job `7` landed
      on an unwritable local hot-path placeholder instead of the Storage Box
      tier, so `.archive_state.json` writes failed.
    - After tiering/writability were restored, fresh Browsertrix still failed
      both PHAC seed documents with `net::ERR_HTTP2_PROTOCOL_ERROR`.
    - Production `healtharchive probe-browser-fetch` confirmed that the pinned
      `playwright_warc` runtime could fetch both PHAC seeds with `200`.
    - The repo-side fallback-WARC numbering fix was deployed before the retry,
      so the fallback backend now appends new stable WARCs instead of
      overwriting `warc-000001.warc.gz` on reruns.
    - Live verification on 2026-04-23 still shows healthy fallback progress
      under `playwright_warc` (`crawled=30303`, `pending=11730`, `failed=2`,
      no recent timeouts).
  - `cihr` is still running on the 2026-04-14 scoped restart.
    - the 2026-04-14 maintenance window deployed `95f7e06`, reconciled job `8`
      from `scopeType=host` to source-managed custom scope, reset the poisoned
      resume/temp frontier while preserving historical WARCs, and allowed
      auto-recover to restart the job cleanly.
    - live verification on 2026-04-23 still shows progress under Browsertrix
      (`stalled=0`, crawl-rate metrics advancing, progress resets after
      occasional timeout noise).
    - preserved historical WARCs still dominate total CIHR bytes; do not treat
      that historical storage footprint as evidence that the new scope failed.
- Job lock-dir cutover remains complete:
  - `/etc/healtharchive/backend.env` points at `/srv/healtharchive/ops/locks/jobs`
  - API and worker were both restarted during the 2026-04-14 maintenance
    window, so the env change is live in production.
- Annual output-dir mount topology is still unexpected for the active 2026 jobs:
  - direct `sshfs` mounts remain in place instead of bind mounts.
  - conversion remains intentionally deferred until a future maintenance window
    after the annual crawl is idle or during an explicitly accepted
    interruption.
- Rescue observability follow-through is implemented in repo and is now the
  normal operator path:
  - `healtharchive list-jobs` surfaces effective backend plus compact rescue
    state.
  - `healtharchive show-job` surfaces
    primary/configured/effective backend plus fallback/promotion details.
  - `healtharchive annual-status` acts as the compact annual rescue summary
    surface, including backend/rescue/operator-state summaries.
  - crawl textfile metrics expose backend/fallback rescue state.
- Deploy follow-through for `a3e0dece` is partially complete in production:
  - the 2026-04-23 deploy updated the VPS checkout to `a3e0dece`, applied the
    `HealthArchiveIndexingNotStarted` alert semantics change, restarted the API
    cleanly, and passed baseline drift verification.
  - the worker restart was intentionally skipped because PHAC and CIHR are
    still running; the worker-side rowcount/log-formatting fix from
    `a3e0dece` will not be live until the next safe worker restart.
  - `./scripts/verify_public_surface.py --timeout-seconds 60` now passes API,
    frontend, and raw-snapshot checks but still fails one replay browse URL for
    indexed HC snapshot `395971` with `404` on
    `https://replay.healtharchive.ca/job-6/...`.
  - replay diagnosis is now concrete:
    - `healtharchive replay-reconcile --job-id 6` reports
      `missing_index,missing_warc_links`
    - `--apply` as `haadmin` fails with `Permission denied` creating WARC links
      under `/srv/healtharchive/replay/collections/job-6/archive`
    - the deployed `healtharchive-replay-reconcile.service` template currently
      runs as `haadmin`, so new collections are not self-healing under the
      current `hareplay:healtharchive` replay-volume ownership model
  - the VPS branch `prod-pre-a3e0dece` now preserves the detached pre-deploy
    commit chain (`d8e2534e`, `607df02b`, `48cfe3f9`) and should be kept until
    those commits are reviewed and either cherry-picked or explicitly retired.
- Deploy follow-through for `c9600341` is now partially complete in production:
  - the 2026-04-23 deploy updated the VPS checkout to `c9600341`, restarted the
    API cleanly, and installed the replay-reconcile systemd template change so
    future automation no longer runs as `haadmin`.
  - HC replay indexing for `job-6` was repaired manually as root after the old
    reconcile ownership mismatch blocked WARC-link creation.
  - the API-side replay-readiness guard is live, but it does not suppress HC
    `browseUrl` anymore because `job-6` now has a real replay collection.
  - the remaining replay failure is no longer missing collection state:
    - direct pywb logs show `GET` and `HEAD` for the exact failing HC replay URL
      returning `200`
    - Caddy still returns `502` for the public replay URL because the upstream
      replay response contains a malformed MIME header line beginning with
      `AWSALBCORS=...`
    - Caddy logs the concrete parser failure as
      `net/http: HTTP/1.x transport connection broken: malformed MIME header line`
    - this is now a replay header-sanitization / proxy-compatibility bug, not a
      replay indexing bug
- Alerting/report hygiene from the recent crawl work is deployed:
  - bounded content reporting is now the preferred operator diagnostic for live
    crawl cost/failure classification.
  - stale historical crawl warnings are reduced; investigate throughput/churn
    trends in Grafana rather than via direct throughput pages.

## Current priority order

Treat the following as the current ops execution order:

1. Fix the remaining HC replay `502` by sanitizing malformed archived replay
   headers (currently an `AWSALBCORS` cookie line that Caddy cannot parse) so
   public replay works through `replay.healtharchive.ca`.
2. Monitor PHAC and CIHR to completion, then index the completed annual jobs.
3. Restart the worker in the next safe maintenance window after the annual
   crawl is idle (or during an explicitly accepted interruption) so the
   `a3e0dece` worker-side log-formatting fix is actually loaded.
4. Annual output-dir bind-mount conversion during the next acceptable
   maintenance window after the annual crawl is idle.
5. Routine quarterly ops and evidence collection.

## Current ops tasks (implementation already exists; enable/verify)

- PHAC follow-up is now monitoring and post-run indexing, not another blind
  intervention.
  - Current state: job `7` (`phac-20260101`) is running under
    `playwright_warc` after the 2026-04-20 recovery.
  - Settled live evidence:
    - the post-reboot storage-tier drift was repaired and worker writability was
      restored before the retry
    - fresh Browsertrix still failed the PHAC seeds with
      `net::ERR_HTTP2_PROTOCOL_ERROR`
    - `healtharchive probe-browser-fetch` succeeded for both PHAC seed pages
    - the fallback-WARC numbering fix was deployed on the VPS before the retry
    - the active PHAC combined log is now `archive_playwright_warc_capture_...`
      and shows sustained progress with `failed=0`
  - Next steps:
    - keep monitoring the current PHAC run while progress remains healthy
    - when PHAC completes, run `healtharchive index-job --id 7`
    - if PHAC fails instead of completing, inspect the final PHAC combined log
      before changing backend/state again
    - after the 2026 annual campaign is idle, decide whether PHAC should remain
      Browsertrix-first in future runs or move to a different default strategy
  - Do not manually restart or re-patch PHAC again while the current fallback
    run is healthy.
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
- HC annual indexing follow-through is complete, but replay follow-through is
  not.
  - Current state: job `6` (`hc-20260101`) is `indexed` and `search-ready`
    with `262567` indexed pages after the 2026-04-22 hot-path remount and the
    2026-04-23 indexing run.
  - Settled live evidence:
    - `findmnt -T /srv/healtharchive/jobs/hc/20260101T000502Z__hc-20260101`
      points at the Storage Box-backed HC path
    - `healtharchive show-job --id 6` reports `Status: indexed`
    - `healtharchive annual-status --year 2026` shows HC as
      `operator_state=search-ready`
  - Remaining follow-through:
    - diagnose why `verify_public_surface.py --timeout-seconds 60` still gets
      `404` for the HC replay browse URL while raw snapshot fetch succeeds
    - rerun public-surface verification after the replay issue is fixed
- Replay follow-up is now the main post-deploy gap.
  - Current state: the public-surface verifier passes API health/stats,
    sources, exports, search, raw snapshot fetch, usage, changes, frontend
    pages, and the frontend report forwarder, but fails replay on
    `https://replay.healtharchive.ca/job-6/20260414224554/...#ha_snapshot=395971`.
  - Next steps:
    - treat replay indexing / missing-collection work for HC job `6` as done:
      `replay-reconcile --apply --job-id 6` completed successfully after a
      root-run repair
    - treat the remaining failure as a public replay proxy bug:
      pywb serves the exact HC page with `200`, but Caddy returns `502` because
      the replay response contains a malformed archived cookie header line
      (`AWSALBCORS=...`) that Go's HTTP parser rejects
    - inspect and fix replay-header sanitization at the pywb/Caddy boundary;
      do not spend more time on replay indexing for HC `6`
    - rerun `./scripts/verify_public_surface.py --timeout-seconds 60` after the
      replay fix and record the result
- Preserve and review the pre-deploy production-only branch.
  - Current state: `prod-pre-a3e0dece` exists on the VPS and preserves the
    detached pre-deploy commits that would otherwise have been left unreachable
    by the 2026-04-23 deploy.
  - Next steps:
    - compare `prod-pre-a3e0dece` against `main`
    - decide whether each preserved commit needs cherry-pick, replacement, or
      explicit retirement
    - do not delete the branch until that review is documented
- Maintenance window (after 2026 annual crawl is idle): convert annual output dirs from direct `sshfs` mounts to bind mounts.
  - Why defer: unmount/re-mount of a live job output dir can interrupt in-progress crawls; benefit is reduced Errno 107 blast radius,
    but not worth forced interruption mid-campaign.
  - Detection (crawl-safe): `python3 /opt/healtharchive/scripts/vps-annual-output-tiering.py --year 2026`
  - Repair (maintenance only): stop the worker and ensure crawl containers are stopped, then:
    - `sudo python3 /opt/healtharchive/scripts/vps-annual-output-tiering.py --year 2026 --apply --repair-unexpected-mounts --allow-repair-running-jobs`
- After any reboot/rescue/maintenance where mounts may drift:
  - Verify Storage Box mount is active (`healtharchive-storagebox-sshfs.service`).
  - Re-apply annual output tiering for the active campaign year and confirm job output dirs are on Storage Box (see incident: `incidents/2026-02-04-annual-crawl-output-dirs-on-root-disk.md`).
- After deploying new crawl tuning defaults (or if an annual campaign was started before the change):
  - Reconcile already-created annual job configs so retries/restarts adopt the new per-source profiles:
    - Dry-run: `healtharchive reconcile-annual-tool-options --year <YEAR>`
    - Apply: `healtharchive reconcile-annual-tool-options --year <YEAR> --apply`
- Verify the new Docker resource limit environment variables are set appropriately on VPS if defaults need adjustment:
  - `HEALTHARCHIVE_DOCKER_MEMORY_LIMIT` (default: 4g)
  - `HEALTHARCHIVE_DOCKER_CPU_LIMIT` (default: 1.5)
- Post-deploy follow-through (alerting):
  - Review notification volume and alert outcomes after 7 days (firing + resolved counts by alertname/severity).
  - Confirm crawl throughput/churn investigations are being done via Grafana (`HealthArchive - Pipeline Health`) and not missed due to notification removal.
  - Consider a future composite crawl-degradation alert only if dashboard review repeatedly reveals actionable issues that are not otherwise alerted.
  - After the next safe worker restart, verify that page-group rebuild logs now
    show `unknown` instead of negative counts when PostgreSQL rowcount is
    indeterminate.
- After PHAC and CIHR complete:
  - index completed annual jobs that are still `awaiting-index`
  - verify `annual-status --year 2026` reaches search-ready state only after
    HC, PHAC, and CIHR are all indexed successfully

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
