import re
from pathlib import Path

from scripts import generate_llms_txt

REPO_ROOT = Path(__file__).resolve().parents[1]


FORBIDDEN_PUBLIC_CONTEXT_TERMS = (
    "om" + "sas",
    "can" + "meds",
    "medical-school",
    "ad" + "missions " + "strengthening",
    "application " + "strategy",
    "strengthens an application",
    "platform" + "-ops-contract",
    "/" + "home/jer",
    "/opt/healtharchive",
    "/srv/healtharchive",
    "/mnt/",
    "/volume1/",
    "/" + "etc/projects-merge",
)

REQUIRED_PUBLIC_CONTEXT_DOCS = {
    "README.md",
    "docs/README.md",
    "docs/architecture.md",
    "docs/api-consumer-guide.md",
    "docs/development/live-testing.md",
    "docs/contributing.md",
}

FORBIDDEN_PUBLIC_CONTEXT_PATHS = (
    "AGENTS.md",
    "AGENTS.override.md",
    "CLAUDE.md",
    "GEMINI.md",
    "docs/llms.txt",
    "docs/openapi.json",
)

FORBIDDEN_PUBLIC_CONTEXT_PREFIXES = (
    ".agents/",
    ".codex/",
    ".git/",
    "build/",
    "coverage/",
    "dist/",
    "docs/deployment/",
    "docs/operations/",
    "docs/planning/",
    "node_modules/",
    "site/",
    "tmp/",
)

FORBIDDEN_DATASET_RIGHTS_CLAIMS = (
    "citable dois (future)",
    "complete metadata export",
    "for large-scale research, consider using dataset releases",
    "use dataset releases for bulk access",
    "attribute healtharchive",
    "download datasets",
)


def test_llms_txt_public_context_allowlist_excludes_private_docs() -> None:
    public_docs = set(generate_llms_txt.PUBLIC_CONTEXT_DOCS)

    assert "docs/documentation-guidelines.md" not in public_docs
    assert public_docs.issuperset(REQUIRED_PUBLIC_CONTEXT_DOCS)
    assert public_docs.isdisjoint(FORBIDDEN_PUBLIC_CONTEXT_PATHS)
    assert all(
        not path.startswith(prefix)
        for path in public_docs
        for prefix in FORBIDDEN_PUBLIC_CONTEXT_PREFIXES
    )


def test_llms_txt_public_context_terms_are_public_safe() -> None:
    joined = "\n".join(generate_llms_txt.PUBLIC_CONTEXT_DOCS).lower()

    for term in FORBIDDEN_PUBLIC_CONTEXT_TERMS:
        assert term not in joined


def test_llms_txt_public_context_source_content_is_public_safe() -> None:
    for doc_path in generate_llms_txt.PUBLIC_CONTEXT_DOCS:
        text = (REPO_ROOT / doc_path).read_text(encoding="utf-8").lower()

        for term in FORBIDDEN_PUBLIC_CONTEXT_TERMS:
            assert term not in text, f"{term!r} leaked through {doc_path}"


def test_llms_txt_generated_content_uses_public_context_sections_only() -> None:
    content = generate_llms_txt.build_llms_txt(repo_root=REPO_ROOT)
    section_headings = {
        doc_path
        for doc_path in generate_llms_txt.PUBLIC_CONTEXT_DOCS
        if f"## {doc_path}\n\n" in content
    }

    assert section_headings == set(generate_llms_txt.PUBLIC_CONTEXT_DOCS)
    assert section_headings.issuperset(REQUIRED_PUBLIC_CONTEXT_DOCS)

    for forbidden_path in FORBIDDEN_PUBLIC_CONTEXT_PATHS:
        assert f"## {forbidden_path}\n\n" not in content

    for forbidden_prefix in FORBIDDEN_PUBLIC_CONTEXT_PREFIXES:
        assert not re.search(rf"^## {re.escape(forbidden_prefix)}", content, re.MULTILINE)

    lower_content = content.lower()
    for term in FORBIDDEN_PUBLIC_CONTEXT_TERMS:
        assert term not in lower_content


def test_dataset_guidance_does_not_overstate_archive_access_or_reuse() -> None:
    api_guide = (REPO_ROOT / "docs/api-consumer-guide.md").read_text(encoding="utf-8")
    quickstart = (REPO_ROOT / "docs/quickstart.md").read_text(encoding="utf-8")
    generated_context = generate_llms_txt.build_llms_txt(repo_root=REPO_ROOT)

    for text in (api_guide, quickstart, generated_context):
        lower_text = text.lower()
        assert "metadata-only" in lower_text
        for claim in FORBIDDEN_DATASET_RIGHTS_CLAIMS:
            assert claim not in lower_text

    lower_api_guide = re.sub(r"\s+", " ", api_guide.lower())
    lower_quickstart = re.sub(r"\s+", " ", quickstart.lower())
    lower_generated_context = re.sub(r"\s+", " ", generated_context.lower())

    assert "does not grant permission to embed or redistribute" in lower_api_guide
    assert "metadata release artifacts" in lower_api_guide
    assert "do not contain the complete replay, warc, or archived-content" in lower_api_guide
    assert "blanket reuse or redistribution rights" in lower_api_guide
    assert "repository's rights.md notice" in lower_api_guide
    assert "inspect the public metadata api" in lower_quickstart
    assert "not full-archive downloads" in lower_quickstart
    assert "blanket reuse rights" in lower_quickstart
    assert "repository's rights.md notice" in lower_quickstart
    assert (
        "do not contain the complete replay, warc, or archived-content" in lower_generated_context
    )
