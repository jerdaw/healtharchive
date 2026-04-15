# HealthArchive Monorepo Phase 0 Inventory And Execution Checklist

**Created:** 2026-04-14
**Status:** Point-in-time inventory for pre-import execution prep
**Related plan:** `2026-04-14-healtharchive-monorepo-consolidation-plan.md`
**Purpose:** capture the real repo/GitHub control-plane state that must be reconciled before any frontend history import or canonical monorepo cutover

---

## Scope

This inventory covers the current **GitHub/repo control plane** for:

1. `jerdaw/healtharchive-backend`
2. `jerdaw/healtharchive-frontend`

It does **not** cover:

1. VPS cutover execution
2. platform inventory updates in `platform-ops`
3. source-code import mechanics beyond the prerequisites they depend on

Use this document to run phase 0 of the main consolidation plan.

---

## Snapshot summary

## Backend repo

Repository identity as observed on 2026-04-14:

1. repo: `jerdaw/healtharchive-backend`
2. visibility: public
3. default branch: `main`
4. homepage: none set
5. open PRs: none
6. open issues: none
7. classic branch protection: none
8. rulesets:
   - `main-protection` exists and is **active**
   - requires:
     - `Backend CI / test`
     - `Backend CI / api-health`
   - also blocks deletion and non-fast-forward updates
9. workflows:
   - `Backend CI (Full)`
   - `Backend CI`
   - `Deploy Documentation`
   - `Workflow Lint`
   - `Dependabot Updates`
10. repo secrets: none listed
11. repo variables: none listed
12. GitHub environments: none
13. deploy keys: none
14. custom webhooks: none
15. Actions policy:
   - Actions enabled
   - all actions allowed
   - default workflow permissions: read
   - workflows may approve pull-request reviews
16. merge policy:
   - merge commits allowed
   - rebase merges allowed
   - squash merges allowed
   - delete branch on merge enabled
   - default merge method currently resolves to squash
17. repo features:
   - issues enabled
   - discussions disabled
   - projects enabled
   - wiki enabled
18. GitHub Pages site: none
19. releases/tags: none observed

## Frontend repo

Repository identity as observed on 2026-04-14:

1. repo: `jerdaw/healtharchive-frontend`
2. visibility: public
3. default branch: `main`
4. homepage: `https://healtharchive.ca`
5. open PRs:
   - `#99` Dependabot npm update (`diff` 8 -> 9)
   - `#97` Dependabot GitHub Actions update (`dependabot/fetch-metadata` 2 -> 3)
6. open issues:
   - `#67` remove `eslint-plugin-react` patch after upstream eslint 10 support
7. classic branch protection: none
8. rulesets:
   - `main` exists but is **disabled**
   - configured for deletion block, non-fast-forward block, and required linear history
   - currently not enforced
9. workflows:
   - `Dependabot auto-merge`
   - `Frontend CI`
   - `Production Smoke`
   - `Workflow Lint`
   - `Dependabot Updates`
   - `pages-build-deployment`
10. repo secrets: none listed
11. repo variables: none listed
12. GitHub environments:
   - `github-pages`
   - `Preview`
   - `Production`
13. environment secrets:
   - none listed in `github-pages`
   - none listed in `Preview`
   - none listed in `Production`
14. environment variables:
   - none listed in `github-pages`
   - none listed in `Preview`
   - none listed in `Production`
15. deploy keys: none
16. custom webhooks: none
17. Actions policy:
   - Actions enabled
   - all actions allowed
   - default workflow permissions: read
   - workflows may approve pull-request reviews
18. merge policy:
   - merge commits allowed
   - rebase merges allowed
   - squash merges allowed
   - delete branch on merge enabled
   - default merge method currently resolves to squash
19. checked-in workflow files:
   - `.github/workflows/frontend-ci.yml`
   - no checked-in auto-merge workflow file was present
   - `.github/workflows/production-smoke.yml`
   - `.github/workflows/workflow-lint.yml`
   - no checked-in `pages-build-deployment` workflow file exists
20. deployment history visible in GitHub:
   - `vercel[bot]` deployed `Production` on 2026-02-24 at `5d94ed4603e94b68dbaef022b0a813860d787399`
   - `vercel[bot]` deployed `Preview` on 2026-02-24 at `e64e0bbfc8a2c5d5462a85a896a7a22595ea4330`
   - `jerdaw` triggered `github-pages` deployments on 2026-02-23 from `main`
   - `pages-build-deployment` workflow runs were still failing/cancelling on 2026-03-17
21. checked-in legacy deployment config:
   - `vercel.json`
   - `../../frontend/scripts/vercel-ignore-build.sh`
22. repo features:
   - issues enabled
   - discussions disabled
   - projects enabled
   - wiki enabled
23. GitHub Pages site: none returned by API
24. releases/tags: none observed

## Shared repository-governance observations

From the checked-in repo contents:

