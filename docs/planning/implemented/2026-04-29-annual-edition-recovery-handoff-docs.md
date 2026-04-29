# Annual Edition Recovery Handoff Docs (Implemented 2026-04-29)

## Summary

Completed the documentation-only handoff update for the late-April annual
edition recovery work. The repo now records the deployed annual-edition
convergence state, the PHAC recovery/indexing outcome, and the remaining CIHR
operator path without requiring chat history as operational memory.

## What Changed

- Updated the live ops roadmap to record the deployed convergence commit,
  current HC/PHAC readiness, PHAC reindex evidence, and CIHR as the only active
  2026 annual blocker.
- Updated the future backlog so completed HC/PHAC salvage work is no longer
  listed as unfinished, while CIHR indexing/reporting, large-indexing
  robustness, PHAC long-term backend policy, watchdog escalation, future
  sharding, and post-campaign maintenance remain visible.
- Updated PHAC incident notes so they distinguish the successfully salvaged
  2026 fallback campaign from unresolved future Browsertrix/default-backend and
  temporary-exclusion decisions.
- Added runbook guidance for detached multi-hour indexing, production env
  loading, progress monitoring, duplicate-reconcile avoidance, and cautious
  stale-transaction handling.
- Updated the planning index so the current priority sequence no longer treats
  PHAC as an active crawl/indexing blocker.

## Verification

Validated on 2026-04-29:

1. `git diff --check`
2. `make docs-build MKDOCS=".venv/bin/python -m mkdocs"`
3. Targeted stale-state scan for current PHAC readiness contradictions in
   roadmap, incident, and indexing runbook docs.

## Remaining Follow-Through

These items remain active backlog or ops-roadmap work, not unfinished handoff
documentation:

1. monitor CIHR until completion, then index and regenerate its annual report
2. improve large-indexing progress and transaction ergonomics
3. decide PHAC long-term Browsertrix/default-backend and exclusion policy
4. restart the worker when the annual crawl is idle
5. convert annual output dirs to bind mounts during a safe maintenance window
6. review and resolve the preserved `prod-pre-a3e0dece` production branch
