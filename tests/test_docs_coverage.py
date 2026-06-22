from __future__ import annotations

import sys
from pathlib import Path

import pytest

from scripts import check_docs_coverage


def test_exclude_docs_patterns_match_mkdocs_globs(tmp_path: Path) -> None:
    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    excluded_root_file = docs_root / "project.md"
    excluded_tree_file = docs_root / "planning" / "implemented" / "old.md"
    excluded_glob_file = docs_root / "planning" / "2026-01-01-note.md"
    included_file = docs_root / "planning" / "roadmap.md"

    for path in (excluded_root_file, excluded_tree_file, excluded_glob_file, included_file):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("# test\n", encoding="utf-8")

    patterns = check_docs_coverage._load_exclude_docs_patterns(
        {
            "exclude_docs": """
            project.md
            planning/implemented/**
            planning/2026-*.md
            """
        }
    )

    assert check_docs_coverage._is_excluded_doc(
        excluded_root_file, docs_root=docs_root, patterns=patterns
    )
    assert check_docs_coverage._is_excluded_doc(
        excluded_tree_file, docs_root=docs_root, patterns=patterns
    )
    assert check_docs_coverage._is_excluded_doc(
        excluded_glob_file, docs_root=docs_root, patterns=patterns
    )
    assert not check_docs_coverage._is_excluded_doc(
        included_file, docs_root=docs_root, patterns=patterns
    )


def test_strict_coverage_ignores_excluded_tracked_docs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo_root = tmp_path
    docs_root = repo_root / "docs"
    docs_root.mkdir()
    (docs_root / "README.md").write_text("# Home\n", encoding="utf-8")
    (docs_root / "project.md").write_text("# Excluded\n", encoding="utf-8")
    (repo_root / "mkdocs.yml").write_text(
        """
site_name: Test Docs
docs_dir: docs
exclude_docs: |
  project.md
nav:
  - Home: README.md
""".lstrip(),
        encoding="utf-8",
    )

    def fake_git_ls_files_md(_repo_root: Path) -> list[Path]:
        return [docs_root / "README.md", docs_root / "project.md"]

    monkeypatch.setattr(check_docs_coverage, "_git_ls_files_md", fake_git_ls_files_md)
    monkeypatch.setattr(
        sys, "argv", ["check_docs_coverage.py", "--repo-root", str(repo_root), "--strict"]
    )

    assert check_docs_coverage.main() == 0
