from __future__ import annotations

import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Iterator

import pytest
from sqlalchemy.orm import Session

from archive_tool.state import CrawlState
from archive_tool.utils import cleanup_temp_dirs as real_cleanup_temp_dirs
from ha_backend import cli as cli_module
from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.models import ArchiveJob, Snapshot, Source


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "cli_cleanup.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def _seed_indexed_job(tmp_path: Path, *, status: str = "indexed") -> int:
    """
    Create a single Source and an indexed ArchiveJob with a temp dir and state.
    """
    output_dir = tmp_path / "job-output"
    output_dir.mkdir(parents=True, exist_ok=True)

    temp_dir = output_dir / ".tmp1234"
    temp_dir.mkdir()

    # Initialise a CrawlState so that .archive_state.json exists and tracks
    # the temp dir for cleanup.
    state = CrawlState(output_dir, initial_workers=1)
    state.add_temp_dir(temp_dir)

    with get_session() as session:
        src = Source(
            code="hc",
            name="Health Canada",
            base_url="https://www.canada.ca/en/health-canada.html",
            description="HC",
            enabled=True,
        )
        session.add(src)
        session.flush()

        job = ArchiveJob(
            source_id=src.id,
            name="job-cleanup",
            output_dir=str(output_dir),
            status=status,
            cleanup_status="none",
        )
        session.add(job)
        session.flush()
        return job.id


def test_cleanup_job_temp_mode_removes_temp_and_state(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path)

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        output_dir = Path(job.output_dir)
        temp_dir = next(output_dir.glob(".tmp*"))
        state_path = output_dir / ".archive_state.json"
        assert temp_dir.is_dir()
        assert state_path.is_file()

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id)])

    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        args.func(args)
    finally:
        sys.stdout = old_stdout

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        assert job.cleanup_status == "temp_cleaned"
        assert job.cleaned_at is not None

    # Paths should be gone.
    assert not temp_dir.exists()
    assert not state_path.exists()


def test_cleanup_job_temp_mode_preserves_stable_warc_and_zim_artifacts(
    tmp_path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path)

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        output_dir = Path(job.output_dir)
        stable_warcs_dir = output_dir / "warcs"
        stable_warcs_dir.mkdir()
        stable_warc = stable_warcs_dir / "stable.warc.gz"
        stable_warc.write_bytes(b"stable warc bytes")
        zim_file = output_dir / "job-cleanup.zim"
        zim_file.write_bytes(b"zim bytes")

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id)])
    args.func(args)

    assert stable_warc.read_bytes() == b"stable warc bytes"
    assert zim_file.read_bytes() == b"zim bytes"


def test_cleanup_job_allows_index_failed_status(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path, status="index_failed")

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id)])
    args.func(args)

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        assert job.cleanup_status == "temp_cleaned"
        assert job.cleaned_at is not None


def test_cleanup_job_filesystem_cleanup_runs_outside_db_session(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path)
    active_sessions = 0

    @contextmanager
    def tracked_session() -> Iterator[Session]:
        nonlocal active_sessions
        with get_session() as session:
            active_sessions += 1
            try:
                yield session
            finally:
                active_sessions -= 1

    def cleanup_spy(temp_dirs: list[Path], state_file_path: Path) -> None:
        assert active_sessions == 0
        real_cleanup_temp_dirs(temp_dirs, state_file_path)

    monkeypatch.setattr(cli_module, "get_session", tracked_session)
    monkeypatch.setattr("archive_tool.utils.cleanup_temp_dirs", cleanup_spy)

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id)])
    args.func(args)

    assert active_sessions == 0


