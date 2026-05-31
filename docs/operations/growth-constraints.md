# Growth Constraints (internal policy)

Purpose: prevent slow scope creep from undermining reliability on a single-VPS architecture.

These constraints are intentionally conservative defaults. Adjust only after a capacity review.

## Storage budget

- **Target:** keep total disk usage under **70%** of available space.
- **Review threshold:** **80%** usage triggers a pause on new sources until cleanup or capacity planning is complete.
- **Replay retention:** if replay is enabled, WARCs must remain available. Use **safe cleanup only** (`cleanup-job --mode temp-nonwarc`).
- **Current 2026 capacity finding:** the 2026 CIHR job's stable WARC set is
  about `710 GiB` on its own, and the 1 TiB Storage Box had about `249 GiB`
  free after CIHR temp-dir cleanup on 2026-05-31. The current Storage Box
  cannot hold another CIHR-scale annual campaign while keeping the 2026 replay
  WARCs hot.
- **Before starting the next annual campaign:** choose one of:
  - upgrade the Storage Box capacity;
  - offload older annual WARC sets to protected cold storage and document the
    replay impact;
  - reduce hot replay retention by source/year with an explicit retention
    decision.

## Source cap per annual edition

- **Default cap:** add **no more than 2 new sources** per annual edition.
- Any additions beyond the cap require:
  - a successful dry-run capture,
  - indexing verification,
  - and a storage headroom check.

## Performance budgets (initial targets)

These are targets, not guarantees. Use them to detect regressions.

- **Search (view=pages):** p95 response < 2s for common queries.
- **Snapshot detail:** p95 response < 1s for metadata payloads.
- **Changes feed:** p95 response < 2s for edition-aware queries.

If p95 exceeds targets for multiple weeks, pause new scope additions and prioritize performance fixes.

## Crawl load limits

- Keep crawler parallelism conservative during annual campaigns to avoid:
  - starving the API,
  - exceeding source rate limits,
  - and filling storage too quickly.
- If capture jobs start to lag, reduce concurrency before expanding scope.

## Public-facing summary (use in governance)

Reliability and provenance take priority over expanding coverage. Sources are added deliberately within storage and operational capacity, and the archive does not attempt to crawl the entire internet.
