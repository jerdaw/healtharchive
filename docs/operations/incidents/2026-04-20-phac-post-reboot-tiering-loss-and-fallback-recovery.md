# Incident: PHAC post-reboot tiering loss and fallback recovery (2026-04-20)

Status: closed

## Metadata

- Date (UTC): 2026-04-20
- Severity (see `operations/incidents/severity.md`): sev2
- Environment: production
- Primary area: crawl
- Owner: Jeremy Dawson
- Start (UTC): 2026-04-20T13:20:03Z
- End (UTC): 2026-04-20T14:35:09Z

---

## Summary

After the VPS recovery window, PHAC annual job `7` restarted into a broken
output-dir state: its hot path had drifted off the Storage Box tier and onto a
local placeholder that the worker could not write. Once tiering and writability
were restored, fresh Browsertrix still failed both PHAC seed documents with
`net::ERR_HTTP2_PROTOCOL_ERROR`. The bounded recovery was to validate the
`playwright_warc` fallback on the live seeds, deploy the fallback-WARC
numbering fix, and resume PHAC under the fallback backend.

## Impact

- User-facing impact:
  - the 2026 annual campaign stayed not-search-ready longer than expected
  - PHAC was unavailable for new indexed search content while job `7` was down
- Internal impact (ops burden, automation failures, etc):
  - manual VPS triage, storage repair, and job-state intervention were required
  - the current ops tracker and planning docs drifted behind the live PHAC state
- Data impact:
  - Data loss: no
  - Data integrity risk: yes, before the fallback-WARC numbering fix was deployed
  - Recovery completeness: complete
- Duration:
  - about 75 minutes from the failed Browsertrix restart to the healthy
    fallback restart

## Detection

- Detected during operator-led post-reboot annual-crawl verification with:
  - `./scripts/vps-crawl-status.sh --year 2026 --job-id 7`
  - `healtharchive show-job --id 7`
  - `findmnt -T "$OUT_DIR"`
  - worker-user writability probes on the PHAC output dir
- Most useful signals:
  - `show-job` / combined-log tails showing `.archive_state.json` permission
    failures and then fresh Browsertrix `ERR_HTTP2_PROTOCOL_ERROR` seed
    failures
  - `probe-browser-fetch` demonstrating that the pinned `playwright_warc`
    runtime could fetch both PHAC seeds successfully
  - crawl metrics confirming fallback activation and sustained progress once the
    fallback run was live

## Decision log

- 2026-04-20T14:25:13Z — Decision: use `probe-browser-fetch` before any PHAC
  backend promotion (why: confirm the fallback runtime is viable on the actual
  seed URLs, risks: adds a bounded operator step but avoids blind restarts)
- 2026-04-20T14:30:00Z — Decision: deploy the fallback-WARC numbering fix
  before re-running PHAC under `playwright_warc` (why: prevent fallback reruns
  from overwriting `warc-000001.warc.gz`, risks: delays restart until the repo
  fix is deployed)

## Timeline (UTC)

- 2026-04-20T13:20:03Z — PHAC job `7` starts again after the earlier recovery
  window.
- 2026-04-20T13:21:00Z — Fresh Browsertrix attempt logs
  `net::ERR_HTTP2_PROTOCOL_ERROR` on `https://www.canada.ca/en/public-health.html`.
- 2026-04-20T13:21:01Z — Fresh Browsertrix attempt logs the same error on
  `https://www.canada.ca/fr/sante-publique.html`.
- 2026-04-20T13:21:43Z — Post-reboot verification snapshot shows PHAC running
  with `WARC files (discovered): 273` but `WARC files: 0`, and no indexed pages.
- 2026-04-20T14:24:51Z — `healtharchive probe-browser-fetch` starts against the
  two PHAC seed URLs.
- 2026-04-20T14:25:13Z — Probe confirms both seed URLs are fetchable via
  `playwright_warc` with `200`.
- 2026-04-20T14:30:03Z — PHAC is recovered from stale-running state to
  `retryable`, then patched to `capture_backend=playwright_warc`.
- 2026-04-20T14:35:09Z — PHAC starts cleanly under `playwright_warc`.
- 2026-04-20T15:00:13Z — Live crawl verification shows PHAC progressing under
  fallback with `crawled=191`, `failed=0`, and new stable WARCs appended above
  `warc-000273.warc.gz`.

## Root cause

- Immediate trigger:
  - post-reboot annual output-dir tiering drift left the PHAC hot path on an
    unwritable local placeholder, so worker state writes failed
- Underlying cause(s):
  - the annual output-dir topology still relied on direct `sshfs` mounts rather
    than the intended bind-mount layout, making post-reboot drift harder to
    reason about
  - PHAC seed fetches still reproduce Browsertrix/Canada.ca HTTP/2 document
    failures even after the managed Browsertrix config and `--disable-http2`
    propagation fixes

## Contributing factors

- The production run started with the older fallback backends that would have
  reused `warc-000001.warc.gz` on reruns, so the safe fallback relaunch had to
  wait for a repo deployment.
- PHAC and CIHR were both active, which raised the bar for any maintenance that
  could interrupt live output dirs.
- The current ops roadmap still described PHAC as failed/parked, which added
  documentation drift during the live recovery session.

## Resolution / Recovery

1. Verified the Storage Box tier was healthy and isolated the PHAC output-dir
   problem to the hot-path drift / writability failure.
