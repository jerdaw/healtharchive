# 2026-06-11: Annual Crawl Storage Guardrails

**Status**: Implemented 2026-06-11
**Scope**: Annual crawl scheduling, media retention policy, and storage-risk prevention

## Overview

Added enforceable annual-crawl guardrails after the 2026 CIHR WARC compaction
closeout showed that large media can dominate stable WARC storage. Future
annual jobs now carry an explicit storage-policy provenance block and cannot be
queued in apply mode unless the operator acknowledges the annual storage/media
review.

## Implementation

- Broadened managed source binary/media extension lists so HC, PHAC, and CIHR
  exclude common large audio/video URL extensions in addition to binary
  documents.
- Added canonical Browsertrix `--blockRules` for large media URLs to managed
  annual source profiles. Scope exclusions keep matching URLs out of the page
  frontier; block rules prevent matching embedded media requests from being
  loaded during page capture.
- Kept the existing direct binary-document navigation exclusions as throughput
  safeguards. Document retention exceptions remain part of source/year scope
  review rather than the large-media block rule.
- Updated managed argument reconciliation so missing large-media block rules are
  treated as drift and can be repaired for annual jobs.
- Added `schedule-annual --apply --ack-storage-policy`; apply mode now fails
  without the acknowledgement.
- Persisted `annual_storage_policy` in annual job config for source/year
  provenance.

## Verification

- `tests/test_job_registry.py`
  - validates managed media/document extension exclusion and canonical
    `--blockRules`;
  - validates drift reconciliation adds the canonical large-media block rule.
- `tests/test_cli_schedule_annual.py`
  - verifies apply mode fails without `--ack-storage-policy`;
  - verifies created annual jobs persist acknowledged storage policy metadata.
- `tests/test_cli_reconcile_annual_tool_options.py` and
  `tests/test_ops_crawl_auto_recover_scope_reconcile.py`
  cover reconciliation behavior for existing annual configs and running jobs.

## Remaining Work

The basic guardrail is implemented. The roadmap still tracks a richer annual
storage-budget gate that requires a concrete source/year size estimate,
capacity target, and documented approval record before jobs are queued.
