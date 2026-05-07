# HealthArchive ops roadmap (internal)

This file tracks the current ops roadmap/todo items only. Keep it short and current.

For historical roadmaps and upgrade context, see:

- `docs/planning/README.md` (backend repo)

For the compact handoff view of crawl progress, recent fixes, and pickup
commands, see:

- `docs/operations/current-work-tracker.md`

Keep the two synced copies of this file aligned:

- Backend repo: `docs/operations/healtharchive-ops-roadmap.md`
- Optional local working copy (non-git): if you keep a separate ops checklist outside the repo, keep it in sync with this canonical file.

## Recurring ops (non-IRL, ongoing)

- **Quarterly:** run a restore test and record a public-safe log entry in `/srv/healtharchive/ops/restore-tests/`.
- **Quarterly:** add an adoption signals entry in `/srv/healtharchive/ops/adoption/` (links + aggregates only).
- **Quarterly:** confirm dataset release exists and passes checksum verification (`sha256sum -c SHA256SUMS`).
- **Quarterly:** confirm core timers are enabled and succeeding (recommended: on the VPS run `cd /opt/healtharchive && ./scripts/verify_ops_automation.sh`; then spot-check `journalctl -u <service>`).
- **Quarterly:** docs drift skim: re-read the production runbook + incident response and fix any drift you notice (keep docs matching reality).

## Current status (as of 2026-05-06)

Live facts below come from operator-provided VPS output, not direct assistant
production access.

- 2026 annual campaign status:
  - `hc` job `6` is indexed, search-ready, and research-ready.
    - Indexed pages: `262567`.
    - Backend: `playwright_warc` fallback, labeled through annual-edition
      provenance.
  - `phac` job `7` is indexed, search-ready, and research-ready.
    - Indexed pages: `121940`.
    - Backend: `playwright_warc` fallback, labeled through annual-edition
      provenance.
    - Manual reindex evidence:
      `/srv/healtharchive/ops/manual-runs/phac-reindex-20260429T051607Z.log`
      shows `Indexing for job 7 completed successfully with 121940
      snapshot(s).`, followed by `Indexed: 1`, `Failed: 0`, `Jobs: 7`.
      Completion timestamp in the log: `2026-04-29 14:45:29 UTC`.
  - `cihr` job `8` is indexed, search-ready, and research-ready.
    - Indexed pages: `557972`.
    - Backend: `browsertrix`.
    - Crawler stage: `operator_accepted_warcs_after_zim_build_failure`.
    - Final WARC details: `689` stable WARC files, `689` discovered WARC files,
      stable WARC source, manifest valid, total WARC size `709.83 GB`.
    - Annual edition report:
      `/srv/healtharchive/jobs/editions/cihr/2026/coverage-report.json`
      reported `Status=research_ready`, `Search ready=True`, and
      `Research ready=True`.
- Annual search readiness is restored: `annual-status --year 2026` reports
  `Ready for search: YES`, and production deploy/public-surface verification
  after the search follow-through passed on 2026-05-06.
- Job lock-dir cutover remains complete:
  - `/etc/healtharchive/backend.env` points at
    `/srv/healtharchive/ops/locks/jobs`.
  - API and worker were both restarted during the 2026-04-14 maintenance
    window, so the env change is live in production.
- Annual output-dir mount topology was corrected for 2026 annual output dirs
  on 2026-05-06:
  - jobs `6`, `7`, and `8` were converted during a maintenance window;
  - annual status remained `indexed=3`;
  - replay smoke returned `200` for HC, PHAC, and CIHR.
- Worker/watchdog posture was restored after CIHR indexing:
  - `healtharchive-worker.service` active
  - `healtharchive-crawl-auto-recover.timer` active
  - `/etc/healtharchive/crawl-auto-recover-enabled` present
  - `healtharchive-storage-hotpath-auto-recover.timer` active
- Public-surface verification is no longer blocked by search latency:
  - Deploys through `e9129c4eda31ce8a2b6072454e2ae48f484ecbad` passed the
    production deploy helper, baseline drift check, and public-surface
    verifier.
  - Public verifier now reaches API health/stats/sources/exports/search,
    snapshot detail, raw HTML, replay URL, usage/changes/RSS, frontend English
    and French pages, snapshot pages, and report forwarder checks.
  - Final warm-up timing samples after the search-performance deploys:
    - `q=covid&pageSize=1`: `3.252s`, `5.476s`, `2.487s`, `2.389s`, `1.959s`
    - `q=covid&pageSize=1&view=pages`: `8.959s`, `6.742s`, `4.787s`,
      `4.566s`, `4.285s`
    - `pageSize=1`: `6.793s`, `1.885s`, `3.678s`, `2.339s`, `2.067s`
    - `pageSize=1&source=cihr`: `5.919s`, `2.329s`, `2.502s`, `3.070s`,
      `2.491s`
  - Remaining search work is future DB/index-plan tuning for broad
    `q=...&view=pages` if repeated warm-cache samples exceed the desired
    response target.
- Repo-side WARC-complete/ZIM-finalization recurrence prevention is deployed:
  WARC-complete Browsertrix runs with final crawlStatus `pending=0` and
  discoverable WARCs are eligible for indexing instead of automatically
  starting another resume crawl.
- CIHR failed-URL review is complete:
  - final crawlStatus reported `failed=26`, but the failure increments were
    final retry exhaustion events;
  - 25 page/route URLs already had exact job `8` snapshot coverage;
  - the lone uncovered URL was a render-asset image
    `/images/ipph_launch_may_2024-1.jpg`, accepted as a non-page gap.
- Alerting/report hygiene from the recent crawl work is deployed:
  - bounded content reporting is the preferred operator diagnostic for live
    crawl cost/failure classification.
  - stale historical crawl warnings are reduced; investigate throughput/churn
    trends in Grafana rather than via direct throughput pages.

## Current priority order

Treat the following as the current ops execution order:

1. Optional: investigate broad `q=...&view=pages` DB/index-plan tuning if
   repeated warm-cache samples stay above the desired response target.
2. Routine quarterly ops and evidence collection.

## Current ops tasks (implementation already exists; enable/verify)

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
- Annual output-dir drift checks:
  - Future maintenance should keep using
    `python3 /opt/healtharchive/scripts/vps-annual-output-tiering.py --year <YEAR>`
    as the dry-run detector and the same script with `--apply` during an
    approved maintenance window.
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
  - On the next relevant page-group rebuild, verify that logs show `unknown`
    instead of negative counts when PostgreSQL rowcount is indeterminate.

## IRL / external validation (active; runs in parallel with ops)

External validation work is **not blocked** by crawl recovery or maintenance
window items. HC, PHAC, and CIHR are indexed and research-ready, and the 2026
annual output-dir mount conversion is complete. Outreach and scholarly output
can proceed independently on any day.

The active plan is:

- **`../planning/2026-02-admissions-strengthening-plan.md`** — phases, effort, and sequence for all external/IRL work.

Current status as of 2026-05-06:

- Phase 1 items (outreach, uptime monitoring, portfolio page, ethics/governance update) are **not yet started**.
- The plan was created 2026-02-25; about 10 weeks have elapsed, placing the
  timeline in Phase 3 territory.
- The mentions log remains empty (zero confirmed partners, verifiers, or citations).
- **The single highest-leverage unblocking action is: send the first outreach batch** (5–10 contacts, using existing templates at `../operations/outreach-templates.md` and the playbook at `playbooks/external/outreach-and-verification.md`).

Treat external outreach as a parallel track to daily ops — not something to start "once ops settles." Ops will not fully settle before application deadlines.
