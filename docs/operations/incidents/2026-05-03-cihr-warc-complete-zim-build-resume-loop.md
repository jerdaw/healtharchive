# Incident: CIHR WARC-complete crawl resumed after ZIM build failure (2026-05-03)

Status: resolved

## Metadata

- Date (UTC): 2026-05-03
- Severity (see `operations/incidents/severity.md`): sev1
- Environment: production
- Primary area: crawl
- Owner: Jeremy Dawson
- Start (UTC): 2026-05-03T01:09:59Z
- End (UTC): 2026-05-05T15:40:24Z

---

## Summary

CIHR annual job `8` reached a WARC-complete Browsertrix crawl state on
2026-05-03 with `pending=0`, but Zimit then failed its `warc2zim` step because
it could not find the main seed record in the WARC set being processed. The
archive wrapper treated the non-zero Zimit exit code as a failed crawl stage and
started another resume attempt, even though the captured WARCs were sufficient
for HealthArchive's indexing pipeline. Operators stopped the duplicate crawl,
accepted the completed WARC crawl by marking job `8` as `completed`, and ran
manual `reconcile-completed-indexing` for CIHR. The detached indexing run
completed on 2026-05-04 with `557972` CIHR snapshot rows, and
`annual-status --year 2026` reported all three 2026 annual jobs
`search-ready`.

Post-recovery service restoration completed on 2026-05-05T15:40:24Z:
`ha-check` reported `OK: snapshot complete`, with the worker active, crawl
auto-recover timer active, crawl auto-recover sentinel present, and all three
2026 annual jobs search-ready.

## Impact

- User-facing impact:
  - the 2026 annual campaign remained not search-ready because CIHR was still
    unindexed while HC and PHAC were already search-ready
  - public search continued to serve existing indexed content, but the 2026
    CIHR annual capture was not available in search
- Internal impact (ops burden, automation failures, etc):
  - manual log analysis, worker shutdown, Docker crawl shutdown, direct job
    state correction, and detached indexing were required
  - the worker and crawl auto-recover remained intentionally stopped during CIHR
    indexing, to avoid duplicate crawl/indexing work
  - after CIHR indexing completed, the annual campaign became search-ready; the
    worker and crawl auto-recover services were then restored manually
- Data impact:
  - Data loss: no evidence
  - Data integrity risk: no WARC corruption evidence surfaced during indexing;
    replay verification remains a follow-up check
  - Recovery completeness: annual search readiness and normal worker/watchdog
    posture restored; replay spot checks and annual edition report generation
    remain follow-up verification
- Duration:
  - annual search-readiness impact lasted until indexing completed on
    `2026-05-04T14:37:49Z`
  - operational restoration completed at `2026-05-05T15:40:24Z`

## Detection

- Detected during operator-led annual-campaign checks and log inspection:
  - `healtharchive annual-status --year 2026`
  - `healtharchive show-job --id 8`
  - `rg -n '"context":"crawlStatus"' "$latest" | tail`
  - `tail` of the previous and current CIHR combined logs
  - worker journal inspection around the attempt rollover
- Most useful signals:
  - previous attempt log showing:
    - `crawled=9226`
    - `total=9252`
    - `pending=0`
    - `failed=26`
    - `Crawling done`
  - Zimit `warc2zim` error:
    - `Unable to find WARC record for main page: ZimPath(cihr-irsc.gc.ca/e/193.html), aborting`
  - worker journal showing the wrapper classified RC `4` as a failed stage and
    started `Resume Crawl - Attempt 2`
  - manual indexing log showing WARC discovery found `626` unique WARC files

## Decision log

- 2026-05-03T01:13:47Z - Decision made by the worker wrapper: classify
  `Resume Crawl - Attempt 1` as failed because the Docker/Zimit process exited
  RC `4` (why: generic non-zero process handling, risks: repeats a crawl that
  was already WARC-complete).
- 2026-05-03T01:14:47Z - Decision made by the worker wrapper: start
  `Resume Crawl - Attempt 2` after a one-minute backoff (why: default failed
  stage recovery path, risks: duplicate work and additional temp dirs).
- 2026-05-03, before manual indexing - Operator decision: stop
  `healtharchive-worker.service` and any running Zimit/OpenZIM Docker container
  (why: prevent duplicate crawl work while accepting the completed WARC capture,
  risks: worker remains offline until explicitly restarted).
