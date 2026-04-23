from __future__ import annotations

import ast
from pathlib import Path


def test_warc_tiering_systemd_template_repairs_stale_mounts() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = repo_root / "docs" / "deployment" / "systemd" / "healtharchive-warc-tiering.service"
    text = unit_path.read_text(encoding="utf-8")
    assert "--repair-stale-mounts" in text
    assert "vps-warc-tiering-bind-mounts.sh --apply --repair-stale-mounts" in text


def test_annual_output_tiering_systemd_template_repairs_stale_mounts() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = (
        repo_root
        / "docs"
        / "deployment"
        / "systemd"
        / "healtharchive-annual-output-tiering.service"
    )
    text = unit_path.read_text(encoding="utf-8")
    assert "--repair-stale-mounts" in text
    assert "--allow-repair-running-jobs" in text


def test_storage_hotpath_auto_recover_systemd_template_requires_venv() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = (
        repo_root
        / "docs"
        / "deployment"
        / "systemd"
        / "healtharchive-storage-hotpath-auto-recover.service"
    )
    text = unit_path.read_text(encoding="utf-8")
    assert "ConditionPathExists=/opt/healtharchive/.venv/bin/python3" in text
    assert (
        "ExecStart=/opt/healtharchive/.venv/bin/python3 "
        "/opt/healtharchive/scripts/vps-storage-hotpath-auto-recover.py --apply"
    ) in text


def test_crawl_auto_recover_systemd_template_sets_stall_threshold() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = (
        repo_root / "docs" / "deployment" / "systemd" / "healtharchive-crawl-auto-recover.service"
    )
    text = unit_path.read_text(encoding="utf-8")
    assert "vps-crawl-auto-recover.py --apply" in text
    assert "--stall-threshold-seconds 3600" in text
    assert "--degraded-rate-enabled" in text
    assert "--degraded-action observe" in text
    assert "--ensure-min-running-jobs 3" in text
    assert "--start-max-disk-usage-percent 88" in text


def test_disk_threshold_cleanup_systemd_template_is_sentinel_and_env_gated() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = (
        repo_root
        / "docs"
        / "deployment"
        / "systemd"
        / "healtharchive-disk-threshold-cleanup.service"
    )
    text = unit_path.read_text(encoding="utf-8")
    assert "ConditionPathExists=/etc/healtharchive/backend.env" in text
    assert "ConditionPathExists=/etc/healtharchive/cleanup-automation-enabled" in text
    assert "ConditionPathExists=/opt/healtharchive/.venv/bin/python3" in text
    assert "EnvironmentFile=/etc/healtharchive/backend.env" in text
    assert "scripts/vps-cleanup-automation.py" in text
    assert "--threshold-mode" in text
    assert "--apply" in text


def test_storage_hotpath_auto_recover_script_has_no_top_level_backend_imports() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / "vps-storage-hotpath-auto-recover.py"
    mod = ast.parse(script_path.read_text(encoding="utf-8"))
    top_level_imports = [
        node
        for node in mod.body
        if isinstance(node, (ast.Import, ast.ImportFrom))
        and (
            (isinstance(node, ast.ImportFrom) and (node.module or "").startswith("ha_backend"))
            or any(
                (alias.name or "").startswith("ha_backend")
                for alias in getattr(node, "names", [])
                if isinstance(alias, ast.alias)
            )
        )
    ]
    assert top_level_imports == []


def test_worker_auto_start_systemd_template_requires_venv() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = (
        repo_root / "docs" / "deployment" / "systemd" / "healtharchive-worker-auto-start.service"
    )
    text = unit_path.read_text(encoding="utf-8")
    assert "ConditionPathExists=/etc/healtharchive/worker-auto-start-enabled" in text
    assert "ConditionPathExists=/opt/healtharchive/.venv/bin/python3" in text
    assert (
        "ExecStart=/opt/healtharchive/.venv/bin/python3 "
        "/opt/healtharchive/scripts/vps-worker-auto-start.py --apply"
    ) in text
    assert "--reconcile-running-drift" in text


def test_public_surface_verify_systemd_template_uses_canonical_frontend_domain() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = (
        repo_root
        / "docs"
        / "deployment"
        / "systemd"
        / "healtharchive-public-surface-verify.service"
    )
    text = unit_path.read_text(encoding="utf-8")
    assert "--frontend-base https://healtharchive.ca" in text
    assert "--frontend-base https://www.healtharchive.ca" not in text


def test_api_systemd_template_defaults_to_multiple_workers() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = repo_root / "docs" / "deployment" / "systemd" / "healtharchive-api.service"
    text = unit_path.read_text(encoding="utf-8")
    assert "ConditionPathExists=/etc/healtharchive/backend.env" in text
    assert "ConditionPathExists=/opt/healtharchive/.venv/bin/uvicorn" in text
    assert "Environment=HEALTHARCHIVE_API_WORKERS=2" in text
    assert '--workers "${HEALTHARCHIVE_API_WORKERS}"' in text
    assert "--proxy-headers" in text


def test_replay_systemd_template_loads_sitecustomize_and_dynamic_ids() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = repo_root / "docs" / "deployment" / "systemd" / "healtharchive-replay.service"
    text = unit_path.read_text(encoding="utf-8")
    assert "ConditionPathExists=/srv/healtharchive/replay/config.yaml" in text
    assert "ConditionPathExists=/srv/healtharchive/jobs" in text
    assert "ExecStartPre=/usr/bin/getent passwd hareplay" in text
    assert "ExecStartPre=/usr/bin/getent group healtharchive" in text
    assert "-e PYTHONPATH=/webarchive" in text
    assert "$$(/usr/bin/id -u hareplay)" in text
    assert "$$(/usr/bin/getent group healtharchive | /usr/bin/cut -d: -f3)" in text
    assert "-v /srv/healtharchive/replay:/webarchive:rw" in text
    assert "-v /srv/healtharchive/jobs:/warcs:ro,rshared" in text


def test_worker_systemd_template_uses_healtharchive_cli() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    unit_path = repo_root / "docs" / "deployment" / "systemd" / "healtharchive-worker.service"
    text = unit_path.read_text(encoding="utf-8")
    assert "ConditionPathExists=/etc/healtharchive/backend.env" in text
    assert "ConditionPathExists=/opt/healtharchive/.venv/bin/healtharchive" in text
    assert "WorkingDirectory=/opt/healtharchive" in text
    assert (
        "ExecStart=/opt/healtharchive/.venv/bin/healtharchive start-worker --poll-interval 30"
        in text
    )
    assert "ha" + "-backend" not in text
