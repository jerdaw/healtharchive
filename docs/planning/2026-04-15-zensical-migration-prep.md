# Docs-Site Zensical Migration Prep

## Status

Active prep only. This document inventories the current docs-platform coupling
points so the actual migration can be planned and executed in a separate change
series.

## Goal

Prepare the backend repo for a dedicated migration from the current MkDocs
Material stack to Zensical without starting that migration in this change.

## Current coupling points to account for

- **Navigation**: `mkdocs.yml` is the current sidebar/navigation source of
  truth.
- **Build + serve entrypoints**: `make docs-serve`, `make docs-build`,
  `make docs-build-strict`, and `make docs-check` currently resolve a `mkdocs`
  binary.
- **Docs validation**: `scripts/check_docs_coverage.py` currently parses
  `mkdocs.yml` directly to measure nav coverage.
- **Dependency groups**: `pyproject.toml` currently carries a docs dependency
  group centered on MkDocs Material and its current plugins.
- **Canonical docs/process guidance**: `AGENTS.md`,
  `docs/documentation-guidelines.md`, `README.md`, and `docs/project.md`
  currently describe the live docs portal as MkDocs-based.
- **Portal scope boundary**: the backend docs portal still owns only the
  repo-root `docs/` tree; frontend and datasets docs remain canonical in their
  own locations and should continue to be linked to rather than mirrored.

## What should happen in the migration-planning chat

1. Decide the target Zensical structure and how it will express the current nav.
2. Decide whether the repo will preserve the existing `make docs-*` interface
   or rename it with compatibility wrappers.
3. Replace MkDocs-specific docs checks with Zensical-aware equivalents while
   preserving the current documentation coverage expectations.
4. Update contributor/operator guidance only after the implementation approach
   is fixed, so policy docs describe the new reality once instead of thrashing.
5. Keep a fallback path documented: if Zensical cannot cover the required
   parity in a reasonable series, fall back to Sphinx + MyST rather than
   leaving the repo in a half-migrated state.

## Out of scope for this prep note

- Swapping the generator
- Editing docs build commands or dependency groups
- Reworking navigation/content structure beyond documenting the current state
- Rewriting historical docs just because they mention MkDocs

## Readiness criteria before implementation starts

- The repo is clean and pushed.
- The migration runs in a dedicated chat/series rather than piggybacking on
  unrelated crawl/backend work.
- The implementation plan explicitly covers nav replacement, build/serve
  commands, docs checks, dependency changes, and policy-doc follow-through.
