# Incident: Annual crawl — PHAC canada.ca HTTP/2 thrash (2026-03-23)

Status: contained

## Metadata

- Date (UTC): 2026-03-23
- Severity: sev1
- Environment: production
- Primary area: crawl
- Owner: (unassigned)
- Start (UTC): 2026-03-23T10:39:22Z
- End (UTC): 2026-03-23T22:43:58Z

---

## Summary

The annual PHAC crawl (`job_id=7`) entered a sustained failure loop on
`www.canada.ca` with repeated document-level `net::ERR_HTTP2_PROTOCOL_ERROR`
errors. The observed failures were broader than the previously excluded
`public-health-notices` subtree and covered many in-scope PHAC URLs under both
English and French paths.

We first confirmed that the deployed backend was missing the repo-side PHAC scope reconciliation fix, then deployed that fix and reconciled the live PHAC job config. A controlled PHAC-only restart picked up the corrected scope exclusion, but the crawl still flatlined, so a broader source-profile compatibility fix (`--extraChromeArgs --disable-http2`) was prepared, deployed, and verified in the live PHAC process.

Follow-up log review later showed that compatibility change was itself invalid
for the deployed zimit image: each restart failed during zimit's `warc2zim`
preflight with `unrecognized arguments: --extraChromeArgs --disable-http2`.
That self-inflicted failure was then removed from the live path.

Subsequent repo-side investigation confirmed the underlying zimit mismatch: the
deployed `v3.0.5` entrypoint treats unknown arguments as `warc2zim` arguments
and does not recognize Browsertrix `extraChromeArgs` itself, even though
Browsertrix supports them. The follow-up runtime fix therefore moved the
managed canada.ca HTTP/2 workaround into a Browsertrix config file passed via
zimit's supported `--config` path for fresh/new crawl phases instead of mixed
CLI passthrough.

The immediate repo-side follow-up was to:

- harden `archive_tool` monitoring so a stage that emits no `crawlStatus` for a
  full stall window is treated as an explicit monitored stall
  (`reason=no_stats`) instead of remaining silently `running`
- route the Browsertrix-only HTTP/2 workaround through a managed config file
  passed via zimit `--config`
- merge that managed Browsertrix config into resumed crawl config as well, so
  resumed phases preserve the same override as fresh/new phases

The final empirical result after those fixes was:

- the config/plumbing bug was resolved for both fresh and resumed PHAC runs
- the old `warc2zim` preflight failure disappeared
- PHAC still did not resume useful crawl progress, and resumed runs could still
  terminate immediately with `crawled=0 total=2 failed=2` and effectively empty
  WARC output

So the incident was contained, but the deeper PHAC runtime/state issue remains
open as future work.

## Impact

- User-facing impact: annual campaign remained `Ready for search: NO`.
- Internal impact: repeated operator intervention was required to inspect logs, reconcile config drift, and restart PHAC without interrupting CIHR.
- Data impact:
  - Data loss: unknown.
  - Data integrity risk: low/unknown (the issue is crawl completeness/progress, not known corruption).
  - Recovery completeness: partial at time of write-up.
- Duration: approximately 12h 04m.

## Detection

- `rg` on the PHAC combined log showed repeated `Page Load Failed: retry limit reached` entries with `net::ERR_HTTP2_PROTOCOL_ERROR`.
- `./scripts/vps-crawl-status.sh --year 2026 --job-id 7 --recent-lines 5000` showed:
  - `crawled` flat at `267`
  - `crawl_rate_ppm=0`
  - `last_progress_age_seconds` continuing to climb
  - no useful forward progress after restart
- `show-job --id 7` and process inspection confirmed the live runner was
  initially using stale PHAC passthrough args, then later picked up the
  corrected scope exclusion and finally the managed Browsertrix config after the
  repo-side follow-up deploys.

## Decision log

