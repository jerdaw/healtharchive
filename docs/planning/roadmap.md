# HealthArchive roadmap

**Current state:** Repository implementation is stable; the aggregate
data-integrity report and July maintenance, UX, and performance batches,
including the coverage-validated stats fast path, are complete.
**Last updated:** 2026-08-15
**Immediate priority:** none; dataset rights/release containment is complete
and stewardship is event-triggered. There is no active conversion campaign.
**Repository-only execution queue:** empty until a trigger in the table below
is satisfied.

Current dataset publication posture:
`../decisions/2026-08-12-dataset-publication-and-stewardship.md`.

**Rollout status (2026-08-12):** the prerequisite datasets controls are
published and verified through PR 15 at
`802a91168ef6d315d22c8e14a14a33182b354cd5`; the time-robust rights wording is
published at final datasets state `ba39fd13315d32db78edc47fbcd90c98109b6b22`.
Scheduled publication and keepalive are absent, manual dispatch remains, the
rights notice resolves, and the 15/24 schema guards pass. Monorepo PR 154
merged as `443edd97278cf0c21bb525f24696dce2ddb61cad`; frontend release
`ac4e88cb1775` is live, the bilingual public surfaces were verified, and the
prior release remains the rollback target. The containment rollout is closed.

This file tracks **not-yet-implemented** work and planned upgrades. Completed
implementation records belong in `implemented/`, not in the active queue.

It is intentionally **not** an implementation plan.

## Priority and readiness