@pytest.mark.parametrize("status", ["queued", "running", "retryable", "completed", "failed"])
def test_cleanup_job_rejects_unsafe_statuses(status: str, tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        src = Source(
            code="hc",
            name="Health Canada",
            base_url="https://www.canada.ca/en/health-canada.html",
            description="HC",
            enabled=True,
        )
        session.add(src)
        session.flush()

        job = ArchiveJob(
            source_id=src.id,
            name=f"job-{status}",
            output_dir=str(tmp_path / f"job-{status}"),
            status=status,
        )
        session.add(job)
        session.flush()
        job_id = job.id

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id)])

    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        try:
            args.func(args)
        except SystemExit:
            # Expected due to sys.exit(1) in the command.
            pass
    finally:
        sys.stdout = old_stdout

    # Status and cleanup_status should remain unchanged.
    with get_session() as session:
        loaded_job = session.get(ArchiveJob, job_id)
        assert loaded_job is not None
        assert loaded_job.status == status
        assert loaded_job.cleanup_status == "none"


def test_cleanup_job_refuses_temp_when_replay_enabled_without_force(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path)

    # When replay is enabled, cleanup-job should refuse by default because
    # temp cleanup deletes WARCs required for replay.
    monkeypatch.setenv("HEALTHARCHIVE_REPLAY_BASE_URL", "https://replay.example.test")

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        output_dir = Path(job.output_dir)
        temp_dir = next(output_dir.glob(".tmp*"))
        state_path = output_dir / ".archive_state.json"
        assert temp_dir.is_dir()
        assert state_path.is_file()

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id)])

    try:
        args.func(args)
    except SystemExit:
        pass

    # Paths should remain.
    assert temp_dir.is_dir()
    assert state_path.is_file()


def test_cleanup_job_allows_temp_with_force_when_replay_enabled(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path)

    monkeypatch.setenv("HEALTHARCHIVE_REPLAY_BASE_URL", "https://replay.example.test")

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        output_dir = Path(job.output_dir)
        temp_dir = next(output_dir.glob(".tmp*"))
        state_path = output_dir / ".archive_state.json"
        assert temp_dir.is_dir()
        assert state_path.is_file()

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id), "--force"])

    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        args.func(args)
    finally:
        sys.stdout = old_stdout

    assert not temp_dir.exists()
    assert not state_path.exists()


def test_cleanup_job_temp_nonwarc_consolidates_warcs_and_rewrites_snapshot_paths(
    tmp_path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id = _seed_indexed_job(tmp_path)

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        output_dir = Path(job.output_dir)
        temp_dir = next(output_dir.glob(".tmp*"))

        archive_dir = temp_dir / "collections" / "crawl-test" / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        source_warc = archive_dir / "rec-1.warc.gz"
        source_warc.write_bytes(b"dummy warc bytes")

        snap = Snapshot(
            job_id=job.id,
            source_id=job.source_id,
            url="https://example.test/page",
            normalized_url_group="https://example.test/page",
            capture_timestamp=datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            mime_type="text/html",
            status_code=200,
            title="Example",
            snippet="Example",
            language="en",
            warc_path=str(source_warc),
            warc_record_id="rec-1",
        )
        session.add(snap)

    parser = cli_module.build_parser()
    args = parser.parse_args(["cleanup-job", "--id", str(job_id), "--mode", "temp-nonwarc"])

    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        args.func(args)
    finally:
        sys.stdout = old_stdout

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        assert job.cleanup_status == "temp_nonwarc_cleaned"
        assert job.cleaned_at is not None

        snap = session.query(Snapshot).filter(Snapshot.job_id == job_id).one()
        output_dir_abs = output_dir.resolve()
        tmp_warc_prefix = f"{output_dir_abs.as_posix()}/.tmp"
        assert not Path(snap.warc_path).resolve().as_posix().startswith(tmp_warc_prefix)
        assert "/warcs/" in snap.warc_path

    assert not any(output_dir.glob(".tmp*"))
    assert not (output_dir / ".archive_state.json").exists()

    warcs_dir = output_dir / "warcs"
    assert warcs_dir.is_dir()
    stable_warcs = list(warcs_dir.glob("*.warc.gz"))
    assert len(stable_warcs) == 1
    assert stable_warcs[0].is_file()
    assert stable_warcs[0].stat().st_size > 0

    provenance_state = output_dir / "provenance" / "archive_state.json"
    assert provenance_state.is_file()
