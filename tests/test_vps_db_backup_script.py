from __future__ import annotations

import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "vps-db-backup.sh"


def run_backup_script(
    tmp_path: Path, *args: str, env_overrides: dict[str, str] | None = None
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.update(
        {
            "BACKEND_ENV": str(tmp_path / "missing-backend.env"),
            "HEALTHARCHIVE_DATABASE_URL": "postgresql://local-test/healtharchive",
            "HEALTHARCHIVE_BACKUP_LOCAL_DIR": str(tmp_path / "local"),
            "HEALTHARCHIVE_BACKUP_REQUIRE_MIRROR": "0",
            "NODE_EXPORTER_TEXTFILE_DIR": str(tmp_path / "metrics"),
        }
    )
    if env_overrides:
        env.update(env_overrides)
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        check=False,
        capture_output=True,
        text=True,
        env=env,
        cwd=REPO_ROOT,
    )


def test_help_prefers_generic_cold_mirror_language() -> None:
    result = subprocess.run(
        ["bash", str(SCRIPT), "--help"],
        check=False,
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )

    assert result.returncode == 0
    assert "HEALTHARCHIVE_BACKUP_COLD_MIRROR_DIR" in result.stdout
    assert "HEALTHARCHIVE_BACKUP_COLD_MIRROR_ROOT" in result.stdout
    assert "Storage Box" not in result.stdout
    assert "/srv/healtharchive/storagebox" not in result.stdout


def test_dry_run_uses_generic_cold_mirror_env_without_storagebox_default(tmp_path: Path) -> None:
    mirror_dir = tmp_path / "cold-mirror" / "db"
    result = run_backup_script(
        tmp_path,
        "--dry-run",
        env_overrides={
            "HEALTHARCHIVE_BACKUP_COLD_MIRROR_DIR": str(mirror_dir),
            "HEALTHARCHIVE_BACKUP_COLD_MIRROR_ROOT": str(tmp_path / "cold-mirror"),
        },
    )
    output = result.stdout + result.stderr

    assert result.returncode == 0, output
    assert str(mirror_dir) in output
    assert "Storage Box" not in output
    assert "/srv/healtharchive/storagebox" not in output


def test_required_mirror_without_config_fails_with_generic_env_guidance(tmp_path: Path) -> None:
    result = run_backup_script(
        tmp_path,
        "--dry-run",
        env_overrides={
            "HEALTHARCHIVE_BACKUP_REQUIRE_MIRROR": "1",
        },
    )
    output = result.stdout + result.stderr

    assert result.returncode == 1
    assert "HEALTHARCHIVE_BACKUP_COLD_MIRROR_DIR" in output
    assert "HEALTHARCHIVE_BACKUP_COLD_MIRROR_ROOT" in output
    assert "Storage Box" not in output
    assert "/srv/healtharchive/storagebox" not in output