- 2026-05-03, before manual indexing - Operator decision: mark job `8` as
  `completed` after verifying the previous attempt's last crawlStatus had
  `pending=0` (why: HealthArchive indexes WARCs, and the WARC crawl had
  completed; risks: the 26 final retry failures need coverage review before
  closure).
- 2026-05-03T01:39:52Z - Operator decision: start detached
  `reconcile-completed-indexing --source cihr --limit 1` (why: make the
  WARC-complete job search-ready without restarting crawl, risks: indexing may
  still fail if WARC or storage integrity issues surface).

## Timeline (UTC)

- 2026-05-02T00:39:30Z - `ha-check` shows CIHR job `8` running under
  Browsertrix with `crawled=5122`, `total=8062`, `pending=1`, no recent
  timeouts, and fresh progress.
- 2026-05-02T00:39:30Z - Crawl auto-recover is intentionally paused: timer
  inactive and sentinel missing. This was expected after earlier stale-progress
  false positives during CIHR's final retry tail.
- 2026-05-03T01:09:54Z - `archive_resume_crawl_-_attempt_1_20260502_065415`
  logs `Worker done, all tasks complete`.
- 2026-05-03T01:09:59Z - The same attempt logs final crawlStatus:
  `crawled=9226`, `total=9252`, `pending=0`, `failed=26`, followed by
  `Crawling done` and `Exiting, Crawl status: done`.
- 2026-05-03T01:09:59Z - Zimit starts processing WARC files under
  `/output/.tmpr4uwz1x9/collections/crawl-20260502065419555/archive`.
- 2026-05-03T01:13:44Z - `warc2zim` fails with:
  `Unable to find WARC record for main page: ZimPath(cihr-irsc.gc.ca/e/193.html), aborting`.
- 2026-05-03T01:13:47Z - Worker journal records final RC `4`, parses the last
  crawl stats as `{'crawled': 9226, 'total': 9252, 'pending': 0, 'failed': 26}`,
  marks the stage failed, and schedules another resume crawl.
- 2026-05-03T01:14:47Z - `Resume Crawl - Attempt 2` starts.
- 2026-05-03T01:14:52Z - Current attempt writes
  `archive_resume_crawl_-_attempt_2_20260503_011450.combined.log` and starts a
  new output temp dir, `/output/.tmpu5ncwcp_`.
- 2026-05-03T01:15:00Z - Attempt 2 starts crawling again at
  `https://cihr-irsc.gc.ca/e/54016.html` with `crawled=4123`, `total=7211`.
- 2026-05-03T01:25:27Z - `annual-status --year 2026` still shows CIHR
  `status=running`, `operator_state=running-primary`, `indexed_pages=0`, while
  HC and PHAC are already `search-ready`.
- 2026-05-03T01:25:29Z - `show-job --id 8` reports `TempDirs=175`, `WARC files
  (discovered): 689`, and `Indexed pages: 0`.
- 2026-05-03T01:28:07Z - Operator checks the latest combined log and sees
  attempt 2 actively crawling from `crawled=4128` through `4147`, confirming
  the system was doing more crawl work rather than indexing the completed WARC
  set.
- 2026-05-03, before indexing - Operator stops `healtharchive-worker.service`
  and stops any running OpenZIM/Zimit Docker container.
- 2026-05-03, before indexing - Operator runs a Python job-state correction
  that parses the previous attempt log, verifies `pending=0`, and marks job `8`
  as `completed` with `crawler_exit_code=0`, `crawler_status=success`, and
  `crawler_stage=operator_accepted_warcs_after_zim_build_failure`.
- 2026-05-03T01:39:52Z - Operator starts detached indexing:
  `nohup nice -n 10 ./.venv/bin/healtharchive reconcile-completed-indexing --source cihr --limit 1`.
- 2026-05-03T01:40:09Z - Indexing WARC discovery reports
  `Total unique WARC files found: 626`.
- 2026-05-03T08:25:30Z - Manual indexing log records:
  `Starting indexing for job 8 (689 WARC file(s))`.
- 2026-05-04T14:35:08Z - Manual indexing log records:
  `Rebuilt unknown page group(s) (deleted 0) for job 8`.
- 2026-05-04T14:37:49Z - Manual indexing completes successfully:
  `Indexing for job 8 completed successfully with 557972 snapshot(s)`;
  reconciliation summary shows `Indexed: 1`, `Failed: 0`, `Jobs: 8`.
