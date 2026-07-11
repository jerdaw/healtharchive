# Cross-Repo Issue Templates Implementation Plan

**Status:** Implemented 2026-07-10

**Goal:** Add tested, public-safe bug and feature issue templates to the current
HealthArchive app and datasets repositories.

**Design:** `../../superpowers/specs/2026-07-10-cross-repo-issue-templates-design.md`

## Task 1: Add app issue templates and tests

**Files:**

- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `tests/test_github_issue_templates.py`
- Modify: `CONTRIBUTING.md`

Add app-specific reproduction/surface/environment prompts, public security and
secret-removal guidance, contribution links, and a focused pytest contract.

## Task 2: Add datasets issue templates and tests

**Files in `healtharchive-datasets`:**

- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `tests/test_github_issue_templates.py`
- Modify: `CONTRIBUTING.md`

Add release/artifact/integrity prompts, metadata-only and immutability
constraints, contribution links, and a stdlib unittest contract.

## Task 3: Validate each repository

1. Run focused tests in both repos.
2. Run app backend/docs checks proportionate to the touched files.
3. Run the datasets `make check` gate.
4. Run commit file-quality/private-key and secret checks.

## Task 4: Close app roadmap truth

**Files:**

- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive this plan under `docs/planning/implemented/`

Record both validated PRs and remove item #5 only after current app and datasets
repository coverage is complete.

## Task 5: Publish and verify

1. Commit/push the datasets branch and open/read back its PR against `main`.
2. Record that PR in the app completion evidence.
3. Commit/push the app branch and open/read back its stacked PR.
4. Report hosted checks without changing repository settings or opening issues.

## Completion Record

- Confirmed the current repository boundary after monorepo consolidation: the
  app repo owns backend/frontend issues, and the datasets repo owns release
  artifact/integrity issues. Both already had pull-request templates and lacked
  issue templates.
- Added app bug/feature templates with reproduction, affected-surface,
  compatibility, validation, security-routing, and secret/private-data prompts.
- Added datasets bug/feature templates with release/artifact,
  checksum/manifest, metadata-only, compatibility/immutability,
  security-routing, and unpublished-data prompts.
- Kept labels and assignees empty, left blank issues enabled by default, and did
  not change repository settings or security policy.
- Initial RED in each repo: both focused contracts failed for the two missing
  templates. GREEN: two app pytest cases and two datasets unittest cases passed.
- App `make test-fast` passed 385 tests with the repository's documented
  Starlette/httpx deprecation warning; the focused template tests passed
  separately. Strict documentation coverage and MkDocs build passed.
- Datasets `make check` passed Ruff format/lint, Python compilation, four
  unittests (including release-bundle validation), and docs references after a
  single import-layout lint fix.
- Updated both contribution guides with direct template links and public-safe
  security/privacy guidance.
- Datasets PR [#11](https://github.com/jerdaw/healtharchive-datasets/pull/11)
  is open and mergeable against `main`; hosted datasets CI started after PR
  creation.
- Removed completed roadmap item #5 only after both repositories had validated,
  pushed branches. No issue, release, tag, label, assignee, or deployment was
  created.
