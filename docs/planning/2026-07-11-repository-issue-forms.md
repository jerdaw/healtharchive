# Repository Issue Forms Implementation Plan

> **For implementers:** Use `superpowers:subagent-driven-development` to
> execute each task with implementer and specification/quality review. Follow
> the approved design in
> `docs/superpowers/specs/2026-07-11-repository-issue-forms-design.md` and use
> `superpowers:test-driven-development` for the repository contract.

**Goal:** Add structured, public-safe GitHub bug and feature forms, route
specialized reports correctly, and reconcile contribution and roadmap guidance
with the repository's enabled features.

**Architecture:** Keep the forms as declarative repository metadata under
`.github/ISSUE_TEMPLATE/`. Protect their schema and routing contract with one
focused Python test using the existing YAML dependency. Do not couple the
forms to mutable GitHub labels, assignees, projects, issue types, or settings.

**Tech stack:** GitHub issue-form YAML, Python, pytest, PyYAML, Markdown.

**Global constraints:** Change only this monorepo; do not change GitHub
settings or external repositories. Use exactly
`https://github.com/jerdaw/healtharchive/security/advisories/new` for private
security reports and `https://healtharchive.ca/report` for archived-content
reports. Do not add labels, assignees, projects, or issue types. Keep public
files free of secrets, private infrastructure details, personal data, and
personal health information. Do not claim the chooser is live before merge.

---

## Task 1: Add and validate the repository intake forms

**Files:**

- Create: `tests/test_repository_issue_forms.py`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Write the failing repository contract test**

Create `tests/test_repository_issue_forms.py` with the following contract
(minor refactoring is acceptable, but preserve every assertion):

```python
from pathlib import Path
import re
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / ".github" / "ISSUE_TEMPLATE"
FORM_NAMES = ("bug_report.yml", "feature_request.yml")
ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
FORM_KEYS = {"name", "description", "title", "body"}
FIELD_KEYS = {
    "markdown": {"type", "attributes"},
    "input": {"type", "id", "attributes", "validations"},
    "textarea": {"type", "id", "attributes", "validations"},
    "dropdown": {"type", "id", "attributes", "validations"},
    "checkboxes": {"type", "id", "attributes", "validations"},
}
ATTRIBUTE_KEYS = {
    "markdown": {"value"},
    "input": {"label", "description", "placeholder", "value"},
    "textarea": {"label", "description", "placeholder", "value", "render"},
    "dropdown": {"label", "description", "options", "multiple"},
    "checkboxes": {"label", "description", "options"},
}
REQUIRED_FIELDS = {
    "bug_report.yml": {"area", "description", "steps", "expected", "actual"},
    "feature_request.yml": {"problem", "proposal", "area"},
}
EXPECTED_LINKS = [
    {
        "name": "Report a security vulnerability privately",
        "url": "https://github.com/jerdaw/healtharchive/security/advisories/new",
        "about": "Do not report security vulnerabilities in a public issue.",
    },
    {
        "name": "Report an archived-content issue",
        "url": "https://healtharchive.ca/report",
        "about": (
            "Report broken snapshots, metadata errors, missing coverage, or "
            "takedown requests."
        ),
    },
]


def load_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    return data


def test_issue_forms_follow_the_supported_contract() -> None:
    for name in FORM_NAMES:
        form = load_yaml(TEMPLATE_DIR / name)
        assert set(form) == FORM_KEYS
        assert all(isinstance(form[key], str) and form[key].strip() for key in FORM_KEYS - {"body"})
        assert isinstance(form["body"], list) and form["body"]

        ids: list[str] = []
        by_id: dict[str, dict[str, Any]] = {}
        for field in form["body"]:
            assert isinstance(field, dict)
            field_type = field.get("type")
            assert field_type in FIELD_KEYS
            assert set(field) <= FIELD_KEYS[field_type]
            attributes = field.get("attributes")
            assert isinstance(attributes, dict)
            assert set(attributes) <= ATTRIBUTE_KEYS[field_type]

            if field_type == "markdown":
                assert isinstance(attributes.get("value"), str)
                assert attributes["value"].strip()
                continue

            field_id = field.get("id")
            assert isinstance(field_id, str) and ID_PATTERN.fullmatch(field_id)
            ids.append(field_id)
            by_id[field_id] = field
            assert isinstance(attributes.get("label"), str)
            assert attributes["label"].strip()
            validations = field.get("validations", {})
            assert isinstance(validations, dict)
            assert set(validations) <= {"required"}
            if "required" in validations:
                assert isinstance(validations["required"], bool)

            if field_type == "dropdown":
                options = attributes.get("options")
                assert isinstance(options, list) and options
                assert all(isinstance(option, str) and option.strip() for option in options)
            if field_type == "checkboxes":
                options = attributes.get("options")
                assert isinstance(options, list) and options
                for option in options:
                    assert isinstance(option, dict)
                    assert set(option) == {"label", "required"}
                    assert isinstance(option["label"], str) and option["label"].strip()
                    assert option["required"] is True

        assert len(ids) == len(set(ids))
        for field_id in REQUIRED_FIELDS[name]:
            assert by_id[field_id]["validations"]["required"] is True


def test_issue_chooser_uses_only_the_intended_routes() -> None:
    config = load_yaml(TEMPLATE_DIR / "config.yml")
    assert set(config) == {"blank_issues_enabled", "contact_links"}
    assert config["blank_issues_enabled"] is False
    assert config["contact_links"] == EXPECTED_LINKS
    assert all(set(link) == {"name", "url", "about"} for link in config["contact_links"])
    assert all(
        isinstance(value, str) and value.strip()
        for link in config["contact_links"]
        for value in link.values()
    )


def test_contribution_guide_does_not_route_to_disabled_discussions() -> None:
    text = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
    assert "discussion" not in text.casefold()
```

