from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.models import ArchiveJob, Source
from ha_backend.seeds import seed_sources


def _load_script_module(script_filename: str, module_name: str) -> ModuleType:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / script_filename
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    assert spec is not None
    assert spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


def _init_test_db(tmp_path: Path, monkeypatch, name: str) -> None:
    db_path = tmp_path / name
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def test_vps_crawl_metrics_textfile_handles_stale_mount_output_dir(tmp_path, monkeypatch) -> None:
    mod = _load_script_module(
        "vps-crawl-metrics-textfile.py",
        module_name="ha_test_vps_crawl_metrics_textfile",
    )
    _init_test_db(tmp_path, monkeypatch, "crawl_metrics.db")

    output_dir = tmp_path / "jobdir"
    output_dir.mkdir(parents=True)
    combined_log_path = (
        output_dir / "archive_new_crawl_phase_-_attempt_1_20260108_000000.combined.log"
    )
    combined_log_path.write_text("hello\n", encoding="utf-8")

    with get_session() as session:
        seed_sources(session)
        session.flush()
        hc = session.query(Source).filter_by(code="hc").one()
        job = ArchiveJob(
            source=hc,
            name="hc-20260101",
            status="running",
            started_at=datetime.now(timezone.utc),
            output_dir=str(output_dir),
            combined_log_path=str(combined_log_path),
            config={},
        )
        session.add(job)
        session.flush()
        job_id = int(job.id)

    original_stat = Path.stat

    def fake_stat(self: Path, *, follow_symlinks: bool = True) -> os.stat_result:
        s = str(self)
        if s == str(output_dir) or s.startswith(f"{output_dir}/"):
            raise OSError(107, "Transport endpoint is not connected", s)
        return original_stat(self, follow_symlinks=follow_symlinks)

    monkeypatch.setattr(Path, "stat", fake_stat)

    out_dir = tmp_path / "out"
    rc = mod.main(["--out-dir", str(out_dir), "--out-file", "crawl.prom"])
    assert rc == 0

    prom = (out_dir / "crawl.prom").read_text(encoding="utf-8")
    assert "healtharchive_crawl_metrics_ok 1" in prom
    assert "healtharchive_crawl_running_jobs 1" in prom

    labels = f'job_id="{job_id}",source="hc"'
    assert f"healtharchive_crawl_running_job_output_dir_ok{{{labels}}} 0" in prom
    assert f"healtharchive_crawl_running_job_output_dir_errno{{{labels}}} 107" in prom
    assert f"healtharchive_crawl_running_job_log_probe_ok{{{labels}}} 0" in prom
    assert f"healtharchive_crawl_running_job_log_probe_errno{{{labels}}} 107" in prom


def test_vps_tiering_metrics_textfile_reports_errno_for_hot_path(tmp_path, monkeypatch) -> None:
    mod = _load_script_module(
        "vps-tiering-metrics-textfile.py",
        module_name="ha_test_vps_tiering_metrics_textfile",
    )

    hot_path = tmp_path / "hot"
    hot_path.mkdir(parents=True)
    manifest_path = tmp_path / "warc-tiering.binds"
    manifest_path.write_text(f"{tmp_path / 'cold'} {hot_path}\n", encoding="utf-8")

    monkeypatch.setattr(mod, "_is_mountpoint", lambda _p: False)
    monkeypatch.setattr(mod, "_unit_exists", lambda _u: False)

    original_stat = Path.stat

    def fake_stat(self: Path, *, follow_symlinks: bool = True) -> os.stat_result:
        s = str(self)
        if s == str(hot_path) or s.startswith(f"{hot_path}/"):
            raise OSError(107, "Transport endpoint is not connected", s)
        return original_stat(self, follow_symlinks=follow_symlinks)

    monkeypatch.setattr(Path, "stat", fake_stat)

    out_dir = tmp_path / "out"
    rc = mod.main(
        [
            "--out-dir",
            str(out_dir),
            "--out-file",
            "tiering.prom",
            "--manifest",
            str(manifest_path),
            "--storagebox-mount",
            str(tmp_path / "storagebox"),
        ]
    )
    assert rc == 0

    prom = (out_dir / "tiering.prom").read_text(encoding="utf-8")
    assert "healtharchive_tiering_manifest_ok 1" in prom
    assert f'healtharchive_tiering_hot_path_ok{{hot="{hot_path}"}} 0' in prom
    assert f'healtharchive_tiering_hot_path_errno{{hot="{hot_path}"}} 107' in prom


