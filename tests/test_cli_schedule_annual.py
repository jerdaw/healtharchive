from __future__ import annotations

import json
import sys
from io import StringIO
from pathlib import Path

import pytest

from ha_backend import cli as cli_module
from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.job_registry import create_job_for_source
from ha_backend.models import ArchiveJob
from ha_backend.seeds import seed_sources


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "cli_schedule_annual.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def _run_cli(args_list: list[str]) -> str:
    parser = cli_module.build_parser()
    args = parser.parse_args(args_list)

    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        args.func(args)
    finally:
        sys.stdout = old_stdout

    return stdout.getvalue()


def _write_storage_budget(tmp_path: Path, *, year: int = 2027) -> Path:
    path = tmp_path / "annual-storage-budget.json"
    path.write_text(
        json.dumps(
            {
                "version": 1,
                "campaign_year": year,
                "financial_policy": {
                    "additional_spend_cad": 0,
                    "new_paid_storage_approved": False,
                },
                "sources": {
                    source: {
                        "estimated_warc_gib": estimate,
                        "capacity_target_gib": 250,
                        "large_media_policy": "exclude_or_cap_unless_explicitly_required",
                        "replay_requirement": "rebuild_replay_indexes_after_warc_replacement",
                        "approval": {
                            "reviewed_at_utc": f"{year - 1}-12-15T00:00:00Z",
                            "note": "test budget",
                        },
                        "financial_policy": {
                            "additional_spend_cad": 0,
                            "new_paid_storage_approved": False,
                            "already_paid_capacity_only": True,
                        },
                    }
                    for source, estimate in {"hc": 60, "phac": 60, "cihr": 140}.items()
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )
    return path


def test_schedule_annual_apply_requires_storage_policy_ack(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    with pytest.raises(SystemExit) as exc:
        _run_cli(["schedule-annual", "--year", "2027", "--apply"])

    assert exc.value.code == 1

    with get_session() as session:
        assert session.query(ArchiveJob).count() == 0


def test_schedule_annual_apply_requires_storage_budget_file(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    with pytest.raises(SystemExit) as exc:
        _run_cli(["schedule-annual", "--year", "2027", "--apply", "--ack-storage-policy"])

    assert exc.value.code == 1

    with get_session() as session:
        assert session.query(ArchiveJob).count() == 0


def test_schedule_annual_dry_run_does_not_create_jobs(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    out = _run_cli(["schedule-annual", "--year", "2027"])
    assert "DRY-RUN" in out

    with get_session() as session:
        assert session.query(ArchiveJob).count() == 0


def test_schedule_annual_apply_creates_jobs_ordered_and_labeled(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    budget_path = _write_storage_budget(tmp_path)
    _run_cli(
        [
            "schedule-annual",
            "--year",
            "2027",
            "--apply",
            "--ack-storage-policy",
            "--storage-budget-file",
            str(budget_path),
        ]
    )

    with get_session() as session:
        jobs = session.query(ArchiveJob).order_by(ArchiveJob.id).all()

        assert len(jobs) == 3
        source_codes = []
        for job in jobs:
            assert job.source is not None
            source_codes.append(job.source.code)
        assert source_codes == ["hc", "phac", "cihr"]
        assert [job.name for job in jobs] == [
            "hc-20270101",
            "phac-20270101",
            "cihr-20270101",
        ]
        assert all(job.status == "queued" for job in jobs)
        assert all(job.queued_at is not None for job in jobs)
        assert jobs[0].queued_at is not None
        assert jobs[1].queued_at is not None
        assert jobs[2].queued_at is not None
        assert jobs[0].queued_at < jobs[1].queued_at < jobs[2].queued_at

        for job in jobs:
            cfg = job.config or {}
            assert cfg.get("campaign_kind") == "annual"
            assert cfg.get("campaign_year") == 2027
            assert cfg.get("campaign_date") == "2027-01-01"
            assert cfg.get("campaign_date_utc") == "2027-01-01T00:00:00Z"
            assert cfg.get("scheduler_version") == "v1"
            storage_policy = cfg.get("annual_storage_policy")
            assert storage_policy is not None
            assert storage_policy["operator_acknowledged"] is True
            assert storage_policy["storage_budget"]["estimated_warc_gib"] > 0
            assert storage_policy["storage_budget"]["capacity_target_gib"] == 250
            assert storage_policy["storage_budget"]["financial_policy"] == {
                "additional_spend_cad": 0,
                "new_paid_storage_approved": False,
                "already_paid_capacity_only": True,
            }
            assert storage_policy["large_media_policy"] == (
                "exclude_or_cap_unless_explicitly_required"
            )
            assert "mp4" in storage_policy["large_media_extensions"]
            assert "mp3" in storage_policy["large_media_extensions"]
            assert storage_policy["replay_requirement"] == (
                "rebuild_replay_indexes_after_warc_replacement"
            )
            assert cfg.get("seeds")
            assert cfg.get("zimit_passthrough_args") is not None
            assert cfg.get("tool_options") is not None
            tool_opts = cfg.get("tool_options") or {}
            assert tool_opts.get("enable_monitoring") is True
            assert tool_opts.get("enable_adaptive_workers") is True


def test_schedule_annual_apply_is_idempotent(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    budget_path = _write_storage_budget(tmp_path)
    base_args = [
        "schedule-annual",
        "--year",
        "2027",
        "--apply",
        "--ack-storage-policy",
        "--storage-budget-file",
        str(budget_path),
    ]
    _run_cli(base_args)
    _run_cli(base_args)

    with get_session() as session:
        assert session.query(ArchiveJob).count() == 3


def test_schedule_annual_skips_source_with_active_job(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    # Create an active (queued) job for hc first; the annual scheduler should
    # refuse to enqueue a second hc job until this one is handled.
    with get_session() as session:
        create_job_for_source("hc", session=session)

    budget_path = _write_storage_budget(tmp_path)
    _run_cli(
        [
            "schedule-annual",
            "--year",
            "2027",
            "--apply",
            "--ack-storage-policy",
            "--storage-budget-file",
            str(budget_path),
        ]
    )

    with get_session() as session:
        jobs = session.query(ArchiveJob).order_by(ArchiveJob.id).all()

        assert len(jobs) == 3
        annual_jobs = [j for j in jobs if (j.config or {}).get("campaign_kind") == "annual"]
        annual_codes = set()
        for job in annual_jobs:
            assert job.source is not None
            annual_codes.add(job.source.code)
        assert annual_codes == {"phac", "cihr"}


def test_schedule_annual_respects_max_create_per_run(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "jobs"))

    with get_session() as session:
        seed_sources(session)

    budget_path = _write_storage_budget(tmp_path)
    _run_cli(
        [
            "schedule-annual",
            "--year",
            "2027",
            "--apply",
            "--ack-storage-policy",
            "--storage-budget-file",
            str(budget_path),
            "--max-create-per-run",
            "1",
        ]
    )

    with get_session() as session:
        jobs = session.query(ArchiveJob).order_by(ArchiveJob.id).all()

        assert len(jobs) == 1
        assert jobs[0].source is not None
        assert jobs[0].source.code == "hc"
        assert jobs[0].name == "hc-20270101"
