from pathlib import Path

import pytest

TEMPLATE_DIR = Path(__file__).resolve().parents[1] / ".github" / "ISSUE_TEMPLATE"


@pytest.mark.parametrize(
    ("filename", "expected_name", "expected_headings"),
    [
        (
            "bug_report.md",
            "Bug report",
            [
                "## What happened?",
                "## Reproduction",
                "## Expected behavior",
                "## Affected surface",
                "## Environment",
                "## Additional context",
            ],
        ),
        (
            "feature_request.md",
            "Feature request",
            [
                "## Problem",
                "## Proposed outcome",
                "## Alternatives considered",
                "## Scope and compatibility",
                "## Validation",
            ],
        ),
    ],
)
def test_issue_template_contract(
    filename: str, expected_name: str, expected_headings: list[str]
) -> None:
    template = TEMPLATE_DIR / filename
    assert template.is_file(), f"missing issue template: {template}"

    content = template.read_text(encoding="utf-8")
    parts = content.split("---", maxsplit=2)
    assert len(parts) == 3 and parts[0] == "", "template must start with YAML frontmatter"

    frontmatter, body = parts[1], parts[2]
    assert f"name: {expected_name}" in frontmatter
    assert "about:" in frontmatter
    assert 'title: "' in frontmatter
    assert 'labels: ""' in frontmatter
    assert 'assignees: ""' in frontmatter

    for heading in expected_headings:
        assert heading in body

    assert "SECURITY.md" in body
    assert "secret" in body.lower()
    assert "private" in body.lower()
