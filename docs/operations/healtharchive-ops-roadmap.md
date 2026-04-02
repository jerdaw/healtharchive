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

## Current status (as of 2026-03-27)

- 2026 annual campaign is partially active on the VPS:
  - `cihr` remains running.
  - `hc` is still in a failed state from earlier annual-campaign churn.
  - `phac` is parked as `retryable` after the 2026-03-23 investigation and controlled restart attempt.
- CIHR annual crawl job `8` was re-checked live on 2026-03-27 after repeated
  `HealthArchiveCrawlTempDirsHigh` warnings.
  - Current live-health result: the crawl is still progressing (`crawl_rate_ppm`
    roughly `3-4`, `stalled=0`, progress age low, `container_restarts_done=15`).
  - The temp-dir warning is currently interpreted as historical accumulation in
    the long-lived annual job directory rather than fresh active churn.
  - Bounded content-cost sampling now points to a CIHR-specific
    media-heavy frontier problem:
    - sampled bytes were dominated by `.mp4`
    - top sampled families were CIHR `asl-video/...` assets
  - Operational posture: do not interrupt the current CIHR crawl solely due to
    temp-dir count while forward progress continues.
  - Follow-up remains repo-side scope analysis after the crawl is idle/terminal,
    not live VPS cleanup.
- Deploy-lock suppression is cleared (the stale `/tmp/healtharchive-backend-deploy.lock` was removed; auto-recover apply actions are no longer skipped due to deploy lock).
- Job lock-dir cutover is **staged** (non-disruptive) but not fully complete:
  - `/etc/healtharchive/backend.env` now sets `HEALTHARCHIVE_JOB_LOCK_DIR=/srv/healtharchive/ops/locks/jobs`
  - `/srv/healtharchive/ops/locks/jobs` exists with intended perms
  - Maintenance-window restart of services is still required to pick up the env change.
- Annual output-dir mount topology is currently **unexpected** (direct `sshfs` mounts instead of bind mounts) for the active 2026 jobs.
  - We are intentionally deferring conversion to bind mounts until a maintenance window to avoid interrupting in-progress crawls.
- PHAC annual crawl job 7 is no longer blocked on deploy/config drift or on the
  earlier Browsertrix-flag plumbing bug.
  - The scope reconciliation fix and the temporary PHAC HTML-family exclusions
    were both deployed and verified in the live PHAC process on 2026-03-23.
  - The incompatible HC/PHAC CLI passthrough (`--extraChromeArgs
    --disable-http2`) was removed from canonical annual config and live annual
    jobs after the deployed zimit image proved it forwarded those flags into
    `warc2zim` preflight.
  - Repo-side monitor hardening now exists for one part of the symptom: stages
    that emit no `crawlStatus` for a full stall window now trigger an explicit
    `no_stats` intervention instead of silently hanging.
  - Repo-side managed Browsertrix-config support is deployed and verified for
    both fresh/new and resumed HC/PHAC runs:
    - fresh/new phases launch via zimit `--config /output/.browsertrix_managed_config.yaml`
    - resumed phases now carry the same Browsertrix overrides through the
      stable `.zimit_resume.yaml`
  - Repo-side poisoned-resume fallback now exists for managed-browsertrix jobs:
    if the newest resumed run ended with `crawled=0 total=2 failed=2` plus the
    empty/unprocessable-WARC tail error, `archive_tool` skips that resume queue
    and starts a new crawl phase with consolidation instead of looping back
    into the same poisoned resume state.
  - That fallback no longer depends on the newest `crawlStatus` line being
    well-formed; malformed or empty trailing stats now fall back to the most
    recent usable stats entry, and the empty-WARC tail signature alone is
    enough to force a fresh crawl phase for managed-browsertrix jobs.
  - Empirical result after those fixes: PHAC still does not make useful forward
    progress. Resumed PHAC attempts can start cleanly, then end immediately with
    `crawled=0 total=2 failed=2` and an effectively empty/unprocessable WARC.
  - PHAC is currently parked as `retryable` with the worker stopped rather than
    allowing continued blind retries against the same unresolved state/runtime
    problem.
