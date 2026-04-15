# HealthArchive Frontend + Backend Monorepo Consolidation Plan

**Created:** 2026-04-14
**Status:** Active planning only — execution not started
**Scope:** `healtharchive-backend` + `healtharchive-frontend`; `healtharchive-datasets` remains separate
**Primary goal:** consolidate source control and developer workflow without changing the current production runtime model or risking archive/data loss

---

## Recommendation summary

HealthArchive should converge on a **single repo for backend + frontend**, but
the safest implementation path is a **backend-anchored monorepo** rather than a
full immediate reshape into `apps/backend` + `apps/frontend`.

Recommended near-term target:

```text
healtharchive-backend/          # repo slug retained temporarily
├── pyproject.toml
├── src/
├── tests/
├── docs/
├── scripts/
├── frontend/
│   ├── package.json
│   ├── src/
│   ├── tests/
│   ├── docs/
│   └── scripts/
└── optional shared/ or packages/ later
```

Why this is the preferred migration path:

1. the backend repo is already the HealthArchive docs hub and production ops anchor
2. the backend deploy path is tightly coupled to the repo root on the VPS
3. the frontend is already treated as a dependent sibling checkout by CI and local e2e tooling
4. this approach preserves history and minimizes host-side breakage

Longer-term option:

1. after one or two stable release windows, optionally rename the repo slug to `healtharchive`
2. only after that, decide whether there is enough value to normalize into `apps/backend`

Temporary-state rule:

1. retaining the backend repo slug and `/opt/healtharchive-backend` path is a phase-1 safety choice, not the desired final naming model
2. every temporary compatibility shim introduced by this plan must have:
   - an explicit owner
   - a removal trigger
   - a latest-removal phase
3. the old frontend repo must not remain an ambiguous second source of truth after the cutover window
4. any future repo-slug or backend-path cleanup is a separate decision gate, not an automatic follow-on change

Companion host-side execution board:

1. app-repo implementation and source-control work remain canonical here
2. the eventual VPS/inventory/runbook cutover work is prepared separately in:
   - `/home/jer/repos/platform-ops/docs/plans/PLAN-013-healtharchive-monorepo-production-cutover.md`

Do **not** combine repo consolidation with a runtime redesign. The monorepo move
should change source control and developer ergonomics first, while keeping:

1. backend runtime: systemd + local venv + current data paths
2. frontend runtime: Docker container behind host Caddy on `127.0.0.1:3200`
3. current domains, ports, env-file paths, and archive/database storage

---

## Settled evaluator outcomes

These decisions have been pressure-tested and are treated as the current
defaults unless new evidence changes them:

1. **Merge frontend + backend repos:** yes
   - rationale: current CI/docs/API-contract coupling is already monorepo-like
2. **Keep `healtharchive-datasets` separate:** yes
   - rationale: publication/release semantics differ from app code
3. **Use the backend repo as the monorepo seed:** yes
   - rationale: it is already the docs hub and deploy anchor
4. **Do not combine repo consolidation with runtime redesign:** yes
   - rationale: source-control migration and production runtime change are separate risk classes
5. **Import frontend history with `git subtree`, not a squashed import:** yes
   - rationale: preserves history while minimizing migration complexity
6. **Do not rename the repo slug immediately:** yes, but only temporarily
   - rationale: immediate GitHub/admin churn is not worth the phase-1 risk
7. **Place the frontend under `frontend/` in phase 1:** yes
   - rationale: least churn relative to current path assumptions
8. **Keep the backend at repo root in phase 1:** yes
   - rationale: deploy scripts, docs, and systemd references are heavily root-oriented
9. **Avoid heavy monorepo tooling initially:** yes
   - rationale: a Python + Node polyglot repo should start with simple orchestration first
10. **Use path-filtered CI, but conservatively:** yes
    - rationale: monorepo CI must stay efficient without silently skipping shared-risk changes
11. **Generate frontend API types from backend OpenAPI, types-first:** yes
    - rationale: hand-maintained duplicate types are a clear drift surface