1. both repos have a `../../.github/pull_request_template.md`
2. both repos have a `.github/dependabot.yml`
3. neither repo currently has a checked-in `CODEOWNERS`
4. neither repo currently has checked-in issue forms/templates
5. neither repo appears to rely on repository-level secrets or variables today
6. both repos currently allow merge, rebase, and squash merges
7. both repos currently delete branches on merge
8. both repos currently use read-only default workflow permissions with workflow approval of PR reviews enabled

---

## What this means for the migration

## Findings that reduce migration complexity

1. no releases or tags need to be preserved or re-homed
2. no discussions need to be migrated because discussions are disabled in both repos
3. no repo secrets/variables are currently listed, so the GitHub-side secret migration is simpler than expected
4. both repos already use `main`, so there is no branch-name reconciliation problem
5. no open backend PRs/issues need to be rehomed before the monorepo becomes canonical
6. neither repo uses deploy keys or custom webhooks, so there is no hidden SSH-hook integration to re-home

## Findings that require explicit decisions

1. the frontend repo still has active GitHub work:
   - two Dependabot PRs
   - one open issue
2. the backend repo has an **active** ruleset, while the frontend repo has a **disabled** one
3. the monorepo cannot inherit backend protections accidentally; required checks must be redefined deliberately for the new workflow names
4. the frontend repo still exposes workflow state that will need retirement decisions:
   - `Dependabot auto-merge`
   - `Production Smoke`
   - `pages-build-deployment`
5. the frontend repo has GitHub-side deployment state beyond Actions:
   - `Preview` and `Production` environments with recent `vercel[bot]` deployments on 2026-02-24
   - a `github-pages` environment with deployments on 2026-02-23
6. because neither repo has `CODEOWNERS` today, the monorepo has an opportunity to introduce path-based ownership cleanly, but this must be an explicit choice

## Findings that look stale or ambiguous

1. `pages-build-deployment` appears in the frontend workflow list, but the GitHub Pages API reports no configured Pages site
2. the frontend repo docs already describe older Vercel preview URLs as historical, but the repo still has checked-in Vercel config and recent `vercel[bot]` deployments
3. that means the old frontend repo still has hidden deployment surfaces that should be explicitly retired or re-homed before archival

---

## Required Phase 0 decisions

These should be settled before the subtree import branch is treated as the
canonical migration branch.

### 1. Open frontend PR policy

Choose one of:

1. merge before import
2. close and recreate in the monorepo
3. abandon intentionally

Recommended default:

1. do **not** merge the current Dependabot PRs into the old frontend repo during the migration window
2. close them with a note that dependency updates will be re-evaluated or regenerated in the monorepo after cutover

Rationale:

1. they are low-urgency bot PRs
2. letting them land during the overlap window increases the chance of subtree refresh churn

### 2. Open frontend issue policy

Current issue:

1. `#67` remove the `eslint-plugin-react` patch when upstream catches up

Recommended default:

1. copy the issue into the monorepo issue tracker once canonical
2. close the old issue with a pointer after the old frontend repo becomes read-only

### 3. Monorepo ruleset policy

Decide before canonical cutover:

1. whether the monorepo keeps a single active ruleset on `main`
2. what the required status checks are called
3. whether linear history is required
4. who can bypass

Recommended default:

1. create an **active** main-branch ruleset in the monorepo
2. require the new monorepo workflow names rather than trying to preserve old check names
3. keep deletion and non-fast-forward protections
4. avoid relying on a disabled ruleset pattern like the current frontend repo

Observed live backend ruleset snapshot on 2026-04-15:

1. backend repo currently has one active default-branch ruleset: `main-protection`
2. required checks are still only:
   - `Backend CI / test`
   - `Backend CI / api-health`
3. enabled protections are:
   - branch deletion blocked
   - non-fast-forward pushes blocked
4. bypass actor is `Repository admin Role` with `always` bypass

Activation gate for the ruleset change:

1. do **not** update required checks on the live backend repo until the monorepo workflow files are present on the canonical default branch
2. wait for at least one successful default-branch run that publishes all intended new check contexts:
   - `Frontend CI / contract-sync`
   - `Frontend CI / lint-and-test`
3. after those checks exist on the canonical branch, update the existing `main-protection` ruleset in place instead of creating a second overlapping default-branch ruleset
4. do not retire the old frontend repo until no required-check dependency points at the old repo

### 4. CODEOWNERS policy

Decide explicitly:

1. keep no CODEOWNERS
2. add a minimal path-based CODEOWNERS file from day one

Recommended default:

1. add a minimal monorepo `CODEOWNERS`
2. at minimum cover:
   - backend code
   - frontend code
   - workflows
   - docs

Even in a single-maintainer repo, this improves review routing and future clarity.

### 5. Dependabot policy

Current split:

1. backend manages `pip` + `github-actions`
2. frontend manages `npm` + `github-actions`

Recommended default:

1. merge into one monorepo config
2. keep:
   - `pip` at repo root
   - `npm` in `/frontend`
   - `github-actions` at repo root
3. preserve update cadence and labels unless you intentionally simplify them

### 6. Frontend orphan/stale GitHub workflow policy

