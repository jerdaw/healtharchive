from __future__ import annotations

import io
import sys
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

from warcio.archiveiterator import ArchiveIterator
from warcio.statusandheaders import StatusAndHeaders
from warcio.warcwriter import WARCWriter

from ha_backend import cli as cli_module
from ha_backend import db as db_module
from ha_backend.archive_storage import get_job_warcs_dir
from ha_backend.db import Base, get_engine, get_session
from ha_backend.models import ArchiveJob, Snapshot, Source


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "compact-warcs.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def _write_response_record(
    writer: WARCWriter,
    *,
    url: str,
    content_type: str,
    payload: bytes,
) -> str:
    headers = StatusAndHeaders(
        "200 OK",
        [
            ("Content-Type", content_type),
            ("Content-Length", str(len(payload))),
        ],
        protocol="HTTP/1.1",
    )
    record = writer.create_warc_record(
        url,
        "response",
        payload=io.BytesIO(payload),
        http_headers=headers,
    )
    record_id = record.rec_headers.get_header("WARC-Record-ID")
    assert record_id
    writer.write_record(record)
    return record_id


def _seed_indexed_job_with_html_and_video(tmp_path: Path) -> tuple[int, Path, str, str]:
    output_dir = tmp_path / "job-output"
    warcs_dir = get_job_warcs_dir(output_dir)
    warcs_dir.mkdir(parents=True)
    warc_path = warcs_dir / "warc-000001.warc.gz"

    html_payload = b"<html><body>keep me</body></html>"
    video_payload = b"video bytes" * 1024
    with warc_path.open("wb") as fh:
        writer = WARCWriter(fh, gzip=True)
        html_record_id = _write_response_record(
            writer,
            url="https://example.test/page.html",
            content_type="text/html; charset=utf-8",
            payload=html_payload,
        )
        video_record_id = _write_response_record(
            writer,
            url="https://example.test/video.mp4",
            content_type="video/mp4",
            payload=video_payload,
        )

    with get_session() as session:
        source = Source(code="cihr", name="CIHR", enabled=True)
        session.add(source)
        session.flush()
        job = ArchiveJob(
            source_id=source.id,
            name="cihr-compact",
            output_dir=str(output_dir),
            status="indexed",
        )
        session.add(job)
        session.flush()
        snapshot = Snapshot(
            job_id=job.id,
            source_id=source.id,
            url="https://example.test/page.html",
            normalized_url_group="https://example.test/page.html",
            capture_timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
            status_code=200,
            mime_type="text/html",
            warc_path=str(warc_path.resolve()),
            warc_record_id=html_record_id,
        )
        session.add(snapshot)
        session.flush()
        return job.id, warc_path, html_record_id, video_record_id


def _run_cli(args: list[str]) -> str:
    parser = cli_module.build_parser()
    parsed = parser.parse_args(args)
    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        parsed.func(parsed)
    finally:
        sys.stdout = old_stdout
    return stdout.getvalue()


def test_compact_warcs_dry_run_reports_media_drop_without_writing(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id, warc_path, _record_id, _video_id = _seed_indexed_job_with_html_and_video(tmp_path)

    output = _run_cli(["compact-warcs", "--id", str(job_id)])

    assert "Mode:          DRY-RUN" in output
    assert "video/mp4" in output
    assert "Snapshot records found:    1/1" in output
    assert not (warc_path.parent.parent / "warcs_compacted").exists()


def test_compact_warcs_counts_url_only_snapshot_references(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id, _warc_path, _record_id, _video_id = _seed_indexed_job_with_html_and_video(tmp_path)

    with get_session() as session:
        snapshot = (
            session.query(Snapshot).filter(Snapshot.url == "https://example.test/page.html").one()
        )
        snapshot.warc_record_id = None

    output = _run_cli(["compact-warcs", "--id", str(job_id)])

    assert "Snapshot records found:    1/1" in output


def test_compact_warcs_apply_stages_compacted_warc_and_preserves_html(
    tmp_path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id, warc_path, html_record_id, _video_id = _seed_indexed_job_with_html_and_video(tmp_path)
    staging_dir = tmp_path / "staged-compact"

    output = _run_cli(
        [
            "compact-warcs",
            "--id",
            str(job_id),
            "--apply",
            "--staging-dir",
            str(staging_dir),
        ]
    )

    assert "Mode:          APPLY-STAGE" in output
    assert "Snapshot records found:    1/1" in output
    staged_warc = staging_dir / "warc-000001.warc.gz"
    assert staged_warc.is_file()
    assert (staging_dir / "manifest.json").is_file()
    assert (staging_dir / "compaction-report.json").is_file()
    assert warc_path.is_file()

    response_types = []
    html_ids = []
    with staged_warc.open("rb") as fh:
        for record in ArchiveIterator(fh):
            if record.rec_type != "response":
                continue
            ctype = record.http_headers.get_header("Content-Type") or ""
            response_types.append(ctype.split(";", 1)[0].lower())
            html_ids.append(record.rec_headers.get_header("WARC-Record-ID"))

    assert response_types == ["text/html"]
    assert html_record_id in html_ids


def test_compact_warcs_refuses_to_drop_snapshot_referenced_record(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)
    job_id, warc_path, _html_id, video_record_id = _seed_indexed_job_with_html_and_video(tmp_path)

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        snapshot = Snapshot(
            job_id=job.id,
            source_id=job.source_id,
            url="https://example.test/video.mp4",
            normalized_url_group="https://example.test/video.mp4",
            capture_timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
            status_code=200,
            mime_type="video/mp4",
            warc_path=str(warc_path.resolve()),
            warc_record_id=video_record_id,
        )
        session.add(snapshot)

    parser = cli_module.build_parser()
    parsed = parser.parse_args(["compact-warcs", "--id", str(job_id)])
    try:
        parsed.func(parsed)
    except SystemExit as exc:
        assert exc.code == 1
    else:  # pragma: no cover - defensive test failure path
        raise AssertionError("compact-warcs should refuse to drop a referenced record")
