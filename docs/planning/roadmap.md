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

Use this backlog as the public tracker for:

- reconciling real source/snapshot coverage counts across public materials
- updating the project summary/about page
- adding public uptime history and status-page evidence
- publishing the governance/ethics + data-retention summary
- verifier/partner/advisor outreach
- the methods paper + architecture diagram
- the first formal dataset release with a DOI

Individual items:

- External outreach + verification execution (operator-only):
  - Private execution procedure: private operations workspace
  - Public materials: `../operations/outreach-templates.md`,
    `../operations/partner-kit.md`, and `../operations/mentions-log.md`
- Secure at least 1 distribution partner (permission to name them publicly).
- Secure at least 1 verifier (permission to name them publicly).
- Write and publish a methods paper (preprint + JOSS submission).
  - Outline: `../operations/methods-note-outline.md`
- Publish first formal dataset release with Zenodo DOI.
  - Public contract: `../operations/export-integrity-contract.md`
  - Private release procedure: private operations workspace
- Maintain a public-safe mentions/citations log with real entries:
  - `../operations/mentions-log.md` (links only; no private contact data)
- Healthchecks.io alignment: keep private scheduler configuration, private
  health-check environment configuration, and the external healthchecks UI in sync.
  - Public tracking should expose only public-safe status evidence.