- 2026-05-05T15:30:51Z - `ha-check` reports `Ready for search: YES`; all
  annual 2026 jobs are indexed/search-ready. CIHR job `8` is `status=indexed`,
  `operator_state=search-ready`, `indexed_pages=557972`.
- 2026-05-05T15:30:51Z - `ha-check` still fails because
  `healtharchive-worker.service` is inactive. The crawl auto-recover timer is
  also inactive and `/etc/healtharchive/crawl-auto-recover-enabled` is missing.
- 2026-05-05T15:32:28Z - Process check for manual indexer PID `3491506`
  confirms the process is gone; the manual reindex log contains the successful
  completion summary.
- 2026-05-05T15:40:24Z - Operator restarts `healtharchive-worker.service`,
  restores `/etc/healtharchive/crawl-auto-recover-enabled`, starts
  `healtharchive-crawl-auto-recover.timer`, and runs `ha-check`.
  `ha-check` reports `OK: snapshot complete`, `worker service active`,
  `Ready for search: YES`, crawl auto-recover timer active, crawl auto-recover
  sentinel present, storage hot-path auto-recover healthy, and no running jobs.

## Root cause

- Immediate trigger:
  - Zimit's `warc2zim` step failed after a Browsertrix crawl-complete state
    because it could not find the main seed record
    `cihr-irsc.gc.ca/e/193.html` in the WARC input it was processing.
- Underlying cause(s):
  - The archive lifecycle conflated WARC capture success with optional ZIM build
    success. HealthArchive's backend indexes WARCs, but the wrapper still
    treated Zimit RC `4` as a failed crawl stage.
  - The final Zimit processing path operated on the latest resume temp dir
    (`.tmpr4uwz1x9`) while CIHR's complete crawl output spanned many temp dirs.
    The main seed record was not present in the WARC subset used by that ZIM
    build.
  - `skip_final_build=True` in the HealthArchive job config did not prevent the
    observed Zimit-side `warc2zim` work inside the crawl container. It only
    guards HealthArchive/archive_tool's own final consolidation stage after the
    containerized Zimit stage returns.

## Contributing factors

- CIHR had accumulated many temp dirs (`175` at diagnosis time), so the WARC set
  was fragmented across resume attempts.
- The final retry tail included many slow pages and direct fetch timeouts before
  completion. The crawl still completed with `pending=0`, but this made the
  logs noisy and the success signal easier to miss.
- The generic failed-stage recovery path is "resume crawl"; it did not inspect
  the last crawlStatus for WARC completeness before retrying.
- Existing health checks treated the job as live because attempt 2 was actively
  crawling. They did not flag "WARC-complete, ZIM build failed, resumed instead
  of indexing."
- The earlier CIHR auto-recover false positive required pausing the
  auto-recover timer and sentinel, reducing automated recovery while operators
  preserved the crawl.

## Resolution / Recovery

Recovery of annual search readiness and normal worker/watchdog posture is
complete. Steps completed:

1. Confirmed auto-recover was not responsible for the 2026-05-03 rollover:
   `healtharchive-crawl-auto-recover.service` had no entries around the attempt
   rollover, and the host had not rebooted.
2. Confirmed attempt 1 reached WARC-complete crawlStatus:
   `pending=0`, `failed=26`, `Crawling done`.
3. Confirmed the subsequent failure was Zimit finalization, not the Browsertrix
   crawl itself:
   `Unable to find WARC record for main page`.
4. Stopped duplicate crawl work:

   ```bash
   sudo systemctl stop healtharchive-worker.service
   sudo docker ps --format '{{.ID}} {{.Image}} {{.Names}}' \
     | awk '/openzim|zimit/ {print $1}' \
     | xargs -r sudo docker stop
   ```

5. Accepted the completed WARC crawl by parsing the previous attempt log and
   setting job `8` to `completed` for WARC indexing:

   ```python
   stats = parse_last_stats_from_log(log_path)
   if not stats or int(stats.get("pending", -1)) != 0:
       raise SystemExit("Refusing: previous attempt does not show pending=0")

   job.status = "completed"
   job.finished_at = datetime.now(timezone.utc)
   job.crawler_exit_code = 0
   job.crawler_status = "success"
   job.crawler_stage = "operator_accepted_warcs_after_zim_build_failure"
   job.combined_log_path = str(log_path)
   job.last_stats_json = stats
   job.pages_crawled = int(stats.get("crawled") or 0)
   job.pages_total = int(stats.get("total") or 0)
   job.pages_failed = int(stats.get("failed") or 0)
   ```

