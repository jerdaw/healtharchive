from __future__ import annotations

from pathlib import Path

REVIEWED_PRIVATE_TERMS = (
    "tail" + "scale",
    "ha" + "admin",
    "het" + "zner",
    "back" + "up",
    "recov" + "ery",
    "sys" + "temd",
    "prome" + "theus",
    "push" + "over",
    "/" + "srv",
    "/" + "etc",
    "ss" + "hfs",
    "storage" + " box",
    "storage" + "box",
    "healtharchive" + "-api",
    "healtharchive" + "-worker",
    "vps" + "-deploy",
    "deploy" + "-vps",
    "verify" + "-production",
    "production" + " verification",
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _read(relative_path: str) -> str:
    return (_repo_root() / relative_path).read_text(encoding="utf-8")


def test_deployment_and_operations_docs_are_public_boundary_safe() -> None:
    public_roots = (_repo_root() / "docs" / "deployment", _repo_root() / "docs" / "operations")

    for root in public_roots:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
            for term in REVIEWED_PRIVATE_TERMS:
                assert term not in text, f"{path.relative_to(_repo_root())} contains {term!r}"


def test_operator_heavy_docs_are_public_boundary_stubs() -> None:
    stubbed_paths = (
        "docs/deployment/disaster-" + "recov" + "ery.md",
        "docs/deployment/production-rollout-checklist.md",
        "docs/deployment/runbook-vps" + "-deploy.md",
        "docs/deployment/" + "sys" + "temd/README.md",
        "docs/operations/playbooks/core/deploy-and-verify.md",
        "docs/operations/playbooks/core/incident-response.md",
        "docs/operations/playbooks/validation/production-closeout.md",
        "docs/operations/runbooks/README.md",
        "docs/operations/incidents/README.md",
    )

    for relative_path in stubbed_paths:
        text = _read(relative_path)
        assert text.startswith("# Public Boundary Stub")
        assert "private operations workspace" in text
        assert "host topology" in text


def test_private_runtime_artifacts_are_not_tracked_in_public_docs() -> None:
    repo_root = _repo_root()
    unit_dir = repo_root / "docs" / "deployment" / ("sys" + "temd")

    assert not any(unit_dir.glob("*.service"))
    assert not any(unit_dir.glob("*.timer"))
    assert not (repo_root / "docs" / "deployment" / ("prome" + "theus-alerts-crawl.yml")).exists()
    assert not (repo_root / "docs" / "deployment" / "pywb" / "config.yaml").exists()
    assert not (repo_root / "docs" / "operations" / "production-baseline-policy.toml").exists()


def test_active_entrypoints_keep_shared_host_facts_behind_private_ops_boundary() -> None:
    private_ops_path = "/".join(["", "home", "jer", "repos", "vps", "platform-ops"])

    for relative_path in (
        "README.md",
        "AGENTS.md",
        "ENVIRONMENTS.md",
        "docs/README.md",
        "docs/deployment/production-rollout-checklist.md",
        "docs/deployment/staging-rollout-checklist.md",
    ):
        content = _read(relative_path)
        assert "private" in content.lower()
        assert private_ops_path not in content


def test_agent_docs_keep_symlink_and_authorship_guardrails_current() -> None:
    repo_root = _repo_root()

    assert (repo_root / "CLAUDE.md").is_symlink()
    assert (repo_root / "GEMINI.md").is_symlink()
    assert (repo_root / "frontend" / "CLAUDE.md").is_symlink()
    assert (repo_root / "frontend" / "GEMINI.md").is_symlink()

    assert (repo_root / "CLAUDE.md").readlink() == Path("AGENTS.md")
    assert (repo_root / "GEMINI.md").readlink() == Path("AGENTS.md")
    assert (repo_root / "frontend" / "CLAUDE.md").readlink() == Path("AGENTS.md")
    assert (repo_root / "frontend" / "GEMINI.md").readlink() == Path("AGENTS.md")

    root_agents = _read("AGENTS.md")
    frontend_agents = _read("frontend/AGENTS.md")

    assert "Public/private documentation boundary" in root_agents
    assert "Do not add AI-assistant attribution" in root_agents
    assert "Do not add AI-assistant attribution" in frontend_agents
    assert "dependabot[bot]" in root_agents
    assert "github-actions[bot]" in root_agents
    assert "dependabot[bot]" in frontend_agents
    assert "github-actions[bot]" in frontend_agents
