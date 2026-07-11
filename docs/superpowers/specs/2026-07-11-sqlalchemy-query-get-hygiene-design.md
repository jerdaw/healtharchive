# SQLAlchemy Query.get Test Hygiene Design

**Date:** 2026-07-11

## Context

The maintenance audit explicitly schedules a Python test-hygiene pass for
SQLAlchemy `Query.get()` deprecations. A repository search finds exactly two
uses, both in `tests/test_changes.py::test_get_latest_job_ids_by_source_logic`.
The focused file passes 13 tests but emits two `LegacyAPIWarning` messages that
direct callers to `Session.get()`.

## Goal

Remove the two SQLAlchemy legacy-API warnings without changing application
behavior or broadening into unrelated warning cleanup.

## Non-goals

- Changing production queries, models, sessions, or database behavior.
- Addressing `datetime.utcnow()` warnings.
- Migrating Starlette/FastAPI TestClient dependencies.
- Suppressing, filtering, or globally reclassifying warnings.
- Upgrading SQLAlchemy or any dependency.

## Selected Change

Replace:

```python
db_session.query(ArchiveJob).get(primary_key)
```

with:

```python
db_session.get(ArchiveJob, primary_key)
```

`Session.get()` is already the dominant pattern in the test suite and preserves
primary-key identity lookup semantics. The surrounding assertions, fixtures,
and transaction lifecycle remain unchanged.

## Validation Strategy

Use the warning as the failing contract:

1. run `tests/test_changes.py` with SQLAlchemy `LegacyAPIWarning` promoted to an
   error and confirm the legacy call fails;
2. apply the two mechanical replacements;
3. rerun the same command and confirm all 13 tests pass;
4. search `src/` and `tests/` for remaining `Query.get()` call shapes;
5. run strict documentation validation and the pre-push gate.

Other known warning classes remain visible and are not claimed fixed.

## Documentation Closeout

Update `docs/maintenance-audit.md` in three places: annotate the historical
deferred observation as resolved by this later hygiene pass, remove
`Query.get()` from the current recommendation, and remove it from the current
remaining-warning list. Retain the datetime, TestClient, and SQLite
ResourceWarning follow-ups. Archive a short implementation plan, update both
planning indexes, and run `make docs-check`. No roadmap item is closed.

## Risk And Rollback

Risk is minimal because the change uses the same model and primary key through
the supported session API. Focused warning-as-error validation protects the
intended outcome. Rollback is limited to two test lines, maintenance-audit truth
maintenance, and planning history.
