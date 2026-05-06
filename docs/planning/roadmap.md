# Future roadmap (backlog)

This file tracks **not-yet-implemented** work and planned upgrades.

It is intentionally **not** an implementation plan.

## How to use this file (workflow)

1. Pick a reasonable amount of work from the items in this backlog.
2. Create a focused implementation plan in `docs/planning/` (example name: `YYYY-MM-<topic>.md`).
3. Implement the work.
4. Update canonical documentation so operators/users can run and maintain the result.
5. Move the completed implementation plan to `docs/planning/implemented/` and date it.

## External / IRL work (not implementable in git)

These items are intentionally “external” and require ongoing human follow-through.

A consolidated, phased plan covering external outreach, scholarly outputs,
and application preparation is in:

- **`2026-02-admissions-strengthening-plan.md`** (active implementation plan)

That plan addresses Gates 1-4 below, the methods paper, dataset DOI, and
application-specific preparation on a ~12-week timeline.

Use that active plan, not this backlog file, as the canonical near-term
sequence for:

- reconciling real source/snapshot coverage counts across public materials
- updating the portfolio/about narrative page
- adding public uptime history and status-page evidence
- publishing the governance/ethics + data-retention summary
- verifier/partner/advisor outreach
- the methods paper + architecture diagram
- the first formal dataset release with a DOI

Individual items (for reference; see the plan above for execution order):

- External outreach + verification execution (operator-only):
  - Playbook: `../operations/playbooks/external/outreach-and-verification.md`
- Secure at least 1 distribution partner (permission to name them publicly).
- Secure at least 1 verifier (permission to name them publicly).
- Write and publish a methods paper (preprint + JOSS submission).
  - Outline: `../operations/methods-note-outline.md`
  - Plan: `2026-02-admissions-strengthening-plan.md` (Phase 2, item 2)
- Publish first formal dataset release with Zenodo DOI.
  - Runbook: `../operations/dataset-release-runbook.md`
  - Plan: `2026-02-admissions-strengthening-plan.md` (Phase 2, item 3)
- Maintain a public-safe mentions/citations log with real entries:
  - `../operations/mentions-log.md` (links only; no private contact data)
- Healthchecks.io alignment: keep systemd timers, `/etc/healtharchive/healthchecks.env`, and the Healthchecks UI in sync.
  - See: `../operations/playbooks/validation/healthchecks-parity.md` and `../deployment/production-single-vps.md`
