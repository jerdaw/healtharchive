from pathlib import Path

from scripts import generate_llms_txt

REPO_ROOT = Path(__file__).resolve().parents[1]


FORBIDDEN_PUBLIC_CONTEXT_TERMS = (
    "omsas",
    "canmeds",
    "medical-school",
    "admissions strengthening",
    "application strategy",
    "strengthens an application",
    "platform-ops-contract",
    "/home/jer",
    "/opt/healtharchive",
    "/srv/healtharchive",
    "/mnt/",
    "/volume1/",
    "/etc/projects-merge",
)


def test_llms_txt_public_context_allowlist_excludes_private_docs() -> None:
    public_docs = set(generate_llms_txt.PUBLIC_CONTEXT_DOCS)

    assert "AGENTS.md" not in public_docs
    assert "docs/documentation-guidelines.md" not in public_docs
    assert all(not path.startswith("docs/deployment/") for path in public_docs)
    assert all(not path.startswith("docs/operations/") for path in public_docs)
    assert all(not path.startswith("docs/planning/") for path in public_docs)


def test_llms_txt_public_context_terms_are_public_safe() -> None:
    joined = "\n".join(generate_llms_txt.PUBLIC_CONTEXT_DOCS).lower()

    for term in FORBIDDEN_PUBLIC_CONTEXT_TERMS:
        assert term not in joined


def test_llms_txt_public_context_source_content_is_public_safe() -> None:
    for doc_path in generate_llms_txt.PUBLIC_CONTEXT_DOCS:
        text = (REPO_ROOT / doc_path).read_text(encoding="utf-8").lower()

        for term in FORBIDDEN_PUBLIC_CONTEXT_TERMS:
            assert term not in text, f"{term!r} leaked through {doc_path}"
