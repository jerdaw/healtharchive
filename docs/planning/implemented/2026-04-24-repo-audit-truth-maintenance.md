# Repo Audit Truth Maintenance (Implemented 2026-04-24)

## Summary

Completed the 2026-04-23 repo-audit follow-through for HealthArchive. The
maintenance pass aligned the stated CI/coverage/security posture with the docs
that describe it, added the missing frontend regression coverage for security
headers, and closed the active planning loop without changing the broader
backlog.

## What Changed

- Reconciled frontend CI/security docs with the actual enforcement model.
- Rebased backend coverage/truth docs on the current fast-lane vs full-lane
  split.
- Added the frontend security-header regression test that was queued during the
  remediation wave.
- Archived the completed audit-only board and remediation sequence so the
  active planning lane only lists work that is still unfinished.
- Removed local ignored build junk under `.tmp/`.
- Confirmed the lingering pre-import monorepo planning stash was superseded by
  the implemented-plan listings already on `main`, then dropped the obsolete
  stash because no stash-only planning guidance remained current.

## Verification

Validated on 2026-04-24:

1. `make docs-build`
2. `python -m pytest tests/test_active_docs_current_state.py`
3. `cd frontend && npm run check`

## Remaining Follow-Through

These items remain active backlog work, not unfinished audit cleanup:

1. structural decomposition for `cli.py` and `api/routes_public.py`
2. future CI-scope decisions for fast vs full backend lanes
3. longer-term issue-report retention/review follow-through
