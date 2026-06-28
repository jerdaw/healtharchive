# Autonomous Overnight Work Plan (Implemented 2026-06-28)

## Summary

Completed the 2026-06-28 unattended maintenance queue for HealthArchive. The
work stayed inside safe, reviewable regression coverage, public documentation
alignment, and one narrow indexing-observability change. It did not change
schema, migrations, deployment behavior, credentials, public API semantics, or
production operations procedures.

## Completed Scope

- Added frontend test setup coverage for jsdom canvas behavior to remove noisy
  local test warnings.
- Updated static-page accessibility tests to avoid React `act(...)` warnings.
- Tightened frontend tests that guard browser-facing code against admin,
  metrics, and private API references.
- Added frontend security-header, locale-link, metadata, and alpha French
  `noindex` regression coverage.
- Added backend/admin tests for fail-closed admin auth and alternate admin
  token header handling.
- Added cleanup-job safety regression coverage for unsafe job states and
  missing archive roots.
- Added WARC discovery edge coverage for deterministic ordering and hardlink
  duplicate handling.
- Added public API pagination, changes feed, export endpoint, and raw snapshot
  failure-mode regression coverage.
- Added public-surface tests around generated `llms.txt` content and the local
  public verifier options.
- Added public-safe indexing progress logs around WARC discovery,
  verification, and per-WARC reading using WARC filenames only.
- Documented local validation scope, GitHub Actions free-tier posture, generated
  docs artifacts, and the known upstream TestClient warning.
- Reworded the public monitoring summary to avoid private-boundary terms.
- Updated PR guidance to match the local validation policy.

## Files and Areas

- Backend tests: public API, admin auth, cleanup, indexing, WARC discovery,
  raw snapshot replay, public verifier, and generated LLM context coverage.
- Frontend tests: setup, accessibility, public-only reference scanning,
  security headers, i18n, and metadata coverage.
- Source: `src/ha_backend/indexing/pipeline.py` only, for narrow progress
  logging.
- Docs: testing guidelines, documentation guidelines, monitoring summary, and
  pull request guidance.
- Generator: `scripts/generate_llms_txt.py`, split to expose a pure
  `build_llms_txt()` path for tests.

## Validation

Final validation passed on 2026-06-28:

1. `make ci`
2. `make frontend-ci`
3. `make docs-refs`
4. `make docs-coverage-strict`
5. `make coverage-critical`
6. `git diff --check`
7. Sensitive path-name scan over the diff
8. Secret-pattern scan over the diff
9. `.venv/bin/pre-commit run detect-private-key --all-files`

Observed non-fatal warnings were the documented Starlette/FastAPI TestClient
warning and ResourceWarnings from the broad coverage run. `coverage-critical`
passed with 81.58% critical coverage against the 75% floor.

## Follow-Through

- Keep the Starlette/FastAPI TestClient warning documented until the supported
  upstream migration path is clear.
- Keep GitHub Actions free-tier work open for workflow trigger, concurrency,
  artifact-retention, and manual-dispatch review.
- Keep public/private operations separation open for any remaining operator-only
  assets outside the covered docs surface.
- Continue tracking upstream-safe dependency fixes through the existing
  dependency workflow rather than applying blind overrides or downgrades.