The `pages-build-deployment` workflow entry should be confirmed before the old
repo is retired.

Recommended default:

1. treat it as historical/stale unless proven otherwise
2. verify there is no actual Pages dependency before archiving the repo

### 7. External deployment integration policy

Current hidden state:

1. the frontend repo has GitHub environments `Preview`, `Production`, and `github-pages`
2. deployment history shows `vercel[bot]` deployments to `Preview` and `Production` on 2026-02-24
3. the checked-in repo still contains `vercel.json` and `../../frontend/scripts/vercel-ignore-build.sh`
4. the `pages-build-deployment` workflow was still running on 2026-03-17 even though the Pages API reports no configured site and no workflow file exists in the repo tree

Recommended default:

1. treat old-repo Vercel and GitHub Pages state as legacy, not canonical
2. do not leave any production or preview deployment integration pointed at the old frontend repo after the monorepo becomes canonical
3. if preview deployments are still valuable, recreate them deliberately against the monorepo rather than preserving them implicitly on the old repo
4. disable or remove the orphaned GitHub Pages configuration before archival

Decision now locked on 2026-04-14:

1. HealthArchive production remains VPS-only
2. legacy Vercel `Production` and `Preview` integrations will be retired, not re-homed, as part of frontend-repo retirement
3. legacy GitHub Pages state will be removed/disabled, not preserved
4. no preview-deployment surface will be carried forward in this migration by default
5. if preview deployments are wanted later, they must be introduced as a separate, explicit monorepo-era decision

---

## Exact retirement checklist for old frontend deployment state

Use this checklist before the subtree import branch is treated as the active
migration branch.

### Objective

Remove the old frontend repo's hidden deployment authority before the monorepo
transition creates ambiguity about which repo owns releases.

### Known baseline being retired

As of 2026-04-14, the old frontend repo still shows:

1. GitHub environments:
   - `Preview`
   - `Production`
   - `github-pages`
2. recent Vercel deployment history:
   - latest visible `Production` deployment by `vercel[bot]` on 2026-02-24 at `5d94ed4603e94b68dbaef022b0a813860d787399`
   - latest visible `Preview` deployment by `vercel[bot]` on 2026-02-24 at `e64e0bbfc8a2c5d5462a85a896a7a22595ea4330`
3. GitHub Pages residue:
   - no Pages site returned by the API
   - repeated `pages-build-deployment` runs still visible through 2026-03-17
   - `github-pages` environment still exists with a branch-policy protection rule
4. checked-in legacy Vercel artifacts:
   - `vercel.json`
   - `../../frontend/scripts/vercel-ignore-build.sh`

### Stage 1. Freeze evidence and choose the cutoff

Do this immediately before any disablement work:

1. record the frontend default-branch SHA chosen as the freeze/import candidate
2. record the latest visible deployment evidence for each old-repo environment:
   - `Preview`
   - `Production`
   - `github-pages`
3. record the date/time after which no new old-repo deployments are acceptable
4. note explicitly that production authority remains the VPS path, not Vercel or GitHub Pages

### Stage 2. Disable old-repo external deploy triggers before import

This is the critical pre-import hardening step.

1. disconnect the old frontend repo from any Vercel project that can create GitHub-linked `Preview` or `Production` deployments
2. verify no HealthArchive production domain or operational preview flow still depends on that old-repo Vercel linkage
3. disable GitHub Pages for the old frontend repo if any hidden Pages source remains configured outside the checked-in repo tree
4. disable or remove the stale `pages-build-deployment` workflow state so GitHub stops attempting Pages deploys for the old repo
5. do not start the subtree import until those external deployment triggers are disabled

### Stage 3. Verify disablement before import

The disablement work is not complete until it is verified from GitHub state.

1. confirm `gh api repos/jerdaw/healtharchive-frontend/pages` still returns no configured site
2. confirm no new `pages-build-deployment` runs appear after the disablement timestamp
3. confirm no new `vercel[bot]` deployments appear after the disablement timestamp
4. confirm the old repo no longer has any operational role in preview or production deployment reasoning
5. record the verification timestamp in the migration notes

### Stage 4. Overlap-window rule after import

Once the subtree import branch exists:

1. the old frontend repo may remain readable, but it must not retain deploy authority
2. no preview or production deployment should originate from the old frontend repo
3. if an emergency frontend fix is needed during overlap, it must land in the monorepo branch first
4. do not re-enable Vercel or GitHub Pages on the old frontend repo as a shortcut

### Stage 5. Old-repo archival cleanup

After the monorepo is canonical and stable:

1. replace the old frontend README with a pointer to the monorepo
2. move the old repo to read-only/pointer status
3. archive the old repo after the planned observation window
4. leave a short archival note describing that Vercel/GitHub Pages integration was intentionally retired during monorepo consolidation

Define “read-only/pointer status” explicitly:

1. this is an operational state, **not** GitHub archive yet
2. replace the README with a redirect/pointer notice
3. update repo description/homepage if needed so GitHub listing views point at the monorepo
4. close or redirect open PRs instead of merging new work there
5. close or redirect remaining active issues with a pointer to the canonical monorepo location
6. leave the repo unarchived only for the planned observation window, then archive it once production and contributor routing are stable

