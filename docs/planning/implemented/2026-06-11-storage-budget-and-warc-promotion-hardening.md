# 2026-06-11: Storage Budget and WARC Promotion Hardening

**Status**: Implemented 2026-06-11
**Scope**: Annual scheduling guardrails and compacted WARC promotion safety

## Overview

Strengthened the repo-side safety rails that came out of the 2026 CIHR storage
closeout. Annual scheduling now requires a concrete source/year storage budget
file in apply mode, and staged compacted WARCs can be promoted through a
validated CLI path instead of ad hoc file moves.

## Implementation

- Added `schedule-annual --storage-budget-file` and made it required with
  `--apply`.
- Validated that every selected source has a positive WARC estimate, capacity
  target, large-media policy, replay requirement, and approval timestamp.
- Persisted the validated per-source storage budget inside each annual job's
  `annual_storage_policy` provenance block.
- Added `promote-compacted-warcs`, a dry-run-first command that validates a
  staged compaction manifest/report, swaps live `warcs/` with a rollback
  directory in apply mode, and writes promotion provenance.
- Required explicit replay-reindex acknowledgement before promotion because
  replay indexes depend on WARC byte offsets.

## Verification

- `tests/test_cli_schedule_annual.py`
  - verifies apply mode still requires storage-policy acknowledgement;
  - verifies apply mode now also requires a storage budget file;
  - verifies annual jobs persist validated budget metadata.
- `tests/test_cli_compact_warcs.py`
  - verifies promotion dry-run validates without replacing live WARCs;
  - verifies apply mode refuses to run without replay-reindex acknowledgement;
  - verifies apply mode swaps live WARCs, keeps a rollback directory, and writes
    provenance.

## Remaining Work

Private operations material should hold the detailed estimate inputs, capacity
tables, approval notes, and post-promotion retention decisions. Public roadmap
tracking now focuses on estimate calibration and retention-ledger discipline
rather than the repo-side command surfaces.
