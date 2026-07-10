# WARC Report Discovery Parity Design

## Context

HealthArchive indexing discovers a union of stable, state-tracked temporary,
and latest untracked fallback WARCs. It also deduplicates hardlinked or
manifest-copied files in favor of stable replay paths. The read-only crawl
content report implements separate discovery logic and returns immediately
when stable WARCs exist, so it can undercount newer temporary or fallback
output from an active or recovered crawl.

The future roadmap explicitly tracks consistency between canonical indexing
discovery and non-indexing operator scripts. Repository search found the crawl
content report as the remaining script with an independent stable/temp/fallback
selection path.

## Decision

Extract the filesystem union from `discover_all_warcs_for_job` into a pure
output-directory helper:

```python
def discover_all_warcs_for_output_dir(
    host_output_dir: Path,
    *,
    tracked_temp_dirs: Sequence[Path] = (),
    allow_fallback: bool = True,
) -> WarcDiscoveryResult:
    ...
```

The helper will:

- validate tracked temporary directories without changing state;
- discover stable WARCs;
- discover WARCs in every valid tracked temporary directory;
- include the latest `.tmp*` fallback directory when it is not already
  tracked and fallback is enabled;
- reuse existing manifest and file-identity deduplication;
- return the existing source, source-count, path, and count metadata.

`discover_all_warcs_for_job` will retain its existing `CrawlState` interaction,
including stale-path pruning and persistence, then delegate the filesystem
union to the new helper. This preserves indexing behavior.

The crawl content report will continue reading `.archive_state.json` through
its existing read-only path. It will convert the recorded temp paths to
`Path` values, call the pure helper, and keep returning the current
`(warc_paths, source)` tuple internally. Its public report schema remains
unchanged; `warc_discovery_source` may now correctly be `mixed`.

## Data Flow

1. The report reads the job and state JSON without instantiating `CrawlState`.
2. It passes recorded temp paths and the output directory to the shared helper.
3. The helper scans stable, tracked-temp, and latest untracked fallback groups.
4. Existing inode and consolidation-manifest checks remove duplicate temp
   copies while retaining genuinely new WARCs.
5. The report samples the newest files from the complete union and emits the
   existing JSON and human-readable fields.

The indexing path follows the same steps after `CrawlState.get_temp_dir_paths`
performs its existing state maintenance.

## Error Handling And Safety

- Missing, stale, inaccessible, or malformed tracked path values are ignored.
- Files that disappear or cannot be statted during discovery are skipped, as
  they are today.
- A malformed or unreadable consolidation manifest continues to disable only
  copy-fallback deduplication; manifest validity reporting is a separate
  backlog item.
- The new helper performs no writes and never calls `CrawlState`.
- The report must leave `.archive_state.json` byte-for-byte unchanged.
- No database, API, worker, cleanup, deployment, or private operations behavior
  changes.

## Test Strategy

- Add a canonical-helper test with one stable WARC, one state-tracked temp
  WARC, and one newer untracked fallback WARC. Assert all three paths,
  `source="mixed"`, and per-source counts.
- Add a report test for the same layout. Assert it fails before the report is
  rewired because the existing stable-first return sees only one WARC.
- Assert the report returns the union, reports `mixed`, and leaves the state
  file unchanged after implementation.
- Keep all existing hardlink, copied-manifest, empty, stable-only, temp-only,
  and fallback-only discovery tests green.
- Run the focused discovery/report suites, complete backend CI, strict docs
  coverage/build, and diff integrity checks.

## Alternatives Considered

1. **Pure shared output-directory helper (selected).** Removes the duplicated
   selection logic while preserving the distinct write semantics of indexing
   and reporting.
2. **Duplicate the union inside the report.** Produces a smaller immediate diff
   but leaves two implementations that can drift again, contrary to the
   roadmap item.
3. **Make all job discovery read-only.** Simplifies semantics but silently
   removes `CrawlState`'s existing stale-path pruning and persistence from the
   indexing path, which is unnecessary for this fix.

## Documentation And Backlog

Update the architecture guide to describe union discovery, stable-path
preference, and the read-only output-directory helper. Remove the completed
WARC-discovery consistency follow-through item from the future roadmap after
repository search and tests confirm the crawl content report was the remaining
independent operator-script path.

## Completion Criteria

- The report and indexing wrapper use one union/deduplication implementation.
- Mixed stable, tracked-temp, and latest-fallback output is fully counted.
- Stable duplicates remain preferred and are not counted twice.
- Report generation does not modify crawl state.
- Canonical docs and the future roadmap describe the delivered state.
- Focused, complete, and strict documentation validation pass.