Draft replacement README text for the old frontend repo:

```md
# HealthArchive Frontend (Historical Repository)

This repository no longer hosts active frontend development.

The canonical HealthArchive source now lives in:

- Main repo: https://github.com/jerdaw/healtharchive-backend
- Frontend app: https://github.com/jerdaw/healtharchive-backend/tree/main/frontend
- Documentation: https://docs.healtharchive.ca

New issues and pull requests should go to `jerdaw/healtharchive-backend`.

Production frontend releases are now sourced from the monorepo `frontend/`
directory on the VPS. Legacy Vercel and GitHub Pages integration for this repo
was intentionally retired during the monorepo consolidation.

This repository is kept only for historical reference during the transition
window and will be archived after the planned stabilization period.
```

### Evidence to preserve in the migration record

Capture enough evidence that future operators can prove the old repo lost deploy
authority intentionally.

1. the cutoff timestamp for acceptable old-repo deployments
2. the last known visible `Preview` deployment
3. the last known visible `Production` deployment
4. the last known visible `github-pages` run/deployment
5. the verification timestamp showing no new deploy activity after disablement

### Hard no-go rule

Do not begin the subtree import if either of these is true:

1. new `vercel[bot]` deployments are still being recorded against the old frontend repo
2. `pages-build-deployment` is still running or GitHub Pages state is still acting like a live publish path

---

## Execution status on 2026-04-14

This section records the first real execution pass against the retirement
checklist.

### Evidence captured

1. cutoff timestamp chosen: `2026-04-14T15:57:39-04:00`
2. frontend remote default-branch SHA at cutoff: `c8fc28b8a8b047383460e767a809b9eb83f14df4`
3. latest visible deployment evidence at capture time:
   - `Preview`: `2026-02-24T17:27:04Z` by `vercel[bot]` at `e64e0bbfc8a2c5d5462a85a896a7a22595ea4330`
   - `Production`: `2026-02-24T19:09:07Z` by `vercel[bot]` at `5d94ed4603e94b68dbaef022b0a813860d787399`
   - `github-pages`: `2026-02-23T18:00:49Z` by `jerdaw` at `00b5294d5105019be7e94c6056ad6bbf8075bdb5`

### Actions completed

1. deleted GitHub environment `github-pages`
2. deleted GitHub environment `Preview`
3. deleted GitHub environment `Production`

### Verification after deletion

Verification timestamp: `2026-04-14T15:58:29-04:00`

1. `gh api repos/jerdaw/healtharchive-frontend/environments` now returns `total_count: 0`
2. `gh api repos/jerdaw/healtharchive-frontend/pages` still returns HTTP `404`, consistent with no configured Pages site
3. `gh api 'repos/jerdaw/healtharchive-frontend/deployments?per_page=10'` shows no deployments after the cutoff timestamp

### Remaining blockers

1. `pages-build-deployment` still appears in `gh workflow list -R jerdaw/healtharchive-frontend` as an active workflow object
2. `gh workflow disable pages-build-deployment -R jerdaw/healtharchive-frontend` returned HTTP `422` with:
   - `Unable to disable this workflow`
3. there is no `vercel` CLI installed in this environment and no visible Vercel auth material in environment variables or standard local config paths
4. the available GitHub token could not enumerate app installations, so repo-to-Vercel linkage cannot be proven removed from GitHub API access alone

### Current execution verdict

1. GitHub environment cleanup is complete
2. GitHub Pages appears non-live, but the synthetic `pages-build-deployment` workflow object still needs explicit resolution or longer observation to prove it stays inert
3. Vercel unlinking remains an external/admin task unless Vercel account access is provided through another channel
4. the subtree import should still wait until the Vercel unlink question is closed and the Pages residue is judged operationally inert

### Manual procedure to close the remaining Vercel blocker

Use the Vercel dashboard as the primary path.

1. sign into Vercel with access to every personal account or team that may have ever owned the old frontend project
2. for each account/team scope in the Vercel team switcher:
   - locate any project connected to `jerdaw/healtharchive-frontend`
   - open the project
   - go to `Settings` -> `Git`
   - under `Connected Git Repository`, use `Disconnect`
3. if the old project still has custom domains attached in Vercel:
   - open `Domains`
   - remove any domain still attached to that project
   - if a domain is only lingering in Vercel and no longer needed there, remove it from the account-level domain list too
4. if the project is now only legacy clutter after Git disconnect:
   - go to `Settings` -> `General`
   - use `Delete Project`
   - only do this if you are certain no desired domain, env var, or deployment history needs to survive there
5. repeat until no Vercel project remains connected to the old frontend repo in any accessible scope

### Optional CLI path if Vercel access is later available on a shell host

Only use this if the machine is already authenticated to the correct Vercel
scope and the local directory is linked to the correct Vercel project.

