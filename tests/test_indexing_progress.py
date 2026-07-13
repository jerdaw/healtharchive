from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.indexing import progress as progress_module
from ha_backend.indexing.progress import IndexingProgressReporter, indexing_progress_payload
from ha_backend.models import ArchiveJob, ArchiveJobIndexingProgress, Source


@dataclass
class ManualClock:
    monotonic_value: float = 0.0
    now_value: datetime = datetime(2026, 7, 10, 12, 0, tzinfo=timezone.utc)

    def monotonic(self) -> float:
        return self.monotonic_value

    def now_utc(self) -> datetime:
        return self.now_value

    def advance(self, seconds: float) -> None:
        self.monotonic_value += seconds
        self.now_value += timedelta(seconds=seconds)


def _init_test_db(tmp_path: Path, monkeypatch) -> int:
    db_path = tmp_path / "indexing-progress.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")
    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with get_session() as session:
        source = Source(
            code="hc",
            name="Health Canada",
            base_url="https://www.canada.ca/en/health-canada.html",
            description="HC",
            enabled=True,
        )
        session.add(source)
        session.flush()
        job = ArchiveJob(
            source_id=source.id,
            name="indexing-progress",
            output_dir=str(tmp_path / "job-output"),
            status="completed",
        )
        session.add(job)
        session.flush()
        return int(job.id)


def test_reporter_persists_progress_and_throttles_same_phase_updates(tmp_path, monkeypatch) -> None:
    job_id = _init_test_db(tmp_path, monkeypatch)
    clock = ManualClock()
    reporter = IndexingProgressReporter(
        job_id,
        heartbeat_interval_seconds=10,
        monotonic=clock.monotonic,
        now_utc=clock.now_utc,
    )

    reporter.update(phase="discover", warc_total=2)
    reporter.update(phase="discover", warc_total=2, records_processed=10)

    with get_session() as session:
        progress = session.get(ArchiveJobIndexingProgress, job_id)
        assert progress is not None
        assert progress.records_processed == 0

    clock.advance(10)
    reporter.update(phase="discover", warc_total=2, records_processed=20)

    with get_session() as session:
        progress = session.get(ArchiveJobIndexingProgress, job_id)
        assert progress is not None
        assert progress.phase == "discover"
        assert progress.warc_total == 2
        assert progress.records_processed == 20
        assert progress.started_at.replace(tzinfo=timezone.utc) == datetime(
            2026, 7, 10, 12, 0, tzinfo=timezone.utc
        )
        assert progress.last_progress_at.replace(tzinfo=timezone.utc) == datetime(
            2026, 7, 10, 12, 0, 10, tzinfo=timezone.utc
        )


def test_reporter_writes_immediately_when_phase_or_current_warc_changes(
    tmp_path, monkeypatch
) -> None:
    job_id = _init_test_db(tmp_path, monkeypatch)
    clock = ManualClock()
    reporter = IndexingProgressReporter(
        job_id,
        heartbeat_interval_seconds=10,
        monotonic=clock.monotonic,
        now_utc=clock.now_utc,
    )

    reporter.update(phase="verify", warc_total=2)
    reporter.update(
        phase="read_warc",
        current_warc="warc-000001.warc.gz",
        warc_index=1,
        warc_total=2,
    )

    with get_session() as session:
        progress = session.get(ArchiveJobIndexingProgress, job_id)
        assert progress is not None
        assert progress.phase == "read_warc"
        assert progress.current_warc == "warc-000001.warc.gz"
        assert progress.warc_index == 1


def test_progress_payload_reports_non_negative_elapsed_and_age(tmp_path, monkeypatch) -> None:
    job_id = _init_test_db(tmp_path, monkeypatch)
    clock = ManualClock()
    reporter = IndexingProgressReporter(
        job_id,
        heartbeat_interval_seconds=0,
        monotonic=clock.monotonic,
        now_utc=clock.now_utc,
    )
    reporter.update(phase="read_warc", records_processed=123)

    with get_session() as session:
        progress = session.get(ArchiveJobIndexingProgress, job_id)
        assert progress is not None
        payload = indexing_progress_payload(
            progress,
            now_utc=datetime(2026, 7, 10, 11, 59, 59, tzinfo=timezone.utc),
        )

    assert payload["recordsProcessed"] == 123
    assert payload["elapsedSeconds"] == 0.0
    assert payload["lastProgressAgeSeconds"] == 0.0
    assert payload["startedAt"] == "2026-07-10T12:00:00+00:00"


def test_reporter_retains_failed_progress_and_clear_removes_it(tmp_path, monkeypatch) -> None:
    job_id = _init_test_db(tmp_path, monkeypatch)
    clock = ManualClock()
    reporter = IndexingProgressReporter(
        job_id,
        heartbeat_interval_seconds=0,
        monotonic=clock.monotonic,
        now_utc=clock.now_utc,
    )
    reporter.update(
        phase="read_warc",
        current_warc="warc-000002.warc.gz",
        warc_index=2,
        warc_total=3,
        records_processed=456,
    )

    reporter.mark_failed()

    with get_session() as session:
        progress = session.get(ArchiveJobIndexingProgress, job_id)
        assert progress is not None
        assert progress.phase == "failed"
        assert progress.current_warc == "warc-000002.warc.gz"
        assert progress.records_processed == 456

    reporter.clear()
    with get_session() as session:
        assert session.get(ArchiveJobIndexingProgress, job_id) is None


def test_reporter_disables_itself_after_persistence_failure(tmp_path, monkeypatch, caplog) -> None:
    job_id = _init_test_db(tmp_path, monkeypatch)

    def broken_session():
        raise RuntimeError("progress database unavailable")

    monkeypatch.setattr(progress_module, "get_session", broken_session)
    reporter = IndexingProgressReporter(job_id, heartbeat_interval_seconds=0)

    reporter.update(phase="discover")
    reporter.update(phase="verify")

    assert caplog.text.count("Disabling indexing progress persistence") == 1
