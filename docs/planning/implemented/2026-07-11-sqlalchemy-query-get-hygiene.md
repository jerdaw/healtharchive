# SQLAlchemy Query.get Test Hygiene (Implemented 2026-07-11)

**Status:** Implemented | **Scope:** Replaced the repository's two legacy
SQLAlchemy `Query.get()` test calls with supported `Session.get()` lookups and
closed only that warning item.

## Outcomes

- Changed only the two lookups in
  `test_get_latest_job_ids_by_source_logic`:

  ```python
  job1 = db_session.get(ArchiveJob, snap1.job_id)
  job2 = db_session.get(ArchiveJob, snap2.job_id)
  ```

- No production code, dependencies, warning policy, or roadmap entries changed.
- The maintenance audit now preserves the original deferred-warning chronology
  while recording that the later 2026-07-11 pass resolved `Query.get()` only.
- Current recommendations and warning lists no longer identify `Query.get()` as
  outstanding work.

## Test-First Evidence

- RED: the focused test file, with SQLAlchemy `LegacyAPIWarning` promoted to an
  error, reported `1 failed, 12 passed` and failed at the first legacy lookup.
- RED also reported seven unrelated `datetime.utcnow()` warnings.
- GREEN: after both replacements, the same command reported `13 passed` with
  no `LegacyAPIWarning` failure.
- GREEN continued to report the same seven unrelated `datetime.utcnow()`
  warnings; this batch did not claim to fix them.
- A guarded repository search found zero remaining
  `.query(...).get(...)` call shapes under `src/` and `tests/`.

## Validation

- `make prepush` passed Ruff formatting and linting, mypy, 385 tests, API smoke,
  dependency audit, and migration audit.
- The full test run retained one existing Starlette/httpx TestClient warning.
- `make docs-check` passed with temporary ignored, non-secret placeholders for
  two paths that the pre-existing maintenance audit referenced but that were
  absent on `origin/main`: the local frontend environment override and the
  frontend dependency directory.
- Those worktree-local placeholders were removed immediately after validation.
  This batch did not fix that reference-check issue; ready PR #142 handles it
  separately.
- `git diff --check` passed.

## Open Follow-ups

- Python `datetime.utcnow()` deprecation warnings in test fixtures remain open.
- The Starlette/httpx TestClient deprecation warning remains open.
- SQLite `ResourceWarning` messages during coverage remain open.

## Canonical Docs Updated

- `docs/maintenance-audit.md` records the warning's historical observation,
  later resolution, and the remaining warning work.

## Historical Context

The approved design remains in
`docs/superpowers/specs/2026-07-11-sqlalchemy-query-get-hygiene-design.md`.
Detailed execution history is preserved in git.