1. `vercel git disconnect`
2. if needed first: `vercel link`
3. dashboard verification is still preferred even if the CLI path succeeds

### Post-unlink verification commands

Run these after the Vercel dashboard work is done.

1. verify the old GitHub repo still shows no environments:

   ```bash
   gh api repos/jerdaw/healtharchive-frontend/environments
   ```

2. verify Pages still has no live site:

   ```bash
   gh api repos/jerdaw/healtharchive-frontend/pages
   ```

   Expected result: HTTP `404`

3. verify no new deployments appeared after the cutoff timestamp:

   ```bash
   gh api 'repos/jerdaw/healtharchive-frontend/deployments?per_page=20' \
     | jq 'map(select(.created_at > "2026-04-14T19:57:39Z"))'
   ```

   Expected result: `[]`

4. verify no new Pages workflow runs appeared after the cutoff:

   ```bash
   gh run list -R jerdaw/healtharchive-frontend \
     --workflow 'pages-build-deployment' \
     --limit 20 \
     --json databaseId,startedAt,headSha,conclusion,status
   ```

   Expected result: no runs with `startedAt` after the disablement window

5. verify the workflow inventory for the old repo so any future residue is obvious:

   ```bash
   gh workflow list -R jerdaw/healtharchive-frontend
   ```

### Exit condition for clearing the blocker

Treat the Vercel blocker as closed only when:

1. the manual dashboard pass confirms no Vercel project is still connected to `jerdaw/healtharchive-frontend`
2. no new `vercel[bot]` deployments appear after the cutoff
3. no new `pages-build-deployment` runs appear after the same observation window
4. that verification timestamp is added to this document before subtree import begins

### Final verification after manual dashboard pass

User-confirmed manual actions:

1. no other Vercel account/team scope exists
2. `healtharchive.ca` was removed from the visible Vercel scope
3. no Vercel project was visible in the only accessible scope

Verification timestamp: `2026-04-14T16:21:16-04:00`

Observed verification results:

1. `gh api repos/jerdaw/healtharchive-frontend/environments` returned `{"total_count":0,"environments":[]}`
2. `gh api repos/jerdaw/healtharchive-frontend/pages` returned HTTP `404`
3. `gh api 'repos/jerdaw/healtharchive-frontend/deployments?per_page=20' | jq 'map(select(.created_at > "2026-04-14T19:57:39Z"))'` returned `[]`
4. `gh run list -R jerdaw/healtharchive-frontend --workflow 'pages-build-deployment' --limit 20 --json ...` returned no runs after the cutoff timestamp
5. `gh workflow list -R jerdaw/healtharchive-frontend` still shows a synthetic `pages-build-deployment` workflow object, but it has remained inert across the observation window

Updated verdict:

1. the Vercel unlink blocker is treated as closed for Phase 0 purposes
2. the old frontend repo no longer shows active deploy authority through GitHub environments or post-cutoff deployment activity
3. the synthetic `pages-build-deployment` object should be treated as historical residue unless it produces new runs again
4. the subtree import gate related to legacy deployment authority is now satisfied

### Additional GitHub control-plane verification on 2026-04-15

This closes the remaining “hidden GitHub state” checklist items for both repos.

Observed state:

1. backend repo metadata:
   - description still says `Backend for HealthArchive.ca ...`
   - homepage is unset
   - discussions remain disabled
2. frontend repo metadata:
   - description still says `Frontend for HealthArchive.ca ...`
   - homepage remains `https://healtharchive.ca`
   - discussions remain disabled
3. backend repo control plane:
   - repo secrets: none
   - repo variables: none
   - environments: none
   - deploy keys: none
   - custom webhooks: none
   - releases: none
   - tags: none
4. frontend repo control plane after retirement work:
   - repo secrets: none
   - repo variables: none
   - environments: none
   - deploy keys: none
   - custom webhooks: none
   - releases: none
   - tags: none

Operational conclusion:

1. there are no remaining GitHub-side secrets, variables, hooks, releases, or tags that need migration planning in phase 1
2. repo description/homepage metadata should be updated only when the monorepo becomes canonical, not before
3. the old frontend repo still needs the planned pointer README and metadata redirect during the retirement window
4. the backend repo still needs a monorepo-appropriate description/homepage at canonical cutover

### Exact post-green GitHub cutover commands

Do not run these until all of the following are true:

1. the monorepo migration branch has been merged or otherwise made canonical on `jerdaw/healtharchive-backend:main`
2. the canonical default branch has produced at least one successful run publishing the new frontend check contexts:
   - `Frontend CI / contract-sync`
   - `Frontend CI / lint-and-test`
3. you are ready to make the GitHub control plane match the new canonical repo shape

Operator action sequence after that gate:

#### 1. Verify the required check contexts exist on backend `main`

```bash
BACKEND_SHA="$(gh api repos/jerdaw/healtharchive-backend/commits/main --jq .sha)"
gh api repos/jerdaw/healtharchive-backend/commits/$BACKEND_SHA/check-runs --jq '.check_runs[].name'
```

Expected minimum contexts:

1. `Backend CI / test`
2. `Backend CI / api-health`
3. `Frontend CI / contract-sync`
4. `Frontend CI / lint-and-test`

#### 2. Update canonical backend repo metadata

```bash
gh api --method PATCH \
  -H 'Accept: application/vnd.github+json' \
  repos/jerdaw/healtharchive-backend \
  -f description='HealthArchive.ca monorepo – backend services, frontend app, and documentation hub' \
  -f homepage='https://healtharchive.ca'
```

#### 3. Update the live backend `main-protection` ruleset in place

Create the payload locally first:

```bash
cat >/tmp/healtharchive-main-protection.json <<'JSON'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [
    {
      "actor_id": 5,
      "actor_type": "RepositoryRole",
      "bypass_mode": "always"
    }
  ],
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "Backend CI / test" },
          { "context": "Backend CI / api-health" },
          { "context": "Frontend CI / contract-sync" },
          { "context": "Frontend CI / lint-and-test" }
        ]
      }
    }
  ]
}
JSON
```

Apply it:

```bash
gh api --method PUT \
  -H 'Accept: application/vnd.github+json' \
  repos/jerdaw/healtharchive-backend/rulesets/12543570 \
  --input /tmp/healtharchive-main-protection.json
```

Verify it:

```bash
gh api repos/jerdaw/healtharchive-backend/rulesets/12543570 \
  --jq '.rules[] | select(.type=="required_status_checks").parameters.required_status_checks[].context'
```

#### 4. Put the old frontend repo into pointer metadata state

```bash
gh api --method PATCH \
  -H 'Accept: application/vnd.github+json' \
  repos/jerdaw/healtharchive-frontend \
  -f description='Historical HealthArchive frontend repository; active development moved to jerdaw/healtharchive-backend/frontend' \
  -f homepage='https://github.com/jerdaw/healtharchive-backend/tree/main/frontend'
```

#### 5. Replace the old frontend README with the pointer text

In the old frontend checkout:

```bash
cat > README.md <<'MD'
# HealthArchive Frontend (Historical Repository)

This repository no longer hosts active frontend development.

The canonical HealthArchive source now lives in:

- Main repo: https://github.com/jerdaw/healtharchive-backend
- Frontend app: https://github.com/jerdaw/healtharchive-backend/tree/main/frontend
- Documentation: https://docs.healtharchive.ca

New issues and pull requests should go to `jerdaw/healtharchive-backend`.

Production frontend releases are now sourced from the monorepo `frontend/`
directory on the VPS. Legacy Vercel and GitHub Pages integration for this repo
was intentionally retired during the monorepo consolidation.

This repository is kept only for historical reference during the transition
window and will be archived after the planned stabilization period.
MD
git add README.md
git commit -m "docs: point old frontend repo at monorepo"
git push
```

#### 6. Close or redirect frontend issue `#67` after it is recreated in the canonical repo

```bash
gh issue close 67 \
  -R jerdaw/healtharchive-frontend \
  --reason "not planned" \
  --comment "Tracked in jerdaw/healtharchive-backend#<new_issue_number> after the monorepo cutover."
```

#### 7. Archive the old frontend repo after the observation window

```bash
gh api --method PATCH \
  -H 'Accept: application/vnd.github+json' \
  repos/jerdaw/healtharchive-frontend \
  -f archived=true
```

Reference docs:

1. GitHub REST: Update a repository ruleset
   - https://docs.github.com/en/rest/repos/rules#update-a-repository-ruleset
2. GitHub REST: Update a repository
   - https://docs.github.com/en/rest/repos/repos#update-a-repository

### Freeze refs and GitHub work disposition

This records the explicit source-control freeze state for the next migration
step.

1. backend remote `main` SHA selected for the migration base: `4d558c8c957d2df0809e3284a3e2eb5f4138da39`
2. frontend remote `main` SHA selected as the import freeze point: `c8fc28b8a8b047383460e767a809b9eb83f14df4`
3. backend local migration branch created for the work: `codex/healtharchive-monorepo-migration`
4. old frontend PR disposition:
   - PR `#99` closed on 2026-04-14 with a note that the dependency update will be re-evaluated or regenerated in the canonical monorepo after cutover
   - PR `#97` closed on 2026-04-14 with the same migration-window rationale
   - open frontend PR count is now `0`
5. old frontend issue disposition:
   - issue `#67` remains open during the migration window
   - it should be recreated or carried forward into the canonical monorepo tracker once the monorepo is canonical
   - only then should the old issue be closed with a pointer
6. overlap-window rule:
   - no planned `git subtree pull` refresh should occur after the initial import
   - any emergency frontend fix during overlap must land in the monorepo branch first
   - the old frontend repo must not become the only place a fix exists again

### Disposable dry-run import validation

To validate the import mechanics without touching the canonical worktree, a
disposable clone test was run on 2026-04-14.

1. backend dry-run base:
   - fetched `origin/main`
   - checked out a disposable branch from backend SHA `4d558c8c957d2df0809e3284a3e2eb5f4138da39`
