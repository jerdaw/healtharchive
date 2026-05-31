# Roadmaps

## Current backlog

- Future roadmap (what is *not* implemented yet): `roadmap.md`

## Implementation plans (active)

Implementation plans live directly under `docs/planning/` while they are active.
When complete, move them to `docs/planning/implemented/` and date them.

Active plans:

- Admissions strengthening (OMSAS ABS + CanMEDS, ~12 weeks): `2026-02-admissions-strengthening-plan.md`
- Hot-path staleness root-cause investigation: `2026-02-06-hotpath-staleness-root-cause-investigation.md`

## Current priority sequence

Treat the following as the current "what's next" order across roadmap docs:

1. After the crawl/ops path is stabilized, the main project emphasis is the
   active admissions-strengthening plan.
   - That plan is the canonical home for the next external-validation,
     methods-paper, and dataset-release work.
   - Canonical plan: `2026-02-admissions-strengthening-plan.md`
2. Optional broad `q=...&view=pages` DB/index-plan tuning remains a future
   backend/search backlog item if repeated warm-cache samples exceed the
   desired response target.
   - Canonical tracker: `../operations/healtharchive-ops-roadmap.md`
3. Any docs-site migration planning should use the archived prep inventory as
   the starting point, but the actual generator swap remains a separate change
   series.
   - Canonical reference:
     `implemented/2026-04-15-zensical-migration-prep.md`

## Operator Follow-Through (Maintenance Window)

Some plans are "implemented in repo" but still require a short, operator-run maintenance step on the VPS.

Current known items: none.

Recently closed items:

- API DB pool exhaustion recurrence prevention:
  - Current state: completed. API request-scoped database sessions are closed
    promptly, export responses no longer stream from live DB iterators, the
    production database role has a 60-second idle transaction timeout, and
    Prometheus alerts on excessive idle transactions.
  - Incident:
    `../operations/incidents/2026-05-29-api-db-pool-exhaustion.md`
  - Deployed ref: `b4975c4f4986eca7da382618076f1f609e10fbef`
- 2026 annual campaign closeout:
  - Current state: completed. The campaign is search-ready for HC, PHAC, and
    CIHR with a durable closeout report and campaign-level closeout SOP.
  - Report: `../operations/reports/2026-annual-campaign-closeout.md`
  - Playbook: `../operations/playbooks/crawl/annual-campaign-closeout.md`
- CIHR scope/content-cost follow-through:
  - Current state: completed. Job `8` was manually accepted after a ZIM
    finalization failure, indexed successfully with `557972` pages, and
    reviewed for failed-URL coverage.
  - No targeted follow-up capture is needed for this incident.
  - Historical plans:
    - `implemented/2026-03-23-annual-crawl-content-cost-and-scope-diagnosis.md`
    - `implemented/2026-05-05-public-search-and-cihr-followthrough.md`
- PHAC annual-crawl policy follow-up after the 2026-03-23 canada.ca incident:
  - Current state: job `7` indexed successfully on 2026-04-29 through the
    labeled `playwright_warc` fallback path, and the PHAC annual edition report
    is research-ready.
  - Policy decision: keep PHAC Browsertrix-first with labeled
    `playwright_warc` fallback for now, and keep the temporary high-churn
    exclusions until a separate live verification proves those paths are stable.
  - No targeted PHAC recrawl is needed for the 2026 annual edition.
  - Status tracking + next-step guidance: `../operations/healtharchive-ops-roadmap.md`
- Annual output-dir mount topology conversion (direct `sshfs` mounts → bind mounts):
  - Current state: completed on 2026-05-06 for annual jobs `6`, `7`, and `8`.
  - Verification: one Storage Box `sshfs` process, hot/cold directory identity
    matched, annual status remained `indexed=3`, and replay smoke returned
    `200` for HC, PHAC, and CIHR.
  - Status tracking: `../operations/healtharchive-ops-roadmap.md`