def test_vps_docker_runtime_metrics_reports_container_size_and_cache_paths(
    tmp_path: Path, monkeypatch
) -> None:
    mod = _load_script_module(
        "vps-docker-runtime-metrics-textfile.py",
        module_name="ha_test_vps_docker_runtime_metrics_textfile",
    )

    def fake_run(args: list[str], *, timeout: int = 30) -> subprocess.CompletedProcess[str]:
        if args[:3] == ["docker", "ps", "--format"]:
            return subprocess.CompletedProcess(
                args, 0, stdout="healtharchive-frontend\n", stderr=""
            )
        if args[:3] == ["docker", "inspect", "--size"]:
            payload = [
                {
                    "Config": {"Image": "healtharchive-frontend:test"},
                    "State": {"Status": "running", "Running": True},
                    "SizeRw": 123456,
                    "SizeRootFs": 654321,
                }
            ]
            return subprocess.CompletedProcess(args, 0, stdout=json.dumps(payload), stderr="")
        if args[:2] == ["docker", "exec"]:
            script = args[-1]
            stdout = "4096\n" if "/fetch-cache" in script else "8192\n"
            return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr="")
        raise AssertionError(args)

    monkeypatch.setattr(mod, "_run", fake_run)

    out_dir = tmp_path / "out"
    rc = mod.main(["--out-dir", str(out_dir), "--out-file", "docker.prom"])
    assert rc == 0

    prom = (out_dir / "docker.prom").read_text(encoding="utf-8")
    assert "healtharchive_docker_runtime_metrics_ok 1" in prom
    assert (
        'healtharchive_docker_container_size_rw_bytes{container="healtharchive-frontend",'
        'image="healtharchive-frontend:test",state="running"} 123456'
    ) in prom
    assert (
        'healtharchive_docker_path_bytes{container="healtharchive-frontend",'
        'path="/app/.next/cache/fetch-cache"} 4096'
    ) in prom


def test_vps_frontend_cache_maintenance_clears_and_restarts_when_over_limit(
    tmp_path: Path, monkeypatch
) -> None:
    mod = _load_script_module(
        "vps-frontend-cache-maintenance.py",
        module_name="ha_test_vps_frontend_cache_maintenance",
    )
    calls: list[str] = []
    byte_values = iter([(20, 1), (0, 1)])

    def fake_path_bytes(_container: str, _path: str) -> tuple[int, int]:
        return next(byte_values)

    def fake_clear(_container: str, _path: str) -> int:
        calls.append("clear")
        return 1

    def fake_restart(_container: str) -> int:
        calls.append("restart")
        return 1

    monkeypatch.setattr(mod, "_path_bytes", fake_path_bytes)
    monkeypatch.setattr(mod, "_clear_path", fake_clear)
    monkeypatch.setattr(mod, "_restart_container", fake_restart)

    out_dir = tmp_path / "out"
    rc = mod.main(
        [
            "--apply",
            "--out-dir",
            str(out_dir),
            "--out-file",
            "frontend-cache.prom",
            "--max-bytes",
            "10",
        ]
    )
    assert rc == 0
    assert calls == ["clear", "restart"]

    prom = (out_dir / "frontend-cache.prom").read_text(encoding="utf-8")
    assert "healtharchive_frontend_cache_maintenance_ok 1" in prom
    assert "healtharchive_frontend_cache_over_limit" in prom
    assert "healtharchive_frontend_cache_clear_success" in prom
    assert "healtharchive_frontend_cache_restart_success" in prom


def test_vps_crawl_metrics_textfile_reports_pending_annual_output_dir_not_writable(
    tmp_path: Path, monkeypatch
) -> None:
    import getpass

    mod = _load_script_module(
        "vps-crawl-metrics-textfile.py",
        module_name="ha_test_vps_crawl_metrics_textfile_annual_writability",
    )
    _init_test_db(tmp_path, monkeypatch, "crawl_metrics_annual.db")
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    output_dir = tmp_path / "annual_out"
    output_dir.mkdir(parents=True)
    os.chmod(output_dir, 0o555)  # readable/executable but not writable for the current user

    with get_session() as session:
        seed_sources(session)
        session.flush()
        phac = session.query(Source).filter_by(code="phac").one()
        job = ArchiveJob(
            source=phac,
            name="phac-20260101",
            status="queued",
            output_dir=str(output_dir),
            config={},
        )
        session.add(job)
        session.flush()
        job_id = int(job.id)

    out_dir = tmp_path / "out"
    rc = mod.main(
        [
            "--out-dir",
            str(out_dir),
            "--out-file",
            "crawl.prom",
            "--annual-writability-probe-user",
            getpass.getuser(),
            "--annual-writability-probe-max-jobs",
            "10",
        ]
    )
    assert rc == 0

    prom = (out_dir / "crawl.prom").read_text(encoding="utf-8")
    assert "healtharchive_crawl_annual_pending_output_dir_probe_user_ok 1" in prom
    labels = f'job_id="{job_id}",source="phac",status="queued",year="2026"'
    assert f"healtharchive_crawl_annual_pending_job_output_dir_writable{{{labels}}} 0" in prom
    assert (
        f"healtharchive_crawl_annual_pending_job_output_dir_writable_errno{{{labels}}} 13" in prom
    )
