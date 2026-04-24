# Repo Audit Follow-Up Board (2026-04-23)

Status: audit-only. No fixes applied.

## Scope

Parallel audit across:

- code quality
- security
- privacy
- documentation quality and drift
- test quality and drift

## Current Setup

HealthArchive is a backend-first monorepo with an in-tree frontend:

- `src/ha_backend/` owns the FastAPI API, worker, CLI, indexing, and runtime
  services.
- `src/archive_tool/` owns the crawler/orchestrator subpackage.
- `frontend/` owns the live Next.js application.
- The repo already has a strong ops and documentation surface, so the main
  audit question here is whether current enforcement still matches repo size and
  claims.

## Current Entry Points

- `README.md`
- `docs/README.md`
- `ENVIRONMENTS.md`
- `docs/deployment/production-single-vps.md`
- `docs/operations/README.md`
- `docs/planning/roadmap.md`

## Findings By Area

### Code Quality

- `High`: `make ci` and the main backend CI lane no longer match the repo's
  stated engineering bar for a backend of this size. Full tests, coverage
  thresholds, docs checks, and Bandit are outside the main gate. Evidence:
  `pyproject.toml`, `Makefile`, `.github/workflows/backend-ci.yml`,
  `AGENTS.md`.
- `Medium`: core backend boundaries have collapsed into oversized modules,
  especially `src/ha_backend/api/routes_public.py` and `src/ha_backend/cli.py`.
  Evidence: `src/ha_backend/api/routes_public.py`, `src/ha_backend/cli.py`.

### Security

- `Medium`: frontend security docs overstate CI enforcement while the live CSP
  remains report-only. Evidence: `frontend/README.md`,
  `.github/workflows/frontend-ci.yml`,
  `frontend/next.config.ts`,
  `frontend/docs/deployment/verification.md`.
- `Informational`: the backend admin-token and private-metrics boundaries
  should be reviewed as one privileged surface even though this pass did not
  identify a concrete exploit-level issue. Evidence: `README.md`,
  `docs/operations/*`, `src/ha_backend/api/*`.

### Privacy

- `Low`: issue-report retention and deletion expectations remain qualitative for
  the one free-text plus optional-email intake surface. Evidence:
  `docs/operations/data-handling-retention.md`,
  `docs/operations/risk-register.md`,
  `src/ha_backend/api/routes_public.py`,
  `src/ha_backend/models.py`.

### Documentation Quality And Drift

- `No major finding above reporting threshold`: the repo has the cleanest
  current boundary and navigation split in this audit batch. The remaining work
  is follow-through: keep frontend bridge docs landing operators in the root
  production runbook and continue demoting historical deployment links where
  they can distract first-time operators.

### Test Quality And Drift

- `Medium`: coverage policy is internally inconsistent and not part of normal
  PR enforcement. `AGENTS.md` says critical modules should stay above 80 percent
  line coverage while the dedicated coverage doc still describes 75 percent as
  the enforced threshold. Evidence: `AGENTS.md`,
  `docs/development/test-coverage.md`, `Makefile`,
  `.github/workflows/backend-ci-full.yml`.
- `Medium`: the blocking public-surface smoke is permissive enough to miss
  meaningful contract drift in empty-index or partially disabled states.
  Evidence: `.github/workflows/backend-ci.yml`,
  `scripts/verify_public_surface.py`.

## Follow-Up Tracks

- Align `AGENTS.md`, coverage policy docs, and backend CI so the stated quality
  bar is the enforced one.
- Break the backend surface into smaller command and router families before more
  ops features accumulate in the current monolith files.
- Reconcile frontend security documentation with the controls actually enforced
  in CI, and decide whether report-only CSP remains acceptable.
- Define a concrete retention review path for issue reports, optional reporter
  email, and any related operator notes.
- Keep the current boundary/navigation structure intact while further demoting
  historical deployment links in first-time operator entry paths.