- 2026-03-23T11:3x:00Z — Deferred PHAC recovery until the repo-side reconciliation fix was committed, pushed, and deployed. Recovery against undeployed code was explicitly rejected.
- 2026-03-23T11:4x:00Z — Chose a PHAC-only stop/recover/restart path to avoid interrupting the healthy CIHR crawl.
- 2026-03-23T12:00:49Z — After confirming the `public-health-notices` exclusion was active in the live PHAC process, concluded the remaining failure pattern was broader than that subtree and required a source-profile compatibility change rather than repeated blind restarts.

## Timeline (UTC)

- 2026-03-23T10:39:22Z — Earliest operator-captured PHAC log entry in the current incident window shows `net::ERR_HTTP2_PROTOCOL_ERROR`.
- 2026-03-23T11:37:55Z — Backend deploy completed on the VPS with the annual scope reconciliation fix active.
- 2026-03-23T11:39:xxZ — `show-job --id 7` confirmed PHAC config now included the canonical `public-health-notices` exclusion.
- 2026-03-23T11:49:48Z — Existing PHAC runner stopped cleanly via its transient systemd unit.
- 2026-03-23T11:49:53Z — `recover-stale-jobs --apply --source phac --limit 1` marked job 7 `retryable`.
- 2026-03-23T11:50:02Z — PHAC job 7 relaunched.
- 2026-03-23T12:00:49Z — Status snapshot showed PHAC still flatlined at `crawled=267`, `crawl_rate_ppm=0`, and `container_restarts_done=30`.
- 2026-03-23T12:37:46Z — Backend deploy completed on the VPS with the Browsertrix compatibility change active (`b863ec0`).
- 2026-03-23T12:43:34Z — PHAC was relaunched via a new transient systemd unit after `recover-stale-jobs` marked job 7 `retryable`.
- 2026-03-23T12:43:35Z — New live PHAC process started with `--extraChromeArgs --disable-http2` confirmed in the command line.
- 2026-03-23T12:55:29Z — Status snapshot showed no recent HTTP/2/timeouts, but also no parseable `crawlStatus` and no measurable progress (`progress_known=0`, `crawl_rate_ppm=-1`).
- 2026-03-23T13:12:30Z — Follow-up snapshot still showed no progress and no new WARC mtimes while the state file kept updating and the latest log had advanced to `archive_resume_crawl_-_attempt_8_...`.
- 2026-03-23T13:18:16Z — PHAC job 7 was parked as `retryable` again pending repo-side investigation.
- 2026-03-23T18:57:26Z — Direct inspection of the newest PHAC resume log showed `zimit: error: unrecognized arguments: --extraChromeArgs --disable-http2` during the `warc2zim` preflight check.
- 2026-03-23T19:24:07Z — The newest PHAC log still showed the old incompatible
  `warc2zim` preflight failure (`unrecognized arguments`) from the broken
  passthrough path.
- 2026-03-23T19:26:17Z — After the rollback/reconcile, PHAC was restarted with
  the legacy passthrough removed and returned to real crawl behavior instead of
  immediate preflight failure.
- 2026-03-23T21:17:50Z — PHAC again crossed the HTTP/network threshold with
  repeated `net::ERR_HTTP2_PROTOCOL_ERROR` on core PHAC publication families,
  confirming the deeper issue remained after the passthrough rollback.
- 2026-03-23T22:00:25Z — PHAC was relaunched under the managed Browsertrix
  config path; the first fresh/new launch used zimit
  `--config /output/.browsertrix_managed_config.yaml`.
- 2026-03-23T22:08:15Z — Resume attempts still collapsed into
  `crawled=0 total=2 failed=2` with unprocessable/empty WARC output because the
  managed Browsertrix config had not yet been propagated into `.zimit_resume.yaml`.
- 2026-03-23T22:33:38Z — After the resume-merge follow-up deploy, resumed PHAC
  launches were verified to use `--config /output/.zimit_resume.yaml`, and the
  live `.zimit_resume.yaml` contained `extraChromeArgs: ['--disable-http2']`.
- 2026-03-23T22:37:23Z — Even with the managed Browsertrix config present on
  resumed phases, PHAC still ended immediately with `crawled=0 total=2 failed=2`
  and `WARC file(s) is unprocessable and looks probably mostly empty`.