6. Started detached indexing:

   ```bash
   nohup nice -n 10 ./.venv/bin/healtharchive reconcile-completed-indexing --source cihr --limit 1 \
     > "<service-data-root>/ops/manual-runs/cihr-reindex-20260503T013952Z.log" 2>&1 &
   ```

7. Verified indexing discovered WARC inputs:
   `Total unique WARC files found: 626`.

8. Confirmed detached indexing completed successfully:

   ```text
   2026-05-04 14:37:49,492 [INFO] healtharchive.indexing [-]: Indexing for job 8 completed successfully with 557972 snapshot(s).
   Completed-job indexing reconciliation
   Indexed: 1
   Failed:  0
   Jobs:    8
   ```

9. Confirmed annual campaign readiness:
   `annual-status --year 2026` reported `Ready for search: YES` and
   `search-ready=3`.

10. Restored normal service posture:

    ```bash
    sudo systemctl start healtharchive-worker.service
    sudo install -m 0644 -o root -g root /dev/null /etc/healtharchive/crawl-auto-recover-enabled
    sudo systemctl start healtharchive-crawl-auto-recover.timer
    ```

11. Confirmed post-restore health:
    `ha-check` reported `OK: snapshot complete`, `worker service active`,
    `Ready for search: YES`, `healtharchive-crawl-auto-recover.timer active`,
    and sentinel present.

## Recurrence prevention status

The production recovery changed operational state only:

- duplicate crawl work was stopped
- job `8` was manually accepted as WARC-complete for indexing
- detached indexing was run to completion
- the worker and crawl auto-recover watchdog were restored after indexing

Repo-side recurrence prevention has been implemented locally, but it is not a
live production mitigation until the change is committed, pushed, and deployed
to the VPS. The local change:

- classifies the observed `warc2zim` seed-record finalization failure as
  WARC-complete only when the combined log also has final crawlStatus
  `pending=0` and backend WARC discovery finds indexable WARCs
- marks that condition with crawler stage
  `warc_complete_finalization_failed`
- keeps the original non-zero crawler exit code for auditability
- returns crawl success to the worker so indexing starts instead of another
  resume crawl
- surfaces the condition in `show-job`/`annual-status` rescue state and
  operator notes as `warc-complete-finalization-failed`

Remaining recurrence-prevention work:

- deploy and verify the local code path in production
- decide separately whether CIHR/other WARC-only jobs should suppress Zimit's
  internal `warc2zim` path, rather than tolerating its failure after WARC
  completeness is proven
- add a metric/alert if a WARC-complete finalization failure is accepted in a
  future run
- add progress observability for long WARC consolidation/indexing runs

Until the local change is deployed, this incident is operationally resolved but
not prevented by live software. If the same condition recurs before deployment,
the safe recovery path remains manual verification of `pending=0`, stopping
duplicate crawl work, and accepting the completed WARC crawl for indexing.

## Post-incident verification

Indexing completion and service restoration have been verified.

