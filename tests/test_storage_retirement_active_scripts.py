from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


ACTIVE_RETIREMENT_SCRIPT_PATHS = [
    Path("scripts/vps-capture-hotpath-staleness-evidence.sh"),
    Path("scripts/vps-diff-hotpath-staleness-evidence.sh"),
    Path("scripts/vps-hotpath-staleness-drill.sh"),
    Path("scripts/verify_ops_automation.sh"),
    Path("scripts/vps-ops-deployment-phase3.sh"),
    Path("scripts/vps-annual-campaign-closeout.sh"),
    Path("scripts/render_annual_closeout_report.py"),
    Path("docs/_templates/annual-campaign-closeout-report-template.md"),
]

CURRENT_STORAGE_RETIREMENT_PUBLIC_DOC_PATHS = [
    Path("docs/decisions/2026-01-23-annual-crawl-throughput-and-artifacts.md"),
    Path("docs/decisions/2026-05-24-db-backup-retention-and-nas-ingest.md"),
]


def test_active_storage_retirement_scripts_no_longer_name_storagebox() -> None:
    for relative_path in ACTIVE_RETIREMENT_SCRIPT_PATHS:
        text = (REPO_ROOT / relative_path).read_text(encoding="utf-8")

        assert "storagebox" not in text.lower(), relative_path
        assert "/srv/healtharchive/storagebox" not in text, relative_path
        assert "healtharchive-storagebox-sshfs" not in text, relative_path


def test_current_public_storage_decisions_use_generic_cold_archive_language() -> None:
    for relative_path in CURRENT_STORAGE_RETIREMENT_PUBLIC_DOC_PATHS:
        text = (REPO_ROOT / relative_path).read_text(encoding="utf-8")

        assert "StorageBox" not in text, relative_path
        assert "Storage Box" not in text, relative_path
        assert "storagebox" not in text.lower(), relative_path
        assert "/srv/healtharchive/storagebox" not in text, relative_path
        assert "cold archive" in text.lower() or "cold-archive" in text.lower(), relative_path


def test_active_storage_retirement_scripts_use_archive_cache_contract() -> None:
    verifier = (REPO_ROOT / "scripts" / "verify_ops_automation.sh").read_text(encoding="utf-8")
    phase3 = (REPO_ROOT / "scripts" / "vps-ops-deployment-phase3.sh").read_text(encoding="utf-8")
    capture = (REPO_ROOT / "scripts" / "vps-capture-hotpath-staleness-evidence.sh").read_text(
        encoding="utf-8"
    )
    drill = (REPO_ROOT / "scripts" / "vps-hotpath-staleness-drill.sh").read_text(encoding="utf-8")

    assert "--require-archive-cache-auto-recover" in verifier
    assert "--require-storage-hotpath-auto-recover" not in verifier
    assert "healtharchive-archive-cache-auto-recover.timer" in verifier
    assert "healtharchive-storage-hotpath-auto-recover.timer" not in verifier

    assert "healtharchive-archive-cache-auto-recover.timer" in phase3
    assert "healtharchive-storage-hotpath-auto-recover.timer" not in phase3

    assert "archive-cache-auto-recover.json" in capture
    assert "healtharchive_archive_cache_auto_recover.prom" in capture
    assert "healtharchive_storage_hotpath_auto_recover.prom" not in capture

    assert "healtharchive_archive_cache_auto_recover.drill.prom" in drill
    assert "healtharchive_storage_hotpath_auto_recover.drill.prom" not in drill


def test_cache_cold_archive_status_writer_uses_value_free_schema() -> None:
    text = (REPO_ROOT / "scripts" / "vps-cache-cold-archive-status.py").read_text(encoding="utf-8")

    assert "healtharchive-cache-cold-archive-status-v1" in text
    assert "secret_values_collected=false" in text
    assert "raw_sensitive_output_collected=false" in text
    assert "storageBoxRetired" in text
    assert "/var/lib/projects-merge" not in text
    assert "/srv/healtharchive/storagebox" not in text
