# Environments & configuration (pointer)

Canonical cross-repo environment wiring lives in:

- `docs/deployment/environments-and-configuration.md`

Shared host inventory, ingress ownership, canonical public hosts, and
cross-project operations state live in the private shared-ops workspace. Use
that workspace's documentation boundary as the default rule for what belongs
in this repo versus shared ops documentation.

This file intentionally avoids duplicating environment details to prevent drift.

Related docs:

- `docs/deployment/production-single-vps.md` (production runbook)
- `docs/deployment/environments-and-configuration.md` (current frontend/backend env contract)
- `docs/deployment/hosting-and-live-server-to-dos.md` (historical Vercel-era checklist)
- `docs/operations/monitoring-and-ci-checklist.md` (CI and monitoring setup)
- Private shared-ops documentation boundary (shared-host vs app-repo documentation ownership)
