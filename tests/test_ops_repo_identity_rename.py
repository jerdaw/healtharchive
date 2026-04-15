from __future__ import annotations

from pathlib import Path

DISALLOWED_LITERALS = (
    "jerdaw/" + "healtharchive" + "-backend",
    "healtharchive/" + "healtharchive" + "-backend",
    "/opt/" + "healtharchive" + "-backend",
    "/tmp/" + "healtharchive" + "-backend-deploy.lock",
    "ha" + "-backend",
)

ACTIVE_ROOTS = (
    ".github",
    "docs",
    "frontend",
    "scripts",
    "src",
    "tests",
    "README.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CITATION.cff",
    "mkdocs.yml",
    "pyproject.toml",
    "VPS-DEPLOYMENT-INSTRUCTIONS.md",
)

EXCLUDED_PREFIXES = (
    "docs/planning/implemented/",
    "docs/operations/incidents/",
    "frontend/.next/",
    "site/",
    ".cache/",
)


def _iter_active_files(repo_root: Path) -> list[Path]:
    paths: list[Path] = []
    for root_name in ACTIVE_ROOTS:
        root = repo_root / root_name
        if not root.exists():
            continue
        if root.is_file():
            paths.append(root)
            continue
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            relative = path.relative_to(repo_root).as_posix()
            if relative.startswith(EXCLUDED_PREFIXES):
                continue
            if any(part.endswith(".egg-info") for part in path.parts):
                continue
            paths.append(path)
    return paths


def test_active_surfaces_do_not_use_retired_healtharchive_identity() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    violations: list[str] = []

    for path in _iter_active_files(repo_root):
        relative = path.relative_to(repo_root).as_posix()
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for literal in DISALLOWED_LITERALS:
            if literal in text:
                violations.append(f"{relative}: {literal}")

    assert not violations, "retired HealthArchive identity found in active surfaces:\n" + "\n".join(
        violations
    )