- Public surface checks:
  - done: `annual-status --year 2026` reported `Ready for search: YES`
  - partial: public search for `source=cihr` returned `search_total=485160`
    and recent CIHR result URLs on 2026-05-05
  - partial: public snapshot metadata for sample snapshot `1319121` returned
    `statusCode=200` and original URL
    `https://cihr-irsc.gc.ca/f/54463.html` on 2026-05-05
  - initial failure: `scripts/verify_public_surface.py` with
    `--timeout-seconds 60 --raw-timeout-seconds 300` timed out on the generic
    unfiltered search probe
    `https://api.healtharchive.ca/api/search?pageSize=1` on 2026-05-05; this
    prevented the verifier from selecting a snapshot id and therefore did not
    exercise `/api/snapshot`, raw HTML, or replay URL checks in that run
  - follow-up timing probe on 2026-05-05 showed:
    `pageSize=1` returned in `69.043s`, `pageSize=1&view=pages` in `0.936s`,
    `pageSize=1&source=cihr` in `16.985s`,
    `pageSize=1&source=cihr&view=pages` in `0.342s`,
    `q=covid&pageSize=1` in `73.491s`, and
    `q=covid&pageSize=1&view=pages` in `58.538s`
  - deployed follow-up: `scripts/verify_public_surface.py` falls back to
    `view=pages` to obtain a snapshot id when a primary search mode is slow,
    while preserving the original search failure
  - deployed follow-up: default PostgreSQL public search now relies on stored
    `snapshots.search_vector`, stored `Snapshot.deduplicated`, and a lean
    default broad-query rank
  - final production verification through
    `e9129c4eda31ce8a2b6072454e2ae48f484ecbad` passed the deploy helper,
    baseline drift check, and public-surface verifier; the verifier reached
    search, snapshot metadata, raw HTML, replay URL, usage/changes/RSS,
    frontend English/French pages, snapshot pages, and report forwarder checks
  - final warm-up timing samples:
    `q=covid&pageSize=1` in `3.252s`, `5.476s`, `2.487s`, `2.389s`,
    `1.959s`; `q=covid&pageSize=1&view=pages` in `8.959s`, `6.742s`,
    `4.787s`, `4.566s`, `4.285s`; `pageSize=1` in `6.793s`, `1.885s`,
    `3.678s`, `2.339s`, `2.067s`; `pageSize=1&source=cihr` in `5.919s`,
    `2.329s`, `2.502s`, `3.070s`, `2.491s`
- Worker/job health checks:
  - done: indexing process `3491506` is gone
  - done: indexing log path
    `<service-data-root>/ops/manual-runs/cihr-reindex-20260503T013952Z.log`
    contains successful completion summary
  - done: `healtharchive annual-status --year 2026`
  - done: `healtharchive show-job --id 8 --warc-details` reported job
    `status=indexed`, `WARC files=689`, `WARC files (discovered)=689`,
    `WARC source=stable`, `Manifest valid=True`, total WARC size `709.83 GB`,
    and `Indexed pages=557972`
  - done: `ha-check` reports `OK: snapshot complete`
  - done: `healtharchive-worker.service` active
  - done: `healtharchive-crawl-auto-recover.timer` active and
    `/etc/healtharchive/crawl-auto-recover-enabled` present
- Storage/mount checks (if relevant):
  - current WARC discovery succeeded across the job's tracked temp dirs
  - done: post-restore `ha-check` reported storage hot-path auto-recover timer
    active, sentinel present, and last healthy state at `2026-05-05T15:40:24Z`
- Integrity checks (if relevant):
  - done: CIHR indexed page count is `557972`
  - done: CIHR annual edition report generated with `Status=research_ready`,
    `Search ready=True`, `Research ready=True`, and report JSON
    `<service-data-root>/jobs/editions/cihr/2026/coverage-report.json`
  - done: DB sample found CIHR snapshots from job `8` with `200` status codes
    and stable WARC paths under
    `<service-data-root>/jobs/cihr/20260101T000502Z__cihr-20260101/warcs/`
  - done: public verifier confirmed a CIHR snapshot detail response, raw HTML
    response, and replay URL response after the search follow-through deploys

## Public communication

No public communication has been sent as of this draft. Public search continued
serving existing indexed content, but the annual 2026 search-ready milestone was
delayed. Internal tracking is sufficient unless later replay or coverage checks
find a user-facing integrity issue.

## Open engineering questions

- What exact code/config path should suppress Zimit's internal `warc2zim` build
  when HealthArchive only needs WARC output?
- Are the 26 failed URLs acceptable CIHR coverage gaps, or do any require a
  targeted follow-up capture? Answer: the final failed counter increments were
  retry-budget exhaustion events during direct fetch. Production DB review on
  2026-05-06 found exact job `8` snapshots for 25 page/route URLs, including
  `200` latest snapshots for the real CIHR pages and a `404` snapshot for the
  malformed `/f/bit.ly/4alz5pv` path. The remaining URL,
  `/images/ipph_launch_may_2024-1.jpg`, is a render asset and is acceptable as
  a documented non-page gap. No targeted follow-up capture or source-config
  change is needed for this incident.
- Why does the generic unfiltered public search probe
  `/api/search?pageSize=1` time out after the CIHR indexing load, while
  source-filtered CIHR search returned results quickly? Answer: the initial
  production path was doing too much per-request search work after the 2026
  annual index load. The deployed follow-through uses stored search vectors,
  stored deduplication state, and lean default ranking; further broad
  `q=...&view=pages` tuning is optional future DB/index-plan work if repeated
  warm-cache samples exceed target.

