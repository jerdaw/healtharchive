from __future__ import annotations

from pathlib import Path


def _read(relative_path: str) -> str:
    repo_root = Path(__file__).resolve().parents[1]
    return (repo_root / relative_path).read_text(encoding="utf-8")


def test_systemd_public_surface_verifier_uses_apex_frontend() -> None:
    text = _read("docs/deployment/systemd/healtharchive-public-surface-verify.service")
    assert "--frontend-base https://healtharchive.ca" in text


def test_active_docs_do_not_treat_vercel_as_current_healtharchive_path() -> None:
    production_rollout = _read("docs/deployment/production-rollout-checklist.md")
    staging_rollout = _read("docs/deployment/staging-rollout-checklist.md")
    architecture = _read("docs/architecture.md")
    docs_index = _read("docs/README.md")

    assert "historical Vercel-era checklist" not in production_rollout
    assert "https://healtharchive.vercel.app" not in architecture
    assert "Vercel wiring" not in docs_index
    assert "optional future staging reference" in staging_rollout


def test_active_docs_reflect_apex_canonical_frontend() -> None:
    production_rollout = _read("docs/deployment/production-rollout-checklist.md")
    production_runbook = _read("docs/deployment/production-single-vps.md")

    assert "frontend canonical host: `https://healtharchive.ca`" in production_rollout
    assert "frontend alias: `https://www.healtharchive.ca` -> apex redirect" in production_rollout
    assert "`healtharchive.ca` (canonical)" in production_runbook


if __name__ == "__main__":
    test_systemd_public_surface_verifier_uses_apex_frontend()
    test_active_docs_do_not_treat_vercel_as_current_healtharchive_path()
    test_active_docs_reflect_apex_canonical_frontend()
