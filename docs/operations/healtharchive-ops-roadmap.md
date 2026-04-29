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

## Current status (as of 2026-04-29)

Live facts below come from operator-provided VPS output, not direct assistant
production access.

- Annual-edition convergence is deployed on the VPS at
  `01e3e3f7565cd84d1e00b600b97bc8ac27109909`.
- 2026 annual campaign status:
  - `hc` job `6` is indexed, search-ready, and research-ready.
    - Indexed pages: `262567`.
    - Annual edition captured URL count: `65976`.
    - Backend: `playwright_warc` fallback, labeled through annual-edition
      provenance.
  - `phac` job `7` is indexed, search-ready, and research-ready.
    - Indexed pages: `121940`.
    - Annual edition captured URL count: `20723`.
    - Backend: `playwright_warc` fallback, labeled through annual-edition
      provenance.
    - Manual reindex evidence:
      `/srv/healtharchive/ops/manual-runs/phac-reindex-20260429T051607Z.log`
      shows `Indexing for job 7 completed successfully with 121940
      snapshot(s).`, followed by `Indexed: 1`, `Failed: 0`, `Jobs: 7`.
      Completion timestamp in the log: `2026-04-29 14:45:29 UTC`.
  - `cihr` job `8` is the only remaining active 2026 annual blocker.
    - Latest known `ha-check` at about `2026-04-29T17:06Z` showed the job
      running under Browsertrix with fresh progress: `8526 / 9165`,
      `pending=1`, `failed=0`, and `658` discovered WARC files.
    - Keep monitoring while progress remains fresh; do not interrupt a healthy
      run.
- Annual search is still not globally ready only because `cihr` is not yet
  indexed. HC and PHAC are usable/search-ready.
- Job lock-dir cutover remains complete:
  - `/etc/healtharchive/backend.env` points at
    `/srv/healtharchive/ops/locks/jobs`.
  - API and worker were both restarted during the 2026-04-14 maintenance
    window, so the env change is live in production.
- Annual output-dir mount topology is still unexpected for active 2026 jobs:
  - direct `sshfs` mounts remain in place instead of bind mounts.
  - conversion remains intentionally deferred until a future maintenance window
    after the annual crawl is idle or during an explicitly accepted
    interruption.
- Deploy follow-through for `a3e0dece` remains partially complete in
  production:
  - the API-side changes were deployed and verified on 2026-04-23.
  - the worker restart was intentionally skipped while annual crawls were
    active; the worker-side rowcount/log-formatting fix from `a3e0dece` will
    not be live until the next safe worker restart.
  - the VPS branch `prod-pre-a3e0dece` preserves detached pre-deploy commits
    (`d8e2534e`, `607df02b`, `48cfe3f9`) and should be kept until reviewed.
- Replay + public-surface follow-through from 2026-04-23 remains complete:
  replay ownership, header sanitization, raw snapshot lookup, and public
  surface verification were repaired before the annual-edition deployment.
- Alerting/report hygiene from the recent crawl work is deployed:
  - bounded content reporting is the preferred operator diagnostic for live
    crawl cost/failure classification.
  - stale historical crawl warnings are reduced; investigate throughput/churn
    trends in Grafana rather than via direct throughput pages.

## Current priority order

Treat the following as the current ops execution order:

1. Monitor CIHR at a human-friendly cadence while progress remains fresh.
2. When CIHR completes, index it and regenerate its annual edition report.
3. Restart the worker in the next safe maintenance window after the annual
   crawl is idle (or during an explicitly accepted interruption) so the
   `a3e0dece` worker-side log-formatting fix is actually loaded.
4. Annual output-dir bind-mount conversion during the next acceptable
   maintenance window after the annual crawl is idle.
5. Review and resolve the preserved VPS branch `prod-pre-a3e0dece`.
6. Decide PHAC long-term backend/exclusion policy after reviewing the indexed
   fallback coverage.