- [ ] **Step 2: Prove RED**

Run:

```bash
pytest tests/test_repository_issue_forms.py -q
```

Expected: failure at the missing `.github/ISSUE_TEMPLATE/bug_report.yml`; the
test itself must collect successfully.

- [ ] **Step 3: Add the bug form**

Create `.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug report
description: Report a reproducible problem with HealthArchive
title: "[Bug]: "
body:
  - type: markdown
    attributes:
      value: |
        GitHub issues are public. Do not include secrets, personal data, or personal health information.

        Report security vulnerabilities privately at https://github.com/jerdaw/healtharchive/security/advisories/new.
        Report broken snapshots, metadata errors, missing coverage, or takedown requests at https://healtharchive.ca/report.
  - type: dropdown
    id: area
    attributes:
      label: Affected area
      options:
        - Backend API
        - Crawler and archive tooling
        - Frontend and public website
        - Documentation
        - CI and developer tooling
        - Other
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
      description: Clearly describe the problem.
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: Provide the smallest reliable sequence that demonstrates the problem.
      placeholder: |
        1. Run or open ...
        2. Select or enter ...
        3. Observe ...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Version or commit
      description: Provide a release, branch, or commit if known.
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Include relevant operating system, browser, Python, or Node.js versions.
  - type: textarea
    id: logs
    attributes:
      label: Logs or screenshots
      description: Remove secrets and personal information before sharing public evidence.
  - type: textarea
    id: context
    attributes:
      label: Additional context
  - type: checkboxes
    id: confirmations
    attributes:
      label: Confirmations
      options:
        - label: I searched existing issues for the same problem.
          required: true
        - label: I removed secrets, personal data, and personal health information.
          required: true
```

- [ ] **Step 4: Add the feature form**

Create `.github/ISSUE_TEMPLATE/feature_request.yml`:

```yaml
name: Feature request
description: Propose an improvement to HealthArchive
title: "[Feature]: "
body:
  - type: markdown
    attributes:
      value: |
        GitHub issues are public. Do not include secrets, personal data, or personal health information.
  - type: textarea
    id: problem
    attributes:
      label: Problem or user need
      description: Explain who is affected and what they cannot do today.
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed outcome
      description: Describe the result you would like, without requiring a specific implementation.
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
  - type: dropdown
    id: area
    attributes:
      label: Affected area
      options:
        - Backend API
        - Crawler and archive tooling
        - Frontend and public website
        - Documentation
        - CI and developer tooling
        - Other
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Examples or additional context
      description: Add public-safe examples, references, or mockups if helpful.
  - type: checkboxes
    id: confirmations
    attributes:
      label: Confirmations
      options:
        - label: I searched existing issues for a similar proposal.
          required: true
        - label: I removed secrets, personal data, and personal health information.
          required: true
```

- [ ] **Step 5: Add the chooser routing**

Create `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Report a security vulnerability privately
    url: https://github.com/jerdaw/healtharchive/security/advisories/new
    about: Do not report security vulnerabilities in a public issue.
  - name: Report an archived-content issue
    url: https://healtharchive.ca/report
    about: Report broken snapshots, metadata errors, missing coverage, or takedown requests.
```

- [ ] **Step 6: Reconcile all contribution-guide routes**

Make these five contextual replacements in `CONTRIBUTING.md`:

1. Quick-start “Ask questions” -> `[contact page](https://healtharchive.ca/contact)`.
2. Rename “Feature Discussion” to “Feature Proposals”; replace “Use
   Discussions” with the feature-request issue form while retaining feedback,
   issue creation, and incremental-PR guidance.
3. Architecture step “Open a Discussion” -> open a feature request and get
   feedback early.
4. General questions table row -> public contact page; bug and feature rows ->
   their named structured forms in the GitHub issue chooser.
