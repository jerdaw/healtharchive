# Maintenance Audit

Audit date: July 5, 2026

## Audit Metadata

- Target repo root: current Git repository root. Exact local filesystem path is
  intentionally omitted from this public report.
- Prompt-pack root: user-supplied external v5 deep-evidence repo-health prompt
  pack containing an entrypoint named RUN_THIS_FIRST.md and the required pass
  files. Exact local filesystem path is intentionally omitted from this public
  report.
- Git state at start of this continuation:
  `main...origin/main` with maintenance edits already present in `.env.example`,
  `README.md`, `docs/**`, `src/ha_backend/config.py`, `tests/test_config.py`,
  and an untracked `docs/maintenance-audit.md`.
- Prompt-pack handling: read-only. No files under the prompt-pack root were
  modified or copied into the repo.

## Repo Profile

HealthArchive is a public app monorepo for HealthArchive.ca. It contains:

- Python/FastAPI/SQLAlchemy backend code under `src/ha_backend/`;
- an in-tree crawler/orchestrator package under `src/archive_tool/`;
- Alembic migrations under `alembic/`;
- a Next.js/TypeScript frontend under `frontend/`;
- MkDocs documentation under `docs/`;
- CI, verification, and operations scripts under `.github/`, `scripts/`, and
  related ops config trees.

Risk level for unattended changes: moderate to high. Public APIs, admin and
metrics auth, crawl job lifecycle, WARC/replay paths, local/production config,
database migrations, and public/private documentation boundaries all affect
operator safety or public behavior. Changes in this pass were kept local,
reversible, repo-native, and verified with existing commands.

## Instructions And Conventions Considered

- Repo-local instructions: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.
- Frontend-specific instructions: `frontend/AGENTS.md`.
- Canonical docs: `README.md`, `docs/architecture.md`,
  `docs/documentation-guidelines.md`, `docs/development/live-testing.md`,
  `src/archive_tool/docs/documentation.md`,
  `frontend/docs/development/bilingual-dev-guide.md`.
- Tooling/config: `Makefile`, `pyproject.toml`, `requirements.txt`,
  `mkdocs.yml`, `.pre-commit-config.yaml`, `.nvmrc`,
  `frontend/package.json`, `frontend/package-lock.json`.
- CI/workflows: `.github/workflows/backend-ci.yml`,
  `.github/workflows/backend-ci-full.yml`, `.github/workflows/frontend-ci.yml`,
  `.github/workflows/docs.yml`, `.github/workflows/workflow-lint.yml`,
  `.github/workflows/platform-ops-integration.yml`,
  `.github/workflows/production-smoke.yml`.
- Public/private boundary: production host paths, private inventories,
  exact operator runbooks, credentials, private network details, and shared host
  state are not to be added to public docs.

## Closeout Maintenance Continuation

After the initial audit pass, a maintenance closeout pass inspected the
repository state, project process docs, branch/PR/CI state, generated
artifacts, roadmap requirements, and attribution policy before push.

Closeout findings:

- `CLAUDE.md` and `GEMINI.md` are relative symlinks to `AGENTS.md`.
- GitHub PR, branch, and CI state was inspected through `git` and the GitHub
  CLI available in the local environment.
- Open PRs: none.
- Remote branches: `main` and `gh-pages`; `main` is protected. `gh-pages` is
  the documentation publishing branch and was intentionally left in place.
- Latest pushed `main` CI for commit `d6df53c2` was green for Backend CI,
  Frontend CI, platform validation, and documentation deployment. The
  documentation publishing branch was treated as intentional generated output
  and left in place.
- Roadmap process was re-read. No active implementation plan corresponded to
  this maintenance audit, so no plan was moved to `docs/planning/implemented/`
  and no roadmap item was silently expanded. Nonessential findings remain in
  this report's recommendations.
- Ignored local environment assets such as `.env`, `.venv/`, `node_modules/`,
  `private/`, and `frontend/.env.local` were intentionally preserved. Safe
  generated cache/database artifacts were cleaned during closeout.
- The maintenance changes were collected in human-authored local commits with
  no co-author trailer.

## Reviewable-File Inventory And Coverage Tier

Inventory evidence:

- `git ls-files | wc -l` -> `742` tracked files.
- Reviewable group counts from `git ls-files`:
  - `src/`: 60 tracked backend/crawler source files.
  - `tests/`: 114 tracked backend test files.
  - `frontend/src/`: 80 tracked frontend source/assets files.
  - frontend tests/specs: 41 tracked files.
  - `docs/`: 211 tracked documentation files.
  - `scripts/`: 86 tracked scripts.
  - `.github/`: 11 tracked CI/config files.
  - deployment/infrastructure/container surfaces: 1 directly counted top-level
    container/deploy match, plus many VPS/operator scripts under `scripts/`.
  - dependency/tooling config matches: 17 tracked files.

Coverage tier: large repo. The tracked file count is above the v5 prompt-pack
large-repo threshold, and the repo includes several operational subsystems.
Coverage was therefore risk-based rather than every-file manual review.

Manual review focused on:

- entrypoint instructions, README, docs policy, architecture, live testing,
  docs nav, and report surfaces;
- package manifests, lockfiles, Makefile targets, pre-commit, CI workflows,
  frontend package scripts, and Node/Python version declarations;
- config/env/auth/CORS/security header code in `src/ha_backend/config.py`,
  `src/ha_backend/api/__init__.py`, and `src/ha_backend/api/deps.py`;
- public/admin route surfaces in `src/ha_backend/api/routes_public.py` and
  `src/ha_backend/api/routes_admin.py`;
- compare-to-live SSRF and diff-rendering paths in
  `src/ha_backend/live_compare.py`, `src/ha_backend/diffing.py`,
  `frontend/src/app/[locale]/compare-live/page.tsx`, and
  `frontend/src/app/[locale]/compare/page.tsx`;
- data/session/model/migration surfaces in `src/ha_backend/db.py`,
  `src/ha_backend/models.py`, `alembic/env.py`, and `alembic/versions/**`;