2. Re-ran annual output-dir tiering with the production backend environment
   loaded so the helper talked to PostgreSQL instead of falling back to SQLite.
3. Confirmed PHAC output-dir writability for the worker user again.
4. Let the fresh Browsertrix retry prove the deeper failure mode:
   both PHAC seeds failed with `net::ERR_HTTP2_PROTOCOL_ERROR`.
5. Ran `healtharchive probe-browser-fetch` for the PHAC seed URLs and verified
   `playwright_warc` succeeded on both.
6. Patched PHAC job `7` to `capture_backend=playwright_warc`.
7. Deployed the repo fix that makes fallback backends append to the next free
   stable WARC slot.
8. Let the worker restart PHAC under fallback and verified healthy crawl
   progress plus appended stable WARC numbering.

## Post-incident verification

What we did to confirm we’re actually healthy (and not just “running”).

- Public surface checks:
  - `probe-browser-fetch` returned `200` for both PHAC seed pages
- Worker/job health checks:
  - `healtharchive show-job --id 7`
  - `./scripts/vps-crawl-status.sh --year 2026 --job-id 7`
  - crawl metrics showed `configured_backend=playwright_warc`,
    `fallback_active=1`, `failed=0`, and fresh progress
- Storage/mount checks (if relevant):
  - `findmnt -T "$OUT_DIR"`
  - worker-user writability probe on the PHAC output dir
- Integrity checks (if relevant):
  - stable WARC numbering advanced to `warc-000275.warc.gz` and higher instead
    of reusing `warc-000001.warc.gz`

## Open questions (still unknown)

- Should PHAC remain Browsertrix-first in future annual campaigns, or should
  the source default change once the current fallback run is complete?
- Is the temporary PHAC `public-health-notices` exclusion still necessary after
  the fallback run finishes and coverage is reviewed?

## Action items (TODOs)

- [ ] Monitor PHAC to completion and index it if it finishes successfully (owner=Jeremy Dawson, priority=high, due=2026-04-21)
- [x] Index HC job `6` once the annual run window allows it (completed 2026-04-23; `262567` snapshots indexed) (owner=Jeremy Dawson, priority=high, due=2026-04-21)
- [ ] Finish the HC replay fix now that diagnosis is concrete: `healtharchive replay-reconcile --job-id 6` reports `missing_index,missing_warc_links`, and `--apply` as `haadmin` fails with `Permission denied` inside `/srv/healtharchive/replay/collections/job-6/archive`; rerun reconcile as root and redeploy the service template so future replay automation is not stuck behind the same ownership mismatch (owner=Jeremy Dawson, priority=high, due=2026-04-24)
- [ ] Deploy the API-side browse-URL suppression patch so public `browseUrl` fields are omitted whenever a job’s replay collection is missing or incomplete, then rerun `verify_public_surface.py --timeout-seconds 60` to confirm the HC replay `404` is gone (owner=Jeremy Dawson, priority=high, due=2026-04-24)
- [ ] Revisit PHAC’s long-term Browsertrix/default-backend strategy after the current fallback run completes (owner=Jeremy Dawson, priority=medium, due=2026-04-30)
- [ ] Restart the worker during the next safe maintenance window after PHAC/CIHR are idle so the deployed `a3e0dece` worker-side rowcount/logging fix becomes active in production (owner=Jeremy Dawson, priority=medium, due=2026-05-15)
- [ ] Review the preserved VPS branch `prod-pre-a3e0dece` and decide whether its detached pre-deploy commits (`d8e2534e`, `607df02b`, `48cfe3f9`) need cherry-pick, replacement, or explicit retirement (owner=Jeremy Dawson, priority=medium, due=2026-05-01)
- [ ] Convert annual output dirs from direct `sshfs` mounts to bind mounts during the next acceptable maintenance window after the annual crawl is idle (owner=Jeremy Dawson, priority=medium, due=2026-05-15)

## Automation opportunities

- Keep the post-reboot verification path centered on `annual-status`,
  `show-job`, `vps-crawl-status.sh`, and `probe-browser-fetch` so future PHAC
  recoveries do not rely on ad hoc log archaeology.
- The direct-`sshfs` annual output-dir topology should still be retired in a
  later maintenance window; that remains the long-term reduction in post-reboot
  tiering drift risk.

## References / Artifacts

- `./scripts/vps-crawl-status.sh` snapshot(s):
  - `timestamp_utc=2026-04-20T13:21:43Z`
  - `timestamp_utc=2026-04-20T15:08:00Z`
- Relevant log path(s):
  - `/srv/healtharchive/jobs/phac/20260101T000502Z__phac-20260101/archive_initial_crawl_-_attempt_1_20260420_132017.combined.log`
  - `/srv/healtharchive/jobs/phac/20260101T000502Z__phac-20260101/archive_playwright_warc_capture_20260420_143518.combined.log`
- Metric names:
  - `healtharchive_crawl_running_job_configured_backend_info`
  - `healtharchive_crawl_running_job_fallback_active`
  - `healtharchive_crawl_running_job_crawl_rate_ppm`
  - `healtharchive_crawl_running_job_last_progress_age_seconds`
- Related playbooks/runbooks:
  - `docs/operations/playbooks/validation/post-reboot-tiering-verify.md`
  - `docs/operations/playbooks/crawl/annual-campaign.md`
  - `docs/operations/playbooks/storage/storagebox-sshfs-stale-mount-recovery.md`
  - `docs/operations/healtharchive-ops-roadmap.md`