12. **Separate repo cutover from production cutover:** yes
    - rationale: temporary awkwardness is cheaper than mixed-failure root cause analysis
13. **Make the old frontend repo read-only during transition and retire it intentionally:** yes
    - rationale: overlap is acceptable only if it cannot silently diverge
14. **Pause the worker only for actual runtime-risk reasons, not repo-shape reasons:** yes
    - rationale: source-control consolidation alone does not justify crawl interruption
15. **Retire legacy Vercel/GitHub Pages integrations instead of carrying them into phase 1:** yes
    - rationale: production is already VPS-based, and leaving old external deployment surfaces attached would create source-of-truth ambiguity

---

## Current state inventory

### Source-control topology

Current local workspace:

```text
/home/jer/repos/healtharchive/
├── healtharchive-backend/
├── healtharchive-frontend/
└── healtharchive-datasets/
```

Observed coupling already in place:

1. backend CI checks out the frontend repo for e2e smoke:
   - `.github/workflows/backend-ci.yml`
2. frontend CI checks out the backend repo for e2e smoke:
   - `healtharchive-frontend/.github/workflows/frontend-ci.yml`
3. backend local e2e tooling assumes a sibling frontend checkout:
   - `scripts/ci-e2e-smoke.sh`
4. frontend hook/dev docs assume a sibling backend checkout or backend venv:
   - `healtharchive-frontend/scripts/install-pre-push-hook.sh`
   - `healtharchive-frontend/docs/development/dev-environment-setup.md`
5. the backend docs site is already the unified docs hub, but frontend docs are still canonical in a separate repo:
   - `docs/documentation-guidelines.md`
   - `docs/project.md`
6. the frontend currently hand-maintains API response types instead of consuming generated backend contracts:
   - `healtharchive-frontend/src/lib/api.ts`

### Production topology

Current production layout is intentionally split by service runtime, not by
product:

1. backend:
   - git checkout at `/opt/healtharchive-backend`
   - systemd-managed API + worker
   - env file at `/etc/healtharchive/backend.env`
   - archive root `/srv/healtharchive/jobs`
   - DB on local Postgres
2. frontend:
   - release-root deployment at `/srv/apps/healtharchive-frontend/releases/<sha>`
   - active symlink `/srv/apps/healtharchive-frontend/current`
   - env file at `/etc/projects-merge/env/healtharchive-frontend.env`
   - Docker container `healtharchive-frontend`
   - private bind `127.0.0.1:3200`
3. shared host contract:
   - host Caddy owns ingress
   - canonical inventory and shared host paths live in `platform-ops/`

### Consequence of the current split

HealthArchive is already behaving like one product with two runtimes:

1. code changes often need coordinated repo changes
2. CI pays cross-checkout complexity on both sides
3. docs and contributor guidance repeat the same cross-repo setup instructions
4. deployment reasoning is harder than necessary because source-control and service boundaries do not align

---

## Safety constraints and invariants

These are the non-negotiable guardrails for the migration:

1. **No archive/data movement in the repo-consolidation phase**
   - do not move Postgres data
   - do not move WARC storage
   - do not change replay collections
2. **No domain/ingress redesign in the repo-consolidation phase**
   - keep `healtharchive.ca`, `api.healtharchive.ca`, and `replay.healtharchive.ca`
   - keep host Caddy as ingress owner
3. **No same-window combination of source-control import and runtime redesign**
4. **Keep frontend and backend deployable independently**
   - same repo does not imply same release cadence
5. **Keep `healtharchive-datasets` separate**
   - it has a different publication/release contract
6. **Preserve full git history**
   - do not squash frontend history into a single import commit
7. **Keep the old frontend repo intact until the new path has passed at least one stable release window**

---

## Target state

### Phase 1 target: backend-anchored monorepo

Recommended near-term shape:

```text
healtharchive-backend/
├── .github/
├── docs/
├── scripts/
├── src/
├── tests/
├── pyproject.toml
├── Makefile
├── frontend/
│   ├── .github/            # optional: folded into root workflows over time
│   ├── docs/
│   ├── public/
│   ├── scripts/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
└── optional packages/
```

