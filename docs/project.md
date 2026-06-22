# HealthArchive Project Overview

HealthArchive is a public monorepo for archiving, indexing, and serving
Canadian health-government web snapshots. The backend lives at the repository
root, the public web app lives in `frontend/`, and dataset-release material is
kept in a separate datasets repository.

This page is public-facing by design. Production deployment details,
environment-specific operator procedures, host paths, monitoring routes, and
credential locations belong in the private operations workspace, not in tracked
public documentation.

## Where To Start

Use the MkDocs navigation in `mkdocs.yml` as the current source of truth for
the public docs site.

- Researchers and API consumers: start with `docs/api-consumer-guide.md`,
  `docs/api.md`, and `docs/datasets-external/README.md`.
- Backend developers: start with `docs/development/dev-environment-setup.md`,
  `docs/development/live-testing.md`, and `docs/architecture.md`.
- Frontend developers: start with `frontend/docs/development/bilingual-dev-guide.md`.
- Maintainers and operators: use the private operations workspace for
  production runbooks and environment-specific procedures. Public
  deployment/operations docs in this repo are boundary summaries only.

## Repository Map

| Area | Purpose |
| --- | --- |
| Repo root | FastAPI backend, SQLAlchemy models, worker loop, indexing pipeline, CLI commands |
| `src/archive_tool/` | In-tree crawler integration used by backend jobs |
| `frontend/` | Next.js public web app and frontend-specific docs |
| `docs/` | Public-safe project, architecture, API, local development, and contribution docs |
| `docs/planning/` | Backlog and historical implementation plans |
| `docs/datasets-external/` | Pointer to the separate datasets repository |

## Public Documentation Boundary

Public docs may cover project purpose, methodology, architecture, API behavior,
limitations, local development, testing, and contribution workflows.

Public docs must not include private operational details such as production
hostnames, private network names, exact host paths, release roots, environment
file paths, deployment inventories, alerting internals, backup locations, or
operator-only runbooks.

When a public doc needs operational context, keep it to the purpose and
ownership boundary, then point maintainers to the private operations workspace.

## Local Maintenance Commands

Common public-development checks:

```bash
make venv
make ci
make docs-check
```

Frontend parity requires Node.js 20.19.0 or newer:

```bash
make frontend-install
make contract-sync
make frontend-ci
```

For complete local crawl/API testing flows, follow
`docs/development/live-testing.md` instead of inventing ad hoc commands.

## Documentation Maintenance

- Run `make docs-serve` to preview the public docs site locally.
- Run `make docs-build` to regenerate generated public artifacts such as
  `docs/openapi.json` and `docs/llms.txt`.
- Keep new public docs linked from `mkdocs.yml` when they should appear in the
  docs-site sidebar.
- Keep operator-heavy content out of public docs; use public boundary stubs for
  topics that are operationally important but environment-specific.
