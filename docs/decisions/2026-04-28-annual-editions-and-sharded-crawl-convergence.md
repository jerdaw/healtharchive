# Annual Editions and Sharded Crawl Convergence

Date: 2026-04-28

## Status

Accepted

## Context

The 2026 annual crawl campaign showed that treating HC, PHAC, and CIHR as one
large job per source does not provide enough convergence accounting. Captured
WARC data was usually preserved, but crawler frontier state could become
unreliable, forcing fresh phases that made progress hard to reason about. A
completed crawl could also remain unindexed when started outside the worker.

For research use, "done" must not mean "the crawler returned zero errors once."
It must mean the archive can explain what was intended, what was captured, what
failed, what was excluded, and which capture backend produced the evidence.

## Decision

HealthArchive will model each `{source, year}` as an `AnnualEdition` made from
one or more `ArchiveJob` shards. The public product still presents one annual
edition per source/year, while operators can inspect shard-level progress,
retry history, backend fidelity, and known gaps.

Fallback captures such as `playwright_warc` are acceptable when needed, but
they are labeled as fallback fidelity in snapshots, coverage reports, exports,
and edition summaries.

The acceptance standard is documented attainable completeness: bounded retries,
usable captures indexed, and remaining gaps explicitly reported.

## Consequences

- WARC discovery indexes the union of stable and temp WARCs instead of hiding
  temp output when stable WARCs already exist.
- `run-db-job` and the worker reconcile completed jobs into indexing so
  detached watchdog starts do not leave captures unsearchable.
- Annual edition coverage reports are stored as DB summaries plus JSON/Markdown
  artifacts under the archive root.
- Shards that exhaust retry/fallback budgets move to `needs_review` instead of
  being treated as an endless recovery loop.
- The 2026 campaign should be salvaged into editions before creating fill-gap
  shards.