- worker/crawler/indexing paths in `src/ha_backend/jobs.py`,
  `src/ha_backend/worker/main.py`, `src/ha_backend/indexing/pipeline.py`,
  `src/ha_backend/indexing/deduplication.py`, and related tests;
- representative frontend architecture and public-only API boundary from
  `frontend/AGENTS.md`, `frontend/package.json`, `frontend/src/lib/api.ts`,
  and route/component search results.

Excluded from manual review except for presence/consistency checks:

- generated/cached artifacts: `__pycache__/`, `.pytest_cache/`, `.mypy_cache/`,
  `.ruff_cache/`, `.next/`, coverage outputs, `site/`, generated
  `docs/openapi.json`, generated `docs/llms.txt`;
- dependency trees: `.venv/`, `frontend/node_modules/`;
- generated contract/lockfile internals except consistency checks:
  `frontend/src/lib/api-contract.generated.ts`, `frontend/package-lock.json`;
- large binary/source assets except repo placement and public presentation:
  `.xcf`, `.png`, `.webp` frontend assets;
- ignored private/local material such as `.env`, `private/`, and private
  symlinks/copies.

## Command And Search Ledger

| Command or probe | Purpose | Result |
|---|---|---|
| `pwd` | Confirm target working directory | Confirmed current repository root; exact local path omitted. |
| `git rev-parse --show-toplevel` | Resolve target repo root | Passed |
| `git status --short --branch` | Preserve current worktree state | Passed; dirty worktree documented |
| `rg --files <prompt-pack-root>` | Inventory prompt-pack files | Passed |
| `sed` reads of the prompt-pack entrypoint, safety contract, evidence gates, and all pass files | Required v5 workflow read order | Passed |
| `git ls-files`, `wc`, `awk` inventory | Determine coverage tier and file groups | Passed; large repo tier |
| `sed` reads of AGENTS, README, Makefile, pyproject, frontend package, docs, workflows | Repo-native workflow/context discovery | Passed |
| `rg "TODO|FIXME|HACK|XXX|debugger|console.log|print("` | Code-quality/stale-marker probe | Found expected CLI/script prints and planning TODO prose; no safe code cleanup candidate |
| `git grep` private-key/token-shape regex | Secret-shape probe | No committed private-key/API-token shapes found |
| `git grep` auth/secret/token/password/cors/csrf/session terms | Security/auth surface discovery | Found expected auth docs, workflow secrets references, admin auth, and public/private boundary docs |
| `git grep` dangerous-operation terms | Injection/path/subprocess/HTML-rendering probe | Found expected subprocess calls, path handling, URL redirects, and controlled diff HTML rendering |
| `git grep` `HEALTHARCHIVE_*` env vars | Env/config coverage probe | Found many backend/ops vars; `.env.example` remains intentionally local-focused |
| `rg "/home/|/mnt/|/srv/|/etc/|/opt/|api.healtharchive.ca|docs.healtharchive.ca"` | Public/private path and URL boundary probe | Found public API/docs URLs plus many tracked VPS helper defaults; documented as owner-scope follow-up |
| `rg "pageSize|limit|yield_per|StreamingResponse|FileResponse"` | Pagination/export/performance probe | Public/admin list/export paths are bounded; deduplication optimization remains follow-up |
| `find .github/workflows`, `find scripts` | CI/scripts inventory | Passed |
| focused pytest for `tests/test_api_compare_live.py` | Verify added compare-live URL guard tests | Passed: 19 tests, 1 existing warning |

## Baseline And Verification Commands

Commands already run during this maintenance campaign before the v5 continuation:

- `make ci` passed.
- `make frontend-ci` initially failed because `npm` was not on PATH in the
  non-interactive shell, then passed after loading nvm.
- `make docs-check` passed.
- `make check-full` passed after Ruff import-order cleanup.
- `make ci-api-health-local` passed.
- Focused config regression test passed after the archive-root fix.
- Targeted pre-commit on report/docs files passed.
- `git diff --check` passed.

Additional v5 continuation verification:

- `TMPDIR="$(pwd)/.tmp/backend-tmp" TMP="$(pwd)/.tmp/backend-tmp" TEMP="$(pwd)/.tmp/backend-tmp" .venv/bin/pytest tests/test_api_compare_live.py -q`
  passed: 19 tests, 1 existing Starlette/httpx TestClient deprecation warning.
- `make ci` passed: Ruff format check, Ruff lint, mypy, and the fast backend
  pytest subset.
- `make check-full` passed: Ruff, mypy, full pytest, critical coverage,
  pre-commit, Bandit, pip-audit, and docs checks.
- `make frontend-ci` passed after loading nvm for Node `v20.19.0` and npm
  `10.8.2`.
- `make ci-api-health-local` passed with a temporary SQLite DB and ephemeral
  API server.
- `make contract-check` passed; regenerated OpenAPI/frontend contract outputs
  had no tracked diff.
- Final `make docs-check` passed after the report update.

## Pass Completion Table

