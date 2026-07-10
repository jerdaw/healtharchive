# GitHub Actions Free-Tier Policy Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close roadmap item 25c by enforcing and documenting the existing low-noise workflow policy while limiting failure-artifact storage to three days.

**Architecture:** A focused Python policy test parses all seven workflow files with PyYAML and protects trigger, concurrency, required-check-name, and retention invariants. The production workflow change is limited to one `retention-days` value; canonical testing docs and the PR template explain why required workflows remain broad and which manual lanes provide escalation.

**Tech Stack:** GitHub Actions YAML, Python 3.11+, pytest, PyYAML, Markdown.

## Global Constraints

- Preserve the four exact ruleset-required check names.
- Do not add path filters to required backend/frontend workflows.
- Keep automatic workflows cancellable and manual safety workflows non-cancellable.
- Keep every workflow manually dispatchable.
- Do not run production smoke, deploy, publish, or modify repository rulesets.
- Keep private operational configuration outside public documentation.

---

### Task 1: Encode And Apply The Workflow Policy

**Files:**
- Create: `tests/test_ci_workflow_policy.py`
- Modify: `.github/workflows/backend-ci.yml`

**Interfaces:**
- Consumes: all `.github/workflows/*.yml` files
- Produces: pytest policy coverage and a three-day e2e failure-artifact lifetime

- [ ] **Step 1: Write the policy test**

Create a test that loads YAML with `yaml.BaseLoader`, asserts
`workflow_dispatch` exists in every workflow, verifies automatic and
manual-only concurrency policy, verifies the four required job display names,
and requires each upload-artifact step to use one through three retention days.

```python
from pathlib import Path

import yaml


WORKFLOWS = Path(__file__).parents[1] / ".github" / "workflows"
AUTOMATIC = {
    "backend-ci.yml",
    "docs.yml",
    "frontend-ci.yml",
    "platform-ops-integration.yml",
    "workflow-lint.yml",
}
MANUAL_ONLY = {"backend-ci-full.yml", "production-smoke.yml"}
REQUIRED_JOBS = {
    "backend-ci.yml": {"Backend CI / test", "Backend CI / api-health"},
    "frontend-ci.yml": {
        "Frontend CI / contract-sync",
        "Frontend CI / lint-and-test",
    },
}


def load_workflow(name: str) -> dict:
    return yaml.load(
        (WORKFLOWS / name).read_text(encoding="utf-8"),
        Loader=yaml.BaseLoader,
    )
```

The artifact assertion must locate steps whose `uses` starts with
`actions/upload-artifact@` and convert `with.retention-days` to `int` before
asserting `1 <= retention_days <= 3`.

- [ ] **Step 2: Prove the test fails on missing retention**

Run:

```bash
python -m pytest -q tests/test_ci_workflow_policy.py
```

Expected: FAIL identifying the e2e artifact upload in `backend-ci.yml` as
missing `retention-days`.

- [ ] **Step 3: Add the minimal workflow change**

Add this to the existing e2e failure upload's `with` block:

```yaml
retention-days: 3
```

- [ ] **Step 4: Prove the policy test passes**

Run: `python -m pytest -q tests/test_ci_workflow_policy.py`

Expected: all policy tests pass.

- [ ] **Step 5: Commit the policy guard**

```bash
git add .github/workflows/backend-ci.yml tests/test_ci_workflow_policy.py
git commit -m "ci: enforce free-tier workflow policy"
```

### Task 2: Document The Reviewed CI Matrix

**Files:**
- Modify: `docs/development/testing-guidelines.md`
- Modify: `docs/development/test-coverage.md`
- Modify: `.github/pull_request_template.md`

**Interfaces:**
- Consumes: the enforced policy from Task 1 and active ruleset evidence
- Produces: accurate local/CI guidance without private operational details

- [ ] **Step 1: Add the workflow policy matrix**

Document these decisions in `testing-guidelines.md`:

| Workflow class | Trigger policy | Concurrency policy | Reason |
| --- | --- | --- | --- |
| Required backend/frontend | push/PR to `main` plus manual | cancel superseded | exact status contexts protect `main`; cross-boundary changes stay covered |
| Docs/platform/workflow lint | narrowest existing safe trigger plus manual | cancel superseded | avoid obsolete validation/deploy runs |
| Full backend/production smoke | manual only | never auto-cancel | operator-started escalation must finish |

State that failure artifacts expire after three days and that changing required
job names or adding path filters requires a coordinated ruleset change.

- [ ] **Step 2: Correct the coverage guide**

Change the full backend CI `When it runs` cell from `nightly schedule, manual
dispatch` to `manual dispatch` and remove other nightly claims for that workflow.

- [ ] **Step 3: Tighten PR evidence guidance**

Add checklist items requiring `make prepush` for broad readiness and noting that
`make check-full` and production smoke are explicit escalation lanes, not
routine per-commit checks.

- [ ] **Step 4: Run focused documentation checks**

```bash
make docs-refs
make docs-coverage-strict
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit canonical documentation**

```bash
git add .github/pull_request_template.md docs/development/testing-guidelines.md docs/development/test-coverage.md
git commit -m "docs: record free-tier CI workflow policy"
```

### Task 3: Close The Backlog Item And Verify

**Files:**
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Move: `docs/planning/2026-07-10-ci-free-tier-policy-closeout.md` to `docs/planning/implemented/2026-07-10-ci-free-tier-policy-closeout.md`

**Interfaces:**
- Consumes: completed policy and documentation work
- Produces: a clean future backlog and dated implementation record

- [ ] **Step 1: Remove roadmap item 25c**

Delete the completed free-tier resilience item from the future roadmap. Do not
remove unrelated advisory or secret-scan follow-ups.

- [ ] **Step 2: Archive this plan**

Mark all checkboxes complete, add exact verification evidence, move this file
to `docs/planning/implemented/`, remove it from the active-plan list, and add it
to `docs/planning/implemented/README.md`.

- [ ] **Step 3: Run focused policy and workflow validation**

```bash
python -m pytest -q \
  tests/test_ci_workflow_policy.py \
  tests/test_ci_migration_guard.py \
  tests/test_ci_schema_parity.py
```

Expected: all tests pass. The pinned GitHub `Workflow Lint` job will run
`actionlint`; the local workspace intentionally has no actionlint/Go toolchain.

- [ ] **Step 4: Run complete local validation**

```bash
make backend-ci
make docs-check
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 5: Commit closeout evidence**

```bash
git add docs/planning/roadmap.md docs/planning/README.md docs/planning/implemented
git commit -m "docs: close free-tier CI roadmap item"
```

- [ ] **Step 6: Verify the clean committed tree**

Re-run Task 3 Steps 3 and 4, then confirm `git status --short --branch` is clean.