- Alerting noise-reduction tuning is deployed and verified:
  - Alertmanager routing is severity-aware (`critical` keeps resolved notifications, non-critical suppresses resolved and repeats less often).
  - Crawl alerting is now automation-first and dashboard-driven:
    - Crawl-rate/churn notifications were removed (tracked in Grafana instead).
    - `Errno 107` job-level unreadable/writability symptom alerts are split out so storage watchdog alerts are the primary stale-mount signal.
    - Worker-down alerting waits for the worker auto-start watchdog window and suppresses during active deploy locks.
    - Watchdog freshness alerts were added for worker auto-start and crawl auto-recover timers.

## Current priority order

Treat the following as the current ops execution order:

1. PHAC repo-side mitigation and verification.
2. Job lock-dir cutover during a safe maintenance window.
3. CIHR repo-side scope follow-through after the current crawl is idle.
4. Annual output-dir bind-mount conversion after the 2026 annual crawl is idle.
5. Routine quarterly ops and evidence collection.

## Current ops tasks (implementation already exists; enable/verify)

- PHAC follow-up is now deeper repo-side investigation, not another mitigation
  deploy or blind live restart.
  - Current state: job `7` (`phac-20260101`) is parked as `retryable` after a
    controlled 2026-03-23 investigation with the worker stopped.
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
    - redeploy before the next HC/PHAC retry so the poisoned-resume fallback is
      active on the VPS
    - determine whether PHAC still reproduces the same empty-WARC failure from
      a truly fresh crawl phase after the new fallback skips the poisoned queue
    - diagnose the remaining canada.ca runtime/state issue if fresh phases also
      fail to make useful progress
    - revisit the temporary `public-health-notices` exclusion only after the
      deeper PHAC runtime/state issue is understood
  - Do not do further blind PHAC recover/restart attempts from the VPS.
- CIHR follow-up is evidence-backed scope analysis, not live intervention.
  - Current state: job `8` remains healthy enough to keep running; temp-dir
    accumulation alone is not the reason to interrupt it.
  - Settled evidence from the 2026-03-27 bounded content report:
    - sampled WARC bytes were dominated by CIHR-hosted `.mp4` media
    - the heaviest sampled families were `cihr-irsc.gc.ca/asl-video/...`
    - the live job did not show timeout or storage-failure signatures during
      the investigation window
  - Next steps:
    - let the current CIHR crawl continue while progress remains healthy
    - after the crawl is idle/terminal, decide whether CIHR should gain
      source-managed frontier exclusions for media/document/query-heavy paths
    - do not do live cleanup of `.tmp*` for job `8` while it remains running
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

## IRL / external validation (active; runs in parallel with ops)

External validation work is **not blocked** by the PHAC investigation or maintenance-window items. PHAC is parked; the lock-dir cutover and bind-mount conversion are deferred to maintenance windows. Outreach and scholarly output can proceed independently on any day.

The active plan is:

- **`../planning/2026-02-admissions-strengthening-plan.md`** — phases, effort, and sequence for all external/IRL work.

Current status as of 2026-03-25:

- Phase 1 items (outreach, uptime monitoring, portfolio page, ethics/governance update) are **not yet started**.
- The plan was created 2026-02-25; 4 weeks have elapsed, placing the timeline in Phase 1–2 territory.
- The mentions log remains empty (zero confirmed partners, verifiers, or citations).
- **The single highest-leverage unblocking action is: send the first outreach batch** (5–10 contacts, using existing templates at `../operations/outreach-templates.md` and the playbook at `playbooks/external/outreach-and-verification.md`).

Treat external outreach as a parallel track to daily ops — not something to start "once ops settles." Ops will not fully settle before application deadlines.
