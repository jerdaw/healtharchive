# Backend testing guidelines (internal)

This doc describes the **backend** testing expectations and how to run checks locally.

If you want step-by-step “run the app and click it” workflows, use:

- `live-testing.md`

## What CI runs (recommended locally)

From the repo root:

- `make backend-ci` (fast backend CI gate: format check, lint, typecheck, tests)
- `make prepush` (GitHub-parity pre-push gate: `make check` + local API-health verification + CI-aligned `pip-audit` policy)
- `make check-full` (optional: pre-commit, security scan, docs build/lint)

`make backend-ci` is intentionally kept low-friction so it can run constantly without blocking development.
Use `make check-full` before deploys or when you want stricter validation.

Notes:

- `make backend-ci` runs the same fast backend gate as `make ci`, including `make test-fast`.
- `make test-all` runs the full test suite.
- `make prepush` includes `scripts/ci-api-health-local.sh`, which picks an
  available loopback port by default. Use `API_PORT`, `API_HOST`, or
  `PYTHON_BIN` only when debugging a local environment issue.
- Browser automation suites (for example Playwright in related repos) should run in CI by default; only run them locally when you explicitly need interactive debugging.

## Change-scope local gates

Use the narrowest gate that matches the files you changed while iterating, then
run `make prepush` before pushing when the change spans backend/frontend
contracts or user-visible workflows.

| Change scope | Local validation | CI/workflow parity |
| --- | --- | --- |
| Backend-only code or backend tests | `make backend-ci` | `.github/workflows/backend-ci.yml` fast backend gate |
| Frontend-only code, UI tests, or frontend docs/build inputs | `make contract-check` and `make frontend-ci` | `.github/workflows/frontend-ci.yml` contract + frontend jobs |
| Docs-only changes | `make docs-refs` and `make docs-coverage-strict`; add `make docs-build` for nav or rendered-page changes | `.github/workflows/docs.yml` docs build plus advisory docs reference/coverage checks |
| Backend/frontend API contract changes | `make contract-sync`, `make contract-check`, and `make integration-e2e` | Backend and frontend CI plus integrated smoke |
| Broad pre-push readiness | `make prepush`; use `make check-full` before deploys or stricter review | Local parity gate plus optional full backend suite |

Docs reference checks regenerate `docs/openapi.json` and `docs/llms.txt` as
git-ignored public artifacts before validating links and references. Treat
`make docs-refs` as the narrow docs-reference integrity check; use
`make docs-build` when you also need to verify the rendered MkDocs site.

### GitHub Actions quota-constrained periods

When the GitHub Actions free-tier quota is constrained, keep local validation
high-signal and avoid burning CI minutes on nonessential pushes:

- use `make prepush` locally as the default readiness gate before pushing;
- use focused `pytest ...`, `ruff check ...`, and docs builds while iterating;
- defer full frontend/browser automation to GitHub CI or explicit debugging
  sessions, not routine local runs;
- batch docs-only and maintenance-only updates where practical so CI runs less
  often without weakening the required branch checks.

The backlog item for longer-term workflow optimization is tracked in
`../planning/roadmap.md` under GitHub Actions free-tier resilience.

## End-to-end smoke (public surface)

CI also runs a fast end-to-end smoke check that starts the backend + frontend
locally from one checkout and verifies user-critical routes (no browser automation):

- `make integration-e2e`
  - equivalent script form: `./scripts/ci-e2e-smoke.sh --frontend-dir frontend`
  - If the frontend is already built (CI artifact), add: `--skip-frontend-build`

In CI, the smoke check runs in `.github/workflows/backend-ci.yml` on pushes,
pull requests, and manual runs from the same checkout.

## Running subsets

- Unit tests: `pytest`
- One test file: `pytest tests/test_something.py`
- One test: `pytest -k some_keyword`
- Lint + format: `ruff check .` and `ruff format --check .`
- Type-check: `mypy src tests`

### Known local warning

The current FastAPI/Starlette test stack emits a
`StarletteDeprecationWarning` about using `httpx` with `starlette.testclient`
when API tests import `TestClient`. This is an upstream dependency transition,
not a failing project check. Do not silence it broadly, downgrade dependencies,
or rewrite the API test harness solely for the warning; revisit when the
project intentionally adopts the supported TestClient/httpx replacement.

## Writing tests

- Put tests in `tests/` and prefer plain `pytest` tests (no custom harness).
- Keep tests deterministic:
  - avoid real network calls
  - avoid wall-clock dependencies
  - avoid global state between tests
- If you add a new API route, add at least one test that exercises the route and asserts the key behavior.
- If you change DB behavior, prefer tests that set up a temporary DB using the existing test fixtures/patterns.

## Scope (what belongs in tests vs scripts)

- App behavior belongs in `tests/`.
- VPS automation scripts under `scripts/` should stay simple and safe; when logic grows (parsing, policy evaluation), prefer moving that logic into a small Python module that can be tested.