- Investigate Ontario Health811 (https://health811.ontario.ca/static/guest/home/) to see what value our project has in relation to that service.

Track the current status and next actions in:

- the private operations workspace for current ops posture, optional search
  tuning, and routine quarterly evidence collection
- this roadmap for external-validation and scholarly-output follow-through

Supporting materials:

- `../operations/outreach-templates.md`
- `../operations/partner-kit.md`
- private verification packet maintained outside public Git

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
  - Public scaffolding: `../operations/partner-kit.md`, `../operations/outreach-templates.md`, `../operations/mentions-log.md`
  - Private procedure: private operations workspace
  - Done when: one partner can be named publicly, with a durable public link/embed recorded in `../operations/mentions-log.md`.
- Verifier proof (pending).
  - Public scaffolding: `../operations/mentions-log.md`
  - Private procedure: private verification packet maintained outside public Git
  - Done when: one verifier provides written confirmation and permission to be named publicly.
- Mentions/citations log discipline with real artifacts (partially implemented).
  - Existing scaffolding: `../operations/mentions-log.md`, `../_templates/mentions-log-template.md`
  - Done when: log has real dated entries tied to public links, and quarterly cadence updates are happening.
- Quarterly dataset release impact trail (partially implemented; pipeline exists).
  - Public scaffolding: `../operations/export-integrity-contract.md`
  - Private procedure: private operations workspace
  - Done when: at least two consecutive quarterly cycles have both (a) published dataset releases and (b) dated adoption-signal entries.
- Restore-test discipline as repeated practice (partially implemented; first cycle done).
  - Public state: tracked operations files are public-boundary stubs.
  - Private procedure: private operations workspace
  - Done when: restore-test logs exist for at least two consecutive quarterly cycles.
- Automation discipline with evidence artifacts (partially implemented).
  - Public state: tracked operations files are public-boundary stubs.
  - Private procedure: private operations workspace
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
  - Public notes should describe user-facing retention policy only; private
    capacity planning and replay operations live in the private operations
    workspace.
- Annual WARC capacity and storage-tier decision before the next campaign.
  - Context: the 2026 annual crawl showed that stable WARC storage can be
    dominated by accidentally retained large media, and that future annual
    campaigns need an explicit storage budget before they are queued. Current
    financial policy is no additional spend; the storage budget is a capacity
    envelope for already-paid storage, not approval to buy more.
  - Scope:
    - define hot replay, warm archival, and cold/offsite backup tiers
    - compare hosted archival storage against operator-owned cold storage for
      cost, security, reliability, drive wear, bandwidth, restore time, and
      replay latency
    - document which tiers may serve public replay directly and which tiers are
      backup or pre-delete safety copies only
    - keep detailed capacity tables, host wiring, and private storage locations
      in the private operations workspace
  - Done when: the operator has chosen and documented one capacity path
    (cold offload with replay impact documented, source/year hot-retention
    limits, or a separately approved paid-capacity change), the private
    operations record reflects the chosen path, and public docs describe only
    the user-facing retention policy before any new annual jobs are queued.
- Operator-owned cold storage evaluation.
  - Scope: decide whether operator-owned storage should be used for cold WARC
    backups, pre-compaction originals, staged compaction outputs, disaster
    recovery copies, or long-retention archival copies.
  - Guardrails: do not make cold operator-owned storage the only live backing
    store for public replay unless SLO/RPO/RTO, monitoring, security isolation,
    restore testing, and degraded-mode behavior are explicitly documented.
  - Done when: the private operations record captures the selected role for
    operator-owned cold storage, the restore path has been tested, and the
    public roadmap/user-facing docs avoid private network and host details.
- Annual storage budget estimate calibration.
  - Implemented guardrail: `schedule-annual --apply` now requires both
    `--ack-storage-policy` and `--storage-budget-file`; the JSON budget must
    include source/year WARC estimates, capacity targets, large-media policy,
    replay requirement, and approval timestamp for every selected source.
  - Current policy record: a private 2027 storage-budget record exists with
    positive per-source GiB capacity estimates and a zero-additional-spend
    policy note.
  - Remaining work: maintain the detailed estimate inputs, host capacity
    tables, and approval notes in the private operations workspace before each
    annual campaign; tune future estimates using observed WARC growth.
  - Done when: two consecutive annual/quarterly planning cycles have private
    budget records that match observed storage outcomes closely enough to
    support reliable capacity planning.
- Post-promotion original-retention and capacity-ledger discipline.
  - Implemented guardrail: `promote-compacted-warcs` validates staged compaction
    artifacts, promotes compacted WARCs with a rollback directory, and records
    provenance; it intentionally requires replay reindex acknowledgement.
  - Remaining work: keep the private capacity ledger updated after each
    promotion and decide whether pre-promotion originals are deleted, offloaded,
    or retained after the validation window.
  - Done when: each compaction promotion has a private retention decision,
    capacity ledger update, replay validation result, and rollback cleanup or
    offload record.

### Crawling & indexing reliability (backend)

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
  - Delivered 2026-07-10:
    - durable, throttled progress heartbeats during stable WARC consolidation
      and indexing, including phase, current WARC basename, WARC index / total,
      byte and record counters, elapsed time, and last-progress timestamp
    - a separate short-transaction progress table that preserves the atomic
      all-at-once snapshot transaction while making liveness database-visible
    - operator output in `show-job` and `annual-status`; private `ha-check`
      consumers inherit the annual-status payload
    - low-cardinality `healtharchive_indexing_progress_*` metrics for heartbeat
      age and numeric progress, with no WARC path/name label and no alert until
      live history supports a reliable threshold
    - handled failures retain their final progress row for diagnosis; successful
      indexing clears it only after the snapshot transaction commits
    - private operator guidance now correlates durable progress, client
      ownership, exact `pg_stat_activity` evidence, blockers, rollback-safe
      exact-backend-identity termination, and normal reconciliation recovery;
      the procedure remains in the private/shared operations source of truth
  - Remaining work:
    - evaluate safer transaction/checkpoint behavior for very large jobs, or
      document why the current all-at-once transaction remains required
    - provide a first-class detached-run wrapper or runbook pattern for
      production `reconcile-completed-indexing`
    - ensure operators can distinguish healthy CPU-bound parsing from a stale
      DB transaction without ad hoc `/proc` and `pg_stat_activity` archaeology
- Raw snapshot large-WARC direct lookup design.
  - Context: large compressed WARCs can take longer than an API request budget
    to scan sequentially. Production now redirects large
    `/api/snapshots/raw/{id}` requests to pywb replay, which is the correct
    near-term behavior because pywb has a replay index.
  - Remaining work:
    - evaluate adding WARC byte offsets or CDX-derived lookup metadata to
      `Snapshot` rows during indexing
    - decide whether direct raw HTML access for large WARCs is worth the schema
      and migration complexity, given that replay already covers the public
      browsing use case
    - if adopted, update indexing, compaction promotion, replay reindex
      runbooks, and raw snapshot tests so direct lookup remains valid after
      WARC replacement

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
  - Immediate follow-through is tracked in the private operations workspace; keep
    live-run monitoring and maintenance-window cutovers there rather than
    duplicating them in this public backlog.
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
  - Related docs: public annual-campaign summary under `../operations/`; private
    run-specific guidance in the private operations workspace.
- Continue crawl telemetry calibration from live annual-crawl runs, but use dashboard trends (crawl rate / phase churn / progress age) rather than direct throughput alerts.
  - Current focus: validate dashboard thresholds/visual cues and only promote a signal back into Alertmanager if it becomes clearly actionable.
  - Related docs: `../operations/monitoring-and-alerting.md`; private
    run-specific guidance in the private operations workspace.
- Evaluate a low-noise alert digest for dashboard-only warnings.
  - Context: the solo-operator paging policy keeps warning-level conditions out
    of Pushover by default, but some trends may still deserve periodic review.
  - Done when: either a daily/weekly digest exists for dashboard-only warning
    summaries, or the operator explicitly decides that Grafana/Prometheus review
    is sufficient without a digest.
- Consider whether a separate staging backend is worth it (increases ops surface; only do if it buys real safety).
  - See: `../deployment/environments-and-configuration.md`

### Repo governance (future)

- Tighten GitHub merge discipline when there are multiple committers (PR-only + required checks).
  - See: `../operations/monitoring-and-ci-checklist.md`

## Quality, governance, and product backlog (cross-repo)

This section tracks not-yet-implemented quality/governance work across backend, frontend, and datasets repos.
Completed items were removed from this backlog and archived in:

- `implemented/2026-02-12-governance-seo-and-security-foundations.md`
- Numbering is intentionally sparse to preserve stable item IDs from the original audit list.

### Governance and standards

<!-- Items #1 (CITATION.cff) and #2 (SECURITY.md) removed 2026-03-25: confirmed present in all three repos (backend, frontend, datasets). Completed as part of implemented/2026-02-12-governance-seo-and-security-foundations.md. -->

3. **Add a code of conduct to all repos** (S: 1h)
4. **Add LICENSE to datasets repo** (S: 30m) — confirmed still missing as of 2026-03-25
5. **Add GitHub issue and PR templates across repos** (S: 2-3h) -
   this monorepo now has structured bug and feature issue forms, specialized
   report routing, and PR guidance. Coverage in repositories outside this
   checkout remains unverified.
7. **Add changelog/release tags to backend and frontend** (M: 1 day)

### Reliability, security, and CI

25. **Track the frontend Next/PostCSS production dependency advisory until an upstream-safe fix exists** (S: 1-2h)
    - Current evidence: `npm audit --omit=dev --json` on 2026-05-06 reports
      the PostCSS XSS advisory through `next@16.2.4` / bundled `postcss`;
      npm's suggested fix points to an old Next major downgrade and should not
      be applied.
    - Next action: watch for a Next release that carries `postcss>=8.5.10`,
      then update through the normal human-authored dependency workflow and run
      frontend parity checks.
25b. **Upgrade frontend ESLint to 10 only after the plugin stack supports it** (S: 1-2h)
     - Current evidence: local verification on 2026-05-06 showed
       `eslint@10.x` fails with `eslint-plugin-react@7.37.5` because the
       plugin peer range only supports ESLint through `^9.7`.
     - Next action: wait for compatible `eslint-plugin-react`/Next ESLint
       support, then re-test the ESLint 10 upgrade through a human-authored
       dependency commit.
25d. **Clean up historical secret-scan noise if full-history scans become a gate** (S: 1-2h)
     - Context: staged secret scanning is part of local commit hygiene, while
       full-history scans can surface old placeholder examples or generated
       local-cache artifacts that need careful review instead of blanket
       suppression.
     - Scope: review any future `gitleaks detect` findings, remove or rewrite
       true false positives where possible, and use a narrow documented
       baseline only when preserving historical context is more appropriate
       than history surgery.
     - Done when: the chosen full-history scan posture is documented and either
       runs clean or has a reviewed baseline that does not suppress real
       secrets.
25e. **Track the frontend OpenAPI generator audit path until an upstream-safe fix exists** (S: 1-2h)
     - Current evidence: `npm audit --omit=dev --json` on 2026-06-22 still
       reports the remaining `js-yaml` advisory path through
       `openapi-typescript` / `@redocly/openapi-core`. Direct local overrides
       to `js-yaml@5` or `@redocly/openapi-core@2` broke the generator stack,
       so they should not be applied as blind audit fixes.
     - Next action: watch for a compatible `openapi-typescript`/Redocly update,
       then update through the normal human-authored dependency workflow and
       run `make contract-sync`, `make frontend-ci`, and
       `npm audit --omit=dev --json`.

### Documentation and operations maturity

26. **Create explicit data retention schedule table** (S: 2h)
30. **Formalize ethics/research exemption statement** (S: 1-2h)
31. **Add error tracking integration (Sentry)** (M: 1 day)
32. **Add automated uptime monitoring badge** (S: 1-2h) — external monitor (UptimeRobot) is described in the monitoring checklist but public badge and history page are not yet confirmed live as of 2026-03-25
33. **Add public status page content with uptime history** (M: 1 day) — `../operations/service-levels.md` notes no dedicated status page yet
34b. **Measure and record API/operational performance baselines** (S: 1-2h) — all baseline fields in `../operations/service-levels.md` remain TBD since 2026-01-18; collect real p50/p95 measurements from production under normal load and fill in the table
34c. **Split private operational assets from the public repo surface** (M-L: 2-4 days)
     - Context: the public docs portal and generated `docs/llms.txt` are now
       constrained to public-safe project, methodology, API, contribution, and
       local-development material. Public deployment and operations docs are
       now summaries or boundary stubs; any detailed operator procedures belong
       in the private operations workspace.
     - 2026-06-05 status: final public-boundary cleanup replaced the public
       production runbook and monitoring guide with public-safe stubs, added a
       fake platform-contract example, migrated durable private originals to
       the private/shared operations source of truth, and preserved ignored
       local `private/` copies for convenience. Broader operator-only
       docs/scripts remain in tracked Git and still need a deliberate split.
     - 2026-06-05 second-pass status: public `docs/deployment/` and
       `docs/operations/` operator runbooks, continuity procedures, validation
       playbooks, runtime templates, and historical incident details were
       replaced with public-boundary stubs or removed from tracked public docs.
     - 2026-06-05 final status: the public operations index no longer advertises
       operator procedures, external/adoption playbooks are boundary stubs, and
       tests enforce exact public-boundary tombstones plus a public-safe
       non-stub allowlist.
     - 2026-06-28 status: public monitoring summary wording and generated LLM
       context tests were tightened during the autonomous maintenance queue.
       Broader operator-only asset separation remains in scope here.
     - Scope: keep the public documentation boundary enforced, and only retain
       generalized templates or application-contract files in public Git when
       they use explicit placeholders.
     - Done when: repo-root READMEs, generated docs, and tracked documentation
       no longer expose private host paths or operational continuity details, while
       any remaining operational templates have explicit public-safe placeholders
       and tests that describe their contract.

### Frontend quality and public communication

35. **Consolidate bilingual strings (remove inline ternaries)** (L: 1-2 weeks)
    - 2026-07-13 phase: archive discovery/search now uses one typed catalog
      across `/archive`, source browsing, result cards, filters, clipboard
      feedback, and API-health diagnostics, with English/French rendering tests.
    - Remaining scope: migrate the other public workflows in coherent batches;
      do not reintroduce inline copy selection in the completed archive workflow.
36. **Add automated performance/Lighthouse testing** (M: 1 day)
38. **Add coverage badges to READMEs** (S: 1-2h)
42. **Create automated WARC/data integrity report** (M: 1 day)

## Adjacent / optional (in this monorepo, not core HA)

- `rcdc/CDC_zim_mirror`: add startup DB sanity checks and clearer failure modes (empty/invalid LevelDB, missing prefixes, etc.).
  - Scope status (2026-07-10): blocked. The named subproject is absent from the
    current `origin/main` tree, has no matching path in this repository's
    reachable history, and was not found in the recursively searched workspace.
  - Resume only after the canonical source is restored/imported here or its
    maintained repository is linked explicitly. Re-read that project's local
    instructions and test harness before planning the startup validation.