| Pass | Status | Evidence summary |
|---|---|---|
| 01 general code quality/docs/maintenance | Fixed changes | Fixed repo-local archive-root fallback, stale docs/auth wording, stale CI wording, and `.env.example` phase labels; added report evidence. |
| 04 test coverage/regression | Fixed changes | Added config fallback regression test and compare-live URL guard regression tests; targeted compare-live tests passed. |
| 03 security/privacy/secrets | Fixed changes plus deferred owner items | No secret-shape hits; fail-closed admin docs aligned; compare-live URL blockers now directly tested; tracked VPS helper defaults remain owner-scope. |
| 05 CI/automation/workflow | Fixed docs/no-op automation | Existing Makefile/CI commands are strong; README CI wording updated; no new workflow imposed. |
| 06 dependency/package hygiene | No-op with evidence | Manifests/lockfiles/audit config inspected; no dependency changes; audits previously passed. |
| 07 documentation/onboarding | Fixed changes | README, architecture, live-testing, CLI reference, docs index, and report updated to current behavior. |
| 02 architecture/maintainability | No-op with evidence | Architecture boundaries mapped; no safe broad refactor; production-shaped worker/script defaults deferred. |
| 09 performance/scalability | No-op with evidence plus follow-up | Bounded public/admin list/export paths inspected; potential deduplication query scaling follow-up documented. |
| 10 database/data/migrations | No-op with evidence | SQLAlchemy models, Alembic env/versions, session lifecycle, migration guard, local migrations verified through prior full/API smoke checks; no migration created. |
| 08 release readiness | No release action | Checks/build/docs/audit passed in prior campaign; no tag/version/publish/deploy; readiness improved via docs/config/tests. |
| 11 public repo presentation | Fixed docs plus deferred owner items | Public docs clarified; no marketing claims or new process; public/private script split remains owner decision. |
| 12 code-adjacent writing professionalization | Fixed small wording issues plus deferred owner items | Neutralized public docs role labels, removed a chatty API-guide closing, aligned quickstart operator copy with the public/private boundary, cleaned low-value source comments, and left historical review artifacts unchanged pending owner decision. |

## Pass 01: General Code Quality, Documentation, And Maintenance

Scope decision:

- Applies to backend config, docs, tests, public/admin API surfaces, scripts,
  and frontend workflow docs.
- Broad source rewrites, public API changes, workflow replacements, and
  production-operator script redesigns were out of scope.

Surfaces inspected:

- `src/ha_backend/config.py`, `tests/test_config.py`, `.env.example`.
- `README.md`, `docs/architecture.md`,
  `docs/development/live-testing.md`, `docs/reference/cli-commands.md`,
  `docs/README.md`.
- `Makefile`, `pyproject.toml`, `frontend/package.json`, CI workflows.
- representative core modules: `api/deps.py`, `api/__init__.py`,
  `api/routes_public.py`, `api/routes_admin.py`, `jobs.py`,
  `worker/main.py`, `indexing/pipeline.py`, `live_compare.py`.

Probes/searches:

- stale marker/debug probe;
- large-file/hotspot inventory;
- env-var probe;
- dangerous-operation/path/rendering probe;
- current diff/stat review.

Candidate findings considered:

- Fixed: machine-specific `DEFAULT_ARCHIVE_ROOT` fallback in code.
- Fixed: docs claiming tokenless local admin access was the default.
- Fixed: stale README CI wording about full backend workflow scheduling.
- Fixed: `.env.example` comments still using implementation phase labels.
- Not an issue: many `print()` hits are CLI/script user output.
- Deferred: `src/ha_backend/cli.py`, `worker/main.py`, and `scripts/vps-*`
  contain production-shaped paths/defaults. These are intertwined with tested
  operator tooling and private runbooks, so changing them without owner context
  would be risky.

Change-gate decisions:

- Archive-root fallback was evidence-backed, local, testable, and public-safe.
- Docs updates were repo-native and aligned public docs with current tested
  behavior.
- VPS helper defaults were documented but not changed because they may be
  active operator contracts.

Verification:

- Config regression test was added and passed during prior verification.
- `make ci`, `make check-full`, `make frontend-ci`, `make ci-api-health-local`,
  and `make contract-check` passed in this v5 continuation.

## Pass 04: Test Coverage And Regression Confidence

Scope decision:

- Applies strongly: repo has extensive pytest and Vitest suites and Makefile CI
  targets.
- New tests should be close to changed behavior and deterministic.

Surfaces inspected:

- `tests/test_config.py`.
- `tests/test_api_compare_live.py`.
- `tests/test_api_admin_and_metrics.py`, `tests/test_security_headers.py`,
  `tests/test_api_search_and_snapshot.py`, `tests/test_worker.py`,
  `tests/test_worker_tiering.py` by search/manual sampling.
- frontend `package.json` test scripts and `frontend/src/**` test inventory.

Probes/searches:

- test inventory by `find tests` and frontend test file counts;
- mapping source hotspots to tests with `rg` around compare-live, admin auth,
  search, worker, and migration guard;
- targeted pytest for compare-live after adding tests.

Candidate findings considered:

- Fixed: archive-root fallback lacked a regression test.
- Fixed: compare-to-live URL guardrails were security-sensitive but only
  indirectly tested through API error mapping.
- Deferred: existing TestClient/httpx deprecation warning is cross-suite
  maintenance and should be handled separately.
- Deferred: Python `datetime.utcnow()`, SQLAlchemy `Query.get()`, and SQLite
  ResourceWarnings from prior full verification remain focused cleanup work.

Tests added/updated:

- `tests/test_config.py::test_archive_tool_default_root_is_repo_local_and_public_safe`.
- `tests/test_api_compare_live.py::test_compare_live_normalize_url_blocks_unsafe_targets`.
- `tests/test_api_compare_live.py::test_compare_live_normalize_url_strips_fragment_without_network`.

Verification:

- Focused compare-live file passed: 19 tests, 1 existing deprecation warning.
- Final full backend test/CI target is rerun below.

## Pass 03: Security, Privacy, And Secrets Hygiene

Scope decision:

- Applies strongly: public API, admin/metrics auth, issue reports,
  compare-to-live network fetches, raw snapshot replay, CORS/security headers,
  public/private docs boundary, and CI secrets usage are in scope.
- Credential rotation, production policies, deploy scripts, and private runbook
  changes are owner-scope and not changed.

Surfaces inspected:

- `src/ha_backend/api/deps.py` (`require_admin`).
- `src/ha_backend/api/__init__.py` (CORS, request size limits, CSP/HSTS and
  security headers).
- `src/ha_backend/live_compare.py` (URL normalization, private-IP blocking,
  redirect revalidation, byte limits).
- `src/ha_backend/diffing.py` and frontend compare pages (escaped generated
  diff HTML rendered with `dangerouslySetInnerHTML`).
- `.env.example`, `SECURITY.md`, `.github/workflows/*.yml`,
  `docs/documentation-guidelines.md`, public/private boundary stubs.