7. Routine quarterly ops and evidence collection.

## Current ops tasks (implementation already exists; enable/verify)

- PHAC 2026 salvage/indexing is complete.
  - Job `7` is indexed and its annual edition report is regenerated.
  - Remaining PHAC work is policy/architecture follow-through, not live rescue:
    decide whether future PHAC annual campaigns should remain Browsertrix-first
    with fallback or use a different default posture, and decide whether the
    temporary `public-health-notices` exclusion is still needed after reviewing
    the indexed fallback coverage.
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
  - Current handoff:
    - Check with `ha-check` every few hours or before bed; hourly checks are not
      required while progress remains fresh.
    - If CIHR is still `running` with fresh progress, leave it alone.
    - If CIHR becomes `completed`, run indexing detached and then regenerate the
      report:

      ```bash
      cd /opt/healtharchive
      set -a; source /etc/healtharchive/backend.env; set +a
      mkdir -p /srv/healtharchive/ops/manual-runs
      ts="$(date -u +%Y%m%dT%H%M%SZ)"
      nohup ./.venv/bin/healtharchive reconcile-completed-indexing --source cihr --limit 1 \
        > "/srv/healtharchive/ops/manual-runs/cihr-reindex-${ts}.log" 2>&1 &
      echo "pid=$! log=/srv/healtharchive/ops/manual-runs/cihr-reindex-${ts}.log"
      ```

      After indexing succeeds:

      ```bash
      ./.venv/bin/healtharchive annual-edition-report --source cihr --year 2026 --generate
      ha-check
      ```

    - Intervene only if progress stalls again, restart budget starts climbing,
      or excluded families reappear in the live frontier.
    - Do not treat preserved historical WARCs or consolidated temp-WARC bytes
      as proof that the repaired scope regressed.
- Large indexing hygiene for manual production runs:
  - Always load production env first:
    `cd /opt/healtharchive && set -a; source /etc/healtharchive/backend.env; set +a`.
  - Use `nohup` or `tmux` for multi-hour indexing, capture logs under
    `/srv/healtharchive/ops/manual-runs/`, and consider `renice +10 -p <pid>`.
  - Monitor `ps` plus `/proc/<pid>/io`; an increasing `rchar` with high CPU
    means indexing is still making progress even if DB status has not committed.
  - Do not start duplicate `reconcile-completed-indexing` commands for the same
    source/job.
  - If a client process exits but PostgreSQL shows a long-lived
    `idle in transaction`, confirm the job did not commit and inspect blockers
    before terminating only the stale backend.
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
- After CIHR completes:
  - index CIHR if it is completed but still not indexed
  - verify `annual-status --year 2026` reaches search-ready state only after
    HC, PHAC, and CIHR are all indexed successfully

## IRL / external validation (active; runs in parallel with ops)

External validation work is **not blocked** by the active CIHR monitoring or
the remaining maintenance-window items. HC and PHAC are indexed and
research-ready, CIHR is running on the repaired scope, and the bind-mount
conversion remains deferred to a later maintenance window. Outreach and
scholarly output can proceed independently on any day.

The active plan is:

- **`../planning/2026-02-admissions-strengthening-plan.md`** — phases, effort, and sequence for all external/IRL work.

Current status as of 2026-04-14:

- Phase 1 items (outreach, uptime monitoring, portfolio page, ethics/governance update) are **not yet started**.
- The plan was created 2026-02-25; 4 weeks have elapsed, placing the timeline in Phase 1–2 territory.
- The mentions log remains empty (zero confirmed partners, verifiers, or citations).
- **The single highest-leverage unblocking action is: send the first outreach batch** (5–10 contacts, using existing templates at `../operations/outreach-templates.md` and the playbook at `playbooks/external/outreach-and-verification.md`).

Treat external outreach as a parallel track to daily ops — not something to start "once ops settles." Ops will not fully settle before application deadlines.