Closed incident-time question:

- Should crawl auto-recover remain paused? Answer: no. It was safe to restore
  after CIHR indexing finished, no duplicate indexing process existed, and
  `ha-check` showed no running jobs.
- Why did `show-job` report `WARC files (discovered): 689` while manual
  indexing discovery reported `626` unique WARC files? Answer: post-index
  `show-job --warc-details` now reports `WARC files=689`, discovered `689`,
  `WARC source=stable`, and `Manifest valid=True`; the earlier `626` count was
  the temp-dir discovery count before stable WARC consolidation was fully
  reflected in job metadata.
- Should archive_tool classify Zimit RC `4` as WARC-complete when the latest
  crawlStatus has `pending=0` and discoverable WARC files exist? Answer:
  current repo-side mitigation classifies this in backend
  `run_persistent_job`, where the job row, combined log, and backend WARC
  discovery are all available. Moving the classification lower into
  `archive_tool` remains optional future cleanup, not required for the
  immediate recurrence fix.

## Action items (TODOs)

Recovery and closure checks:

- [x] Finish CIHR indexing and record final indexed page count, job status, and
  annual readiness outcome in this incident note (owner=Jeremy Dawson,
  priority=high, due=2026-05-03; completed=2026-05-05)
- [x] Run `annual-status --year 2026` and `ha-check` after indexing completes
  (owner=Jeremy Dawson, priority=high, due=2026-05-03; completed=2026-05-05)
- [x] Restart `healtharchive-worker.service` only after CIHR indexing is no
  longer running and no duplicate indexing process exists (owner=Jeremy Dawson,
  priority=high, due=2026-05-03; completed=2026-05-05)
- [x] Decide whether and when to restore
  `/etc/healtharchive/crawl-auto-recover-enabled` and restart
  `healtharchive-crawl-auto-recover.timer` (owner=Jeremy Dawson, priority=high,
  due=2026-05-03; completed=2026-05-05)

Post-recovery verification:

- [x] Run `annual-edition-report --source cihr --year 2026 --generate` and
  record the result (owner=Jeremy Dawson, priority=high, due=2026-05-08;
  completed=2026-05-05)
- [x] Run `healtharchive show-job --id 8` and record final discovered WARC /
  indexed-page details (owner=Jeremy Dawson, priority=medium, due=2026-05-08;
  completed=2026-05-05)
- [x] Run public search/API spot checks against CIHR 2026 content (owner=Jeremy
  Dawson, priority=medium, due=2026-05-08; partial=2026-05-05: search returned
  `search_total=485160`, first snapshot metadata probe returned 200 status
  metadata, but the loop aborted during raw snapshot probing; the full public
  verifier later timed out on generic unfiltered `/api/search?pageSize=1`;
  completed=2026-05-06: deployed verifier passed search, snapshot metadata,
  raw HTML, replay URL, and frontend snapshot checks)
- [x] Spot-check replayability for a small sample of CIHR snapshots from job
  `8` (owner=Jeremy Dawson, priority=medium, due=2026-05-08;
  partial=2026-05-05: first raw snapshot probe timed out with a 30-second
  client timeout; later full public verifier did not reach raw/replay checks
  because generic search timed out first; completed=2026-05-06: public verifier
  passed raw snapshot and replay URL checks)
- [x] Investigate generic public search latency after CIHR indexing:
  `/api/search?pageSize=1` timed out in `scripts/verify_public_surface.py` with
  a 60-second timeout on 2026-05-05, despite source-filtered CIHR search
  returning quickly (owner=Jeremy Dawson, priority=high, due=2026-05-08;
  completed=2026-05-06: deployed search-performance changes moved the default
  broad path out of the timeout class; optional `q=...&view=pages` tuning is
  tracked in the roadmap)
- [x] Deploy the public-surface verifier fallback and rerun
  `scripts/verify_public_surface.py` so snapshot metadata, raw HTML, and replay
  checks can run even while the slow primary search path remains visible as a
  failure (owner=Jeremy Dawson, priority=high, due=2026-05-08;
  completed=2026-05-06)
