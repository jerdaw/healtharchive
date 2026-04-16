# HealthArchive Frontend + Backend Monorepo Consolidation Plan (Implemented 2026-04-15)

**Status:** Implemented | **Scope:** HealthArchive now uses the backend-anchored
app monorepo in `jerdaw/healtharchive`, with backend code at the repo
root, frontend code under `frontend/`, and `healtharchive-datasets` kept as a
separate publication repo.

## Outcomes

- Adopted the backend-anchored monorepo shape instead of a larger
  `apps/backend` + `apps/frontend` restructure.
- Imported and retained frontend history under `frontend/` while keeping the
  backend repo root as the deploy/docs anchor.
- Standardized local development, CI, and contract-sync workflows on the
  single-repo layout.
- Retired and archived the former standalone `jerdaw/healtharchive-frontend`
  repository after stabilization so the monorepo remains the only active app
  source.
- Kept the production runtime model unchanged during repo consolidation:
  systemd-backed backend at `/opt/healtharchive` plus release-root
  Docker frontend on the VPS.
- Executed the separate host-side source cutover on 2026-04-15 through
  `platform-ops` `PLAN-013` after restore-proof and production-truth checks.

## Canonical Docs Updated

- `../../development/dev-environment-setup.md`
- `../../quickstart.md`
- `../../README.md`
- `../../project.md`
- `../../../frontend/docs/development/dev-environment-setup.md`
- `../../../frontend/docs/implementation-guide.md`
- `https://github.com/jerdaw/platform-ops/blob/main/docs/plans/PLAN-013-healtharchive-monorepo-production-cutover.md`

## Historical Context

Detailed phase-by-phase reasoning, intermediate execution notes, and the
original long-form planning narrative are preserved in git history. The active
host-side execution record lives in the related `platform-ops` docs.
