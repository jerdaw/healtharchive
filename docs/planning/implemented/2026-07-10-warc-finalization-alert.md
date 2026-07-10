# WARC-Complete Finalization Failure Alert (Implemented 2026-07-10)

**Status:** Implemented | **Scope:** Surface newly accepted WARC-complete jobs
whose optional ZIM finalization failed without creating a paging alert.

## Outcomes

- Extended the crawl textfile collector with persisted-state gauges for:
  - the total number of accepted WARC-complete finalization failures
  - the count for every configured source, including zero-valued series
- Reused the shared `WARC_COMPLETE_FINALIZATION_FAILED` stage constant.
- Added `HealthArchiveWarcCompleteFinalizationFailureAccepted`, which detects a
  positive 30-minute per-source delta and holds for five minutes.
- Classified the alert as warning/P2 and dashboard-only, with no Pushover
  routing.
- Kept worker behavior, job state, database schema, deployment wiring, and
  private notification configuration unchanged.

## Tests Added

- Collector integration coverage verifies total, matching-source, and
  zero-filled nonmatching-source gauges.
- Alert-policy coverage verifies the expression, hold time, severity,
  notification tier, public runbook, and absence of paging routing.

The alert-policy test followed an observed red-to-green cycle. During the
collector task, WSL stopped accepting commands before the expected failing
result was captured. After WSL recovered, the worktree already contained the
uncommitted collector implementation alongside its test. That implementation
was preserved, reviewed directly, and validated by the targeted test; the
collector task therefore is not recorded as a fully observed red-to-green
cycle.

## Canonical Docs Updated

- `docs/operations/monitoring-and-alerting.md`
- `docs/planning/roadmap.md`

## Remaining Decision

The roadmap still tracks whether WARC-only jobs should suppress Zimit's
internal `warc2zim` path or continue tolerating optional finalization failure
only after WARC completeness is proven.

## Historical Context

The approved design remains at
`docs/superpowers/specs/2026-07-10-warc-finalization-alert-design.md`. Detailed
implementation steps are preserved in git history.
