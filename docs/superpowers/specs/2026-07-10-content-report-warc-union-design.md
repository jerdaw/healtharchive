# Content Report WARC Union Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

The canonical indexing discovery path unions stable WARCs, temp directories
recorded in crawl state, and one untracked fallback temp directory. It also
deduplicates hardlinks and manifest-recorded copy fallbacks and reports
`stable`, `temp`, `fallback`, `mixed`, or `none` source metadata.

The read-only `scripts/vps-crawl-content-report.py` operator report implements
a separate stable-first decision tree. If any stable WARC exists, it ignores
tracked temp and fallback WARCs. During consolidation, salvage, or interrupted
crawls this can undercount files and bytes and misclassify content-cost evidence.
That is the concrete remaining gap in the roadmap's WARC discovery consistency
follow-through.

## Goals

1. Make job indexing and the read-only content report use one union and
   deduplication implementation.
2. Preserve the existing `discover_all_warcs_for_job` and
   `discover_warcs_for_job` public behavior.
3. Keep the report read-only and preserve its two-value return contract.
4. Add regression coverage for simultaneous stable, tracked-temp, and fallback
   files.
5. Reconcile architecture and roadmap wording with the implemented behavior.

## Non-Goals

- Change crawl state or temp-directory layout.
- Change indexing transactions, snapshot behavior, cleanup, consolidation, or
  manifest format.
- Scan every untracked temp directory; preserve the canonical latest-fallback
  rule.
- Add production paths or operator-only deployment details to public docs.
- Run the report against production data.

## Options Considered

### Duplicate the union inside the report

Rejected. This is the smallest textual change but retains two implementations
of inode/manifest deduplication and fallback semantics, recreating the drift the
roadmap asks to remove.

### Pass a synthetic job into `discover_all_warcs_for_job`

Rejected. It would rely on duck typing against the ORM-oriented API and reread
crawl state even though the report already has a bounded state snapshot.

### Extract an output-directory helper

Selected. Add `discover_all_warcs_for_output_dir(output_dir, temp_dirs,
allow_fallback=True)` to the canonical module. The job API obtains temp dirs
from `CrawlState` and delegates. The report validates temp-dir paths from its
already-loaded snapshot and delegates. Both consumers receive the same
`WarcDiscoveryResult` semantics.

## Detailed Behavior

The helper will:

1. Resolve the output directory.
2. Discover non-empty stable WARCs under the stable WARC directory.
3. Discover non-empty WARCs under the supplied tracked temp directories.
4. If fallback is allowed, find the latest `.tmp*` directory and include it
   only when it is not already tracked.
5. Pass stable, temp, and fallback groups through the existing inode/path and
   manifest-source deduplicator.
6. Return sorted paths, per-source counts, aggregate source classification,
   manifest validity, and count using the current result type.

No filesystem mutation is introduced. Missing, unreadable, or disappearing
paths retain the existing best-effort behavior.

## Testing

- Add a content-report test with one stable WARC, one state-tracked temp WARC,
  and one newer untracked fallback WARC. It must fail against the stable-first
  implementation and pass with all three paths plus `source == "mixed"`.
- Run the focused content-report and canonical discovery test modules.
- Run Ruff and mypy on touched Python files.
- Run the repository's backend CI parity if available within the existing
  environment, plus strict documentation checks for changed docs.
- Run complete-diff whitespace and public-boundary scans before publication.

## Documentation

Update `docs/architecture.md` to describe union and deduplication semantics.
Archive the implementation plan under `docs/planning/implemented/`. Narrow the
roadmap item to any genuinely remaining manifest-reporting work and explicitly
record the operator-report alignment as delivered.
