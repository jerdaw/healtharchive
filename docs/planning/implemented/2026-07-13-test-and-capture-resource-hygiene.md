# Test And Capture Resource Hygiene

**Completed:** 2026-07-13

## Outcome

This consolidated batch resolved the documented UTC fixture, Starlette
TestClient transport, cached SQLite engine, and WARC record-stream lifecycle
findings without suppressing warnings.

Implemented changes:

- replaced the shared fixture's naive UTC fallback with `datetime.now(UTC)`;
- added Starlette's supported `httpx2>=2.0.0` TestClient transport to both
  development dependency surfaces while retaining production `httpx`;
- raised the existing docs-only Pillow dependency to 12.3.0 after the final
  pre-push audit identified five fixed advisories in 12.2.0;
- disposed and cleared the cached SQLAlchemy test engine after each test;
- closed warcio record streams in both production capture backends and every
  tracked test/integration WARC writer, including the CI e2e seed;
- closed the directly owned Playwright test log sink;
- reconciled the maintenance audit so completed warnings are not selected
  again.

## Evidence

The UTC warning boundary began with 4 failed and 9 passed tests. After the
aware fallback, all 13 passed and no executable `datetime.utcnow()` remained
under `src/` or `tests/`.

Resource diagnostics showed:

- Starlette imported legacy `httpx` only when `httpx2` was unavailable;
- cached SQLite engines were replaced without pool disposal;
- warcio retained temporary record streams after `write_record()`;
- one direct `_StageLogSink` test owner omitted cleanup.

Validation completed at the batch boundary:

- affected resource/capture warning-as-error cluster: 87 passed;
- all TestClient-importing modules with Starlette's warning as an error:
  227 passed;
- normal full backend suite: 843 passed;
- CI e2e seed smoke wrote and reread one response record;
- Ruff format check: 221 files already formatted;
- Ruff lint: all checks passed;
- strict docs coverage and strict MkDocs build passed;
- dependency audit passed with no known vulnerabilities after installing
  Pillow 12.3.0;
- `git diff --check` passed.

## Remaining Separate Work

A full strict warning inventory initially reported 49 failures and 794 passes.
After the batch fixes, the remaining class was four VPS recovery scripts whose
singleton lock files are held for a process run but not explicitly closed on
every return path. A safe fix must cover all early returns in each entry point;
it remains one separate operator-script lifecycle batch.

The batch was developed on top of the SQLAlchemy Query.get hygiene commit so
the maintenance-audit chronology remained coherent. The parent branch was
updated with main using merge commits, preserving ancestry without a force
push.
