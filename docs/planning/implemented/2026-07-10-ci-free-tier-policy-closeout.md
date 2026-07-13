# GitHub Actions Free-Tier Policy Closeout

**Status:** Implemented 2026-07-10

## Goal

Close roadmap item 25c by enforcing and documenting the repository's existing
low-noise GitHub Actions policy while limiting failure-artifact storage.

## Decisions

- Preserve the four exact ruleset-required check names:
  `Backend CI / test`, `Backend CI / api-health`,
  `Frontend CI / contract-sync`, and `Frontend CI / lint-and-test`.
- Keep required backend/frontend workflows broad rather than adding path
  filters that could omit required status contexts or cross-boundary checks.
- Keep superseded automatic runs cancellable.
- Keep manual full-backend and production-smoke runs non-cancellable.
- Keep manual dispatch available on every workflow.
- Retain e2e failure bundles for three days.

## Delivered

- Added `tests/test_ci_workflow_policy.py` to parse all seven workflows and
  enforce manual-dispatch, concurrency, required-job-name, and artifact-retention
  policy.
- Added `retention-days: 3` to the sole `actions/upload-artifact` step.
- Added the reviewed workflow matrix and ruleset coordination warning to
  `docs/development/testing-guidelines.md`.
- Corrected `docs/development/test-coverage.md`: the full backend workflow is
  manual-only, not nightly.
- Updated the pull request checklist with broad `make prepush` evidence and
  explicit manual escalation-lane guidance.
- Removed completed roadmap item 25c from the future backlog.

## Test-Driven Evidence

- Red: the policy test reported one failure because `backend-ci.yml` had no
  artifact retention value; three other policy assertions passed.
- Green: all four policy tests passed after the three-day retention value was
  added.
- Focused integration: 13 CI policy/schema/migration tests passed with one
  existing Starlette deprecation warning.

## Final Validation

- `make backend-ci`: passed; Ruff format checked 222 files, Ruff lint passed,
  mypy found no issues in 169 source files, and 385 tests passed with one
  existing warning.
- `make docs-coverage-strict`: passed.
- `make docs-build-strict`: passed.
- `git diff --check`: passed.
- `make docs-refs`: advisory exit 1 in the clean worktree for only two existing
  historical maintenance-audit references to ignored/generated frontend paths.
  This batch added no reference warning.
- Local actionlint was unavailable because the workspace has no actionlint or
  Go toolchain. The pinned `Workflow Lint` GitHub job remains the authoritative
  actionlint gate for the pull request.

## Boundaries

- No production smoke, deployment, publication, ruleset mutation, secret
  access, or private operations change was performed.
- No workflow or required job name changed.
- No path filter or workflow-topology refactor was introduced.