Why this target is safer than a symmetric `apps/*` move now:

1. backend systemd units, scripts, docs, and deploy helpers assume the repo root
2. backend docs are already published from the current repo root
3. current host layout and rollback tooling can survive this shape with fewer changes
4. frontend is the easier side to relocate under a prefix

### Phase 2 optional target: repo rename and layout normalization

Only after the backend-anchored monorepo is stable:

1. optionally rename the GitHub repo to `healtharchive`
2. optionally rename the local checkout path
3. optionally move backend to `backend/` or `apps/backend/`

This should be treated as a **separate program**, not as part of initial
consolidation.

---

## Temporary-state expiry rules

The plan intentionally accepts a few awkward transitional states. They must not
become accidental permanent architecture.

1. **Backend repo slug retained temporarily**
   - accepted only through the first stable release window after monorepo cutover
   - must be revisited explicitly before phase 8 is closed
2. **Backend remains at repo root**
   - accepted through phase 7
   - only revisited under an explicit follow-on decision
3. **Sibling-path compatibility fallbacks**
   - allowed only during the active transition window
   - must be removed before the old frontend repo is archived
4. **Old frontend repo still exists**
   - allowed only as a transition aid
   - must move to read-only and pointer mode once the monorepo is canonical
5. **Shared host paths keep legacy naming**
   - no host path rename is in scope for this plan
   - any future cleanup belongs in `platform-ops` under a separate host-migration decision

---

## Explicit non-goals

This plan does **not** include:

1. merging `healtharchive-datasets` into the main source repo
2. moving the backend into Docker or Coolify
3. replacing systemd for the backend
4. reworking the public domain model
5. changing the crawler/archive storage model
6. changing the backend database technology
7. adopting a JS-only monorepo orchestrator as a prerequisite

Use simple, boring tooling first. A root `Makefile` or equivalent is enough for
the first migration wave.

---

## Phased implementation plan

## Phase 0: Pre-migration freeze and inventory

Objective: define a safe cutover window and stop the target from drifting while
history import and path changes are prepared.

Supporting inventory:

1. use the point-in-time GitHub/repo control-plane checklist in:
   - `2026-04-14-healtharchive-monorepo-phase0-inventory.md`

Tasks:

1. choose the backend repo as the monorepo seed
2. create a migration branch in the backend repo
3. identify a frontend freeze point for history import
4. capture a pre-migration inventory of:
   - current backend branch and deployed SHA
   - current frontend deployed release SHA
   - active CI workflows
   - open frontend PRs/issues/discussions that need disposition
   - GitHub environments, deployment integrations, and any environment-scoped secrets/variables
   - deploy keys, webhooks, Actions policy, and merge-policy defaults
5. decide repo naming policy for phase 1:
   - recommended: keep the repo slug unchanged initially
6. execute the old-frontend deployment-state retirement checklist in:
   - `2026-04-14-healtharchive-monorepo-phase0-inventory.md`
   - section: `Exact retirement checklist for old frontend deployment state`

Exit criteria:

1. both repos are at known SHAs
2. import window is defined
3. no in-flight frontend change is expected to land during subtree import without an explicit re-pull
4. hidden GitHub deployment surfaces on the old frontend repo have an explicit overlap-window policy
5. old frontend Vercel/GitHub Pages state has been disabled and verified per the phase-0 retirement checklist

## Phase 1: Import frontend history into the backend repo

Objective: make the backend repo the new single source repo while preserving
frontend history.

Recommended method:

1. add the canonical frontend GitHub repo as a temporary remote
2. verify that the chosen import ref still resolves to the recorded freeze SHA
3. import it with `git subtree add --prefix=frontend <remote> main`
4. do **not** use `--squash`

Validated implementation note from the 2026-04-14 dry run:

