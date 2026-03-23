# Incident: Annual crawl — PHAC canada.ca HTTP/2 thrash (2026-03-23)

Status: draft (ongoing)

## Metadata

- Date (UTC): 2026-03-23
- Severity: sev1
- Environment: production
- Primary area: crawl
- Owner: (unassigned)
- Start (UTC): 2026-03-23T10:39:22Z
- End (UTC): ongoing

---

## Summary

The annual PHAC crawl (`job_id=7`) entered a sustained failure loop on `www.canada.ca` with repeated document-level `net::ERR_HTTP2_PROTOCOL_ERROR` errors. The observed failures were broader than the previously excluded `public-health-notices` subtree and covered many in-scope PHAC URLs under both English and French paths.

We first confirmed that the deployed backend was missing the repo-side PHAC scope reconciliation fix, then deployed that fix and reconciled the live PHAC job config. A controlled PHAC-only restart picked up the corrected scope exclusion, but the crawl still flatlined, so a broader source-profile compatibility fix (`--extraChromeArgs --disable-http2`) was prepared in the repo and is pending production deployment/verification at the time of this note.

## Impact

- User-facing impact: annual campaign remained `Ready for search: NO`.
- Internal impact: repeated operator intervention was required to inspect logs, reconcile config drift, and restart PHAC without interrupting CIHR.
- Data impact:
  - Data loss: unknown.
  - Data integrity risk: low/unknown (the issue is crawl completeness/progress, not known corruption).
  - Recovery completeness: partial at time of write-up.
- Duration: ongoing.

## Detection

- `rg` on the PHAC combined log showed repeated `Page Load Failed: retry limit reached` entries with `net::ERR_HTTP2_PROTOCOL_ERROR`.
- `./scripts/vps-crawl-status.sh --year 2026 --job-id 7 --recent-lines 5000` showed:
  - `crawled` flat at `267`
  - `crawl_rate_ppm=0`
  - `last_progress_age_seconds` continuing to climb
  - no useful forward progress after restart
- `show-job --id 7` and process inspection confirmed the live runner was initially using stale PHAC passthrough args and later picked up the corrected scope exclusion after deploy/restart.

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
- 2026-03-23T12:xx:xxZ — Repo-side follow-up compatibility change prepared: HC/PHAC annual profiles now add Browsertrix `--extraChromeArgs --disable-http2` and annual reconciliation treats that as canonical passthrough state.

## Root cause

- Immediate trigger: repeated document-level HTTP/2 protocol failures on canada.ca pages prevented PHAC from making useful crawl progress.
- Underlying cause(s): current Browsertrix/chromium transport behavior appears incompatible with some canada.ca annual PHAC pages under the existing source profile; the single `public-health-notices` exclusion was not sufficient to restore progress.

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

Prepared but not yet production-verified:

- Repo-side HC/PHAC source-profile compatibility change adding Browsertrix `--extraChromeArgs --disable-http2`.
- Tests covering annual reconciliation and watchdog scope-arg normalization for the new passthrough behavior.

## Post-incident verification

Completed so far:

- Public surface verification passed after the backend deploy.
- PHAC live process verification showed the reconciled `scopeExcludeRx` was active after restart.
- CIHR remained healthy and was not interrupted during PHAC-specific recovery.

Still required:

- Deploy the Browsertrix compatibility change.
- Reconcile HC/PHAC annual job configs again.
- Restart PHAC once with the new config.
- Confirm `crawled` advances, `crawl_rate_ppm` becomes non-zero, and PHAC is no longer thrashing on the same error pattern.

## Open questions (still unknown)

- Does `--disable-http2` restore useful PHAC progress on production without harming completeness materially?
- Once the compatibility flag is live, is the temporary `public-health-notices` exclusion still necessary?
- Should HC pick up the same compatibility flag immediately through annual reconciliation, even if HC is not currently failing on the same pattern?

## Action items (TODOs)

- [ ] Deploy the HC/PHAC Browsertrix compatibility change with a pinned ref and verify the VPS checkout contains `--disable-http2`. (priority=high)
- [ ] Reconcile annual HC/PHAC job configs in production and confirm `show-job --id 6/7` reflect the canonical passthrough args. (priority=high)
- [ ] Perform one controlled PHAC restart with the new compatibility config and record the outcome in this note. (priority=high)
- [ ] Decide whether the temporary PHAC `public-health-notices` exclusion can be removed after live verification. (priority=medium)
- [ ] If PHAC still flatlines after the compatibility change, capture a narrower set of recurring failing URL families and design a follow-up mitigation. (priority=medium)

## Automation opportunities

- Extend operator snapshots so they surface the live Browsertrix compatibility flags alongside scope filters for running annual jobs.
- Consider a dedicated “config drift before recovery” operator check in crawl-stall tooling so stale VPS checkouts are caught immediately.

## References / Artifacts

- Operator snapshot script: `scripts/vps-crawl-status.sh`
- Playbook: `../playbooks/crawl/crawl-stalls.md`
- Playbook: `../playbooks/core/deploy-and-verify.md`
- Runbook: `../runbooks/crawl-restart-budget-low.md`
- Annual scope/source policy: `../annual-campaign.md`
