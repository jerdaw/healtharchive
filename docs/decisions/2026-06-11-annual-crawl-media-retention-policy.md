# Decision: Annual Crawl Media Retention Policy (2026-06-11)

Status: accepted

## Context

Annual crawls are intended to preserve public health web pages, documents, and
the normal page assets needed for replay. The 2026 annual campaign showed that
large audio/video responses can dominate stable WARC storage without improving
the core search, page-history, or replay value of the archive.

Storage policy also has a public/private boundary: public documentation can
describe retention intent and user-facing consequences, while private capacity
tables, host wiring, and operator storage locations stay outside this
repository.

## Decision

- Preserve HTML pages, documents, and normal page-rendering assets by default.
- Exclude or cap large video and audio captures unless a source/year plan
  explicitly says those media assets are required.
- Treat annual crawl storage budgets, source-specific media policy, and replay
  requirements as pre-run gates before future annual jobs are queued.

## Rationale

HealthArchive's primary value is durable page evidence: searchable captures,
change history, and replayable page context. Large media files can consume most
of the storage budget while adding little value to those core workflows. Making
large-media retention opt-in keeps annual crawls repeatable and leaves room for
future years without quietly trading away replay reliability.

## Alternatives considered

- Keep all media by default: rejected because storage consumption can exceed
  realistic annual capacity planning and make future crawls harder to run.
- Drop all non-HTML assets: rejected because CSS, JavaScript, images, fonts,
  and selected documents are often needed for replay and user-facing evidence.
- Decide after each crawl only: rejected because post-crawl compaction is a
  useful recovery tool, but it is slower and riskier than setting the crawl
  scope correctly before the job runs.

## Consequences

### Positive

- Annual crawl storage growth becomes easier to predict.
- Replay keeps the assets most likely to affect page rendering.
- Large media can still be retained deliberately when a source/year archive
  plan justifies it.

### Negative / risks

- Some embedded media may not replay from HealthArchive if it was excluded or
  compacted out.
- Source-specific policy needs maintenance as websites change their page
  structure and asset conventions.

## Verification / rollout

- Managed source crawl profiles should encode source-specific scope filters.
- Tests should cover query-variant suppression and large-media exclusions for
  managed annual sources.
- Post-crawl storage reports should compare actual WARC size against the
  source/year budget and identify unexpected content-type growth.
- If a media exclusion proves too aggressive, the source/year plan should
  document the exception and the crawl profile should be adjusted deliberately.

## References

- Related code: `src/ha_backend/job_registry.py`
- Related tests: `tests/test_job_registry.py`
- Related CLI: `healtharchive compact-warcs`
- Related planning: `docs/planning/roadmap.md`