- 2026-03-23T22:43:58Z — Job 7 was deliberately parked as `retryable` with the
  worker stopped to avoid further blind retries against the unresolved
  PHAC runtime/state problem.

## Root cause

- Immediate trigger: repeated document-level HTTP/2 protocol failures on
  canada.ca pages prevented PHAC from making useful crawl progress.
- Secondary trigger introduced during mitigation: the deployed zimit image
  rejected `--extraChromeArgs --disable-http2` during its `warc2zim` preflight
  step, causing immediate `RC=2` failures before crawl startup.
- Packaging detail behind the secondary trigger: zimit `v3.0.5` forwards
  unknown arguments to `warc2zim` and does not treat Browsertrix
  `extraChromeArgs` as a known crawler argument on its own entrypoint.
- Control-plane gap discovered during follow-up: the monitor only treated
  "known progress went stale" as a stall, so stages that emitted no
  `crawlStatus` at all could avoid intervention indefinitely until the
  repo-side `no_stats` stall fallback was added.
- Final root-cause status at containment time:
  - resolved: stale annual config drift and broken Browsertrix flag plumbing
  - unresolved: a deeper PHAC crawler/runtime or resume-state incompatibility
    remained even after the fresh/new and resumed Browsertrix config paths were
    fixed

## Contributing factors

- The first PHAC recovery attempt happened after discovering that the VPS checkout did not yet contain the repo-side scope reconciliation change.
- PHAC and HC share the canada.ca host, which makes broad exclusions risky for completeness.
- PHAC had already exhausted its adaptive container restart budget (`30`), so the live run was no longer self-healing.

## Resolution / Recovery

Performed so far:

- Verified the missing PHAC scope reconciliation code on the VPS checkout.
- Committed, pushed, and deployed the PHAC scope reconciliation fix.
- Reconciled the live PHAC annual job config in place.
- Verified `show-job --id 7` included the canonical `public-health-notices` exclusion.
- Performed a PHAC-only stop/recover/restart without interrupting CIHR.
- Confirmed the restarted PHAC process picked up the corrected `scopeExcludeRx`.

Completed after the initial draft:

- Deployed the repo-side HC/PHAC source-profile compatibility change adding Browsertrix `--extraChromeArgs --disable-http2`.
- Reconciled the live HC/PHAC annual job configs in production.
- Relaunched PHAC and verified the live process included `--extraChromeArgs --disable-http2`.
- Identified that the compatibility change itself was invalid for the deployed zimit image because `warc2zim` preflight rejected those flags.
- Paused PHAC again rather than allowing repeated blind restarts.
- Implemented repo-side monitor hardening so stages that emit no `crawlStatus`
  for an entire stall window now trigger a `no_stats` intervention path.
- Implemented repo-side managed Browsertrix config support so HC/PHAC can carry
  browser-only options (including `extraChromeArgs`) via zimit `--config`
  instead of the incompatible mixed CLI passthrough.
- Implemented repo-side resume-config merging so resumed HC/PHAC phases also
  preserve the managed Browsertrix config instead of dropping back to a raw
  `.zimit_resume.yaml`.
- Implemented repo-side poisoned-resume fallback for managed-browsertrix jobs:
  when the newest resumed run ended with `crawled=0 total=2 failed=2` and the
  empty/unprocessable-WARC tail error, `archive_tool` now skips that queue and
  starts a new crawl phase with consolidation instead of blindly resuming the
  same broken state again.
- Hardened the fallback so malformed or empty trailing `crawlStatus.details`
  entries no longer suppress it; `archive_tool` now falls back to the most
  recent usable stats line and still treats the queue as poisoned when the
  empty-WARC tail signature is present.
- Verified in production that:
  - fresh/new PHAC launches used zimit
    `--config /output/.browsertrix_managed_config.yaml`
  - resumed PHAC launches used zimit `--config /output/.zimit_resume.yaml`
  - the live `.zimit_resume.yaml` contained `extraChromeArgs:
    ['--disable-http2']`
