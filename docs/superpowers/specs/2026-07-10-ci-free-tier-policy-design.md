# GitHub Actions Free-Tier Policy Closeout Design

## Context

Roadmap item 25c asks for a focused review of workflow triggers,
concurrency, artifact retention, manual-dispatch lanes, and local parity while
keeping deployable changes protected. The repository ruleset currently requires
these exact checks on `main`:

- `Backend CI / test`
- `Backend CI / api-health`
- `Frontend CI / contract-sync`
- `Frontend CI / lint-and-test`

The existing workflow structure already separates fast automatic checks from
manual full and production-smoke checks. Automatic workflows cancel superseded
runs; manual safety workflows do not. The only stored CI artifact is an e2e
failure bundle, and it has no explicit retention limit. Documentation describes
the local gates but does not record the reviewed workflow policy, and the
coverage guide incorrectly describes the full backend workflow as nightly.

## Decision

Complete the roadmap item as a policy closeout, not a workflow redesign:

1. Keep backend and frontend required-check workflows on all pushes and pull
   requests to `main`. Path-filtering them could leave ruleset-required checks
   absent or pending, and backend/frontend contract coupling makes broad
   coverage intentional.
2. Keep `cancel-in-progress: true` for automatic validation/deployment
   workflows so obsolete commits stop consuming minutes.
3. Keep `cancel-in-progress: false` for manual full-backend and production-smoke
   workflows so an operator-started safety run is not silently displaced.
4. Keep `workflow_dispatch` on every workflow. `backend-ci-full.yml` and
   `production-smoke.yml` remain manual-only escalation lanes.
5. Set the e2e failure artifact to a three-day retention period. It is useful
   for immediate debugging but does not justify long-lived free-tier storage.
6. Add a repository test that parses every workflow and enforces the reviewed
   manual-dispatch, concurrency, required-check identity, and artifact-retention
   invariants.
7. Document the matrix in the testing guide and PR template, correct the stale
   coverage guide, and archive roadmap item 25c as implemented.

No workflow, job, or required-check name changes in this batch.

## Alternatives Considered

1. **Policy closeout with a retention guard (selected).** Small, testable, and
   compatible with the active ruleset while closing the documented review.
2. **Path-filter backend/frontend workflows.** Could save more minutes on
   docs-only changes, but risks missing required check contexts and obscuring
   cross-boundary contract changes.
3. **Collapse workflows or share build artifacts across jobs.** May reduce
   duplicate setup work, but changes failure isolation and required-check
   topology without measured cost evidence.

## Components

### Workflow policy test

`tests/test_ci_workflow_policy.py` will load workflow YAML with
`yaml.BaseLoader` so YAML 1.1 boolean coercion does not turn the `on` key into a
boolean. It will assert:

- every workflow supports manual dispatch;
- automatic workflows cancel superseded runs;
- manual-only safety workflows do not cancel in progress;
- the four ruleset-required job display names remain exact;
- every `actions/upload-artifact` step sets `retention-days` from 1 through 3.

### Workflow change

Only `.github/workflows/backend-ci.yml` changes behavior, adding
`retention-days: 3` to the failure artifact upload. Trigger and concurrency
review results are captured in tests and docs without churn to working YAML.

### Documentation

- `docs/development/testing-guidelines.md` gains a concise workflow-policy
  matrix and explains why required workflows are not path-filtered.
- `.github/pull_request_template.md` makes local `make prepush` evidence
  explicit and distinguishes manual escalation lanes.
- `docs/development/test-coverage.md` changes the inaccurate
  `nightly schedule, manual dispatch` wording to `manual dispatch`.
- the completed implementation plan moves to `docs/planning/implemented/`, and
  roadmap item 25c is removed from the future backlog.

## Validation

- Prove the new policy test fails before retention is configured.
- Add the three-day retention value and prove the policy test passes.
- Run the existing CI schema/migration tests with the new policy test.
- Parse all workflows through the new PyYAML policy test locally. The current
  workspace has no `actionlint` or Go toolchain, so the existing pinned
  `workflow-lint.yml` job remains the authoritative actionlint check on the PR;
  do not install an unpinned replacement solely for this batch.
- Run `make backend-ci`, documentation checks, and `git diff --check` on the
  committed tree.

## Completion Criteria

- Required check identities and broad automatic triggers remain intact.
- Automatic and manual concurrency choices are enforced by tests.
- CI failure artifacts expire after three days.
- Testing and PR guidance describe the reviewed free-tier policy accurately.
- Roadmap item 25c no longer appears as future work.
