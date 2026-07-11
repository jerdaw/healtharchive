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
  `docs/api-consumer-guide.md`, `docs/tutorials/architecture-walkthrough.md`,
  and `docs/meta/documentation-health.md` no longer route to disabled GitHub
  Discussions.
- Root and frontend `SECURITY.md` policies use the same private email channel.
- `docs/planning/roadmap.md` records the completed monorepo scope without
  claiming unverified coverage elsewhere.

## Canonical routing

- Issue chooser security destination:
  `https://github.com/jerdaw/healtharchive/security/policy`
- Actual private security report channel: `security@healtharchive.ca`
- Broken snapshots, metadata errors, missing coverage, or takedown requests:
  `https://healtharchive.ca/report`

## Contract coverage

`tests/test_repository_issue_forms.py` protects four repository contracts:

1. Both forms use supported top-level, field, attribute, ID, option, and
   required-validation shapes.
2. The chooser disables blank issues and contains exactly the policy and
   archived-content destinations.
3. Active security guidance uses the policy URL, both security policies name
   the private email, and no active guide uses the disabled advisory URL.
4. All five public guidance files contain no Discussions routing.

The forms contract was developed red-green on the missing files. The security
contract also failed on this record's stale advisory URL before it was fixed.

## Validation evidence

- `pytest tests/test_repository_issue_forms.py -q`: `4 passed`.
- `make backend-ci`: formatting, Ruff, mypy, and `385 passed`; exit 0.
- `make docs-coverage-strict`: exit 0.
- `make docs-build-strict`: strict MkDocs build completed; exit 0.
- `git diff --check`: exit 0.
- `make docs-check` still exits 1 only for two pre-existing
  `docs/maintenance-audit.md` references to the
  intentionally absent frontend/.env.local and frontend/node_modules/
  local paths; coverage and strict build pass independently as above.

## Remaining work

- Keep cross-repository template coverage open until those repositories are
  explicitly inspected and updated.
