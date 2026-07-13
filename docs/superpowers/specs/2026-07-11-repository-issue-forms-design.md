# Repository Issue Forms Design

**Date:** 2026-07-11

## Context

Roadmap item 5 calls for GitHub issue and pull-request templates across the
project repositories. This monorepo already has `.github/pull_request_template.md`
and detailed bug/feature guidance in `CONTRIBUTING.md`, but it has no
`.github/ISSUE_TEMPLATE/` directory. GitHub Issues are enabled for the
repository; GitHub Discussions are not, even though the contribution guide
contains five directions to that disabled feature.

Final branch review also verified through GitHub's repository API that private
vulnerability reporting is disabled. The root and frontend security policies
already name the working private email channel, so the design must not route
reporters to the unavailable advisory form or change that repository setting
implicitly.

GitHub's current issue-form documentation places YAML forms and the template
chooser configuration under `.github/ISSUE_TEMPLATE/`. Issue forms remain a
GitHub public-preview feature, so this batch uses only the documented core
schema and adds repository-side validation for the contract.

## Goal

Give contributors structured, public-safe bug and feature intake paths, direct
security and archived-content reports to the correct private/specialized
channels, and align contribution guidance with the repository's enabled GitHub
features.

## Non-goals

- Enabling GitHub Discussions, enabling private vulnerability reporting, or
  changing any other repository settings.
- Creating, renaming, or auto-applying labels, issue types, projects, or
  assignees.
- Changing the public `/report` intake behavior or the pull request template.
- Adding templates to repositories outside this checkout.
- Claiming the cross-repository roadmap item is fully complete.
- Adding GitHub Actions or third-party template-validation dependencies.

## Approaches Considered

### 1. GitHub issue forms plus chooser routing (selected)

Add one bug form, one feature form, and one chooser configuration. Derive form
questions from the existing contribution guide, and route security and
archived-content reports through contact links.

This gives contributors structured prompts and prevents public blank issues
without inventing project taxonomy. Maintainers retain GitHub's documented
maintainer-only blank-issue option.

### 2. Legacy Markdown templates

Markdown templates are stable and simple, but cannot require structured fields
or provide chooser-level contact links. The roadmap asks for useful intake
guidance, and the repository already has enough field definitions to use forms
without new product decisions.

### 3. Forms with automatic labels and assignments

Automatic triage could be useful, but the repository's current label inventory
and ownership policy are external mutable state. Adding assignments or labels
would create an unverified workflow dependency, so the forms leave those fields
unset.

## Bug Form Contract

The bug form uses the existing contribution-guide expectations:

- prominent Markdown warning that GitHub issues are public and must not contain
  secrets, personal data, or personal health information;
- explicit routing for vulnerabilities to the repository security policy,
  which provides the working private email channel, and for broken snapshots,
  metadata errors, missing coverage, and takedown requests to
  `https://healtharchive.ca/report`;
- affected area dropdown: backend API, crawler/archive tool, frontend/UI,
  documentation, CI/developer tooling, or other;
- required description, reproduction steps, expected behavior, and actual
  behavior;
- optional version/commit, environment, logs/screenshots, and additional
  context;
- required confirmation that the reporter searched existing issues and removed
  secrets, personal data, and personal health information.

The form sets a descriptive `[Bug]: ` title prefix but does not set labels,
assignees, projects, or issue type.

## Feature Form Contract

The feature form asks for:

- a prominent warning that feature issues are public and must not include
  secrets, personal data, or personal health information;
- the problem or user need;
- a proposed outcome;
- alternatives considered;
- affected area using the same public project areas;
- optional examples or additional context;
- required confirmation that existing issues were searched and the proposal
  contains no secrets, personal data, or personal health information.

It sets a `[Feature]: ` title prefix and likewise avoids automatic triage
metadata.

## Chooser Contract

`.github/ISSUE_TEMPLATE/config.yml` disables contributor blank issues and
provides two contact links:

- the stable GitHub security-policy page, which provides the working private
  email reporting channel without depending on private-vulnerability-reporting
  settings;
- the public HealthArchive.ca report form for broken snapshots, metadata
  errors, missing coverage, and takedown requests.

No Discussions link is shown because Discussions are disabled. Active public
guidance in `CONTRIBUTING.md`, the first-contribution tutorial, API consumer
guide, architecture walkthrough, and documentation-health guide replaces stale
Discussions directions contextually:

- feature and architecture proposals use the feature-request form;
- general questions use the existing public contact page;
- existing advice to seek feedback before large implementation work remains.

## Validation Strategy

Add a focused Python test that loads all three YAML files with the repository's
existing YAML dependency and asserts:

- both form files have non-empty `name`, `description`, `title`, and `body`;
- form top-level keys are limited to the documented core keys used here;
- body entries use supported core types, interactive IDs match GitHub's
  letter/number/hyphen/underscore syntax, and IDs are unique;
- each field type uses only its allowed keys and attributes;
- interactive fields have non-empty labels, dropdowns have non-empty string
  options, and checkboxes have non-empty options whose required confirmations
  are functional;
- expected required intake IDs exist and their `validations.required` values
  are true rather than merely present;
- no form declares labels, assignees, projects, or issue type;
- chooser keys are limited to `blank_issues_enabled` and `contact_links`, and
  blank issues are disabled;
- chooser contact links are exactly the two intended mappings, each contains
  only `name`, `url`, and `about`, and all three values are non-empty strings;
- the security-policy and public-report contact-link URLs match canonical URLs;
- both `SECURITY.md` and `frontend/SECURITY.md` name
  `security@healtharchive.ca` as the private reporting channel;
- active forms, chooser configuration, security policies, and contributor
  guidance do not contain the disabled advisory URL or claim that private
  vulnerability reporting is available;
- all five active public guidance files contain no remaining Discussions URL
  or intake instruction.

Run that focused test, backend parity, pre-commit YAML validation, strict docs
checks, and the repository pre-push gate. After pushing, hosted validation and
direct GitHub file readback confirm the branch contents; the chooser itself
will not become active until merge and must not be claimed live.

## Documentation Closeout

Update both security policies to identify the working email route. Update
`CONTRIBUTING.md` and the four active public guidance docs to describe the
available intake paths and replace disabled Discussions directions. Update
roadmap item 5 to state that monorepo issue and PR intake coverage is complete
while external repository coverage remains unverified. Archive the
implementation plan and update both planning indexes.

## Risk And Rollback

The primary risks are invalid form schema, a public or unavailable
security-report path, or guidance that points to a disabled feature. Focused
structure tests, YAML validation, and exact URL assertions cover these
boundaries. Rollback is limited to the issue-template directory, focused test,
security policies, public guidance files, and planning documentation.

## Reference

- [GitHub: Configuring issue templates for your repository](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [GitHub: Syntax for issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- [GitHub: Configuring private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