- Tracked scripts with production-shaped defaults, by path/secret probes.

Probes/searches:

- private-key/API-token-shape regex: no matches.
- broad auth/secret/password/token/cors/csrf/session grep.
- dangerous-operation grep for subprocess, raw SQL/text SQL, URL redirects,
  `dangerouslySetInnerHTML`, file/path operations, and deserialization.
- public/private path and URL grep.

Candidate findings considered:

- Fixed: code fallback no longer embeds a machine-specific archive root.
- Fixed: admin-auth docs now match fail-closed behavior.
- Fixed: compare-to-live private/loopback/link-local/credential/port blocking
  now has direct tests.
- Already satisfied: `require_admin` fails closed unless a local/dev/test env
  also sets `HEALTHARCHIVE_ALLOW_DEV_ADMIN_NO_TOKEN=true`; admin routes and
  `/metrics` depend on it.
- Already satisfied: raw snapshot responses get restrictive CSP and non-raw
  API responses get restrictive defaults.
- Already satisfied: compare-live revalidates redirect targets and enforces
  content-type, redirect, timeout, port, and byte limits.
- Deferred: tracked VPS helper scripts include exact `/srv`, `/etc`, `/opt`
  defaults and public operational paths. Existing docs/roadmap already identify
  splitting private operational assets as owner work; changing scripts here
  could break operator tooling.

Verification:

- Focused compare-live tests passed.
- Bandit and pip-audit passed in prior `make check-full`.
- Final verification is rerun below.

## Pass 05: CI, Automation, And Developer Workflow

Scope decision:

- Applies strongly: repo uses Makefile targets, GitHub Actions, pre-commit,
  docs checks, frontend npm scripts, contract generation, and API smoke checks.
- No new CI provider, hooks, package manager, or release automation was added.

Surfaces inspected:

- `Makefile`.
- `.github/workflows/backend-ci.yml`, `backend-ci-full.yml`,
  `frontend-ci.yml`, `docs.yml`, `workflow-lint.yml`,
  `platform-ops-integration.yml`, `production-smoke.yml`.
- `.pre-commit-config.yaml`, `.nvmrc`, `frontend/package.json`.
- README workflow sections and live-testing commands.

Probes/searches:

- Makefile target review.
- workflow inventory and manual reads.
- frontend script review.
- prior command execution of backend, frontend, docs, full, and API smoke
  targets.

Candidate findings considered:

- Fixed: README CI description understated backend CI audit and API smoke, and
  incorrectly described the full workflow as nightly/manual rather than manual.
- Already satisfied: local Makefile targets mirror CI enough for backend,
  frontend, docs, API smoke, contract, and full checks.
- Deferred: non-interactive shells may not have `npm` on PATH until nvm is
  loaded. This was documented as an environment note, not a Makefile change,
  because CI sets Node explicitly and local shell managers vary.

Verification:

- `make ci`, `make check-full`, `make frontend-ci`, `make ci-api-health-local`,
  and `make contract-check` passed in this v5 continuation.

## Pass 06: Dependency And Package Hygiene

Scope decision:

- Applies to Python package metadata, dev/docs extras, requirements mirror,
  frontend npm dependencies, lockfile presence, Node version, pre-commit,
  Dependabot/audit config, and scripts.
- Broad upgrades/removals were out of scope without a specific failing audit or
  safe compatibility evidence.

Surfaces inspected:

- `pyproject.toml`, `requirements.txt`, `.pre-commit-config.yaml`,
  `.github/dependabot.yml`.
- `frontend/package.json`, `frontend/package-lock.json`, `.nvmrc`.
- Makefile `audit`/`audit-ci`, `security`, `frontend-install`, and
  `frontend-ci` targets.

Probes/searches:

- dependency manifest reads;
- prior pip-audit through `make check-full`;
- frontend parity through `make frontend-ci`;
- lockfile/diff review showing no dependency files changed.

Candidate findings considered:

- No dependency changes: no high-confidence unused dependency removal or safe
  upgrade was identified.
- Already satisfied: Python audit target exists with a documented Pygments CVE
  ignore; frontend lockfile is present and used by CI.
- Deferred: package version upgrades should be scheduled separately if
  maintainers want freshness beyond security/audit-driven updates.

Dependency-change table:

| Package/config | Change | Reason | Risk | Verification |
|---|---|---|---|---|
| Python dependencies | None | No clear safe upgrade/removal needed | None | Prior `make check-full` and pip-audit passed |
| Frontend dependencies | None | No clear safe upgrade/removal needed | None | Prior `make frontend-ci` passed |
| `.env.example` | Comment/doc-only updates | Local config clarity | Low | Pre-commit/docs/final checks |

## Pass 07: Documentation And Onboarding

Scope decision:

- Applies strongly: repo has a public README, MkDocs portal, local development
  docs, architecture guide, CLI reference, frontend docs bridge, and docs
  coverage/reference checks.
- New docs should fit existing docs index/nav policy without inventing a new
  docs system.

Surfaces inspected:

- `README.md`, `.env.example`, `docs/README.md`,
  `docs/architecture.md`, `docs/development/live-testing.md`,
  `docs/reference/cli-commands.md`, `mkdocs.yml`,
  `docs/documentation-guidelines.md`.

Probes/searches:

- documented admin behavior vs `api/deps.py`;
- documented archive-root default vs `config.py`;
- README CI description vs `.github/workflows/backend-ci.yml` and
  `backend-ci-full.yml`;
- docs generated-output policy vs `.gitignore`;
- docs/reference/coverage/build checks through `make check-full`.

Candidate findings considered:

- Fixed: README/setup docs now state repo-local `.dev-archive-root` fallback
  and explicit staging/production override requirement.
- Fixed: live-testing and architecture docs now describe fail-closed admin auth
  and explicit local tokenless override.
- Fixed: docs index links this maintenance report.
- Deferred: full public env-var reference would be useful, but
  `docs/deployment/environments-and-configuration.md` is intentionally a
  public boundary stub; expanding it needs owner docs-policy direction.

