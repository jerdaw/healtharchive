# Environments & configuration (pointer)

Canonical cross-repo environment wiring lives in:

- `docs/deployment/environments-and-configuration.md`

Shared VPS inventory, ingress ownership, canonical public hosts, and cross-project
operations state live in `/home/jer/repos/vps/platform-ops`. Use
`/home/jer/repos/vps/platform-ops/docs/standards/PLAT-009-shared-vps-documentation-boundary.md`
as the default rule for what belongs in this repo versus shared ops
documentation.

This file intentionally avoids duplicating environment details to prevent drift.

Related docs:

- `docs/deployment/production-single-vps.md` (production runbook)
- `docs/deployment/environments-and-configuration.md` (current frontend/backend env contract)
- `docs/deployment/hosting-and-live-server-to-dos.md` (historical Vercel-era checklist)
- `docs/operations/monitoring-and-ci-checklist.md` (CI and monitoring setup)
- `/home/jer/repos/vps/platform-ops/docs/standards/PLAT-009-shared-vps-documentation-boundary.md` (shared-VPS vs app-repo documentation ownership)
