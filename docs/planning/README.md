# Roadmaps

## Current backlog

- Future roadmap (what is *not* implemented yet): `roadmap.md`

## Implementation plans (active)

Implementation plans live directly under `docs/planning/` while they are active.
When complete, move them to `docs/planning/implemented/` and date them.

Active plans:

- Admissions strengthening (OMSAS ABS + CanMEDS, ~12 weeks): `2026-02-admissions-strengthening-plan.md`
- Crawl operability (locks, writability, retry controls): `2026-02-06-crawl-operability-locks-and-retry-controls.md`
- Hot-path staleness root-cause investigation: `2026-02-06-hotpath-staleness-root-cause-investigation.md`
- Annual crawl content-cost and scope diagnosis: `2026-03-23-annual-crawl-content-cost-and-scope-diagnosis.md`
- Crawl rescue observability and operator ergonomics: `2026-04-10-crawl-rescue-observability-and-operator-ergonomics.md`

## Current priority sequence

Treat the following as the current "what's next" order across roadmap docs:

1. HC annual-crawl follow-up is the immediate technical priority.
   - Browsertrix-first still fails at the HC seed pages on prod, but the new
     rescue path now auto-promotes to `playwright_warc` and makes live forward
     progress there.
   - Keep HC running and use the result to decide the PHAC next step.
   - Canonical tracker: `../operations/healtharchive-ops-roadmap.md`
   - Related active plan for broader source-level diagnosis: `2026-03-23-annual-crawl-content-cost-and-scope-diagnosis.md`
2. Add rescue observability/operator ergonomics follow-through after the
   current HC checkpoint is stable enough.
   - Why this is now explicit: the rescue control flow worked, but the operator
     still had to reconstruct state from logs/metrics by hand.
   - Canonical plan: `2026-04-10-crawl-rescue-observability-and-operator-ergonomics.md`
3. Complete the job lock-dir cutover during a maintenance window once crawls are idle.
   - This is already implemented in repo; the remaining work is operator-run service restarts.
   - Canonical plan: `2026-02-06-crawl-operability-locks-and-retry-controls.md`
4. Convert annual output dirs from direct `sshfs` mounts to bind mounts during a later maintenance window.
   - This remains intentionally deferred until the active annual crawl is idle.
   - Canonical tracker: `../operations/healtharchive-ops-roadmap.md`
5. Diagnose which content classes and URL families are actually driving annual crawl time, storage, and restart churn.
   - Current evidence split:
     - PHAC points to HTML/runtime friction first.
     - CIHR now shows a media-heavy frontier under broad host scope.
   - Treat this as evidence gathering first; use it to decide whether more source-specific download/media/data exclusions are justified.
   - Canonical plan: `2026-03-23-annual-crawl-content-cost-and-scope-diagnosis.md`
6. After the crawl/ops path is stabilized, the main project emphasis is the active admissions-strengthening plan.
   - That plan is the canonical home for the next external-validation, methods-paper, and dataset-release work.
   - Canonical plan: `2026-02-admissions-strengthening-plan.md`

## Operator Follow-Through (Maintenance Window)

Some plans are "implemented in repo" but still require a short, operator-run maintenance step on the VPS.

Current known items:

- HC/PHAC annual-crawl follow-up after the 2026-04-10 live HC checkpoint:
  - Current state:
    - HC job `6` is actively running on the promoted `playwright_warc`
      fallback path
    - PHAC job `7` remains failed and parked as the controlled second-priority
      target
    - CIHR job `8` remains active and should stay undisturbed
  - Settled repo-side outcome:
    - HC/PHAC fresh-first annual policy now uses Browsertrix primary +
      `playwright_warc` fallback
    - HC has already demonstrated that the rescue control flow works live on
      prod: failing Browsertrix seed loads can auto-promote into a healthy
      fallback run
  - Next action:
    - let HC reach a decision-useful checkpoint or terminal state
    - verify final WARC/indexing behavior
    - only then decide whether PHAC should retry under the same policy or
      receive another PHAC-specific patch first
  - Why this is first: PHAC follow-through should now be guided by the live HC
    outcome instead of another blind retry.
  - Status tracking + next-step guidance: `../operations/healtharchive-ops-roadmap.md`
- Job lock-dir cutover:
  - Current state: the env change is already staged on the VPS, but services still need a maintenance-window restart to pick it up.
  - Next action: restart the services that read `/etc/healtharchive/backend.env` after crawls are idle.
  - Why deferred: do not restart the worker mid-crawl unless you explicitly accept interrupting crawls.
  - Plan: `2026-02-06-crawl-operability-locks-and-retry-controls.md` (Phase 4)
- Annual output-dir mount topology conversion (direct `sshfs` mounts → bind mounts):
  - Current state: the active 2026 annual job output dirs are mounted directly via `sshfs` (higher Errno 107/staleness risk).
  - Next action: convert to bind mounts after the 2026 annual crawl is idle.
  - Why maintenance-only: converting requires unmount/remount of job output dirs and can interrupt active crawls.
  - Status tracking: `../operations/healtharchive-ops-roadmap.md`

## Implemented plans (history)

- Implemented plans archive: `implemented/README.md`
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
