# 2026-06-05: WARC Compaction Staging

**Status**: Implemented 2026-06-05
**Scope**: Storage maintenance and replay-safe archive artifact reduction

## Overview

Added a `compact-warcs` CLI command that can estimate and stage compacted WARC
replacements for an indexed job. The command is dry-run by default and apply
mode writes to a staging directory only, so operators can inspect the manifest
and report before replacing any archive artifacts through a separate controlled
workflow.

## Implementation

- Added `src/ha_backend/warc_compaction.py` with a `replay-no-large-media`
  profile that drops unreferenced audio/video response records while preserving
  all snapshot-referenced records.
- Added `healtharchive compact-warcs --id JOB_ID` and apply-mode staging
  options in `src/ha_backend/cli.py`.
- Added staged output artifacts: compacted WARCs, replacement
  `manifest.json`, and `compaction-report.json`.
- Updated `docs/reference/cli-commands.md` with usage and safety semantics.

## Verification

- `tests/test_cli_compact_warcs.py`
  - dry-run reports dropped media without writing staged files;
  - apply mode stages compacted WARCs and preserves HTML replay records;
  - URL-only snapshot references are counted as preserved;
  - referenced large-media records cause the command to fail instead of
    silently dropping replayable content.

## Remaining Work

No follow-up roadmap item is required for the staging command itself. Any future
production replacement workflow should be planned separately because this command
intentionally stops at staging.

Follow-up: the repo-side promotion command was implemented in
`2026-06-11-storage-budget-and-warc-promotion-hardening.md`.
