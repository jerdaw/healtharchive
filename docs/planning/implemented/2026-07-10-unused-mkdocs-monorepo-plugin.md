# Unused MkDocs Monorepo Plugin Removal (Implemented 2026-07-10)

**Status:** Implemented | **Scope:** Removed the confirmed-unused
`mkdocs-monorepo-plugin` direct dependency without changing the current MkDocs
portal, configuration, commands, navigation, or publishing workflow.

## Outcomes

- Removed `mkdocs-monorepo-plugin` from the tracked `docs` optional-dependency
  group.
- Preserved every active MkDocs plugin and all `make docs-*` interfaces.
- Left the intentionally ignored maintainer-local lockfile untouched.
- Updated the archived docs-platform inventory so the resolved stale
  dependency is not selected again.
- Verified a fresh `.[dev,docs]` installation contains 112 distributions and
  does not include the removed package, including transitively.

## Canonical Docs Updated

- `docs/planning/implemented/2026-04-15-zensical-migration-prep.md`
- `docs/planning/README.md`
- `docs/planning/implemented/README.md`

## Validation

- Fresh Python 3.14 worktree-local environment installed successfully from
  `.[dev,docs]`.
- `make backend-ci` passed: Ruff, mypy, and 385 tests.
- `make docs-coverage-strict` passed.
- `make docs-build-strict` passed.
- `git diff --check` passed.

## Known Validation Baseline

In a clean worktree, `make docs-refs` reports two unchanged references in the
historical maintenance audit to intentionally ignored frontend-local assets.
The cleanup introduced no new reference finding and did not create or inspect
ignored environment files to mask the baseline.

## Remaining Work

The generator-migration decisions and coupling points recorded in the
Zensical prep inventory remain unchanged and explicitly out of scope.