Documentation inventory:

- Docs site source: `docs/**` with MkDocs nav in `mkdocs.yml`.
- Generated docs outputs: `docs/openapi.json` and `docs/llms.txt`, ignored and
  refreshed through docs targets.
- Frontend canonical docs: `frontend/docs/**`, bridged through `docs/frontend`.
- Report artifact: `docs/maintenance-audit.md`.

## Pass 02: Architecture And Maintainability

Scope decision:

- Applies through module boundaries, large files, API/data/worker/crawler
  responsibilities, frontend/backend split, and docs architecture map.
- Broad refactors, public API changes, source moves, and production-ops script
  redesign were out of scope.

Surfaces inspected:

- `docs/architecture.md`, README layout, `AGENTS.md`.
- `src/ha_backend/api/**`, `src/ha_backend/models.py`, `src/ha_backend/jobs.py`,
  `src/ha_backend/worker/main.py`, `src/ha_backend/indexing/**`.
- `src/archive_tool/main.py`, `src/archive_tool/docs/documentation.md`.
- `frontend/AGENTS.md`, `frontend/package.json`, `frontend/src/lib/api.ts`,
  `frontend/src/app/[locale]/**` representative routes.

Architecture map:

- Backend package owns config, database/session helpers, ORM models, API routes
  and schemas, search/change logic, indexing, worker orchestration, CLI,
  runtime metrics, and public/admin auth.
- `archive_tool` is an in-tree CLI package invoked by backend jobs and tested
  as a first-class component.
- Worker flow: queued/retryable jobs -> `run_persistent_job()` ->
  completed/failed/retryable -> `index_job()` -> indexed/index_failed.
- Indexing flow: WARC discovery -> optional stable consolidation ->
  WARC verification -> HTML extraction/mapping -> snapshots/outlinks/pages ->
  page signals.
- Frontend consumes public API only, uses generated API contract types, and is
  intentionally forbidden from admin/metrics endpoints.
- Documentation portal remains MkDocs-based with `mkdocs.yml` as nav source of
  truth.

Candidate findings considered:

- No safe structural refactor: large files such as `cli.py`,
  `routes_public.py`, `archive_tool/main.py`, and VPS helper scripts are
  real hotspots but not suitable for drive-by splitting.
- Deferred: worker auto-tiering and VPS defaults deserve a focused private
  operator-context pass if maintainers want to make public/private boundaries
  cleaner in code.
- Already satisfied: public/admin boundary is explicit in route modules and
  frontend instructions.

Verification:

- Existing tests and full checks cover these boundaries; no architecture code
  changes were made in this continuation beyond added tests.

## Pass 09: Performance And Scalability

Scope decision:

- Applies to public search/change/export APIs, indexing/WARC processing,
  worker loops, frontend build/render path, and database query patterns.
- New caching, indexes, queues, profiling stacks, or migrations were out of
  scope without stronger evidence.

Surfaces inspected:

- `src/ha_backend/api/routes_public.py` for `pageSize`, `limit`,
  `StreamingResponse`, export row limits, and direct WARC scans.
- `src/ha_backend/api/routes_admin.py` for admin pagination.
- `src/ha_backend/indexing/pipeline.py`, `warc_reader.py`, `warc_verify.py`,
  `changes.py`, `indexing/deduplication.py`.
- frontend compare pages and `CompareLiveDiffPanel` rendering path by search.

Probes/searches:

- pagination/limit/yield_per/streaming probe.
- dangerous-operation/path probe.
- large file/hotspot inventory.

Candidate findings considered:

- Already satisfied: public search/changes/timeline/admin endpoints use
  bounded `pageSize`/`limit` parameters.
- Already satisfied: exports cap rows with configured limits and materialize
  bounded rows before streaming to avoid holding DB transactions for slow
  clients.
- Already satisfied: WARC indexing flushes every 500 snapshots and uses
  streaming readers.
- Deferred: `find_same_day_duplicates()` does group discovery then per-group
  duplicate queries. It is correct and tested, but could become a scaling issue
  on very large duplicate sets; a focused optimization with tests would be
  appropriate if it appears in production profiles.
- Deferred: direct raw snapshot API scans are size-bounded by
  `_RAW_SNAPSHOT_MAX_DIRECT_WARC_BYTES`; larger deployments should continue to
  prefer pywb replay indexes.

Verification:

- No performance code change was made. Existing/final tests protect behavior.

## Pass 10: Database, Data, And Migration Health

Scope decision:

- Applies strongly: SQLAlchemy models, Alembic migrations, SQLite local tests,
  Postgres production-like docs, session lifecycle, and migration guard.
- Production DBs, remote data, destructive migration changes, and schema
  decisions were out of scope.

Surfaces inspected:

- `src/ha_backend/models.py`, `src/ha_backend/db.py`,
  `src/ha_backend/api/deps.py`, `src/ha_backend/api/__init__.py`.
- `alembic/env.py` and Alembic revisions 0001 through 0015.
- `Makefile` migration and API-health targets.
- tests around DB/session/migration/search/API by inventory and prior full run.

Probes/searches:

- Alembic file inventory.
- SQL/raw-text/dangerous-operation grep.
- pagination/query probes.
- prior `make ci-api-health-local` migration smoke and `make check-full`
  migration guard/tests.

Candidate findings considered:

- No schema drift fix needed: no model changes were made.
- No migration needed: code change only altered default local archive root and
  tests/docs.
- Already satisfied: request-scoped DB sessions are closed immediately after
  route execution, before streaming bodies.
- Deferred: SQLite ResourceWarnings seen during prior coverage indicate a
  future test/session cleanup pass, not a correctness fix in this campaign.

Data safety notes:

- No production database or remote service was accessed.
- No data was modified outside local test SQLite databases.
- No migration was created or run against production.
- Local migration smoke passed earlier through `make ci-api-health-local`.

## Pass 08: Release Readiness

Scope decision:

