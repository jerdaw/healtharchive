# Docs Boundary and CI Follow-Through (Implemented 2026-03-21)

## Summary

Completed a backend maintenance pass to finish the March docs/CI cleanup and
leave the repo in a steady-state `main`-only workflow.

## What Changed

- Completed the shared-VPS docs boundary follow-through on `main`.
  - Merged the backend docs/runbook updates that point shared VPS facts to
    `platform-ops` and keep backend-specific behavior in this repo.
- Added workflow lint coverage for backend GitHub Actions.
  - Introduced `.github/workflows/workflow-lint.yml`.
  - Kept `actionlint` non-required because it only runs on workflow-file changes.
- Fixed docs maintenance drift so `make docs-check` passes end-to-end.
  - Repaired broken doc references.
  - Re-linked previously unreachable docs into the reachable docs graph.
  - Normalized some cross-repo frontend file references to GitHub URLs.
- Hardened local environment bootstrap.
  - `make venv` now runs `python -m ensurepip --upgrade` before installing
    dev/docs dependencies, which avoids broken local gates on Python builds
    that create a venv without `pip`.
- Relaxed the active-docs guard test to check durable facts instead of exact prose.
  - `tests/test_active_docs_current_state.py`
- Removed an OpenAPI export warning caused by a duplicate operation ID on the
  source-preview `GET`/`HEAD` endpoint split.
- Removed stale backlog item `#25` from `docs/planning/roadmap.md` because the
  OpenAPI spec is already generated and published in the docs portal.
- Cleaned repository state after merge.
  - Merged PR `#46`
  - Deleted stale migration branches
  - Set local `main` to track `origin/main`
  - Removed the stale local `gh-pages` branch

## Canonical Docs Updated

- `docs/operations/monitoring-and-ci-checklist.md`
- `docs/deployment/production-rollout-checklist.md`
- `docs/planning/roadmap.md`

## Verification

- `make check`
- `make docs-check`
- Confirmed GitHub branch protection requires `Backend CI / test` and
  `Backend CI / api-health`
- Confirmed no open PRs and no non-`main` working branches remain locally

## Follow-up Notes

- Active planning docs under `docs/planning/` remain active because they still
  contain operator-run VPS work or external/non-git work.
- `gh-pages` remains remote-only by design; treat it as a deploy branch rather
  than a local development branch.
