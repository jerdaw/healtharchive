# Roadmaps

## Current backlog

- Future roadmap (what is *not* implemented yet): `roadmap.md`

## Implementation plans

Implementation plans live directly under `docs/planning/` while they are active.
When complete, move them to `docs/planning/implemented/` and date them.

Active plans:

- None.

Paused or conditional plans:

- Hot-path staleness root-cause investigation: `2026-02-06-hotpath-staleness-root-cause-investigation.md`
  - Reactivate only after a captured Errno 107 recurrence, an approved
    maintenance-window drill, or an explicit storage-architecture disposition.

## Current priority sequence

Treat the following as the current "what's next" order across roadmap docs:

1. Complete monorepo PR 154 through normal review and the established safe
   deployment path.
   - The prerequisite datasets controls were published and verified on
     2026-08-12 at `802a91168ef6d315d22c8e14a14a33182b354cd5`: schedules are
     absent, manual dispatch remains, the conservative rights notice resolves,
     and the 15-snapshot / 24-change schema guards pass.
   - Merge the monorepo patch only after its required checks pass, then deploy
     only with a confirmed rollback and verify the English/French public
     claims, JSON-LD, rights links, and documentation surfaces.
   - Decision record:
     `../decisions/2026-08-12-dataset-publication-and-stewardship.md`
2. Complete the separate data-continuity disposition, then preserve existing
   releases and archive data through event-triggered
   integrity/security stewardship. Make any future capture-campaign decision
   explicitly from rights, capacity, storage, restore, replay, and automation
   evidence rather than an assumed calendar.
3. After containment and only when capacity is available, consider at most one
   bounded outside stewardship review. There is no active conversion,
   adoption, DOI, or general outreach campaign.
4. Optional broad `q=...&view=pages` DB/index-plan tuning remains a future
   backend/search backlog item if repeated warm-cache samples exceed the
   desired response target.
   - Canonical tracker: private operations workspace for live tuning notes;
     public backlog entries stay in `roadmap.md`.
5. Any docs-site migration planning should use the archived prep inventory as
   the starting point, but the actual generator swap remains a separate change
   series.
   - Canonical reference:
     `implemented/2026-04-15-zensical-migration-prep.md`

## Operator Follow-Through (Maintenance Window)

Some plans are "implemented in repo" but still require a short, operator-run maintenance step on the VPS.

Current known items:

- Stats endpoint fast-path deployment and verification:
  - Deploy the coverage-validated `pages` rollup fast path and homepage
    partial-live fallback.
  - Verify `/api/stats` stays within the frontend's eight-second request
    budget across repeated samples, then confirm English and French aggregate
    metrics after cache revalidation.
  - Implementation record:
    `implemented/2026-07-18-stats-fast-path-and-homepage-resilience.md`
- Zero-new-spend storage/baseline wrap-up retrospective:
  - Timing: run about 24 hours after the production deploy and cache/baseline
    maintenance window.
  - Check: API health, Prometheus active alerts, Alertmanager active alerts,
    replay smoke metrics for HC/PHAC/CIHR, and recent API logs for idle
    transaction or usage-metric errors.
  - Current status: checks bounded to the current API service lifetime are
    clean, and the known large raw-snapshot path redirects quickly to replay.
    Keep the item open until the broad 24-hour journal window no longer
    includes pre-fix log entries.
  - Close when: no related alerts remain active and any private operations
    notes/baseline records match the deployed state.

Recently closed items:

- Frontend locale/global error recovery boundaries: `implemented/2026-07-10-frontend-error-boundaries.md`

- 2026 CIHR WARC compaction closeout:
  - Current state: completed. The staged compacted WARC set was promoted after
    parse validation, replay indexes were rebuilt, replay smoke returned `200`,
    and the pre-compaction rollback copy was removed after verification.
  - Prevention follow-up: annual scheduling now requires an explicit
    storage/media-policy acknowledgement in apply mode, managed source profiles
    include large-media URL block rules, and annual job configs retain the
    acknowledged storage policy.
  - Public-safe policy follow-up:
    `../decisions/2026-06-11-annual-crawl-media-retention-policy.md`
  - Remaining product work: keep the reusable promotion/original-retention
    lifecycle tracked in `roadmap.md`.