- Applies as app deployment/internal handoff readiness, not package publication.
- No version bump, release branch, tag, publish, deploy, artifact upload, or
  license decision was authorized or performed.

Surfaces inspected:

- `pyproject.toml`, `frontend/package.json`, `LICENSE`, `SECURITY.md`,
  `CITATION.cff`, `README.md`, `.github/workflows/**`, Makefile release-adjacent
  checks, docs build and frontend build behavior.

Candidate findings considered:

- Fixed: docs/config inaccuracies that would confuse release/deploy review.
- Already satisfied: backend, frontend, docs, audit, API smoke, and full checks
  exist and passed during the campaign.
- Owner decision required: production deployment/public release promotion stays
  outside unattended assistant scope and public docs intentionally defer
  environment-specific procedures.

Release-readiness checklist:

| Area | Status | Notes |
|---|---|---|
| Backend checks | Ready for review | `make ci` and `make check-full` passed |
| Frontend checks/build | Ready for review | `make frontend-ci` passed after nvm load |
| Docs build | Ready for review | `make check-full` included strict docs checks and passed |
| Security/dependency audit | Ready for review | Bandit and pip-audit passed through `make check-full` |
| Version/tag/publish/deploy | Not applicable | Not requested or performed |
| Production rollout | Owner decision | Public docs defer exact environment procedures |

## Pass 11: Public Repo Presentation

Scope decision:

- Applies because this is a public repository for a public app/docs site.
- The goal is factual clarity and public-safety, not marketing, badges,
  screenshots, public maturity claims, or new contribution/governance process.

Surfaces inspected:

- `README.md`, `docs/README.md`, `docs/api-consumer-guide.md` by path probe,
  public docs policy, `.env.example`, package descriptions, security policy,
  docs nav, public/private boundary stubs, tracked VPS script defaults.

Probes/searches:

- public/private URL/path grep;
- README/docs command and behavior cross-checks;
- secret-shape grep;
- docs build/reference checks through `make check-full`.

Candidate findings considered:

- Fixed: public docs now avoid a machine-specific default archive root and
  stale open-admin local behavior.
- Fixed: maintenance audit linked from docs index.
- Already satisfied: README states public/private deployment boundary and
  datasets repo separation.
- Deferred: tracked VPS helper scripts and some historical docs still expose
  exact operational path defaults. Existing roadmap item 34c tracks splitting
  private operational assets from public repo surface; this requires owner
  context and careful script migration.

## Pass 12: Code-Adjacent Writing Professionalization

Scope decision:

- Applies to repository text that affects professional sharing, onboarding,
  review, handoff, or publication: public docs, agent instructions, source
  comments, CLI/script wording surfaced by searches, and dated frontend review
  artifacts.
- The goal was neutral, durable wording. The pass did not add a new docs
  program, governance artifact, style guide, marketing copy, license change,
  or maturity claim.
- The external prompt-pack files referenced by the pasted request were not
  available in the shell for this run: `PROMPT_PACK_ROOT` was unset, and
  constrained searches under the repo, Codex attachments, and `.codex` paths
  did not find the shared safety contract or deep-evidence gate files. This
  pass followed the safety/evidence requirements embedded in the pasted
  request text and this repo's `AGENTS.md`.

Audience and maturity assessment:

- HealthArchive is a public monorepo for a real public-interest archive, with
  active backend, crawler, frontend, docs, CI, and operations-adjacent scripts.
- The appropriate voice is factual, modest, public-safe, and precise: it should
  be clear about current limitations and the public/private operations boundary
  without sounding promotional or informal.

Surfaces inspected:

- Canonical context: `README.md`, `docs/architecture.md`,
  `docs/documentation-guidelines.md`, `docs/development/live-testing.md`,
  `src/archive_tool/docs/documentation.md`, `docs/planning/roadmap.md`,
  `frontend/docs/development/bilingual-dev-guide.md`, and `mkdocs.yml`.
- Public/docs entry points and code-adjacent docs:
  `docs/README.md`, `docs/quickstart.md`, `docs/api-consumer-guide.md`,
  `docs/project.md`, `docs/deployment/README.md`, `docs/operations/README.md`,
  `AGENTS.md`, and `frontend/AGENTS.md`.
- Representative source comments and user-facing script/help wording under
  `src/ha_backend/`, `src/archive_tool/`, `scripts/`, `tests/`, and
  `frontend/src/`.
- Tracked frontend review artifacts:
  `frontend/*_ANALYSIS.md` and `frontend/*_IMPROVEMENT_PLAN.md`.
