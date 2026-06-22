# Documentation Process Audit

Status: historical audit, rewritten as a public-safe current-state summary.

The original 2026-01-09 audit reviewed the project documentation system across
the backend, frontend, datasets, and local workspace conventions. Since then,
the public/private documentation boundary has tightened: production deployment
details and operator-only runbooks now live outside tracked public docs.

## Current Documentation Model

- `mkdocs.yml` is the current public docs-site navigation source of truth.
- `docs/documentation-guidelines.md` defines the documentation policy,
  lifecycle, and public/private boundary.
- `docs/planning/roadmap.md` tracks not-yet-implemented work.
- `docs/planning/implemented/` preserves historical implementation plans.
- `frontend/docs/` owns frontend development and bilingual/i18n guidance.
- `docs/deployment/**` and `docs/operations/**` are public-safe summaries or
  boundary stubs where the real procedure is environment-specific.

## Maintenance Checks

Use these checks when changing docs:

```bash
make docs-refs
make docs-coverage-strict
make docs-build-strict
```

`make docs-refs` regenerates generated public artifacts before checking local
references. `make docs-coverage-strict` follows the MkDocs nav and reachable
links while respecting `exclude_docs` entries in `mkdocs.yml`.

## Durable Principles

- Keep canonical content in one place and link to it from pointers.
- Keep public docs useful for users, researchers, and local contributors.
- Keep environment-specific operational procedures in the private operations
  workspace.
- Treat generated public artifacts, including `docs/openapi.json` and
  `docs/llms.txt`, as public-safe outputs.
- Add templates and nav entries when new docs introduce repeatable workflows.

## Remaining Maintenance Opportunities

- Continue retiring or rewriting stale excluded docs when they no longer match
  the current public docs model.
- Keep dependency, audit, and pre-commit versions aligned across `pyproject.toml`,
  `requirements.txt`, and pre-commit configs.
- Keep frontend root planning notes organized so durable plans live under the
  documented planning structure.
