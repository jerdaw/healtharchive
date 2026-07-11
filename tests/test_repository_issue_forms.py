import re
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / ".github" / "ISSUE_TEMPLATE"
FORM_NAMES = ("bug_report.yml", "feature_request.yml")
PUBLIC_GUIDES = (
    "CONTRIBUTING.md",
    "docs/tutorials/first-contribution.md",
    "docs/api-consumer-guide.md",
    "docs/tutorials/architecture-walkthrough.md",
    "docs/meta/documentation-health.md",
)
SECURITY_POLICIES = ("SECURITY.md", "frontend/SECURITY.md")
ACTIVE_SECURITY_GUIDES = (
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    *SECURITY_POLICIES,
    "CONTRIBUTING.md",
    "docs/planning/implemented/2026-07-11-repository-issue-forms.md",
)
SECURITY_POLICY_URL = "https://github.com/jerdaw/healtharchive/security/policy"
DISABLED_SECURITY_URL = "https://github.com/jerdaw/healtharchive/security/advisories/new"
SECURITY_EMAIL = "security@healtharchive.ca"
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
        "url": SECURITY_POLICY_URL,
        "about": "Read the security policy for the private reporting channel.",
    },
    {
        "name": "Report an archived-content issue",
        "url": "https://healtharchive.ca/report",
        "about": (
            "Report broken snapshots, metadata errors, missing coverage, or takedown requests."
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
        text_keys = FORM_KEYS - {"body"}
        assert all(isinstance(form[key], str) and form[key].strip() for key in text_keys)
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


def test_security_guidance_uses_the_available_private_route() -> None:
    bug_form = (TEMPLATE_DIR / "bug_report.yml").read_text(encoding="utf-8")
    assert SECURITY_POLICY_URL in bug_form

    for policy in SECURITY_POLICIES:
        text = (ROOT / policy).read_text(encoding="utf-8")
        assert SECURITY_EMAIL in text, policy

    for guide in ACTIVE_SECURITY_GUIDES:
        text = (ROOT / guide).read_text(encoding="utf-8")
        assert DISABLED_SECURITY_URL not in text, guide
        assert "private vulnerability reporting" not in text.casefold(), guide


def test_public_guides_do_not_route_to_disabled_discussions() -> None:
    for guide in PUBLIC_GUIDES:
        text = (ROOT / guide).read_text(encoding="utf-8")
        assert "discussion" not in text.casefold(), guide
