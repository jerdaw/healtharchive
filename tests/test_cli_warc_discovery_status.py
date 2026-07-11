from __future__ import annotations

import json
from pathlib import Path

import pytest

from ha_backend import cli as cli_module
from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.models import ArchiveJob, Source


@pytest.fixture
def test_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db_path = tmp_path / "warc_discovery_status.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")
    db_module._engine = None
    db_module._SessionLocal = None
    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    db_module._engine = None
    db_module._SessionLocal = None


def _create_job_with_invalid_manifest(tmp_path: Path) -> tuple[int, Path]:
    output_dir = tmp_path / "job-out"
    warcs_dir = output_dir / "warcs"
    warcs_dir.mkdir(parents=True)
    warc_path = warcs_dir / "stable.warc.gz"
    warc_path.write_bytes(b"stable")
    (warcs_dir / "manifest.json").write_text("{not-json", encoding="utf-8")

    with get_session() as session:
        source = Source(code="hc", name="Health Canada", enabled=True)
        session.add(source)
        session.flush()
        job = ArchiveJob(
            source_id=source.id,
            name="manifest-status-job",
            output_dir=str(output_dir),
            status="completed",
        )
        session.add(job)
        session.flush()
        return job.id, warc_path.resolve()


def _run_cli(args_list: list[str]) -> str:
    parser = cli_module.build_parser()
    args = parser.parse_args(args_list)
    args.func(args)
    return ""


def test_list_warcs_json_exposes_bounded_manifest_status(
    test_db: None,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    job_id, _warc_path = _create_job_with_invalid_manifest(tmp_path)

    _run_cli(["list-warcs", "--id", str(job_id), "--json"])

    output = json.loads(capsys.readouterr().out)
    assert output["manifest_valid"] is False
    assert output["manifest_status"] == "invalid"
    assert output["manifest_error"] == "invalid-json"


def test_list_warcs_plain_output_remains_path_only(
    test_db: None,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    job_id, warc_path = _create_job_with_invalid_manifest(tmp_path)

    _run_cli(["list-warcs", "--id", str(job_id)])

    assert capsys.readouterr().out.strip() == str(warc_path)


def test_show_job_warc_details_exposes_bounded_manifest_status(
    test_db: None,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    job_id, _warc_path = _create_job_with_invalid_manifest(tmp_path)

    _run_cli(["show-job", "--id", str(job_id), "--warc-details"])

    output = capsys.readouterr().out
    assert "Manifest status: invalid" in output
    assert "Manifest valid:  False" in output
    assert "Manifest error:  invalid-json" in output
    assert "not-json" not in output
