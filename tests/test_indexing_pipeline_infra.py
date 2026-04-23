from __future__ import annotations

import pathlib
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.indexing.pipeline import index_job
from ha_backend.models import ArchiveJob, Snapshot, Source
from ha_backend.pages import PagesRebuildResult


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "indexing_infra.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def test_index_job_marks_index_failed_on_storage_infra_errno_107(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    output_dir = tmp_path / "stale-mount"

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
            name="indexing-infra",
            output_dir=str(output_dir),
            status="completed",
        )
        session.add(job)
        session.flush()
        job_id = job.id

    orig_stat = pathlib.Path.stat

    def raising_stat(self: pathlib.Path, *args, **kwargs):
        if Path(self) == output_dir:
            raise OSError(107, "Transport endpoint is not connected", str(self))
        return orig_stat(self, *args, **kwargs)

    monkeypatch.setattr(pathlib.Path, "stat", raising_stat)

    rc = index_job(job_id)
    assert rc != 0

    with get_session() as session:
        stored = session.get(ArchiveJob, job_id)
        assert stored is not None
        assert stored.status == "index_failed"


def test_index_job_logs_unknown_page_group_count_for_negative_rowcount(
    tmp_path, monkeypatch, caplog
) -> None:
    _init_test_db(tmp_path, monkeypatch)

    output_dir = tmp_path / "job-output"
    output_dir.mkdir()
    warc_path = output_dir / "dummy.warc.gz"

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
            name="indexing-unknown-rowcount",
            output_dir=str(output_dir),
            status="completed",
        )
        session.add(job)
        session.flush()
        job_id = job.id

        session.add(
            Snapshot(
                job_id=job.id,
                source_id=source.id,
                url="https://www.canada.ca/en/health-canada/example.html",
                normalized_url_group="https://www.canada.ca/en/health-canada/example.html",
                capture_timestamp=datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc),
                mime_type="text/html",
                status_code=200,
                title="Example",
                snippet="Example snippet",
                language="en",
                warc_path=str(warc_path),
                warc_record_id="stub-record",
            )
        )
        session.commit()

    monkeypatch.setattr(
        "ha_backend.indexing.pipeline._ensure_stable_warcs_available",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        "ha_backend.indexing.pipeline.discover_warcs_for_job",
        lambda _job: [warc_path],
    )
    monkeypatch.setattr(
        "ha_backend.indexing.pipeline.verify_warcs",
        lambda *_args, **_kwargs: SimpleNamespace(warcs_failed=0, failures=[], warcs_checked=1),
    )
    monkeypatch.setattr("ha_backend.indexing.pipeline.iter_html_records", lambda _path: iter(()))
    monkeypatch.setattr(
        "ha_backend.indexing.pipeline.compute_job_storage_stats",
        lambda **_kwargs: SimpleNamespace(
            warc_bytes_total=0,
            output_bytes_total=0,
            tmp_bytes_total=0,
            tmp_non_warc_bytes_total=0,
            scanned_at=datetime(2026, 4, 23, 8, 17, tzinfo=timezone.utc),
        ),
    )
    monkeypatch.setattr(
        "ha_backend.pages.rebuild_pages",
        lambda *_args, **_kwargs: PagesRebuildResult(upserted_groups=-2, deleted_groups=0),
    )

    caplog.set_level("INFO", logger="healtharchive.indexing")

    rc = index_job(job_id)

    assert rc == 0
    assert "Rebuilt unknown page group(s) (deleted 0) for job" in caplog.text
    assert "Rebuilt -2 page group(s)" not in caplog.text