2. frontend source validation:
   - `git ls-remote https://github.com/jerdaw/healtharchive-frontend.git refs/heads/main` returned the expected freeze SHA `c8fc28b8a8b047383460e767a809b9eb83f14df4`
3. validated import command:

   ```bash
   git subtree add --prefix=frontend frontend-origin main
   ```

4. result:
   - subtree import completed successfully
   - the resulting dry-run commit was `b28155ec` with message:
     - `Add 'frontend/' from commit 'c8fc28b8a8b047383460e767a809b9eb83f14df4'`
   - `frontend/package.json` and `../../frontend/README.md` were present
   - the dry-run worktree was clean after the import commit
5. important implementation note:
   - using the local frontend checkout as the subtree source was not reliable enough for the freeze SHA because that object was not present in the local clone's reachable refs
   - for the real import, prefer the canonical GitHub remote URL with a pre-verified `main` SHA rather than relying on the local frontend checkout as the subtree source

### Staged implementation status

The migration branch has progressed beyond planning into a validated staged
implementation. This section records the current technical state as of
2026-04-14.

1. frontend import:
   - the frontend tree has been staged into the backend repo under `frontend/`
   - critical split-repo path assumptions already updated:
     - `scripts/ci-e2e-smoke.sh` now prefers `frontend/` and keeps sibling fallback temporarily
     - `frontend/scripts/install-pre-push-hook.sh` now prefers the monorepo root `.venv`
     - `../../frontend/docs/development/dev-environment-setup.md` is monorepo-aware
2. backend docs tooling:
   - `scripts/check_docs_references.py` was narrowed to the backend-owned docs surface (`docs/**` plus repo-root markdown)
   - rationale: the imported frontend includes its own markdown corpus and should not break backend MkDocs validation by existing in-tree
3. monorepo root workflow surface now exists:
   - added root `.github/workflows/frontend-ci.yml`
   - added root `.github/workflows/production-smoke.yml`
   - updated root `.github/workflows/backend-ci.yml` so integrated e2e uses `frontend/` from the same checkout
   - updated root `.github/dependabot.yml` to cover npm updates in `/frontend`
   - removed the imported dead `frontend/.github/**` control-plane files so the monorepo has one canonical GitHub surface
   - added root `Makefile` targets:
     - `make backend-ci`
     - `make frontend-install`
     - `make contract-sync`
     - `make contract-check`
     - `make frontend-ci`
     - `make integration-e2e`
     - `make monorepo-ci`
   - frontend contract drift is now reduced by generating `frontend/src/lib/api-contract.generated.ts` from backend `docs/openapi.json`
4. validation completed on the staged import:
   - `make docs-refs`
   - `make docs-build`
   - `.venv/bin/python tests/test_active_docs_current_state.py`
   - `PATH=.tmp/node-v20.19.0-linux-x64/bin:$PATH make frontend-ci`
   - `PATH=.tmp/node-v20.19.0-linux-x64/bin:$PATH make integration-e2e`
5. local-environment caveats discovered during validation:
   - the current workspace default Node version is `18.19.1`, but the frontend requires `>=20.19.0`
   - frontend validation therefore used a temporary local Node `20.19.0` toolchain under `.tmp/`
   - direct local `pytest` runs with default capture in this workspace currently hit a capture-tempfile failure; targeted backend validation still succeeds with `-s`, so treat that as a local runtime issue until separately investigated

---

## Phase 0 execution checklist

Run these in order.

### A. Freeze and inventory

1. record backend default branch SHA
2. record frontend default branch SHA
3. record the exact frontend freeze SHA that will be imported
4. record the current backend and frontend ruleset states
5. record the current workflow names in both repos
6. record frontend GitHub environments and the latest visible deployment SHA/date for each non-empty environment

### B. Resolve old frontend GitHub work

1. decide the disposition of PR `#97`
2. decide the disposition of PR `#99`
3. decide how issue `#67` will be carried forward
4. write the overlap-window rule:
   - whether any `git subtree pull` refresh is allowed after import
5. decide whether any old-repo deployment surface is still allowed to run during the overlap window

### C. Define canonical monorepo GitHub policy

1. choose the canonical repo slug for phase 1
2. define the future required checks
3. define the future ruleset/bypass model
4. decide whether to introduce `CODEOWNERS`
5. decide which PR template survives and how it changes
6. decide how Dependabot will be merged

### D. Verify absence of hidden GitHub state

1. confirm repo secrets are still empty or intentionally absent
2. confirm repo variables are still empty or intentionally absent
3. confirm environment secrets/variables are still empty or intentionally absent
4. confirm there are no deploy keys or custom webhooks
5. confirm the frontend environments and deployment writers are understood:
   - `vercel[bot]` for `Preview` and `Production`
   - GitHub Pages for `github-pages`
6. retire Vercel `Preview`/`Production` integrations rather than re-home them
7. confirm the frontend `pages-build-deployment` workflow is not backing a live requirement and disable/remove the orphaned GitHub Pages state
8. confirm discussions remain disabled
9. confirm there are no releases/tags that need policy treatment