1. prefer the canonical GitHub remote URL over the local frontend checkout as the subtree source
2. the local frontend clone may not contain the recorded freeze commit in a reachable ref, even when `ls-remote origin` shows it exists remotely
3. the validated dry-run flow was:

   ```bash
   git remote add frontend-origin https://github.com/jerdaw/healtharchive-frontend.git
   git ls-remote https://github.com/jerdaw/healtharchive-frontend.git refs/heads/main
   git subtree add --prefix=frontend frontend-origin main
   ```

Why `git subtree` is preferred here:

1. preserves frontend history under a prefix
2. does not rewrite existing backend history
3. keeps rollback simple
4. allows temporary `git subtree pull` during the transition window if needed

Exit criteria:

1. `frontend/` exists in the backend repo with preserved history
2. the backend repo can build and test both surfaces locally
3. the old frontend repo remains available as a temporary upstream/mirror

### Transition rules for the legacy frontend repo

The old frontend repo is a transition artifact, not a parallel canonical repo.

1. once the subtree import branch exists, new feature work should land in the monorepo branch, not the old frontend repo
2. before the monorepo becomes canonical, the old frontend repo may be used only for:
   - documenting the freeze point
   - emergency hotfix mirroring
   - controlled `git subtree pull` operations if the migration window must be refreshed
3. any emergency change during the overlap window must follow this order:
   - commit in the monorepo branch first
   - mirror to the old frontend repo only if the old repo still drives a required public/admin surface
   - never allow the old frontend repo to become the only place a fix exists
4. once the monorepo is declared canonical:
   - make the old frontend repo read-only
   - replace its README with a pointer to the monorepo location
   - disable or detach legacy deployment integrations that still target the old repo
   - stop normal PR merges there
5. no direct feature PR should be merged to the old frontend repo after the canonical-cutover announcement

### Freeze-point and overlap checklist

Before the subtree import:

1. record the frontend freeze SHA
2. list open PRs as:
   - merge before import
   - defer and re-open against monorepo
   - abandon
3. list open issues/discussions that need manual migration or pointer handling
4. define whether a temporary `git subtree pull` refresh is permitted during the overlap window
5. record old-repo deployment surfaces that still exist:
   - Vercel Preview/Production integrations
   - GitHub Pages environment/workflow residue
6. define when those old-repo deployment surfaces are disabled
7. name the operator who owns the overlap window and eventual retirement step

Required interpretation after the 2026-04-14 policy lock:

1. phase 1 does not re-home Vercel or GitHub Pages
2. disablement belongs in phase 0, before the subtree import begins

## Phase 2: Compatibility-path updates inside the new monorepo

Objective: make existing scripts and docs work from the new layout before any
production cutover.

Required changes:

1. update backend e2e scripts to look for `frontend/` first and sibling checkout second
2. update frontend helper scripts that look for `../healtharchive-backend`
3. update local development docs from "sibling repos" to "same repo, different subdirs"
4. update docs-hub pointer pages and project docs from multi-repo wording to phased monorepo wording
5. add root helper commands for common flows:
   - backend CI gate
   - frontend CI gate
   - combined e2e smoke

Recommended compatibility rule during this phase:

1. prefer new monorepo paths first
2. keep sibling fallback paths temporarily where that reduces local friction
3. remove fallback paths only after the old frontend repo is retired

Exit criteria:

1. local docs no longer require a sibling frontend checkout as the primary path
2. the combined e2e smoke works from one repo checkout
3. temporary compatibility fallbacks are documented and bounded

## Phase 3: CI consolidation

Objective: replace dual-repo cross-checkout CI with one-repo path-aware CI.

Required changes:

1. move frontend CI into the monorepo root workflow set
2. remove cross-checkout steps between frontend and backend
3. add path filters so:
   - backend-only changes do not run unnecessary frontend jobs
   - frontend-only changes do not run unnecessary backend jobs
   - shared/e2e/doc changes run the full relevant matrix
4. keep a dedicated integrated e2e smoke job that uses one checkout
5. keep artifact and cache paths explicit so frontend build artifacts remain isolated

Recommended workflow structure:

1. `backend-ci`
2. `frontend-ci`
3. `integration-e2e`
4. `docs`
5. optional `workflow-lint`