- [x] Review the 26 failed URLs from the final crawlStatus and decide whether
  they are acceptable gaps or require targeted follow-up capture (owner=Jeremy
  Dawson, priority=medium, due=2026-05-15; completed=2026-05-06: 25 URLs were
  already covered by exact job `8` snapshots; the remaining image URL is an
  acceptable render-asset gap)

Recurrence prevention:

- [x] Add repo-side code handling for WARC-complete/ZIM-failed runs so they can
  move to indexing instead of starting another resume crawl (owner=Jeremy
  Dawson, priority=high, due=2026-05-10; completed=2026-05-05;
  production-deployed=2026-05-05)
- [x] Add regression tests for the final crawlStatus `pending=0` plus Zimit
  RC `4` case and operator-visible annual status (owner=Jeremy Dawson,
  priority=high, due=2026-05-10; completed=2026-05-05;
  production-deployed=2026-05-05)
- [ ] Add monitoring/alerting for accepted WARC-complete/ZIM-finalization
  failures if this state recurs in a future run (owner=Jeremy Dawson,
  priority=medium, due=2026-05-10)
- [ ] Add indexing observability for long WARC consolidation/indexing runs:
  progress heartbeats, current WARC/phase, last-progress timestamp, and
  operator-visible status in `show-job`, `annual-status`, `ha-check`, and
  metrics. Tracked in `docs/planning/roadmap.md` under "Large indexing
  robustness follow-through" (owner=Jeremy Dawson, priority=high,
  due=2026-05-15)
- [x] Update the crawl/indexing runbook with the operator acceptance path for
  WARC-complete/ZIM-failed annual jobs (owner=Jeremy Dawson, priority=medium,
  due=2026-05-10; completed=2026-05-06)
- [ ] Investigate whether CIHR's source config should force a capture backend
  that never invokes Zimit's internal ZIM build when `skip_final_build=True`
  (owner=Jeremy Dawson, priority=medium, due=2026-05-15)

## Future automation opportunities

Some automation changes are now implemented; remaining items below are still
future work.

- Implemented: automatically inspect the final crawlStatus when a Zimit container exits
  non-zero. If `pending=0`, WARC discovery succeeds, and the backend only needs
  WARCs, mark the crawl phase complete and move to indexing rather than
  resuming.
- Emit a metric for "crawl complete but finalization failed" distinct from
  generic crawl failure.
- Include the latest `pending`, `failed`, and finalization error summary in
  `annual-status` or `ha-check` so operators can distinguish a true active crawl
  from a repeated post-crawl finalization loop.
- Emit indexing/consolidation progress outside the main indexing transaction so
  a detached `reconcile-completed-indexing` run can be monitored without using
  `/proc/<pid>/io` and `lsof` as the primary evidence of liveness.
- Keep the actual "accept WARC output despite ZIM failure" state change manual
  until the invariant is well-tested, because accepting partial captures has
  coverage and integrity implications.

## References / Artifacts

- Relevant log path(s):
  - `<service-data-root>/jobs/cihr/20260101T000502Z__cihr-20260101/archive_resume_crawl_-_attempt_1_20260502_065415.combined.log`
  - `<service-data-root>/jobs/cihr/20260101T000502Z__cihr-20260101/archive_resume_crawl_-_attempt_2_20260503_011450.combined.log`
  - `<service-data-root>/ops/manual-runs/cihr-reindex-20260503T013952Z.log`
- Relevant job:
  - CIHR annual job `8`, source `cihr`, name `cihr-20260101`
- Relevant metrics/signals:
  - `healtharchive_crawl_running_job_progress_known`
  - `healtharchive_crawl_running_job_crawl_rate_ppm`
  - `healtharchive_crawl_running_job_last_progress_age_seconds`
  - `healtharchive_crawl_running_job_temp_dirs_count`
  - `healtharchive_crawl_running_job_container_restarts_done`
  - `healtharchive_job_crawl_status{status="completed"}`
  - `healtharchive_job_indexed_pages`
- Related playbooks/runbooks:
  - `docs/operations/playbooks/core/incident-response.md`
  - `docs/operations/runbooks/indexing-not-started.md`
  - `docs/operations/annual-campaign.md`
  - `docs/operations/monitoring-and-alerting.md`
- Related source files for follow-up investigation:
  - `src/archive_tool/main.py`
  - `src/archive_tool/docker_runner.py`
  - `src/ha_backend/jobs.py`
  - `src/ha_backend/job_registry.py`
  - `src/ha_backend/indexing/pipeline.py`
