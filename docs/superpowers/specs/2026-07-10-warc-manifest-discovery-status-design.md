# WARC Manifest Discovery Status Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

`WarcDiscoveryResult.manifest_valid` is documented as whether the consolidation
manifest, if present, is valid. Its implementation instead sets the boolean
false whenever fallback WARCs exist and true when malformed or unreadable
manifest JSON is silently ignored. `list-warcs --json` and `show-job
--warc-details` expose that misleading value, while the read-only crawl content
report does not expose manifest parsing state at all.

The result can therefore tell an operator that a missing manifest is invalid
because discovery used fallback, or that a malformed manifest is valid because
discovery found stable/temp paths. This is the explicit remaining diagnostic
gap in the WARC discovery consistency roadmap item.

## Goals

1. Derive manifest validity from manifest evidence, not discovery source.
2. Preserve the `manifest_valid: bool` field for compatibility.
3. Add a bounded status and error code that distinguish missing, valid,
   malformed, and unreadable manifests without exposing exception/path detail.
4. Surface the same metadata in `list-warcs --json`, `show-job --warc-details`,
   and the read-only crawl content report.
5. Keep plain `list-warcs` output path-only for script compatibility.
6. Close the remaining WARC discovery consistency roadmap item while retaining
   the existing explicit `verify-warc-manifest` command for full presence,
   size, and hash verification.

## Non-Goals

- Run size or SHA-256 verification during ordinary discovery.
- Change consolidation manifest format or generation.
- Reject otherwise discoverable WARCs solely because metadata is malformed.
- Print raw JSON, exceptions, private paths, or file contents in diagnostics.
- Change indexing, cleanup, crawl state, or production configuration.

## Status Model

Add `manifest_status` with these values:

| Status | Meaning | `manifest_valid` | Error code |
| --- | --- | --- | --- |
| `missing` | No manifest exists; discovery does not require one | `true` | none |
| `valid` | JSON root and entries have the expected lightweight shape | `true` | none |
| `invalid` | JSON or required structural shape is malformed | `false` | bounded parse/shape code |
| `unreadable` | The manifest exists but cannot be read | `false` | `read-error` |

Bounded invalid codes are `invalid-json`, `invalid-root`, `invalid-entries`, and
`invalid-entry`. They intentionally omit exception messages and paths.

## Parsing And Deduplication

Replace `_manifest_consolidated_source_paths` with a lightweight parser that
returns consolidated temp-source paths plus status metadata. Valid entries may
still be used for safe copy-fallback deduplication if another entry is malformed,
but the aggregate status remains `invalid`/`invalid-entry` so the partial
manifest cannot be mistaken for healthy evidence.

This parser validates only the structure required for discovery deduplication:
a dictionary root, an optional `entries` list, dictionary entries, and
non-empty `source_path`/`stable_name` fields. A missing `entries` key is treated
as an empty list to match the existing full verifier. Full file presence, size,
and hash checks remain the responsibility of `verify-warc-manifest`.

## Consumer Behavior

- `WarcDiscoveryResult` gains `manifest_status` and `manifest_error` defaults so
  existing keyword/positional construction remains compatible.
- Both non-empty and empty discovery results carry the parsed metadata.
- `list-warcs --json` adds the two fields; non-JSON output does not change.
- `show-job --warc-details` prints manifest status, boolean validity, and a
  bounded error code only when one exists.
- The content report adds the same fields to `job_metadata` and human summary.
  Its existing `discover_warcs_read_only` two-value API remains available; a
  detailed internal helper returns the canonical result.

## Testing

- Change the fallback/no-manifest expectation from invalid to
  `manifest_valid=True`, `manifest_status="missing"`.
- Add valid, malformed JSON, invalid root/entries/entry, and unreadable parser
  regressions.
- Assert content-report metadata and human output expose bounded status/error.
- Assert `list-warcs --json` and `show-job --warc-details` output where existing
  CLI fixtures make that practical.
- Run canonical discovery, content report, affected CLI tests, Ruff, mypy,
  backend-focused parity, strict docs, and hosted CI.

## Delivery

This branch is stacked on HealthArchive PR #129 because it consumes the new
output-directory helper and content-report delegation introduced there. Open a
separate PR against `fix/content-report-warc-union`, link the dependency, and
keep the diff reviewable as a diagnostics-only follow-up.