- API DB pool exhaustion recurrence prevention:
  - Current state: completed. API request-scoped database sessions are closed
    promptly, export responses no longer stream from live DB iterators, the
    production database role has a bounded idle transaction timeout, and private
    monitoring alerts cover excessive idle transactions.
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
  - Status tracking + next-step guidance: private operations workspace
- Annual output-dir mount topology conversion:
  - Current state: completed on 2026-05-06 for annual jobs `6`, `7`, and `8`.
  - Verification: private storage mount topology matched expectations, annual
    status remained `indexed=3`, and replay smoke returned `200` for HC, PHAC,
    and CIHR.
  - Status tracking: private operations workspace
- Preserved VPS branch follow-up:
  - Current state: `prod-pre-a3e0dece` was reviewed against deployed
    `ca25d8ea` and deleted from the VPS.
  - Decision: do not merge or cherry-pick it; the branch is older than current
    deployed state and would remove newer annual edition, replay, search, and
    incident documentation work.

## Implemented plans (history)

- Implemented plans archive: `implemented/README.md`
- Stats fast path and homepage resilience:
  `implemented/2026-07-18-stats-fast-path-and-homepage-resilience.md`
- Homepage fetch and source-link accessibility:
  `implemented/2026-07-10-homepage-fetch-accessibility.md`
- Test and capture resource hygiene:
  `implemented/2026-07-13-test-and-capture-resource-hygiene.md`
- SQLAlchemy Query.get test hygiene:
  `implemented/2026-07-11-sqlalchemy-query-get-hygiene.md`
- Operations governance backlog truth reconciliation:
  `implemented/2026-07-10-ops-governance-backlog-truth.md`
- RCDC backlog scope audit:
  `implemented/2026-07-10-rcdc-backlog-scope-audit.md`
- Existing public project pages contract:
  `implemented/2026-07-10-public-project-pages-contract.md`
- Accessibility audit baseline and statement reconciliation:
  `implemented/2026-07-10-accessibility-audit-baseline.md`
- Canonical architecture diagrams:
  `implemented/2026-07-10-canonical-architecture-diagrams.md`
- Frontend internal link checking and canonical locale routing:
  `implemented/2026-07-10-frontend-internal-link-check.md`
- Deterministic documentation reference checks:
  `implemented/2026-07-11-deterministic-docs-references.md`
- Repository issue forms:
  `implemented/2026-07-11-repository-issue-forms.md`
- Unused MkDocs monorepo plugin removal:
  `implemented/2026-07-10-unused-mkdocs-monorepo-plugin.md`
- Snapshot metadata mobile layout:
  `implemented/2026-07-10-snapshot-metadata-mobile.md`
- Browse-by-source orientation and accessibility:
  `implemented/2026-07-10-browse-by-source-orientation.md`
- Changes result orientation:
  `implemented/2026-07-10-changes-result-orientation.md`
- Status availability communication:
  `implemented/2026-07-10-status-availability-communication.md`
- Autonomous overnight maintenance queue:
  `implemented/2026-06-28-autonomous-overnight-work-plan.md`
- Storage budget and WARC promotion hardening:
  `implemented/2026-06-11-storage-budget-and-warc-promotion-hardening.md`
- Annual crawl storage guardrails:
  `implemented/2026-06-11-annual-crawl-storage-guardrails.md`
- WARC compaction staging: `implemented/2026-06-05-warc-compaction-staging.md`
- WARC-complete finalization failure alert:
  `implemented/2026-07-10-warc-finalization-alert.md`
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
- Content report stable/temp/fallback WARC union: `implemented/2026-07-10-content-report-warc-union.md`
- Bounded WARC manifest discovery status: `implemented/2026-07-10-warc-manifest-discovery-status.md`
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
