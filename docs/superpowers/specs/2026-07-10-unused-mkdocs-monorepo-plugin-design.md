# Unused MkDocs Monorepo Plugin Removal Design

**Date:** 2026-07-10

## Context

The archived docs-platform inventory identifies `mkdocs-monorepo-plugin` as a
stale dependency candidate. A repository-wide search confirms that the package
is declared only in the `docs` optional-dependency group. The live
`mkdocs.yml`, Makefile targets, docs checks, scripts, tests, and workflows do
not configure or invoke it.

This repository intentionally ignores `uv.lock`; the maintainer's local lock
file is not a tracked project artifact and is outside this change.

## Goal

Remove the unused direct dependency while preserving every current MkDocs
build, serve, validation, navigation, and publishing interface.

## Non-goals

- Migrating from MkDocs to Zensical or another generator.
- Changing `mkdocs.yml`, navigation, theme, plugins in active use, or Makefile
  targets.
- Adding a compatibility shim for a package that has no consumer.
- Editing or committing ignored local lockfiles or environment files.
- Broadly upgrading or re-pinning unrelated dependencies.

## Options Considered

### 1. Remove the direct dependency and validate from a fresh environment

Delete the package from `project.optional-dependencies.docs`, install
`.[dev,docs]` in the isolated worktree, assert the distribution is absent, and
run existing backend and strict documentation gates.

This is the selected option because it removes unused supply-chain and install
surface without changing runtime behavior.

### 2. Keep the package for a possible future docs layout

The planned generator migration does not depend on this MkDocs plugin, and the
current portal deliberately owns only the root `docs/` tree. Keeping an unused
package for hypothetical use would preserve cost without a concrete consumer.

### 3. Fold the removal into the docs-platform migration

That migration is explicitly gated on separate product and tooling decisions.
Bundling a confirmed cleanup into it would delay low-risk maintenance and
expand the review surface.

## Design

1. Remove `mkdocs-monorepo-plugin` from the tracked `docs` dependency group.
2. Leave all active MkDocs configuration and command interfaces unchanged.
3. Update the archived Zensical prep inventory so it records the stale
   dependency as resolved rather than repeatedly selecting it.
4. Create a fresh worktree-local environment from `.[dev,docs]` and verify:
   - package metadata does not include the removed distribution;
   - strict docs coverage and strict MkDocs build pass;
   - backend CI and the pre-push audit remain green.
5. Archive the implementation plan and update both planning indexes.

## Validation Boundary

`make docs-refs` currently reports an unchanged historical inline reference to
an ignored frontend-local environment file when run in a clean worktree. This
batch will run the check and record that baseline if it is the only finding,
while requiring the strict coverage and build gates to pass. It will not
create, copy, or inspect environment files to make a path-existence check
green.

## Risk And Rollback

Risk is limited to a hidden import or MkDocs configuration dependency missed
by static search. Fresh-environment installation plus strict documentation
build is the direct guard against that failure. Rollback is restoring the one
dependency declaration.