| Priority | Outcome | Readiness | Gate / next action |
|----------|---------|-----------|--------------------|
| Gate | Choose any future data-continuity posture | Owner-triggered; inactive | Open a separate decision using current rights, storage, restore/replay, automation reliability, and operator capacity evidence; absent approval, keep the corpus bounded and historical |
| P1 | Preserve existing releases and archive data safely | Event-triggered maintenance | Act on a concrete integrity, security, backup, replay, schema, or public-claim defect; do not create a standing work quota |
| Gate | Request one qualified rights review | Owner-triggered; packet prepared | Use the datasets [RIGHTS.md](https://github.com/jerdaw/healtharchive-datasets/blob/main/RIGHTS.md) packet only after a named reviewer, exact question, written output, workload cap, and maintainer approval are recorded; packet preparation does not authorize contact |
| P1 | Permit at most one later outside stewardship review | Conditional/capacity-gated | Proceed only after a separate decision, with one defined question, qualified reviewer, attributable output, workload cap, and no competing external sprint |
| P1 | Improve large-job indexing only when live evidence warrants it | Conditional | Use durable progress history to choose checkpointing, detached execution, or an explicit all-at-once rationale |
| P2 | Resolve WARC-finalization, raw-lookup, or page-search design questions | Decision required | Start a focused plan only after a measured user/operational need selects one option |
| P2 | Maintain upstream dependency and advisory posture | Conditional maintenance | Act only when a compatible upstream fix exists or a concrete security regression appears |
| P3 | Bilingual consolidation and public badges | Later/broad | Reassess only when a bounded independent slice is justified |

Selection rules:

1. Prefer a P0/P1 item whose gate has actually changed.
2. Do not replace live evidence, policy, legal, or operator decisions with
   speculative repository work.
3. For conditional technical items, record the triggering measurement or
   incident in the implementation plan.
4. Do not reactivate scheduled dataset publication, DOI production, generic
   outreach, or repeat-cycle adoption work without a new explicit decision.
5. Do not describe accepted target controls as live before the ordered rollout
   gate is verified.
6. Keep the repository execution queue empty while the owner and event gates
   above remain unchanged; do not turn a prepared packet into standing work.

## How to use this file (workflow)

1. Pick a reasonable amount of work from the items in this backlog.
2. Create a focused implementation plan in `docs/planning/` (example name: `YYYY-MM-<topic>.md`).
3. Implement the work.
4. Update canonical documentation so operators/users can run and maintain the result.
5. Move the completed implementation plan to `docs/planning/implemented/` and date it.

## Outside work and publication (conditional, not active)

There is no standing external-validation, adoption, DOI, methods-paper, or
outbound partnership campaign. The former backlog entries for distribution
partners, named verifiers/advisors, recurring citation collection, a Zenodo
release, and scheduled integrity promotion are superseded as current work by
the dataset publication and stewardship decision.

The following facts and artifacts remain valid:

- Metadata-only public export endpoints and checksum-validated dataset release
  tooling exist.
- Existing releases remain available and are treated as immutable research
  objects, subject to the bounded recovery path.
- The aggregate data-integrity report generator is implemented and the July
  maintenance, UX, and performance batches are complete.
- Outreach templates, a partner kit, a mentions log, and a methods-note outline
  remain historical/reference scaffolding. Their existence is not an
  instruction to begin outreach or publication.

After rights/release/schema and data-continuity containment is complete, at
most one outside stewardship review may be considered if all of these gates
are met:

1. Operator capacity is explicitly available and no other external review
   sprint is active.
2. One qualified reviewer and one concrete stewardship question are selected
   in advance.
3. The expected artifact and workload cap are defined before contact or work.
4. A positive but noncommittal response does not expand the scope.
5. The result is recorded as review or curation evidence; it does not imply
   legal clearance, outside use, institutional adoption, or research impact.

Concrete warm inbound use may be assessed under the same gates. Generic
outreach, DOI production, methods-paper work, and routine promotion remain out
of scope unless a later decision explicitly reactivates one bounded path.

## Transparency & public reporting (policy posture)

- Incident disclosure posture (current default: Option B):
  - Publish public-safe notes only when an incident changes user expectations (outage/degradation, integrity risk, security posture, policy change).
  - Decision record: `../decisions/2026-01-09-public-incident-disclosure-posture.md`
  - Revisit later: consider moving to “Option A” (always publish public-safe notes for sev0/sev1) once operations are demonstrably stable over multiple full campaign cycles.

## Superseded external-validation backlog

The earlier four-gate target—distribution partner, named verifier, recurring
citations, and repeat-cycle publication/operations evidence—is not an active
work program. The same applies to the former advisory-circle and aggregate
transparency promotion items.

These outcomes may still be recorded if they arise from real, permission-aware
outside use or necessary stewardship. They must not be manufactured through a
standing campaign, treated as release gates, or used to justify routine work.
Any later reactivation must compete under the conditional outside-review gates
above and must identify a concrete owner, question, artifact, and stop rule.

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
- Annual WARC capacity and storage-tier decision before any separately
  authorized future campaign.
  - Context: the 2026 annual crawl showed that stable WARC storage can be
    dominated by accidentally retained large media, and that any separately
    authorized future annual campaign would need an explicit storage budget
    before jobs are queued. Current financial policy is no additional spend;
    the storage budget is a capacity
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
    the user-facing retention policy before any separately authorized annual
    jobs are queued.
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
  - Remaining work, only if a future campaign is separately authorized:
    refresh the detailed estimate inputs, host capacity tables, and approval
    notes in the private operations workspace; tune the estimate using observed
    WARC growth.
  - Done when: an explicitly approved planning cycle has a private budget
    record, and subsequent observed storage outcomes are reconciled closely
    enough to support that campaign's capacity decision.
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
    - if a future campaign is separately authorized, decide whether PHAC should
      remain Browsertrix-first or adopt a different default/fallback posture
      after reviewing the indexed fallback coverage
    - determine whether any remaining Browsertrix-only compatibility work is
      worth doing now that the fallback run has been measured
    - decide whether the temporary exclusion is still needed once post-run PHAC
      coverage is reviewed
    - keep the operator path centered on `annual-status`, `list-jobs`, and
      `show-job` so post-run PHAC analysis is observable without ad hoc log
      reconstruction
  - Related docs: public annual-campaign summary under `../operations/`; private
    run-specific guidance in the private operations workspace.
- If a future campaign is separately authorized, continue crawl telemetry
  calibration from that live run, using dashboard trends (crawl rate / phase
  churn / progress age) rather than direct throughput alerts.
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

3. **Add a code of conduct to all repos** (S: 1h) — Later governance batch;
   select one shared policy and attribution posture before copying it across
   repositories.
4. **Resolve the datasets reuse/licensing posture only through qualified owner
   review** (conditional) — No blanket licence selection is current work. A
   future release or reuse-promotion decision remains gated on field-level
   provenance, schema, and applicable-terms review.
5. **Finish GitHub issue and PR template coverage across repos** (S: 1h) —
   CareConnect, HealthArchive, HealthArchive Datasets, VisitBrief, and WaitTime
   have intake templates. Platform Ops is the only workspace repo without
   them; decide whether that private operations repo needs standardized issue
   intake before implementing an exception or forms.
7. **Add changelog/release tags to backend and frontend** (M: 1 day) — Release
   policy and publication intent required before changing tag automation.

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

26. **Create explicit data retention schedule table** (S: 2h) — Policy input
    required; document only approved user-facing retention commitments.
30. **Formalize ethics/research exemption statement** (S: 1-2h) — Human
    ethics/research review required before publication.
31. **Add error tracking integration (Sentry)** (M: 1 day) — Product,
    privacy, account, and operational-ownership decision required.
32. **Add automated uptime monitoring badge** (S: 1-2h) — External monitor
    and public-history ownership required; do not add a badge before the live
    monitor and durable public history are verified.
33. **Add public status page content with uptime history** (M: 1 day) —
    External status/history evidence required; `../operations/service-levels.md`
    currently records no dedicated status page.
34b. **Measure and record API/operational performance baselines** (S: 1-2h) —
     Live production measurement required; collect representative p50/p95
     evidence before filling the currently TBD service-level fields.
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
    - This remains a broad P3 refactor; divide it by one user-visible surface
      when reselected.
    - 2026-07-13 audit: the separate seven-page content improvement plan was
      closed after its remaining correctness and design-system items landed;
      its copy-only rewrite remains deferred here rather than as a duplicate
      active plan.
38. **Add coverage badges to READMEs** (S: 1-2h) — P3; requires a durable,
    trustworthy coverage publication source rather than a static claim.

## Adjacent / optional (in this monorepo, not core HA)

- `rcdc/CDC_zim_mirror`: add startup DB sanity checks and clearer failure modes (empty/invalid LevelDB, missing prefixes, etc.).
  - Scope status (2026-07-10): blocked. The named subproject is absent from the
    current `origin/main` tree, has no matching path in this repository's
    reachable history, and was not found in the recursively searched workspace.
  - Resume only after the canonical source is restored/imported here or its
    maintained repository is linked explicitly. Re-read that project's local
    instructions and test harness before planning the startup validation.