- Preserved VPS branch follow-up:
  - Current state: `prod-pre-a3e0dece` was reviewed against deployed
    `ca25d8ea` and deleted from the VPS.
  - Decision: do not merge or cherry-pick it; the branch is older than current
    deployed state and would remove newer annual edition, replay, search, and
    incident documentation work.

## Implemented plans (history)

- Implemented plans archive: `implemented/README.md`
- Public search and CIHR follow-through:
  `implemented/2026-05-05-public-search-and-cihr-followthrough.md`
- Annual edition recovery handoff docs:
  `implemented/2026-04-29-annual-edition-recovery-handoff-docs.md`
- Repo audit truth maintenance: `implemented/2026-04-24-repo-audit-truth-maintenance.md`
- Frontend + backend monorepo consolidation: `implemented/2026-04-14-healtharchive-monorepo-consolidation-plan.md`
- Monorepo phase 0 inventory and execution checklist: `implemented/2026-04-14-healtharchive-monorepo-phase0-inventory.md`
- Annual crawl content-cost and scope diagnosis: `implemented/2026-03-23-annual-crawl-content-cost-and-scope-diagnosis.md`
- Crawl operability (locks, writability, retry controls): `implemented/2026-02-06-crawl-operability-locks-and-retry-controls.md`
- Crawl health remediation (scope regex, circuit breaker, dep separation, alerts): `implemented/2026-02-25-crawl-health-remediation.md`
- Automation-first crawl alerting and dashboarding: `implemented/2026-02-23-automation-first-crawl-alerting-and-dashboarding.md`
- Alerting noise reduction + routing tuning: `implemented/2026-02-19-alerting-noise-reduction-and-routing-tuning.md`
- Operational resilience improvements: `implemented/2026-02-01-operational-resilience-improvements.md`
- Deploy workflow hardening (single VPS): `implemented/2026-02-07-deploy-workflow-hardening.md`
- CI schema + governance guardrails: `implemented/2026-02-06-ci-schema-and-governance-guardrails.md`
- Storage watchdog observability hardening: `implemented/2026-02-06-storage-watchdog-observability-hardening.md`
- Disk usage investigation (48GB discrepancy): `implemented/2026-02-01-disk-usage-investigation.md`
- WARC discovery consistency improvements (partial): `implemented/2026-01-29-warc-discovery-consistency.md`
- WARC manifest verification: `implemented/2026-01-29-warc-manifest-verification.md`
- Patch-job-config CLI + integration tests: `implemented/2026-01-28-patch-job-config-and-integration-tests.md`
- archive_tool hardening + ops improvements: `implemented/2026-01-27-archive-tool-hardening-and-ops-improvements.md`
- Annual crawl throughput and WARC-first artifacts: `implemented/2026-01-23-annual-crawl-throughput-and-artifacts.md`
- Infra-error retry storms + Storage Box hot-path resilience: `implemented/2026-01-24-infra-error-and-storage-hotpath-hardening.md`
- SLA and service commitments (v1): `implemented/2026-01-17-sla-and-service-commitments.md`
- Test coverage: critical business logic: `implemented/2026-01-17-test-coverage-critical-business-logic.md`
- Disaster recovery and escalation procedures: `implemented/2026-01-17-disaster-recovery-and-escalation-procedures.md`
- Operational hardening: tiering alerting + incident follow-ups: `implemented/2026-01-17-ops-tiering-alerting-and-incident-followups.md`
- Search ranking + snippet quality iteration (v3): `implemented/2026-01-03-search-ranking-and-snippets-v3.md`
- Storage Box / sshfs stale mount recovery + integrity: `implemented/2026-01-08-storagebox-sshfs-stale-mount-recovery-and-integrity.md`

## Historical context

- HealthArchive 6-Phase Upgrade Roadmap (2025; archived): `implemented/2025-12-24-6-phase-upgrade-roadmap-2025.md`