5. Final “Questions?” Discussions link -> public contact page.

Add a short paragraph before each existing bug/feature field list explaining
that the structured GitHub form supplies those prompts. State near bug intake
that security reports must use private vulnerability reporting and
archived-content problems must use `https://healtharchive.ca/report`.

- [ ] **Step 7: Prove GREEN and validate YAML**

Run:

```bash
pytest tests/test_repository_issue_forms.py -q
pre-commit run check-yaml --files \
  .github/ISSUE_TEMPLATE/bug_report.yml \
  .github/ISSUE_TEMPLATE/feature_request.yml \
  .github/ISSUE_TEMPLATE/config.yml
make backend-ci
git diff --check
```

Expected: all commands exit 0. Review `git diff -- CONTRIBUTING.md
.github/ISSUE_TEMPLATE tests/test_repository_issue_forms.py` for exact routes,
public-safe wording, and no unrelated changes.

- [ ] **Step 8: Commit Task 1**

```bash
git add .github/ISSUE_TEMPLATE CONTRIBUTING.md tests/test_repository_issue_forms.py
git commit -m "chore: add repository issue forms"
```

## Task 2: Close the documented monorepo scope and verify the branch

**Files:**

- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/README.md`
- Move: `docs/planning/2026-07-11-repository-issue-forms.md` to
  `docs/planning/implemented/2026-07-11-repository-issue-forms.md`
- Modify: `docs/planning/implemented/README.md`

- [ ] **Step 1: Update the roadmap without overclaiming**

Replace item 5 with wording equivalent to:

```markdown
5. **Add GitHub issue and PR templates across repos** (S: 2-3h) -
   this monorepo now has structured bug and feature issue forms, specialized
   report routing, and PR guidance. Coverage in repositories outside this
   checkout remains unverified.
```

Do not mark the cross-repository item complete or edit items 3, 4, or 7.

- [ ] **Step 2: Run final local validation before recording it**

```bash
pytest tests/test_repository_issue_forms.py -q
make docs-check
make prepush
git diff --check
git status --short --branch
```

Expected: every command exits 0, the focused suite reports three passing tests,
and status contains only this batch's intended files.

- [ ] **Step 3: Archive the plan and indexes with actual evidence**

Compress this plan to a 40–80 line outcome record at
`docs/planning/implemented/2026-07-11-repository-issue-forms.md`. Preserve:
goal/scope, constraints, delivered files and routes, the three focused contract
tests, exact successful validation commands/results, and the fact that external
repository coverage remains unverified.

Remove the active-plan entry from `docs/planning/README.md`, add a concise
implemented-history entry there, and add the dated filename to
`docs/planning/implemented/README.md`.

- [ ] **Step 4: Re-run documentation integrity and commit closeout**

```bash
make docs-check
git diff --check
git diff -- docs/planning
git add docs/planning
git commit -m "docs: record repository issue form coverage"
```

Expected: checks exit 0 and the planning diff contains no private operations
details or claim that the chooser is live.

- [ ] **Step 5: Review, push, and open the ready pull request**

Use the repository review skill before integration. Resolve any validated
findings, re-run affected checks, then:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
git diff --check origin/main...HEAD
git push -u origin codex/repository-issue-forms
gh pr create \
  --base main \
  --head codex/repository-issue-forms \
  --title "chore: add repository issue forms" \
  --body "## Summary

- add validated bug and feature issue forms
- route security and archived-content reports to their canonical channels
- reconcile contribution and roadmap guidance with enabled repository features

## Validation

- \`pytest tests/test_repository_issue_forms.py -q\`
- \`make backend-ci\`
- \`make docs-check\`
- \`make prepush\`

## Scope

This PR covers the HealthArchive monorepo only. Coverage in repositories outside this checkout remains unverified."
```

The PR body must summarize forms/routing, documentation truth maintenance, and
exact validation; it must state that external-repository coverage is not part
of this PR.

- [ ] **Step 6: Verify hosted checks and branch readback**

```bash
gh pr checks --watch
gh pr view --json url,isDraft,mergeable,mergeStateStatus,headRefOid,statusCheckRollup
for path in bug_report.yml feature_request.yml config.yml; do
  gh api "repos/jerdaw/healtharchive/contents/.github/ISSUE_TEMPLATE/$path?ref=codex/repository-issue-forms" \
    --jq .content | base64 --decode >/tmp/"$path"
  test -s /tmp/"$path"
  cmp ".github/ISSUE_TEMPLATE/$path" /tmp/"$path"
done
```

Expected: all required hosted jobs succeed; the PR is ready, mergeable, and
clean; `headRefOid` matches local `HEAD`; all three branch files read back as
byte-for-byte matches. Report branch/PR readiness only—the chooser is not live
until merge.