- Metadata and public project files by probe: `pyproject.toml`,
  `CITATION.cff`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/**`,
  `Makefile`, and `platform-ops-contract.example.yaml`.

Searches/probes run:

| Probe | Purpose | Result |
|---|---|---|
| `rg --files` plus `find docs`, `find frontend/docs`, `find .github` | Inventory reviewable writing surfaces | Confirmed public docs, frontend docs, review artifacts, workflows, and scripts. |
| `rg -n -i "vibe|quick.?and.?dirty|hack|kludge|lol|wtf|stupid|dumb|ugly|gross|yolo|magic|whatever|good enough|don't judge|sorry|short on time|temporary|for now|fix later|ask the user|the user|medical school|med school|sleep|weekend" ...` | Find unprofessional, temporary, or overly casual wording | Mostly legitimate technical uses; several safe comment/doc wording candidates fixed. |
| `rg -n -i "ChatGPT|Codex|Claude|AI generated|generated by AI|assistant|prompt|LLM|agent" ...` | Find assistant/session residue and AI attribution | Expected agent instructions and generated `llms.txt` context references; no improper AI authorship added. |
| `rg -n "TODO|FIXME|HACK|XXX|NOTE|BUG" ...` | Find vague stale markers and code comments | Mostly expected debug/log-level strings, shell notes, and template TODO labels; one obvious source-comment cleanup fixed. |
| `rg -n -i "Jeremy|author|\bI\b|\bmy\b|personal|private" ...` | Find personal/private context and public/private boundary text | Mostly intentional boundary/provenance references; public quickstart copy and personal phrasing in `AGENTS.md` fixed. |
| `rg -n "[✅⚠️🔧💻📊📚👤]" docs frontend/*.md frontend/docs README.md AGENTS.md CONTRIBUTING.md SECURITY.md` | Find symbol-heavy public docs and review artifacts | Public docs role labels and chatty closing fixed; dated frontend review artifacts left unchanged as owner-scope historical review material. |
| `rg -n "HOMEPAGE_ANALYSIS|ARCHIVE_ANALYSIS|CONTENT_PAGES_ANALYSIS|FEATURE_PAGES_ANALYSIS|SNAPSHOT_ANALYSIS|UTILITY_PAGES_ANALYSIS|IMPROVEMENT_PLAN" ...` | Check references to tracked review artifacts | No broad references found beyond one paired analysis/plan link, so no autonomous relocation was needed. |

Candidate wording ledger:

| Candidate | Classification | Decision |
|---|---|---|
| `AGENTS.md` virtualenv instruction with first-person workflow wording | Fixed | Reworded to neutral setup guidance. |
| `README.md` database setup phrasing using "whatever" | Fixed | Reworded to refer to the configured database URL. |
| `docs/README.md` role navigation with emoji labels | Fixed | Replaced with text-only role labels matching the repo's restrained docs style. |
| `docs/quickstart.md` role headings, five-minute claim, and quick deploy snippet | Fixed | Replaced with neutral starting-point copy and public/private operator-boundary guidance. |
| `docs/api-consumer-guide.md` chatty closing line with emoji | Fixed | Removed the closing line; the preceding next-step links already provide a durable close. |
| `frontend/src/app/globals.css` comment using subjective colour criticism | Fixed | Reworded as a contrast rationale. |
| `src/ha_backend/config.py`, `src/ha_backend/cli.py`, `src/ha_backend/job_registry.py`, `src/archive_tool/main.py`, `src/archive_tool/utils.py` comments with "for now" uncertainty or obvious narration | Fixed | Reworded comments around current intent, evidence-based tuning, and failure ownership; removed obvious section-marker comments. |
| PHAC temporary exclusions in `src/ha_backend/job_registry.py` | Intentionally unchanged | The comment is dated, specific, and explains a real crawl-cost guardrail. |
| "temporary crawl artifacts", `time.sleep`, and `MagicMock` search hits | Not an issue | Technical terms, API names, or test-library names. |
| Public/private operations wording throughout docs | Not an issue | Intentional public repository boundary language required by `AGENTS.md`. |
| `scripts/generate_llms_txt.py` and `docs/llms.txt` references | Not an issue | Deliberate public-safe developer-assistant context generator, not AI authorship residue. |
| `pyproject.toml`, `CITATION.cff`, and license author/provenance fields | Not an issue | Legitimate human authorship and citation metadata. |
| Tracked frontend `*_ANALYSIS.md` and `*_IMPROVEMENT_PLAN.md` files | Owner decision | They are dated design-review artifacts with useful historical context. A mass rewrite would create high churn, and deletion/relocation would be a project-organization decision. |
| Generated/vendor-like files such as lockfiles | Skipped | Not useful to edit for prose style and often externally generated. |

Rewrite patterns applied:

- Personal or workflow-specific wording became neutral repo instructions.
- Chatty closings and decorative role icons were removed from public docs.
- Public quickstart deployment content was changed into public-safe boundary
  guidance rather than publishing live operator procedure.
- Comments were changed from temporary uncertainty to current technical intent.
- Obvious code narration was removed where it added no durable "why".

Verification for this pass:

- `git diff --check` passed.
- `make ci` passed: Ruff format check, Ruff lint, mypy, and 385 backend tests
  passed with 1 existing Starlette/httpx deprecation warning.
- `make docs-check` initially failed because the audit report used inline-code
  formatting for unavailable external prompt-pack filenames; the docs reference
  checker treated those as missing repo-local paths. The report wording was
  corrected, and `make docs-check` then passed.
- `make frontend-ci` initially failed because `npm` was not on `PATH` in the
  non-interactive shell. Rerunning with the bundled Node/npm directory
  prepended to `PATH` passed Prettier, ESLint, TypeScript, Vitest, and the
  Next production build.

Maintenance closeout for this pass:

- Re-read `AGENTS.md`, `frontend/AGENTS.md`,
  `docs/documentation-guidelines.md`, `docs/development/testing-guidelines.md`,
  and `docs/roadmap-process.md` before closeout.
- Confirmed the current branch was `main`, tracking `origin/main`; local HEAD
  matched `origin/main` before the closeout commit.
- Confirmed `CLAUDE.md`, `GEMINI.md`, `frontend/CLAUDE.md`, and
  `frontend/GEMINI.md` are relative symlinks to their respective `AGENTS.md`
  files.
- Inspected GitHub state with explicit-repo `gh` commands because the local
  shell PATH did not include `gh` and repo-relative `gh` commands hit a
  safe-directory warning. Open PRs: none. Remote branches: `main` and
  `gh-pages` only. Latest `main` workflow runs before this closeout were green
  for Backend CI, Frontend CI, documentation deployment, and platform
  integration.
- Removed generated local artifacts from verification runs: MkDocs build
  output, temporary test directories, generated docs reference outputs,
  frontend build output, Python caches, frontend TypeScript build info, and
  local tool caches.
- Preserved intentional ignored local assets: local env files, virtualenv,
  frontend dependencies, private notes/copies, and local lock/cache files whose
  ownership was not part of this pass.
- No `.gitignore` update was needed; the generated artifacts removed during
  cleanup were already ignored.
- Roadmap/planning action: no active implementation plan corresponds to this
  professionalization pass, and the remaining frontend review-artifact cleanup
  is documented as an owner decision rather than silently added to the active
  hot-path investigation plan.

## Changes Made

Code/test:

- `src/ha_backend/config.py`: default archive root fallback is now the
  repo-local, git-ignored `.dev-archive-root` instead of a machine-specific
  host path.
- `tests/test_config.py`: added regression coverage for the repo-local fallback.
- `tests/test_api_compare_live.py`: added deterministic URL-normalization
  guard tests for compare-to-live unsafe targets and fragment stripping.

Documentation/config:

- `.env.example`: documented local-only tokenless admin override and removed
  stale phase labels.
- `AGENTS.md`: replaced first-person setup phrasing with neutral repository
  guidance.
- `README.md`: corrected archive-root default, admin auth behavior, and backend
  CI wording; this writing pass also neutralized database setup phrasing.
- `docs/architecture.md`: corrected archive-root/admin-auth behavior.
- `docs/development/live-testing.md`: updated admin local-vs-prod examples.
- `docs/reference/cli-commands.md`: corrected archive-root default/example.
- `docs/README.md`: linked this maintenance audit and replaced decorative role
  icons with text labels.
- `docs/quickstart.md`: replaced casual role headings and public deploy
  commands with public-safe starting-point guidance.
- `docs/api-consumer-guide.md`: removed a chatty closing line.
- `docs/maintenance-audit.md`: replaced the previous v4 report with this v5
  deep-evidence report and added the code-adjacent writing pass ledger.

Comment-only wording:

- `frontend/src/app/globals.css`, `src/ha_backend/config.py`,
  `src/ha_backend/cli.py`, `src/ha_backend/job_registry.py`,
  `src/archive_tool/main.py`, and `src/archive_tool/utils.py`: reworded or
  removed low-value comments without changing runtime behavior.

## Security And Privacy Notes

- No committed private-key/API-token shaped values were found by regex probe.
- The default archive root no longer embeds a machine-specific path in code.
- Admin and metrics docs now match fail-closed runtime behavior.
- Compare-to-live URL safety blockers are now directly covered by tests.
- Reports and final output should not include actual secrets; none were found.
- Ignored private/local files were not inspected or modified.
- Production-shaped tracked VPS scripts remain a public/private boundary
  follow-up, not an autonomous edit.

## Remaining Recommendations

- Decide whether tracked VPS helper scripts should remain public as active
  operator scripts or be split into public-safe templates plus private
  implementations.
- Investigate SQLite ResourceWarnings in full coverage runs and close any
  session/TestClient lifecycle gaps.
- Schedule a Python test hygiene pass for `datetime.utcnow()`,
  SQLAlchemy `Query.get()`, and Starlette/httpx TestClient deprecations.
- Consider a focused optimization pass for same-day deduplication query shape
  if large duplicate groups show up in real datasets.
- Consider a focused docs-policy pass for a public-safe env-var reference,
  keeping deployment/host-specific details in private operations docs.

## Final Verification

| Area | Status | Evidence |
|---|---|---|
| Formatting | Passed | Ruff format via `make ci`/`make check-full`; frontend Prettier via `make frontend-ci`; `ruff format` reported changed Python tests unchanged. |
| Linting | Passed | Ruff via `make ci`/`make check-full`; ESLint via `make frontend-ci`; pre-commit Ruff hooks via `make check-full`. |
| Type checking | Passed | Backend mypy via `make ci`/`make check-full`; frontend `tsc --noEmit` via `make frontend-ci`. |
| Backend tests | Passed | Fast subset: 385 passed, 1 warning. Full pytest: 843 passed, 21 warnings. Focused compare-live file: 19 passed, 1 warning. |
| Critical coverage | Passed | `make check-full` critical coverage: 81.63% total, above the configured 75% threshold; 843 tests passed with 488 warnings under coverage. |
| Frontend tests/build | Passed | Vitest: 38 files and 107 tests passed; Next production build completed successfully. |
| Docs | Passed | `make check-full` and a final standalone `make docs-check` ran OpenAPI export, `docs/llms.txt` generation, docs references, strict docs coverage, and strict MkDocs build successfully. MkDocs reported existing nav omissions, including this report, as INFO. |
| Security/dependencies | Passed | Bandit passed; pip-audit found no known vulnerabilities, with the configured Pygments ignore and local editable package skip. |
| API smoke | Passed | `make ci-api-health-local` passed public health, stats, sources, exports, search, usage, changes, and empty-index-tolerant RSS checks. |
| API contract | Passed | `make contract-check` regenerated OpenAPI and frontend types with no tracked diff. |

Remaining warnings:

- Starlette/httpx TestClient deprecation warning.
- Python `datetime.utcnow()` deprecation warnings in test fixtures.
- SQLAlchemy `Query.get()` deprecation warnings in tests.
- SQLite `ResourceWarning` messages during coverage.

These were not introduced by this pass and are recorded as focused follow-up
work rather than weakened or suppressed.

## Final Diff Summary

Primary maintenance commit diff summary before the closeout report amendment:

```text
.env.example                     |  7 +++++--
README.md                        | 32 +++++++++++++++++---------------
docs/README.md                   |  1 +
docs/architecture.md             | 22 ++++++++++++----------
docs/development/live-testing.md | 26 +++++++++++++++++++-------
docs/maintenance-audit.md        | 768 +++++++++++++++++++++++++++++++++++++++
docs/reference/cli-commands.md   |  4 ++--
src/ha_backend/config.py         | 10 ++++++----
tests/test_api_compare_live.py   | 34 +++++++++++++++++++++++++++++++++-
tests/test_config.py             | 16 ++++++++++++++++
10 files changed, 879 insertions(+), 41 deletions(-)
```

`docs/maintenance-audit.md` is the combined report artifact for this run.

## Risks, Assumptions, And Intentionally Unchanged Areas

- Real staging/production deployments are assumed to set
  `HEALTHARCHIVE_ARCHIVE_ROOT` explicitly, as now documented.
- No database schema changed, so no migration was created.
- No dependencies were upgraded or removed.
- No frontend behavior was changed.
- No deploy, release, or production publish action was performed.
- Production/private operations decisions remain with the maintainer.