- Parked PHAC as `retryable` with the worker stopped rather than continuing
  blind retries against the same unresolved deeper failure mode.

## Post-incident verification

Completed so far:

- Public surface verification passed after the backend deploy.
- PHAC live process verification showed the reconciled `scopeExcludeRx` was active after restart.
- CIHR remained healthy and was not interrupted during PHAC-specific recovery.

Still required:

- Redeploy the new poisoned-resume fallback before the next HC/PHAC retry so
  the VPS skips the known-bad resume queue automatically.
- Determine whether PHAC still reproduces the same failure from a deliberately
  fresh crawl phase after the poisoned queue is skipped automatically.
- Decide whether the temporary `public-health-notices` exclusion remains
  justified once the deeper crawler/runtime issue is understood.
- Design the next repo-side mitigation only if the fresh-phase path still shows
  the deeper canada.ca runtime/state issue.

## Open questions (still unknown)

- Why does the current PHAC resume queue/state terminate almost immediately with
  `crawled=0 total=2 failed=2` even when the managed Browsertrix config is
  present on resumed phases?
- Is the current PHAC resume queue/state itself poisoned, or would the same
  failure reproduce from a truly fresh crawl phase after resume is skipped?
- Once the deeper runtime/state issue is understood, is the temporary
  `public-health-notices` exclusion still necessary?

## Action items (TODOs)

- [x] Deploy the HC/PHAC Browsertrix compatibility change with a pinned ref and verify the VPS checkout contains `--disable-http2`. (priority=high)
- [x] Reconcile annual HC/PHAC job configs in production and confirm `show-job --id 6/7` reflect the canonical passthrough args. (priority=high)
- [x] Perform one controlled PHAC restart with the new compatibility config and record the outcome in this note. (priority=high)
- [x] Roll back the incompatible HC/PHAC `--disable-http2` passthrough with a pinned deploy and annual reconciliation. (priority=high)
- [x] Deploy the managed Browsertrix-config follow-up for HC/PHAC, reconcile
  annual jobs, and verify the live PHAC start path uses zimit `--config`
  rather than CLI `--extraChromeArgs`. (priority=high)
- [x] Deploy the resumed-phase follow-up so `.zimit_resume.yaml` also preserves
  the managed Browsertrix HTTP/2 workaround. (priority=high)
- [x] Improve ops visibility for repeated `Resume Crawl` churn without `crawlStatus` so this state is obvious in VPS snapshots and metrics. (priority=medium)
- [x] Add a repo-side `archive_tool` monitor fallback so a stage with no `crawlStatus` for the full stall window triggers an explicit `no_stats` intervention instead of silently hanging. (priority=medium)
- [x] Add a repo-side poisoned-resume fallback so HC/PHAC can skip the known
  `crawled=0 total=2 failed=2` empty-WARC resume state and restart from a new
  crawl phase with consolidation. (priority=medium)
- [ ] Decide whether the temporary PHAC `public-health-notices` exclusion can be removed after live verification. (priority=medium)
- [ ] Capture the current deeper PHAC no-progress failure mode and design a
  follow-up mitigation before any future restart. (priority=medium)

## Automation opportunities

- Extend operator snapshots so they surface the live Browsertrix compatibility flags alongside scope filters for running annual jobs.
- Consider a dedicated “config drift before recovery” operator check in crawl-stall tooling so stale VPS checkouts are caught immediately.
- Surface repeated `Resume Crawl` stage churn as a first-class ops signal; counting only `New Crawl Phase` churn hid this incident's actual behavior.

## References / Artifacts

- Operator snapshot script: `scripts/vps-crawl-status.sh`
- Playbook: `../playbooks/crawl/crawl-stalls.md`
- Playbook: `../playbooks/core/deploy-and-verify.md`
- Runbook: `../runbooks/crawl-restart-budget-low.md`
- Annual scope/source policy: `../annual-campaign.md`
