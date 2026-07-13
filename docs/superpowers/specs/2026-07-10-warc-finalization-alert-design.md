# WARC-Complete Finalization Failure Alert Design

## Context

HealthArchive can accept a crawl for indexing when WARC capture is complete but
optional ZIM finalization fails. The accepted state is persisted as
`crawler_stage=warc_complete_finalization_failed` and is visible in operator
status commands, but the roadmap still calls for a metric and alert if the state
recurs.

The crawl textfile collector already reads job state from the database and the
Prometheus rule set already treats crawl warnings as dashboard-only P2 signals.
This follow-up can therefore be implemented without changing worker behavior,
job state, schema, deployment wiring, or private notification routing.

## Decision

Extend the crawl textfile collector with two gauges:

- `healtharchive_crawl_warc_complete_finalization_failed_jobs`: total number of
  persisted jobs in the accepted rescue stage;
- `healtharchive_crawl_warc_complete_finalization_failed_jobs_by_source`: the
  same count by configured source.

The metric is a gauge rather than a counter because each collector run
reconstructs current persisted state from the database. Emit a by-source series
for every configured source, including zero counts, so the first future
occurrence produces an observable 0→1 transition.

Add `HealthArchiveWarcCompleteFinalizationFailureAccepted` with this policy:

- expression: a positive 30-minute `delta` of the by-source gauge;
- hold time: 5 minutes;
- severity: warning;
- notification tier: P2;
- routing: dashboard-only, with no Pushover label;
- runbook: the public annual-campaign playbook.

This is an operator-review signal, not an outage or data-loss page. WARC output
was accepted for indexing, so critical paging would contradict the current
solo-operator alert policy.

## Data Flow

1. The metrics collector loads every configured source code.
2. It groups jobs whose crawler stage equals the shared
   `WARC_COMPLETE_FINALIZATION_FAILED` constant by source.
3. Missing source groups are filled with zero and the total is summed.
4. The node-exporter textfile is replaced through the existing atomic writer.
5. Prometheus evaluates the per-source gauge; a positive delta sustains a P2
   warning for five minutes.
6. Existing `healtharchive_crawl_metrics_ok` behavior covers database or
   collector failures; the new metric does not create a second failure path.

## Test Strategy

- Add a metrics integration test with one accepted HC job and assert total=1,
  HC=1, and a different seeded source=0.
- Add an alert-rule test asserting the metric expression, 30-minute window,
  five-minute hold, warning/P2 labels, annual-campaign runbook, and absence of
  Pushover routing.
- Write both assertions before implementation and observe both fail.
- Run the two focused test files, the complete backend CI gate, strict docs
  coverage/build, and diff checks.

## Alternatives Considered

1. **Database-derived gauge and dashboard warning (selected).** Fits the
   existing collector, survives process restarts, and detects recurrence
   without changing job execution.
2. **In-process Prometheus counter in the worker.** Semantically counter-like,
   but process restarts lose local state and the worker is not the current
   durable metrics source for crawl operations.
3. **Critical notification on every accepted failure.** More visible, but too
   noisy for a condition that preserves usable WARC output and currently needs
   review rather than immediate intervention.

## Documentation And Backlog

Add the signal class to the public observability overview. Remove only the
completed metric/alert bullet from WARC finalization failure handling in the
future roadmap; retain the product/operations decision about suppressing or
tolerating optional ZIM finalization.

## Completion Criteria

- Every configured source always has a zero-or-higher gauge series.
- A newly accepted failure creates a positive per-source delta.
- The alert is warning/P2 and cannot page through Pushover.
- Focused and complete validation pass.
- The completed implementation plan is archived and the delivered roadmap
  bullet is removed.
