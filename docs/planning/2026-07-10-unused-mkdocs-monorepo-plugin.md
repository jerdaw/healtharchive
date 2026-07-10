# Unused MkDocs Monorepo Plugin Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the confirmed-unused `mkdocs-monorepo-plugin` dependency
without changing the live documentation platform or its interfaces.

**Architecture:** Change only tracked dependency metadata and the canonical
inventory that identified the stale package. Validate from a fresh
worktree-local environment because the repository intentionally does not track
a lockfile.

**Tech Stack:** Python packaging metadata, uv, MkDocs Material, pytest, Ruff,
mypy, pip-audit.

## Constraints

- Do not modify `mkdocs.yml`, Makefile docs targets, or active MkDocs plugins.
- Do not create or commit a lockfile; `uv.lock` is intentionally ignored.
- Do not inspect, copy, or modify ignored environment files.
- Do not broaden this batch into the planned docs-generator migration.
- Preserve the public/private documentation boundary.

### Task 1: Remove The Unused Direct Dependency

**Files:**

- Modify: `pyproject.toml`

- [ ] Confirm the package has no consumer outside dependency metadata and the
  archived inventory:

  ```bash
  rg -n "mkdocs-monorepo-plugin|monorepo-plugin" . \
    --glob '!pyproject.toml' --glob '!.git/**' --glob '!.tmp/**' \
    --glob '!.venv/**' --glob '!site/**'
  ```

  Expected: only the archived migration-prep note matches.

- [ ] Remove `mkdocs-monorepo-plugin` from the `docs` dependency group with no
  other dependency edits.

- [ ] Verify the metadata diff:

  ```bash
  git diff -- pyproject.toml
  git diff --check
  ```

  Expected: one dependency line removed and no whitespace errors.

- [ ] Commit the dependency cleanup:

  ```bash
  git add pyproject.toml
  git commit -m "chore: remove unused MkDocs monorepo plugin"
  ```

### Task 2: Prove A Fresh Environment Does Not Need The Plugin

**Files:**

- Create ignored local environment only: `.venv/`

- [ ] Create a fresh environment and install the tracked dependency metadata:

  ```bash
  uv venv .venv
  uv pip install --python .venv/bin/python -e '.[dev,docs]'
  ```

- [ ] Assert the removed distribution is absent:

  ```bash
  .venv/bin/python -c \
    "import importlib.metadata as m; assert 'mkdocs-monorepo-plugin' not in {d.metadata['Name'].lower() for d in m.distributions()}"
  ```

- [ ] Run the closest gates:

  ```bash
  make backend-ci
  make docs-coverage-strict
  make docs-build-strict
  make docs-refs
  git diff --check
  ```

  Expected: backend CI and both strict docs gates pass. `docs-refs` may report
  only the unchanged historical ignored-environment-file baseline documented
  in the design; any other finding is a regression to fix.

### Task 3: Close The Documented Candidate

**Files:**

- Modify: `docs/planning/implemented/2026-04-15-zensical-migration-prep.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-unused-mkdocs-monorepo-plugin.md`

- [ ] Replace the stale-candidate wording in the migration-prep inventory with
  a dated resolution note. Preserve the remaining migration coupling points
  and readiness criteria.

- [ ] Move this plan to
  `docs/planning/implemented/2026-07-10-unused-mkdocs-monorepo-plugin.md` and
  compress it to the implemented-plan summary format.

- [ ] Remove the active-plan entry and add the archived plan to both planning
  indexes.

- [ ] Commit the closeout:

  ```bash
  git add docs/planning
  git commit -m "docs: close unused MkDocs plugin cleanup"
  ```

### Task 4: Verify The Committed Tree And Prepare Review

- [ ] Run exact-HEAD gates:

  ```bash
  make backend-ci
  make docs-coverage-strict
  make docs-build-strict
  make prepush
  git diff --exit-code
  git status --short --branch
  ```

- [ ] Request an independent read-only review of `origin/main..HEAD`.

- [ ] Address any validated findings and rerun affected gates.

- [ ] Push the branch, open a ready PR, and wait for hosted checks. Do not
  merge the PR.