- Investigate Ontario Health811 (https://health811.ontario.ca/static/guest/home/) to see what value our project has in relation to that service.

Track the current status and next actions in:

- `../operations/healtharchive-ops-roadmap.md` for immediate PHAC + maintenance-window ops follow-through
- `2026-02-admissions-strengthening-plan.md` for the external-validation and scholarly-output sequence

Supporting materials:

- `../operations/outreach-templates.md`
- `../operations/partner-kit.md`
- `../operations/verification-packet.md`

## Transparency & public reporting (policy posture)

- Incident disclosure posture (current default: Option B):
  - Publish public-safe notes only when an incident changes user expectations (outage/degradation, integrity risk, security posture, policy change).
  - Decision record: `../decisions/2026-01-09-public-incident-disclosure-posture.md`
  - Revisit later: consider moving to “Option A” (always publish public-safe notes for sev0/sev1) once operations are demonstrably stable over multiple full campaign cycles.

## Real-world validation maturity (priority backlog)

Decision: these are all worth implementing because they materially improve external credibility, not just internal operations.

- 4-gate external validation target (cross-cutting):
  - Gate 1 (distribution): at least 1 named distribution partner with a public link/embed.
  - Gate 2 (verification): at least 1 named verifier with written confirmation and permission to name.
  - Gate 3 (citations discipline): mentions/citations log maintained with real, permission-aware public artifacts.
  - Gate 4 (repeatability evidence): quarterly dataset/recovery/automation/uptime artifacts show repeatable operations over multiple cycles.

Outstanding work (not fully implemented yet):

- Distribution partner proof (pending).
  - Existing scaffolding: `../operations/playbooks/external/outreach-and-verification.md`, `../operations/partner-kit.md`
  - Done when: one partner can be named publicly, with a durable public link/embed recorded in `../operations/mentions-log.md`.
- Verifier proof (pending).
  - Existing scaffolding: `../operations/verification-packet.md`
  - Done when: one verifier provides written confirmation and permission to be named publicly.
- Mentions/citations log discipline with real artifacts (partially implemented).
  - Existing scaffolding: `../operations/mentions-log.md`, `../_templates/mentions-log-template.md`
  - Done when: log has real dated entries tied to public links, and quarterly cadence updates are happening.
- Quarterly dataset release impact trail (partially implemented; pipeline exists).
  - Existing scaffolding: `../operations/dataset-release-runbook.md`, `../operations/playbooks/external/adoption-signals.md`
  - Done when: at least two consecutive quarterly cycles have both (a) published dataset releases and (b) dated adoption-signal entries.
- Restore-test discipline as repeated practice (partially implemented; first cycle done).
  - Existing scaffolding: `../operations/restore-test-procedure.md`, `../operations/playbooks/validation/restore-test.md`
  - Done when: restore-test logs exist for at least two consecutive quarterly cycles.
- Automation discipline with evidence artifacts (partially implemented).
  - Existing scaffolding: `../operations/playbooks/validation/automation-maintenance.md`, `../operations/automation-verification-rituals.md`
  - Done when: quarterly posture snapshots and run evidence exist, and failures are visible in logs/monitoring.
- External uptime/availability history (partially implemented).
  - Existing backlog: item #32 and item #33 below.
  - Done when: external monitor history is publicly visible (badge/status trend), not just current `/api/health`.
- Transparency counts over time for reports/takedowns/resolution (new backlog item).
  - Scope: publish aggregate-only periodic counts such as reports received, takedown-category reports, and resolved reports.
  - Guardrails: no report text, no emails, no personal identifiers.
  - Done when: a public surface exposes these aggregate trends with documented update cadence.
- Advisory circle with named participants (new external backlog item).
  - Scope: recruit 1-3 advisors/verifiers willing to be named publicly, with permission.
  - Done when: named list + role description is published and refreshed at least annually.

## Technical backlog (candidates)

Keep this list short; prefer linking to the canonical doc that explains the item.

### Documentation platform governance (cross-repo)

- Keep this repo on MkDocs 1.x plus Material in the current wave, and treat
  that stack as supported legacy rather than the strategic default for new
  standalone docs work.
- Treat Zensical as the intended MkDocs replacement, but only after the earlier
  shared waves succeed: `qquotes` first, then `visitbrief`, then
  `waittimecanada`.
- Keep `healtharchive` in the later plugin-heavy wave because the live docs
  portal still depends on `tags`, `social`, and `swagger-ui-tag`, plus the
  current `mkdocs.yml` navigation ownership and MkDocs-aware coverage/docs
  checks.
- Use `implemented/2026-04-15-zensical-migration-prep.md` as the current inventory of
  coupling points and readiness gates for the eventual dedicated migration
  series.
- When that later migration series starts, planning must explicitly cover:
  - replacement for `mkdocs.yml` navigation ownership
  - replacement or compatibility wrappers for the current `make docs-*` flows
  - replacement for `scripts/check_docs_coverage.py` and any other
    MkDocs-specific validation assumptions
  - docs dependency-group updates in `pyproject.toml`
  - policy-doc follow-through in `../../AGENTS.md`, `../../README.md`,
    `../documentation-guidelines.md`, and `../project.md`
- If Zensical cannot cover the required parity in a reasonable series, prefer
  Sphinx + MyST as the fallback rather than leaving the repo in a half-migrated
  state or starting fresh on new MkDocs work.

### Storage & retention (backend)

- Storage/retention upgrades (only with a designed replay retention policy).
  - See: `../operations/growth-constraints.md`, `../deployment/replay-service-pywb.md`

### Crawling & indexing reliability (backend)

- WARC discovery consistency follow-through (remaining work: keep non-indexing
  operator scripts aligned with union stable/temp/fallback discovery as new
  shard tooling matures).
  - Historical context: `implemented/2026-01-29-warc-discovery-consistency.md`
  - Already implemented: `implemented/2026-01-29-warc-manifest-verification.md`
- Annual edition/shard convergence follow-through.
  - First-pass implementation now models `{source, year}` as `AnnualEdition`,
    attaches legacy 2026 jobs as salvage shards, reconciles completed-job
    indexing, and generates coverage/provenance artifacts.
  - Live 2026 salvage status as of 2026-05-05:
    - HC and PHAC are indexed, search-ready, and research-ready with labeled
      fallback provenance.
    - PHAC follow-up policy is closed for the next annual cycle: retain
      Browsertrix-first scheduling with labeled `playwright_warc` fallback and
      keep the temporary high-churn exclusions unless a separate live
      verification proves those Browsertrix paths are stable.
    - CIHR is indexed, search-ready, and research-ready after manual
      WARC-complete acceptance and completed-job indexing reconciliation.
    - CIHR failed-URL review found exact job `8` snapshot coverage for 25 final
      retry-failed page/route URLs; the lone uncovered image was accepted as a
      non-page render-asset gap.
  - Remaining work: richer target ledger sources (sitemaps/public inventories),
    path/language shard creation for future campaigns, operator UI for shard
    split/retry/acceptance decisions, stricter watchdog `needs_review`
    escalation for repeated recoveries, and richer post-run coverage review
    tooling.
- WARC-complete / ZIM-finalization failure handling.
  - Context: the 2026 CIHR Browsertrix crawl reached final crawlStatus
    `pending=0`, but Zimit `warc2zim` exited RC `4` because the seed page was
    absent from the WARC subset used for finalization. The wrapper treated the
    non-zero finalization exit as a failed crawl and started another resume
    attempt, even though the WARC output was sufficient for backend indexing.
  - Repo-side implementation is deployed:
    - backend `run_persistent_job` classifies the observed
      WARC-complete/ZIM-failed condition as eligible for indexing when final
      crawlStatus has `pending=0` and backend WARC discovery finds indexable
      WARCs
    - regression coverage covers final crawlStatus `pending=0` plus Zimit RC
      `4`, the worker indexing path, and operator-visible annual status
    - `annual-status` and `show-job` surface
      `warc-complete-finalization-failed` with an operator note
  - Remaining work:
    - add a metric/alert for accepted WARC-complete finalization failures if
      this state recurs in a future run
    - decide whether WARC-only jobs should suppress Zimit's internal
      `warc2zim` path, or tolerate that finalization failure only after WARC
      completeness is proven
- Large indexing robustness follow-through.
  - Context: the 2026 PHAC reindex succeeded only after being rerun under
    `nohup`; the first interactive attempt left a stale PostgreSQL
    `idle in transaction` backend after the client died.
  - Additional 2026 CIHR context: manual WARC acceptance after a ZIM build
    failure exposed a long quiet period where the system was actively
    consolidating/hashing and then indexing hundreds of large WARC files, but
    operators had to infer health from `/proc/<pid>/io`, `lsof`, CPU, and
    current open WARC paths because application logs and database-visible state
    did not show live progress.
  - Remaining work:
    - add progress heartbeats/logging during stable WARC consolidation and long
      WARC indexing runs, including current phase, current WARC, WARC index /
      total, bytes or records processed where available, elapsed time, and
      last-progress timestamp
    - expose enough indexing progress outside the final all-at-once transaction
      for `show-job`, `annual-status`, `ha-check`, and metrics to distinguish
      "healthy but quiet" from "stalled"
    - evaluate safer transaction/checkpoint behavior for very large jobs, or
      document why the current all-at-once transaction remains required
    - add clearer stale-transaction detection/remediation guidance for manual
      reconciles
    - provide a first-class detached-run wrapper or runbook pattern for
      production `reconcile-completed-indexing`
    - ensure operators can distinguish healthy CPU-bound parsing from a stale
      DB transaction without ad hoc `/proc` and `pg_stat_activity` archaeology

### Search/API performance (backend)

- Optional broad `q=...&view=pages` DB/index-plan tuning.
  - Context: after CIHR indexing completed, production contained about `1.2M`
    snapshots and default public search initially regressed into timeout /
    60-second latency. The 2026-05-05/2026-05-06 search-performance deploys
    restored the default broad snapshot search path by using stored
    `snapshots.search_vector`, stored `Snapshot.deduplicated`, and a lean
    default broad-query rank.
  - Final warm-up samples after deploy:
    - `q=covid&pageSize=1`: `3.252s`, `5.476s`, `2.487s`, `2.389s`, `1.959s`
    - `q=covid&pageSize=1&view=pages`: `8.959s`, `6.742s`, `4.787s`,
      `4.566s`, `4.285s`
    - `pageSize=1`: `6.793s`, `1.885s`, `3.678s`, `2.339s`, `2.067s`
    - `pageSize=1&source=cihr`: `5.919s`, `2.329s`, `2.502s`, `3.070s`,
      `2.491s`
  - Done for now:
    - default `q=covid&pageSize=1` is no longer in the timeout / 60s class and
      settles in the low-single-digit range after warm-up
    - public-surface verification reaches snapshot metadata, raw HTML, replay,
      and frontend checks
  - Remaining backlog:
    - if `q=...&view=pages` repeatedly exceeds the desired target after
      warm-up, investigate DB/index-plan tuning or materialized page-search
      metadata
    - decide whether any default public browse/search mode should become
      `view=pages` only after a documented product/API decision
    - keep same-day duplicate hiding semantics intact unless a product decision
      explicitly changes the public snapshot view contract
- Resolve the long-term PHAC Browsertrix compatibility posture and re-evaluate the temporary `public-health-notices` exclusion.
  - Context: the 2026 PHAC annual crawl first hit sustained `net::ERR_HTTP2_PROTOCOL_ERROR` churn on canada.ca. On 2026-04-20, a fresh Browsertrix retry still failed at both seed documents, while the validated `playwright_warc` fallback succeeded and the live PHAC job resumed healthy progress under fallback.
  - Live 2026 outcome: the PHAC fallback crawl was indexed on 2026-04-29 with
    `121940` snapshot rows; the annual edition report marks PHAC
    `research_ready` with labeled fallback provenance.
  - Current repo status:
    - the monitor/control-plane gap is closed in git, so stages that emit no
      `crawlStatus` for a full stall window now trigger an explicit `no_stats`
      stall instead of silently hanging
    - HC/PHAC Browsertrix-only chrome args are now carried through managed
      Browsertrix config instead of incompatible zimit CLI passthrough
    - resumed HC/PHAC phases now preserve those managed Browsertrix overrides by
      merging them into the stable `.zimit_resume.yaml`
    - fallback backends now append to the next free stable WARC slot instead of
      overwriting `warc-000001.warc.gz` on reruns
  - Immediate follow-through is tracked in `../operations/healtharchive-ops-roadmap.md`; keep live-run monitoring and maintenance-window cutovers there rather than duplicating them in this backlog.
  - Remaining work:
    - decide whether PHAC should remain Browsertrix-first for future annual
      campaigns or adopt a different default/fallback posture after reviewing
      the indexed fallback coverage
    - determine whether any remaining Browsertrix-only compatibility work is
      worth doing now that the fallback run has been measured
    - decide whether the temporary exclusion is still needed once post-run PHAC
      coverage is reviewed
    - keep the operator path centered on `annual-status`, `list-jobs`, and
      `show-job` so post-run PHAC analysis is observable without ad hoc log
      reconstruction
  - Related docs: `../operations/annual-campaign.md`, `../operations/healtharchive-ops-roadmap.md`
- Continue crawl telemetry calibration from live annual-crawl runs, but use dashboard trends (crawl rate / phase churn / progress age) rather than direct throughput alerts.
  - Current focus: validate dashboard thresholds/visual cues and only promote a signal back into Alertmanager if it becomes clearly actionable.
  - Related docs: `../operations/monitoring-and-alerting.md`, `../operations/healtharchive-ops-roadmap.md`
- Consider whether a separate staging backend is worth it (increases ops surface; only do if it buys real safety).
  - See: `../deployment/environments-and-configuration.md`

### Repo governance (future)

- Tighten GitHub merge discipline when there are multiple committers (PR-only + required checks).
  - See: `../operations/monitoring-and-ci-checklist.md`
- Decide whether to rewrite published non-human-authored git history to the human-only authorship standard.
  - Current policy is implemented for new work: accepted dependency updates should land via new human-authored commits, superseded bot PRs should be closed, and future branches should avoid bot/assistant/CI-only authorship.
  - Remaining gap: older published history still contains historical Dependabot, archived-repo bot commits, and `CI User` authorship in some repos/branches.
  - Do this only with an explicit migration + force-push plan, because it would rewrite shared history across clones and open branches.

## Quality, governance, and product backlog (cross-repo)

This section tracks not-yet-implemented quality/governance work across backend, frontend, and datasets repos.
Completed items were removed from this backlog and archived in:

- `implemented/2026-02-12-governance-seo-and-security-foundations.md`
- Numbering is intentionally sparse to preserve stable item IDs from the original audit list.

### Governance and standards

<!-- Items #1 (CITATION.cff) and #2 (SECURITY.md) removed 2026-03-25: confirmed present in all three repos (backend, frontend, datasets). Completed as part of implemented/2026-02-12-governance-seo-and-security-foundations.md. -->

3. **Add a code of conduct to all repos** (S: 1h) — covered by `2026-02-admissions-strengthening-plan.md` Phase 3, item 6
4. **Add LICENSE to datasets repo** (S: 30m) — confirmed still missing as of 2026-03-25
5. **Add GitHub issue and PR templates across repos** (S: 2-3h) — covered by `2026-02-admissions-strengthening-plan.md` Phase 3, item 6; confirmed not yet present
7. **Add changelog/release tags to backend and frontend** (M: 1 day) — covered by `2026-02-admissions-strengthening-plan.md` Phase 3, item 6

### Reliability, security, and CI

23. **Create formal accessibility audit document** (M: 1-2 days) — covered by `2026-02-admissions-strengthening-plan.md` Phase 3, item 4
24. **Add frontend error boundary components** (M: 1 day)

### Documentation and operations maturity

26. **Create explicit data retention schedule table** (S: 2h) — covered by `2026-02-admissions-strengthening-plan.md` Phase 1, item 1d
27. **Add disaster recovery SLOs (RTO/RPO)** (S: 1-2h)
28. **Write first-responder / on-call runbook** (S: 2-3h)
29. **Create change-management runbook** (S: 2-3h)
30. **Formalize ethics/research exemption statement** (S: 1-2h) — covered by `2026-02-admissions-strengthening-plan.md` Phase 1, item 1d
31. **Add error tracking integration (Sentry)** (M: 1 day)
32. **Add automated uptime monitoring badge** (S: 1-2h) — covered by `2026-02-admissions-strengthening-plan.md` Phase 1, item 1c; external monitor (UptimeRobot) is described in the monitoring checklist but public badge and history page are not yet confirmed live as of 2026-03-25
33. **Add public status page content with uptime history** (M: 1 day) — covered by `2026-02-admissions-strengthening-plan.md` Phase 1, item 1c; `../operations/service-levels.md` notes no dedicated status page yet
34b. **Measure and record API/operational performance baselines** (S: 1-2h) — all baseline fields in `../operations/service-levels.md` remain TBD since 2026-01-18; collect real p50/p95 measurements from production under normal load and fill in the table

### Frontend quality and portfolio communication

35. **Consolidate bilingual strings (remove inline ternaries)** (L: 1-2 weeks)
36. **Add automated performance/Lighthouse testing** (M: 1 day)
37. **Add automated link checking to frontend CI** (S: 1-2h)
38. **Add coverage badges to READMEs** (S: 1-2h) — covered by `2026-02-admissions-strengthening-plan.md` Phase 3, item 6
39. **Create portfolio-ready project summary page** (M: 1 day) — covered by `2026-02-admissions-strengthening-plan.md` Phase 1, item 1b
40. **Generate architecture diagrams (Mermaid/D2)** (M: 1 day) — covered by `2026-02-admissions-strengthening-plan.md` Phase 2, item 2 (sub-task of methods paper)
41. **Create public changelog page on frontend** (M: 1 day) — covered by `2026-02-admissions-strengthening-plan.md` Phase 3, item 6
42. **Create automated WARC/data integrity report** (M: 1 day)

## Adjacent / optional (in this monorepo, not core HA)

- `rcdc/CDC_zim_mirror`: add startup DB sanity checks and clearer failure modes (empty/invalid LevelDB, missing prefixes, etc.).