### E. Prepare retirement behavior for the old frontend repo

1. draft replacement README text that points to the monorepo
2. define when the old repo becomes read-only
3. define when the old repo gets archived
4. define where future issues/PRs should go once the old repo is frozen

---

## Suggested default dispositions from the current state

Based on the observed state, these are the defaults that currently look safest:

1. use the backend repo as the phase-1 canonical monorepo seed
2. import the frontend at a freeze point after resolving the two open Dependabot PRs by closure/defer, not by merge
3. carry forward frontend issue `#67` into the monorepo tracker later
4. create a fresh active monorepo `main` ruleset rather than copying frontend’s disabled model
5. add minimal `CODEOWNERS` in the monorepo
6. merge Dependabot configs into one root config with an `/frontend` npm entry
7. retire the old frontend repo’s Vercel `Preview`/`Production` integrations instead of re-homing them
8. disable or remove the orphaned GitHub Pages configuration before repo archival
9. keep the old frontend repo alive only long enough to support pointer/retirement behavior

---

## Execution update (2026-04-15)

Active-doc normalization continued after the subtree import staging work.

Completed in this pass:

1. rewrote the remaining active backend docs that still treated the frontend as a separate live repo
2. updated CI/branch-protection guidance to the monorepo workflow names and required-check target state
3. marked the old hosting/Vercel checklist as historical-only so it no longer reads like a current deploy path
4. added a minimal monorepo `.github/CODEOWNERS` and expanded the root PR template to cover backend, frontend, contract-sync, and integration gates
5. hardened backend pytest-driven make targets to use a repo-local temp directory, matching the frontend tempdir approach
6. updated the stale unmanaged-source scope-reconcile test so it no longer treats `cihr` as an unmanaged source after CIHR scope management was added

Intentional residue left in place:

1. `scripts/ci-e2e-smoke.sh` still accepts a legacy sibling frontend checkout path for older local layouts
2. `../../frontend/README.md`, `README.md`, and deployment docs still mention Vercel only as historical context
3. Docker tags and environment-file names still use `healtharchive-frontend` where that name is part of the runtime artifact, not a source-control boundary

Validation after this pass:

1. `make docs-refs`
2. `.venv/bin/python tests/test_active_docs_current_state.py`
3. `make docs-build`
4. `make backend-ci`
5. `PATH="/home/jer/repos/healtharchive/healtharchive-backend/.tmp/node-v20.19.0-linux-x64/bin:$PATH" make monorepo-ci`

---

## Cutover execution update (2026-04-15)

The app-repo cutover is now executed, not merely planned.

Completed:

1. canonical monorepo publication:
   - PR `#55` merged into `jerdaw/healtharchive-backend:main`
   - merge commit: `825275f9fd988a927edd2c9a5f6d701d7127f226`
2. canonical default-branch validation:
   - `Backend CI` run `24455307663` completed successfully on `main`
   - `Frontend CI` run `24455307709` completed successfully on `main`
   - `Workflow Lint` run `24455307681` completed successfully on `main`
   - `Deploy Documentation` run `24455307702` completed successfully on `main`
3. backend GitHub control-plane cutover:
   - backend repo description updated to `HealthArchive.ca monorepo – backend services, frontend app, and documentation hub`
   - backend repo homepage updated to `https://healtharchive.ca`
   - live ruleset `main-protection` (`12543570`) updated in place
   - required status checks now include:
     - `Backend CI / test`
     - `Backend CI / api-health`
     - `Frontend CI / contract-sync`
     - `Frontend CI / lint-and-test`
4. old frontend repo pointer-state execution:
   - old frontend repo description updated to mark it as historical
   - old frontend repo homepage updated to the canonical in-tree frontend path
   - pointer README committed and pushed on old frontend `main` at `adecd842b2b6f42ba7121dfdd93127aaade262ab`
   - old frontend repo intentionally remains unarchived during the stabilization window
5. issue carry-forward:
   - canonical follow-up issue created as `jerdaw/healtharchive-backend#59`
   - old frontend issue `jerdaw/healtharchive-frontend#67` closed with a pointer to `#59`
6. local workspace normalization:
   - backend checkout returned to clean `main` after merge
   - old frontend checkout is clean on `main` after the pointer README push

Phase-0 status after this execution:

1. app-repo monorepo canonicalization is complete
2. old frontend repo archival is intentionally deferred until after the observation window
3. host/server migration remains a separate later execution stream owned by the `platform-ops` cutover plan

---

## Exit criteria

Phase 0 is complete only when:

1. the frontend freeze SHA is chosen
2. the open frontend PR/issue disposition is explicit
3. the monorepo GitHub governance model is explicit
4. hidden GitHub state has been checked and either migrated, dropped, or documented
5. Vercel/GitHub Pages behavior on the old frontend repo has an explicit disposition before import begins
6. the old frontend repo retirement behavior is drafted before the source import begins

Status: satisfied on 2026-04-15 for the app-repo cutover path.
