# HealthArchive Documentation

This documentation portal covers the **HealthArchive app monorepo** and links
to the separate datasets documentation.

Public documentation focuses on project purpose, data methodology,
architecture, limitations, and reproducible local development. Deployment is
environment-specific and handled outside this public repository; exact host
paths, private inventories, and operator-only runbooks are intentionally not
documented here.

## Quick Start by Role

Choose the path that matches your role:

- **Developers**: Start with [Development Guide](development/README.md) → [Live Testing](development/live-testing.md)
- **Deploying**: Use your environment-specific deployment runbook outside this public docs portal
- **API consumers**: Start with [API Documentation](api.md)
- **Researchers**: Start with [Architecture](architecture.md) → [Datasets](datasets-external/README.md)

## Key Resources

| Need | Documentation |
|------|---------------|
| Architecture overview | [Architecture](architecture.md) |
| Public project summary | [About HealthArchive](https://healtharchive.ca/about) |
| Public changelog | [Project changelog](https://healtharchive.ca/changelog) |
| Local development setup | [Dev Setup](development/dev-environment-setup.md) |
| Search API | [API Documentation](api.md) |
| Data releases | [Datasets](datasets-external/README.md) |
| Latest maintenance audit | [Maintenance Audit](maintenance-audit.md) |

## Documentation Structure

This docs portal is built from `docs/` in the app monorepo. Frontend-specific
docs remain canonical under `frontend/docs/` and are surfaced here through the
`docs/frontend/` bridge; datasets docs remain canonical in the separate
datasets repo:

- Frontend bridge: `frontend/README.md`
- Datasets pointers: `datasets-external/README.md`

Private shared-ops documentation is the canonical home for shared host facts
such as ingress ownership, service inventory, backup posture, and host access
rules. This public portal keeps only the app-specific and local-development
material needed to understand and reproduce the project.

## Recommended reading order

0. Project docs portal (monorepo + datasets navigation)
   - this page
1. Architecture & implementation (how the code works)
   - `architecture.md`
2. Public API and data access
   - `api.md`
   - `api-consumer-guide.md`
   - `datasets-external/README.md`
3. Local development / live testing (how to run it locally)
   - `development/live-testing.md`
   - `development/dev-environment-setup.md` (local setup guidance)
   - `development/testing-guidelines.md` (backend test expectations)
4. Contribution and public project context
   - `contributing.md`

## Notes

- No secrets live in this repo. Any token/password values shown in docs must be
  placeholders.
- The `archive_tool` crawler has its own internal documentation at
  `src/archive_tool/docs/documentation.md`.
