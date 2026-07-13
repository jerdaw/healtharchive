# Durable Indexing Progress Heartbeats Design

## Context

Large HealthArchive jobs can spend long periods consolidating and hashing WARC
files, then parsing and indexing hundreds of WARCs inside one atomic database
transaction. The pipeline already logs discovery, verification, and per-WARC
indexing events, but job status and indexed counts are committed only when that
transaction finishes. Operators therefore cannot distinguish a healthy quiet
run from a stalled or dead process through `show-job`, `annual-status`, or
metrics.

The roadmap asks for current phase, current WARC, WARC index/total, byte or
record counts where available, elapsed time, and a last-progress timestamp. It
also requires progress outside the final all-at-once snapshot transaction.

## Decision

Add a dedicated one-row-per-job `archive_job_indexing_progress` table. Progress
heartbeats use short independent transactions against this table, leaving the
existing snapshot replacement/indexing transaction atomic. The table stores:

- `job_id` as the primary key and foreign key to `archive_jobs`;
- a bounded phase name;
- current WARC basename plus WARC index and total;
- records processed;
- bytes processed and total where consolidation exposes them;
- indexing start and last-progress timestamps.

Successful indexing removes the progress row after the snapshot transaction
commits. A handled failure records phase `failed`; an abrupt process exit leaves
the last active heartbeat in place so its age is direct stalled-process
evidence. Starting a later attempt resets the row.

## Components

### Progress persistence

`ha_backend.indexing.progress` owns the progress model interface, serialization,
age calculation, and a best-effort `IndexingProgressReporter`. The reporter:

- writes immediately on phase or current-WARC changes;
- throttles repeated record/byte updates to at most one short transaction every
  ten seconds;
- accepts an injectable clock and zero interval for deterministic tests;
- logs and disables itself if progress persistence fails, without failing the
  underlying indexing operation.

The migration is additive and does not alter existing job or snapshot rows.

### Consolidation progress

`consolidate_warcs` gains an optional callback. It reports the current source
WARC, index/total, phase (`reuse`, `copy`, or `hash`), and byte progress while
copying or hashing. Existing callers that omit the callback retain identical
behavior.

The indexing pipeline maps these callbacks to durable phase
`consolidate_warcs`. It then records `discover`, `verify`, `read_warc`, and
`finalize` phases. Record count increments are reported while parsing HTML
records; full-path values are never persisted, only WARC basenames.

### Operator surfaces

`show-job` prints the current or last failed indexing phase, WARC position,
record/byte counts, elapsed seconds, last-progress timestamp, and heartbeat age.

`annual-status --json` adds a nullable `indexingProgress` object to each job;
text output adds a compact progress line. Existing summary counts and rescue
state semantics remain unchanged. Private `ha-check` workflows that consume
annual status gain the same evidence without a new public/private contract.

The crawl textfile collector emits per-job gauges for active progress rows:

- last-progress age seconds;
- current WARC index and WARC total;
- records processed;
- bytes processed and bytes total.

Labels are limited to source, numeric job ID, and bounded phase. No WARC path or
other high-cardinality/private value appears in metric labels. No new alert is
added in this batch; operators first gain an observable signal that can be
calibrated before an alert threshold is chosen.

## Transaction And Failure Semantics

Snapshot deletion and replacement remain one transaction. Progress writes use
only the separate progress row, so they do not expose partial snapshot data or
commit the job row early. A progress-write error is non-fatal and is logged once
per reporter instance. A normal indexing failure retains a final `failed`
heartbeat for diagnosis; a successful run clears it only after the main
transaction has committed.

Consumers treat phases other than `failed` as active. They calculate elapsed and
heartbeat age from UTC timestamps and clamp negative clock skew to zero.

## Testing

- Migration and schema-parity tests cover the new table.
- Reporter tests prove immediate phase writes, throttling, serialization,
  success cleanup, failure retention, and best-effort degradation.
- Archive-storage tests prove copy/hash progress callbacks without changing
  existing consolidation results.
- Pipeline tests observe failing behavior first, then verify consolidation and
  per-WARC/record progress lifecycle plus success/failure handling.
- CLI tests cover text and JSON progress output.
- Metrics tests cover labels and all progress values while excluding failed
  rows from active gauges.
- Focused tests, complete backend CI, strict docs coverage/build, and diff
  checks remain the final gates.

## Documentation And Backlog

Document the durable progress signal in the public observability overview.
Update the large-indexing roadmap entry to mark heartbeat persistence and the
`show-job`/`annual-status`/metrics surfaces implemented. Retain the independent
future decisions about checkpointed indexing, stale-transaction remediation,
and detached-run ergonomics.

## Non-Goals

- Committing partial snapshot batches or changing indexing atomicity.
- Automatically killing or retrying a stale indexing run.
- Adding an uncalibrated paging alert.
- Persisting full filesystem paths in operator metrics.
- Changing production state, deploying, or running a live reindex.

## Completion Criteria

- Consolidation and indexing update durable progress outside the snapshot
  transaction.
- A crashed run leaves a timestamped active row that status commands and
  metrics can identify as stale.
- Successful runs clear progress only after the indexing transaction commits.
- Handled failures retain a bounded diagnostic progress row.
- Existing indexing correctness and atomicity tests remain green.
- Canonical docs no longer present durable progress visibility as unfinished.
