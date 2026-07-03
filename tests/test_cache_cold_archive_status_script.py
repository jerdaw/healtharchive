from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "vps-cache-cold-archive-status.py"


def load_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("ha_test_cache_cold_archive_status", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_build_status_payload_matches_platform_wrapper_schema() -> None:
    mod = load_script()

    payload = mod.build_payload(
        cold_archive_configured=True,
        last_verified_sync_age_seconds=3600,
        last_verified_sync_status="verified",
        last_restore_proof_status="passed",
        nas_retention_verified=True,
        db_backup_mirror_verified=True,
        hot_cache_job_count=4,
        evicted_restorable_job_count=19,
        manifest_verified_count=23,
        storage_box_retired=False,
    )

    assert payload == {
        "schemaVersion": "healtharchive-cache-cold-archive-status-v1",
        "coldArchiveConfigured": True,
        "lastVerifiedSyncAgeSeconds": 3600,
        "lastVerifiedSyncStatus": "verified",
        "lastRestoreProofStatus": "passed",
        "nasRetentionVerified": True,
        "dbBackupMirrorVerified": True,
        "hotCacheJobCount": 4,
        "evictedRestorableJobCount": 19,
        "manifestVerifiedCount": 23,
        "storageBoxRetired": False,
    }
    assert mod.validate_payload(payload)["valid"] is True


def test_default_payload_is_not_configured_and_value_free() -> None:
    mod = load_script()

    payload = mod.build_payload()
    validation = mod.validate_payload(payload)
    rendered = json.dumps(payload, sort_keys=True)

    assert validation["valid"] is True
    assert payload["coldArchiveConfigured"] is False
    assert payload["lastVerifiedSyncStatus"] == "not-configured"
    assert payload["lastRestoreProofStatus"] == "not-started"
    assert payload["lastVerifiedSyncAgeSeconds"] == 0
    assert payload["hotCacheJobCount"] == 0
    assert payload["evictedRestorableJobCount"] == 0
    assert payload["manifestVerifiedCount"] == 0
    assert "token=" not in rendered
    assert "/srv/healtharchive/storagebox" not in rendered
    assert "ssh://" not in rendered


def test_validate_payload_rejects_unknown_private_topology_and_secret_shapes() -> None:
    mod = load_script()
    payload = mod.build_payload()
    payload["nasHostname"] = "nas.local"
    payload["note"] = "token=abc123abc123abc123"

    validation = mod.validate_payload(payload)

    assert validation["valid"] is False
    assert validation["secretShapeDetected"] is True
    assert validation["privateTopologyShapeDetected"] is True
    assert any(error["id"] == "unknown-field-nasHostname" for error in validation["errors"])
    assert any(error["category"] == "sensitive-shape" for error in validation["errors"])


def test_validate_payload_rejects_out_of_range_counts_and_statuses() -> None:
    mod = load_script()
    payload = mod.build_payload()
    payload["hotCacheJobCount"] = 10_000_001
    payload["lastVerifiedSyncStatus"] = "synced-to-my-nas"

    validation = mod.validate_payload(payload)

    assert validation["valid"] is False
    assert any(error["id"] == "metric-hotCacheJobCount" for error in validation["errors"])
    assert any(error["id"] == "status-lastVerifiedSyncStatus" for error in validation["errors"])


def test_cli_writes_json_and_bounded_summary(tmp_path: Path) -> None:
    out = tmp_path / "cold-archive-status.json"
    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--out",
            str(out),
            "--cold-archive-configured",
            "--last-verified-sync-age-seconds",
            "3600",
            "--last-verified-sync-status",
            "verified",
            "--last-restore-proof-status",
            "passed",
            "--nas-retention-verified",
            "--db-backup-mirror-verified",
            "--hot-cache-job-count",
            "4",
            "--evicted-restorable-job-count",
            "19",
            "--manifest-verified-count",
            "23",
        ],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    payload = json.loads(out.read_text(encoding="utf-8"))

    assert result.returncode == 0, result.stderr
    assert "HealthArchive cache/cold archive status" in result.stdout
    assert "status_json_valid=true" in result.stdout
    assert "secret_values_collected=false" in result.stdout
    assert "raw_sensitive_output_collected=false" in result.stdout
    assert str(payload["manifestVerifiedCount"]) == "23"
    assert "token=" not in result.stdout
    assert "/srv/healtharchive/storagebox" not in result.stdout


def test_cli_validate_rejects_sensitive_existing_file_without_echoing_value(tmp_path: Path) -> None:
    status_path = tmp_path / "cold-archive-status.json"
    json_out = tmp_path / "validation.json"
    secret_shape = "token=abc123abc123abc123"
    status_path.write_text(
        json.dumps(
            {
                "schemaVersion": "healtharchive-cache-cold-archive-status-v1",
                "coldArchiveConfigured": False,
                "lastVerifiedSyncAgeSeconds": 0,
                "lastVerifiedSyncStatus": "not-configured",
                "lastRestoreProofStatus": "not-started",
                "nasRetentionVerified": False,
                "dbBackupMirrorVerified": False,
                "hotCacheJobCount": 0,
                "evictedRestorableJobCount": 0,
                "manifestVerifiedCount": 0,
                "storageBoxRetired": False,
                "note": secret_shape,
            }
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--validate",
            str(status_path),
            "--json-out",
            str(json_out),
        ],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    validation = json.loads(json_out.read_text(encoding="utf-8"))

    assert result.returncode == 1
    assert validation["valid"] is False
    assert validation["secretShapeDetected"] is True
    assert secret_shape not in result.stdout
    assert secret_shape not in result.stderr
    assert secret_shape not in json.dumps(validation, sort_keys=True)
