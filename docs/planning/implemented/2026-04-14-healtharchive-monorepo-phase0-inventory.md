# HealthArchive Monorepo Phase 0 Inventory And Execution Checklist (Implemented 2026-04-15)

**Status:** Implemented | **Scope:** Historical inventory and execution-prep
record for the frontend subtree import, monorepo-aware workflow updates, and
production-cutover prerequisites that were completed before the 2026-04-15 live
host cutover.

## Outcomes

- Captured the file-by-file pre-migration inventory and the cutover safety
  constraints before the frontend subtree import.
- Normalized monorepo-aware CI, contract-sync, hook, and dev-environment flows
  after the frontend import landed.
- Recorded the GitHub/governance cleanup needed to make the backend repo the
  single canonical app repo.
- Separated repo-side canonicalization from the later VPS source cutover so the
  production runtime could be changed in a controlled maintenance window.

## Canonical Docs Updated

- `../../development/dev-environment-setup.md`
- `../../documentation-guidelines.md`
- `../../project.md`
- `../../../frontend/docs/development/dev-environment-setup.md`
- `../../../frontend/README.md`
- `https://github.com/jerdaw/platform-ops/blob/main/docs/runbooks/RUN-011-healtharchive-monorepo-ad-hoc-maintenance-window.md`

## Historical Context

The original inventory, checklist detail, and file-by-file migration notes are
preserved in git history. This archived summary is the stable reference for
what Phase 0 delivered and where the living docs now live.
