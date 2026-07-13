# Test And Capture Resource Hygiene Design

**Date:** 2026-07-13

## Context

The maintenance audit tracks three related warning classes: the shared test
fixture's deprecated UTC fallback, Starlette's legacy TestClient transport,
and SQLite connections retained by test engines. A warning-as-error inventory
also found that the two production WARC capture backends and several test WARC
writers retain warcio temporary streams after each record is written.

This batch is stacked on the approved SQLAlchemy warning-cleanup branch because
both changes reconcile the same maintenance-audit lines. Its pull request will
target `codex/sqlalchemy-query-get-hygiene` to avoid overlapping main-targeted
documentation edits.

## Goal

Close this warning/resource-lifecycle group in one reviewable batch, including
the production HTTP and Playwright WARC record writers.

## Non-goals

- Changing application timestamp generation or database schema.
- Normalizing caller-supplied fixture timestamps.
- Removing production `httpx`, which remains used by capture code.
- Refactoring singleton lock ownership in the four VPS recovery scripts. Their
  process-lifetime handles are a separate operational change because a safe
  fix must cover every early-return path across four large entry points.
- Suppressing warnings or changing global warning policy.
- Rebasing or modifying the parent warning-cleanup PR.

## Selected Changes

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

Add Starlette's supported `httpx2>=2.0.0` TestClient transport to both
development dependency surfaces while retaining runtime `httpx`. Add a shared
autouse teardown that disposes the cached SQLAlchemy test engine and clears its
session factory after every test.

Close each warcio record stream in `finally`, including the original stream
retained during digest buffering. Apply this to both production capture
backends and every tracked test/integration WARC writer, including the CI e2e
seed. Close the directly constructed Playwright stage-log sink in its owning
test.

## Validation Strategy

Use warning classes as executable boundaries:

1. run `tests/test_changes.py` with `DeprecationWarning` from module `conftest`
   promoted to an error and confirm the fallback causes four failures;
2. apply the import and one-line replacement;
3. rerun the same command and confirm all 13 tests pass;
4. prove the TestClient import succeeds with Starlette's deprecation promoted
   to an error;
5. run the capture, WARC, database, and API clusters with `ResourceWarning`
   and `PytestUnraisableExceptionWarning` promoted to errors;
6. run the normal full backend suite, strict docs validation, and pre-push.

The full strict inventory initially reported 49 failures and 794 passes. The
remaining four-script singleton-lock class is documented but not claimed fixed.

## Documentation Closeout

Update the same three maintenance-audit contexts on top of the parent branch:

- mark UTC, TestClient, SQLite-engine, and WARC-stream findings resolved;
- retain a precise follow-up for the four singleton lock handles;
- record actual warning-as-error and normal-suite evidence.

Archive a 40–80 line implementation plan and update both planning indexes. No
roadmap item is closed.

## Risk And Rollback

Production risk is limited to closing WARC record streams after
`writer.write_record()` has fully consumed them. Test risk is isolated to
resource cleanup and the supported TestClient transport. Focused capture and
replay tests prove records remain readable; full tests protect surrounding
behavior. Each change can be reverted independently.
