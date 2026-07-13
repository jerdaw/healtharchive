from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    "filename",
    [
        "accessibility.md",
        "accessibility-audit-2026-07-10.md",
    ],
)
def test_frontend_accessibility_docs_match_portal_bridge(filename: str) -> None:
    frontend_doc = REPO_ROOT / "frontend" / "docs" / filename
    portal_doc = REPO_ROOT / "docs" / "frontend" / filename

    assert frontend_doc.is_file(), f"missing canonical frontend doc: {frontend_doc}"
    assert portal_doc.is_file(), f"missing docs-portal bridge copy: {portal_doc}"
    assert frontend_doc.read_bytes() == portal_doc.read_bytes(), (
        f"frontend accessibility doc drifted from portal bridge: {filename}"
    )
