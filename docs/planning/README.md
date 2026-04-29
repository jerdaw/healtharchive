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

1. Monitor CIHR to completion, then index CIHR and regenerate its annual
   edition report.
   - HC and PHAC are indexed, search-ready, and research-ready as of
     2026-04-29.
   - CIHR is the only remaining active annual blocker.
   - Canonical tracker: `../operations/healtharchive-ops-roadmap.md`
2. Convert annual output dirs from direct `sshfs` mounts to bind mounts during
   a later maintenance window.
   - This remains intentionally deferred until the active annual crawl is idle.
   - Canonical plan: `2026-02-06-hotpath-staleness-root-cause-investigation.md`
   - Canonical tracker: `../operations/healtharchive-ops-roadmap.md`
3. After the crawl/ops path is stabilized, the main project emphasis is the
   active admissions-strengthening plan.
   - That plan is the canonical home for the next external-validation,
     methods-paper, and dataset-release work.
   - Canonical plan: `2026-02-admissions-strengthening-plan.md`
4. Any docs-site migration planning should use the archived prep inventory as
   the starting point, but the actual generator swap remains a separate change
   series.
   - Canonical reference:
     `implemented/2026-04-15-zensical-migration-prep.md`

## Operator Follow-Through (Maintenance Window)

Some plans are "implemented in repo" but still require a short, operator-run maintenance step on the VPS.

Current known items:

- CIHR scope/content-cost follow-through:
  - Current state: the repo-side remediation completed on 2026-04-14 via a
    controlled maintenance window, and job `8` continues running on that
    repaired scope.
  - Settled outcome: job `8` restarted under source-managed custom scope and
    the new combined log shows clean HTML frontier pages without live
    `wbdisable=false`, `asl-video`, or document/media frontier expansion.
  - Next action: monitor while fresh progress continues; after it completes,
    run detached indexing, regenerate the CIHR annual edition report, and then
    verify global annual search readiness.
  - Historical plan: `implemented/2026-03-23-annual-crawl-content-cost-and-scope-diagnosis.md`
- PHAC annual-crawl policy follow-up after the 2026-03-23 canada.ca incident:
  - Current state: job `7` indexed successfully on 2026-04-29 through the
    labeled `playwright_warc` fallback path, and the PHAC annual edition report
    is research-ready.
  - Next action: review indexed fallback coverage, decide the future PHAC
    Browsertrix/default-backend posture, and decide whether the temporary
    `public-health-notices` exclusion is still needed.
  - Status tracking + next-step guidance: `../operations/healtharchive-ops-roadmap.md`
- Annual output-dir mount topology conversion (direct `sshfs` mounts → bind mounts):
  - Current state: the active 2026 annual job output dirs are mounted directly via `sshfs` (higher Errno 107/staleness risk).
  - Next action: convert to bind mounts after the 2026 annual crawl is idle.
  - Why maintenance-only: converting requires unmount/remount of job output dirs and can interrupt active crawls.
  - Status tracking: `../operations/healtharchive-ops-roadmap.md`

## Implemented plans (history)

- Implemented plans archive: `implemented/README.md`
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
