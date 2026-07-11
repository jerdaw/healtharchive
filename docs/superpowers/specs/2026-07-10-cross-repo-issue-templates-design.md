# Cross-Repo Issue Templates Design

**Status:** Approved by standing autonomous-work authorization

**Date:** 2026-07-10

## Problem

HealthArchive roadmap item #5 asks for issue and pull-request templates across
the project repositories. The current app monorepo and datasets repo both have
pull-request templates, but neither has issue templates. Contributors therefore
receive no structured prompts for reproduction, affected artifacts,
compatibility, public-data boundaries, or removal of secrets/private
operational detail.

The historical “backend and frontend repos” are now one app monorepo, so the
current repository set for this item is:

1. `jerdaw/healtharchive` (backend + frontend monorepo)
2. `jerdaw/healtharchive-datasets` (metadata-only release repo)

## Goals

1. Add bug-report and feature-request templates to both current repositories.
2. Keep prompts repository-specific and public-safe.
3. Route vulnerability reporters to each repo's existing `SECURITY.md` without
   asking them to disclose vulnerabilities in public issues.
4. Warn reporters not to paste tokens, environment values, private hostnames,
   private paths, or unpublished data.
5. Preserve blank issues rather than introducing a new issue-intake policy.
6. Add stdlib-only regression tests for frontmatter and required sections.
7. Link the templates from each contribution guide.
8. Close roadmap item #5 only after both repos have validated branches and PRs.

## Non-Goals

- Add labels, assignees, projects, or triage automation that may not exist.
- Disable blank issues.
- Add GitHub Issue Forms or a YAML-schema dependency.
- Change pull-request templates.
- Create a security advisory, collect vulnerability details, or modify security
  policy.
- Define service-level response promises.

## Template Choice

Use classic Markdown templates under `.github/ISSUE_TEMPLATE/`:

- `bug_report.md`
- `feature_request.md`

Each uses minimal GitHub frontmatter with `name`, `about`, a conventional title
prefix, and empty labels/assignees. Markdown is portable, reviewable, and does
not require a new form-schema validator.

## App Templates

The app bug template asks for:

- observed behavior and reproduction;
- expected behavior;
- affected surface (backend, frontend, crawler/indexing, docs, other);
- version/commit and local environment;
- bounded logs/screenshots with a secret-removal confirmation.

The app feature template asks for problem, proposed outcome, alternatives,
affected surface, compatibility/API/data implications, and validation ideas.

## Datasets Templates

The datasets bug template focuses on release tag/artifact, checksums/manifests,
validation command, expected integrity behavior, and environment. It explicitly
prohibits unpublished/private data.

The datasets feature template asks for research/reproducibility need, proposed
metadata-only outcome, release-format or immutability implications,
alternatives, and validation.

## Test Contract

Add one repository-native test file per repo. Tests use only `pathlib`, pytest
in the app, and `unittest` in datasets. They require:

- both template files exist;
- frontmatter opens/closes and declares expected name/about/title;
- labels and assignees remain empty;
- security/private-data guidance is present;
- expected repo-specific sections are present.

Syntax is additionally covered by the existing pre-commit YAML/frontmatter
file-quality hooks where applicable; no new runtime dependency is added.

## Documentation And Roadmap

Update each `CONTRIBUTING.md` with direct GitHub “new issue with template” links
and a short security/privacy warning. In the app repo, archive one implementation
plan and remove roadmap item #5 after both repos pass validation and have PRs.

## Validation

- App: focused issue-template test, backend fast test gate as proportionate,
  strict docs checks for planning/contribution links, and hooks.
- Datasets: `make check` and hooks.
- In both repos: review base-to-head diffs, whitespace, private-key, and secret
  scans before push.

## Delivery

Use one branch/PR per repository. The app PR is stacked on the current
HealthArchive docs series because it updates the same planning indexes; the
datasets PR targets `main` independently. No issue is opened and no repository
settings are changed by this batch.