Exit criteria:

1. no workflow checks out a second HealthArchive repo
2. CI parity remains clear for both surfaces
3. branch protection is updated to the new check names before retirement of the old frontend repo

### GitHub control-plane migration checklist

The code move alone is not enough. The GitHub-side control plane must be made
coherent before the monorepo becomes canonical.

Required admin checklist:

1. **Branch protection / required checks**
   - update required status checks to the monorepo workflow names
   - apply this only after the canonical default branch has produced successful runs for every intended required context
   - preferred phase-1 target on `main`:
     - `Backend CI / test`
     - `Backend CI / api-health`
     - `Frontend CI / contract-sync`
     - `Frontend CI / lint-and-test`
   - leave `Backend CI / e2e-smoke` and `Frontend CI / docker-build-smoke` non-required unless the tolerance for branch friction changes later
   - confirm rules for direct pushes, squash/rebase policy, and any merge queue behavior
2. **GitHub environments and external deployment integrations**
   - inventory environment-scoped secrets/variables and deployment policies
   - retire old frontend `Preview`, `Production`, and `github-pages` environments rather than re-home them in phase 1
   - disable Vercel/GitHub Pages integrations so the old repo cannot keep deploying implicitly after cutover
3. **Actions secrets and variables**
   - inventory secrets/vars currently used by both repos
   - copy or re-scope them into the canonical monorepo repo before enabling equivalent workflows
4. **CODEOWNERS and review routing**
   - define ownership for backend, frontend, docs, and shared workflow files
5. **Dependabot and update policy**
   - merge the current Python/npm/github-actions policies deliberately
   - avoid losing coverage for either stack during repo retirement
6. **Security settings**
   - confirm vulnerability reporting, advisory settings, and any code-scanning expectations
7. **PR templates / issue forms / labels**
   - preserve whichever templates remain useful
   - decide whether frontend-specific labels or issue forms survive in the monorepo
8. **Docs + repo metadata**
   - update repo description, homepage links, README entry points, and citations
   - preferred canonical repo metadata in phase 1:
     - description: `HealthArchive.ca monorepo – backend services, frontend app, and documentation hub`
     - homepage: `https://healtharchive.ca`
   - preferred old frontend repo metadata during the observation window:
     - description: `Historical HealthArchive frontend repository; active development moved to jerdaw/healtharchive-backend/frontend`
     - homepage: `https://github.com/jerdaw/healtharchive-backend/tree/main/frontend`
9. **Release and discussions policy**
   - decide whether frontend releases remain informal or get monorepo-tagged
   - decide whether discussions/issues stay in old repos as historical records or are actively migrated
10. **Archived frontend repo behavior**
   - pointer README
   - read-only/pointer status during the observation window
   - explicit note about where active issues/PRs should go

No-go rule:

1. do not make the monorepo canonical on GitHub until required checks, secrets, and CODEOWNERS are confirmed
2. do not archive the old frontend repo until the pointer path and issue/discussion policy are explicit
3. do not archive the old frontend repo while legacy Vercel or GitHub Pages integrations still target it
4. do not update the live backend ruleset to require frontend monorepo checks until those exact check contexts exist on the backend default branch

## Phase 4: API contract hardening

Objective: remove a major remaining reason for frontend/backend drift.

Required changes:

1. generate frontend API types or a lightweight client from backend OpenAPI
2. stop hand-maintaining the shared response types in parallel
3. keep additive API evolution rules intact

Recommended incremental approach:

1. generate types first
2. keep existing frontend fetch wrappers
3. replace hand-written types endpoint-by-endpoint

Do **not** combine repo consolidation with a full frontend data-layer rewrite.

Exit criteria:

1. the highest-risk frontend API types are generated from backend schema
2. CI fails if generated artifacts are stale

## Phase 5: Documentation and contributor workflow realignment

Objective: make the repo understandable once it is physically consolidated.

Required changes:

1. update backend `README.md` from "multi-repo" to "monorepo, datasets separate"
2. update frontend `README.md` to indicate it now lives under the monorepo
3. update docs-hub content in:
   - `docs/project.md`
   - `docs/documentation-guidelines.md`
   - `docs/development/dev-environment-setup.md`
   - `docs/deployment/environments-and-configuration.md`
4. update `AGENTS.md` guidance on local paths and workflows
5. define one canonical contribution flow for backend-only, frontend-only, and cross-surface changes

Exit criteria:

1. new contributors can clone one repo and run the documented local flows
2. docs no longer claim that frontend docs are canonical in a separate source repo

### Proposed root workflow contract

The monorepo should expose one short, predictable command surface from the repo
root. This is the default contract to implement unless execution proves a
different shape is materially better.

Recommended root commands:

1. `make backend-ci`
   - backend formatting, lint, typecheck, fast tests
2. `make frontend-ci`
   - `frontend/` install + format/lint/typecheck/tests/build parity
3. `make integration-e2e`
   - combined backend + frontend smoke from one checkout
4. `make docs-build`
   - backend docs export/build checks
5. `make contract-sync`
   - regenerate frontend API types from backend schema and fail if dirty
6. `make monorepo-ci`
   - the broadest local parity gate for cross-surface changes

Recommended change-class contract:

1. **Backend-only change**
   - required local expectation: `make backend-ci`
   - run integration checks too if API contract, scripts, or docs wiring changed
2. **Frontend-only change**
   - required local expectation: `make frontend-ci`
   - run integration checks too if API usage, report forwarding, or proxy behavior changed
3. **Docs-only change**
   - required local expectation: `make docs-build`
   - broaden scope if docs modify executable examples, workflow names, or deploy instructions
4. **Cross-surface / contract change**
   - required local expectation: `make backend-ci`, `make frontend-ci`, `make integration-e2e`, and `make contract-sync`

Recommended path-filtering rule:

1. any change under shared workflow files, root scripts, docs entry points, or generated contracts should trigger the broader matrix rather than a narrow path filter

## Phase 6: Production deployment migration

Objective: switch production release inputs to the monorepo **without**
changing the live runtime model.

### Backend production path

Recommended approach:

1. keep the deployed backend checkout path at `/opt/healtharchive-backend` for the first migration wave
2. switch that checkout from the old backend-only repo to the new monorepo repo
3. keep backend service names, env files, ports, and data paths unchanged
4. adapt backend deploy tooling only as needed to account for the imported `frontend/` subdir

Why this is safer than a path rename:

1. current systemd templates and scripts assume `/opt/healtharchive-backend`
2. current operator runbooks assume `/opt/healtharchive-backend`
3. keeping the path stable makes rollback materially simpler

### Frontend production path

Recommended approach:

1. keep the release-root model:
   - `/srv/apps/healtharchive-frontend/releases/<sha>`
   - `/srv/apps/healtharchive-frontend/current`
2. switch the release source from the old frontend repo to the new monorepo repo
3. build and run the frontend from `frontend/`
4. keep:
   - container name `healtharchive-frontend`
   - bind `127.0.0.1:3200`
   - env file `/etc/projects-merge/env/healtharchive-frontend.env`
   - Caddy routing unchanged

Additional repo-control consequence:

1. because production now runs on the VPS, any legacy Vercel or GitHub Pages integration still attached to the old frontend repo must be disabled rather than carried forward in phase 1

### Platform-ops implications before execution

Before any production cutover, prepare matching updates in `platform-ops/` for:

1. `inventory/services.yaml`
2. `docs/runbooks/RUN-005-healtharchive-direct-vps-production-runbook.md`
3. any shared inventory or shared-host references that mention the old frontend repo as a separate source repo
4. a dedicated host-side execution board:
   - `platform-ops/docs/plans/PLAN-013-healtharchive-monorepo-production-cutover.md`

Important: service inventory may temporarily point both `healtharchive-api` and
`healtharchive-frontend` at the same repo slug if phase 1 keeps the backend repo
name unchanged. That is acceptable as an interim state if documented clearly.

Exit criteria:

1. backend can be deployed from the monorepo checkout without path churn
2. frontend can be built and deployed from `frontend/` without changing its runtime contract
3. public health checks remain unchanged

## Phase 7: Old frontend repo retirement

Objective: retire the old frontend repo only after the monorepo path is proven.

Recommended sequence:

1. move the old frontend repo into an operational read-only/pointer state
2. replace its README with a pointer to the monorepo location
3. archive it after at least one stable release window
4. disable any residual Vercel/GitHub Pages integrations that still point at the old repo
5. record the retirement decision in docs

Define the observation-window state clearly:

1. “read-only/pointer state” here means policy + discoverability, not GitHub archive yet
2. update README, repo description, and homepage metadata to point at the monorepo
   - repo description should explicitly say the repo is historical
   - homepage should point at the canonical in-tree frontend path, not the production site
3. stop merging direct feature work to the old repo
4. close or redirect open PRs/issues with a pointer to the canonical monorepo location
5. leave the old repo unarchived only long enough to verify contributor routing and production stability

Questions to settle before archival:

1. whether to migrate or close open issues
2. whether discussions stay where they are or move
3. whether to keep the old repo for historical discoverability only
4. whether any frontend-only release tags or automation should be mirrored or intentionally discontinued

Future preview-deployment note:

1. no preview-deployment surface is part of the phase-1 target state
2. if preview deployments are wanted later, recreate them only from the monorepo and only under a separate explicit decision

Exit criteria:

1. active development no longer happens in the old frontend repo
2. contributors are redirected cleanly to the monorepo
3. the old repo no longer owns hidden deployment behavior that could confuse source-of-truth or release provenance

## Phase 8: Optional repo rename and deeper normalization

This phase is explicitly optional and should only start after stabilization.

Possible follow-on changes:

1. rename repo slug to `healtharchive`
2. rename local checkout paths
3. move backend under a subdirectory
4. create `packages/` for shared tooling/contracts

This phase requires its own decision and rollback plan.

---

## Production cutover plan

The repo merge and the server cutover must be treated as separate approval
gates.

### Cutover order

1. finish local monorepo branch and get all checks green
2. prove frontend container build and private bind from `frontend/`
3. prove backend deploy from the monorepo checkout in a dry-run-safe way
4. cut over frontend release sourcing
5. cut over backend repo sourcing
6. observe
7. only after a stable window, retire the old frontend repo

### Go / no-go criteria before production

All of these must be true:

1. backend `make ci` passes in the monorepo
2. frontend `npm run check` passes in `frontend/`
3. integrated e2e smoke passes from one checkout
4. backend docs checks still pass
5. frontend Docker image builds from `frontend/`
6. production rollback commands are written down and rehearsed as dry runs

### Production verification after cutover

Backend:

1. `https://api.healtharchive.ca/api/health`
2. `sudo systemctl status healtharchive-api healtharchive-worker`
3. current backend deploy helper dry-run still behaves as expected

Frontend:

1. `http://127.0.0.1:3200/`
2. `https://healtharchive.ca/`
3. `https://healtharchive.ca/archive`
4. snapshot + browse flow
5. report forwarding flow

Integrated:

1. run `verify_public_surface.py` against current public API/frontend bases
2. confirm replay is unaffected

### Worker coordination

Do **not** pause the worker just because the source repo became a monorepo.

Pause or alter worker behavior only if the deploy/change actually affects:

1. frontend ingress routing
2. backend service restart behavior
3. shared host resources in a way that creates crawl risk

Routine backend deploy safety should continue to be governed by the existing
deploy helper and job-aware worker restart logic.

---

## Rollback strategy

## Repo-level rollback

If the monorepo branch proves too disruptive before production cutover:

1. stop the migration branch
2. continue using the existing separate repos
3. keep the imported branch for later rework

## Frontend production rollback

If the frontend monorepo-sourced release misbehaves:

1. point `/srv/apps/healtharchive-frontend/current` back to the prior known-good release
2. redeploy the previous release
3. keep Caddy and backend unchanged

## Backend production rollback

