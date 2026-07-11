# UTC-Aware Test Timestamp Hygiene Design

**Date:** 2026-07-11

## Context

The maintenance audit tracks `datetime.utcnow()` as focused Python test
hygiene. One executable occurrence remains, in the shared snapshot factory at
`tests/conftest.py`. The `Snapshot.capture_timestamp` model column is declared
with `DateTime(timezone=True)`. Focused change tests pass but emit seven Python
deprecation warnings from the fixture fallback.

This batch is stacked on the approved SQLAlchemy warning-cleanup branch because
both changes reconcile the same maintenance-audit lines. Its pull request will
target `codex/sqlalchemy-query-get-hygiene` to avoid overlapping main-targeted
documentation edits.

## Goal

Replace the naive UTC fallback with an aware UTC timestamp and close only the
`datetime.utcnow()` warning item.

## Non-goals

- Changing application timestamp generation or database schema.
- Normalizing caller-supplied fixture timestamps.
- Migrating Starlette/FastAPI TestClient dependencies.
- Investigating SQLite ResourceWarnings.
- Suppressing warnings or changing global warning policy.
- Rebasing or modifying the parent warning-cleanup PR.

## Selected Change

Import Python 3.11's `UTC` constant and replace:

```python
timestamp or datetime.utcnow()
```

with:

```python
timestamp or datetime.now(UTC)
```

Caller-provided timestamps retain precedence. The fallback becomes explicitly
UTC-aware, matching the timezone-aware ORM column and Python's deprecation
guidance.

## Validation Strategy

Use the fixture module as the warning boundary:

1. run `tests/test_changes.py` with `DeprecationWarning` from module `conftest`
   promoted to an error and confirm the fallback causes four failures;
2. apply the import and one-line replacement;
3. rerun the same command and confirm all 13 tests pass;
4. search `src/` and `tests/` for remaining `datetime.utcnow` calls;
5. run strict docs validation and the pre-push gate.

Warnings from other modules remain outside this focused filter and are not
claimed fixed.

## Documentation Closeout

Update the same three maintenance-audit contexts on top of the parent branch:

- annotate the historical datetime observation as resolved by this later pass;
- remove datetime from the current Python test-hygiene recommendation, leaving
  TestClient work open;
- remove datetime from the current remaining-warning list, leaving TestClient
  and SQLite warnings open.

Archive a 40–80 line implementation plan and update both planning indexes. No
roadmap item is closed.

## Risk And Rollback

Risk is limited to tests that implicitly expected a naive fallback. The model
contract is timezone-aware and focused/full tests validate actual behavior.
Rollback is limited to one import, one fixture expression, audit truth
maintenance, and planning history.
