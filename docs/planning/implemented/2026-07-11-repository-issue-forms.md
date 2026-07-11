# Repository Issue Forms Outcome

**Status:** Implemented in the repository on 2026-07-11. The issue chooser
remains branch content until this change is merged.

## Goal and scope

Add structured, public-safe GitHub bug and feature intake for the
HealthArchive monorepo, route specialized reports to canonical channels, and
align contributor and roadmap guidance with the repository features that are
actually enabled.

This batch covers this monorepo only. Coverage in repositories outside this
checkout remains unverified, so the cross-repository roadmap item stays open.

## Constraints preserved

- GitHub repository settings were not changed.
- Forms do not depend on labels, assignees, projects, or issue types.
- Public issue copy warns contributors not to include secrets, personal data,
  or personal health information.
- No external repositories or deployment surfaces were changed.

## Delivered

- `.github/ISSUE_TEMPLATE/bug_report.yml` collects the affected area,
  description, reproduction steps, expected and actual behavior, optional
  environment evidence, and public-safety confirmations.
- `.github/ISSUE_TEMPLATE/feature_request.yml` collects the user need,
  proposed outcome, alternatives, affected area, context, and confirmations.
- `.github/ISSUE_TEMPLATE/config.yml` disables blank issues and exposes only
  the two intended specialized report routes.
- `CONTRIBUTING.md`, `docs/tutorials/first-contribution.md`, and
  `docs/api-consumer-guide.md` now align public intake with the issue forms and
  contact page, with no remaining disabled GitHub Discussions routing.
- `docs/planning/roadmap.md` records the completed monorepo scope without
  claiming unverified coverage elsewhere.

## Canonical routing

- Security vulnerabilities:
  `https://github.com/jerdaw/healtharchive/security/advisories/new`
- Broken snapshots, metadata errors, missing coverage, or takedown requests:
  `https://healtharchive.ca/report`

## Contract coverage

`tests/test_repository_issue_forms.py` protects three repository contracts:

1. Both forms use supported top-level, field, attribute, ID, option, and
   required-validation shapes.
2. The chooser disables blank issues and contains exactly the intended private
   security and archived-content routes.
3. All three public guides contain no remaining Discussions routing.

The contract was developed red-green: it first collected and failed on the
missing form files, then passed after the forms and guidance were added.

## Validation evidence

- `pytest tests/test_repository_issue_forms.py -q`: `3 passed in 0.04s`.
- `make backend-ci`: formatting, Ruff, mypy, and `385 passed`; exit 0.
- `pre-commit run check-yaml --files .github/ISSUE_TEMPLATE/bug_report.yml
  .github/ISSUE_TEMPLATE/feature_request.yml
  .github/ISSUE_TEMPLATE/config.yml`: all three YAML files passed.
- `make prepush`: formatting, Ruff, mypy, `385 passed`, API smoke, dependency
  audit, and migration verification completed; exit 0.
- `make docs-coverage-strict`: exit 0.
- `make docs-build-strict`: strict MkDocs build completed; exit 0.
- `git diff --check`: exit 0 before archival.
- `make docs-check` after archival reached the reference checker and exited 1
  only for two pre-existing `docs/maintenance-audit.md` references to the
  intentionally absent frontend/.env.local and frontend/node_modules/
  local paths. The plan's two forward-reference errors were resolved by this
  move; coverage and strict build were therefore run separately as above.

## Remaining work

- Keep cross-repository template coverage open until those repositories are
  explicitly inspected and updated.