If the backend monorepo-sourced deploy misbehaves:

1. use the existing backend rollback path with the prior known-good ref
2. revert to the prior deployed SHA
3. keep DB and archive paths untouched

## Data rollback

There should be **no** data rollback for the repo-consolidation move because:

1. Postgres is not being migrated
2. WARC storage is not being migrated
3. replay collections are not being migrated

That is a core design requirement of this plan.

---

## Known file/path impacts

This is the minimum observed impact list; it is not exhaustive.

| Surface | Current assumption | Migration consequence |
| --- | --- | --- |
| `backend/.github/workflows/backend-ci.yml` | checks out separate frontend repo | remove cross-checkout; use `frontend/` |
| `frontend/.github/workflows/frontend-ci.yml` | checks out separate backend repo | remove cross-checkout; use same checkout |
| `scripts/ci-e2e-smoke.sh` | defaults to `../healtharchive-frontend` | prefer `frontend/`, keep fallback temporarily |
| `frontend/scripts/install-pre-push-hook.sh` | looks for `../healtharchive-backend/.venv/bin/pre-commit` | change to same-repo root path |
| `frontend/docs/development/dev-environment-setup.md` | describes sibling repo workflow | rewrite for one-repo workflow |
| `docs/documentation-guidelines.md` | frontend docs canonical in separate repo | rewrite after cutover to same-repo source of truth |
| `docs/project.md` | project described as multi-repo | rewrite to "monorepo + datasets repo" |
| GitHub branch protection | required checks tied to separate repos | update to monorepo workflow names before canonical cutover |
| GitHub secrets / vars | split across separate repos | inventory and copy before workflow cutover |
| `.github/CODEOWNERS` and templates | currently repo-local and split | reconcile into one monorepo governance surface |
| `platform-ops/inventory/services.yaml` | frontend and api use different repo slugs | update when the production cutover happens |
| `platform-ops` runbooks | frontend release sourced from separate repo | update to monorepo release source before execution |

Also note:

1. many documentation links currently point to `github.com/jerdaw/healtharchive-frontend`
2. many backend runbooks and systemd templates reference `/opt/healtharchive-backend`
3. those `/opt/healtharchive-backend` references are a reason to avoid moving backend out of the repo root in phase 1
4. the GitHub-side merge/admin surface is currently duplicated and must be treated as a first-class migration concern, not a cleanup task

---

## Open questions and recommended defaults

### 1. Should the GitHub repo be renamed immediately?

Recommended default: **No**

1. keep the current backend repo slug for phase 1
2. rename only after the monorepo is stable

### 2. Should the frontend live in `frontend/` or `apps/frontend/`?

Recommended default: **`frontend/`**

1. shorter paths
2. less churn
3. matches current e2e script fallback patterns more closely

### 3. Should the backend move under `backend/` now?

Recommended default: **No**

1. too many current deploy/docs/systemd assumptions point at backend-as-root
2. the cleanliness benefit is not worth the immediate migration risk

### 4. Should a monorepo build tool be introduced immediately?

Recommended default: **No**

1. start with simple shell/Make targets
2. add heavier orchestration only after the monorepo proves its value

### 5. What happens to `healtharchive-datasets`?

Recommended default: **Keep separate**

1. release cadence differs
2. public citation/research semantics differ
3. it is already intentionally metadata-only and publication-oriented

---

## Definition of done

This plan is complete only when:

1. frontend and backend live in one repo with preserved history
2. both services can be developed from one checkout
3. both services remain independently deployable
4. no production data or archive storage was moved as part of the consolidation
5. CI no longer depends on cross-checking out a second HealthArchive repo
6. docs describe the new reality cleanly
7. the old frontend repo is retired intentionally, not abandoned implicitly

---

## Immediate next step

If execution is approved, the first concrete implementation step should be:

1. create the migration branch in the backend repo
2. import frontend history into `frontend/`
3. fix the minimum local-path and CI assumptions needed to run both surfaces from one checkout

Do **not** start with a repo rename, host path rename, or backend directory move.
