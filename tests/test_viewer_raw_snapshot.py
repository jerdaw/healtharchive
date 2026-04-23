from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from warcio.warcwriter import WARCWriter

from archive_tool.playwright_warc_backend import run_playwright_warc_capture
from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.indexing.pipeline import index_job
from ha_backend.indexing.viewer import find_record_for_snapshot
from ha_backend.models import ArchiveJob, Snapshot, Source
from ha_backend.url_normalization import normalize_url_for_grouping


def _init_test_app(tmp_path: Path, monkeypatch):
    """
    Configure a temporary SQLite DB and return a FastAPI TestClient.
    """
    db_path = tmp_path / "viewer.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    from ha_backend.api import app

    try:
        import uvloop  # noqa: F401
    except Exception:
        return TestClient(app)
    return TestClient(app, backend_options={"use_uvloop": True})


def _write_test_warc(warc_path: Path, url: str, html: str) -> str:
    """
    Create a tiny WARC file with a single HTML response and return its record ID.
    """
    warc_path.parent.mkdir(parents=True, exist_ok=True)
    with warc_path.open("wb") as f:
        writer = WARCWriter(f, gzip=True)
        payload = BytesIO(
            (
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: text/html; charset=utf-8\r\n"
                "Content-Length: " + str(len(html.encode("utf-8"))) + "\r\n"
                "\r\n" + html
            ).encode("utf-8")
        )
        record = writer.create_warc_record(
            uri=url,
            record_type="response",
            payload=payload,
            warc_headers_dict={"WARC-Date": "2025-01-01T12:00:00Z"},
        )
        writer.write_record(record)
        return record.rec_headers.get_header("WARC-Record-ID")


def _write_multi_record_warc(warc_path: Path, records: list[tuple[str, str]]) -> list[str]:
    warc_path.parent.mkdir(parents=True, exist_ok=True)
    record_ids: list[str] = []
    with warc_path.open("wb") as f:
        writer = WARCWriter(f, gzip=True)
        for url, html in records:
            payload = BytesIO(
                (
                    "HTTP/1.1 200 OK\r\n"
                    "Content-Type: text/html; charset=utf-8\r\n"
                    "Content-Length: " + str(len(html.encode("utf-8"))) + "\r\n"
                    "\r\n" + html
                ).encode("utf-8")
            )
            record = writer.create_warc_record(
                uri=url,
                record_type="response",
                payload=payload,
                warc_headers_dict={"WARC-Date": "2025-01-01T12:00:00Z"},
            )
            writer.write_record(record)
            record_ids.append(record.rec_headers.get_header("WARC-Record-ID"))
    return record_ids


def test_raw_snapshot_route_serves_html(tmp_path, monkeypatch) -> None:
    client = _init_test_app(tmp_path, monkeypatch)

    warc_dir = tmp_path / "warcs"
    warc_file = warc_dir / "test.warc.gz"
    url = "https://example.org/page"
    html_body = "<html><body><h1>Hello from WARC</h1></body></html>"
    record_id = _write_test_warc(warc_file, url, html_body)

    with get_session() as session:
        src = Source(
            code="test",
            name="Test Source",
            base_url="https://example.org",
            description="Test",
            enabled=True,
        )
        session.add(src)
        session.flush()

        snap = Snapshot(
            job_id=None,
            source_id=src.id,
            url=url,
            normalized_url_group=url,
            capture_timestamp=datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            mime_type="text/html",
            status_code=200,
            title="Test Page",
            snippet="Snippet",
            language="en",
            warc_path=str(warc_file),
            warc_record_id=record_id,
        )
        session.add(snap)
        session.flush()
        snapshot_id = snap.id

    resp = client.get(f"/api/snapshots/raw/{snapshot_id}")
    assert resp.status_code == 200
    assert "Hello from WARC" in resp.text


def test_find_record_for_snapshot_prefers_exact_record_id_without_url_fallback(tmp_path) -> None:
    warc_file = tmp_path / "warcs" / "multi.warc.gz"
    url = "https://example.org/page"
    record_ids = _write_multi_record_warc(
        warc_file,
        [
            (url, "<html><body><h1>Older Body</h1></body></html>"),
            (url, "<html><body><h1>Target Body</h1></body></html>"),
        ],
    )

    snapshot = Snapshot(
        id=1,
        job_id=None,
        source_id=1,
        url=url,
        normalized_url_group=url,
        capture_timestamp=datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
        mime_type="text/html",
        status_code=200,
        title="Target Snapshot",
        snippet="Target",
        language="en",
        warc_path=str(warc_file),
        warc_record_id=record_ids[1],
    )

    record = find_record_for_snapshot(snapshot)
    assert record is not None
    assert record.warc_record_id == record_ids[1]
    assert "Target Body" in record.body_bytes.decode("utf-8", errors="replace")


def test_raw_snapshot_missing_warc_returns_404(tmp_path, monkeypatch) -> None:
    """
    When the underlying WARC file is missing, the viewer should return 404
    with a meaningful error message.
    """
    client = _init_test_app(tmp_path, monkeypatch)

    missing_warc = tmp_path / "warcs" / "missing.warc.gz"
    url = "https://example.org/missing"

    with get_session() as session:
        src = Source(
            code="test",
            name="Test Source",
            base_url="https://example.org",
            description="Test",
            enabled=True,
        )
        session.add(src)
        session.flush()

        snap = Snapshot(
            job_id=None,
            source_id=src.id,
            url=url,
            normalized_url_group=url,
            capture_timestamp=datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            mime_type="text/html",
            status_code=200,
            title="Missing WARC Page",
            snippet="Snapshot with missing WARC",
            language="en",
            warc_path=str(missing_warc),
            warc_record_id="missing-id",
        )
        session.add(snap)
        session.flush()
        snapshot_id = snap.id

    resp = client.get(f"/api/snapshots/raw/{snapshot_id}")
    assert resp.status_code == 404
    body = resp.json()
    assert "Underlying WARC file" in body["detail"]


def test_playwright_warc_capture_indexes_and_replays_canonical_final_url(
    tmp_path, monkeypatch
) -> None:
    client = _init_test_app(tmp_path, monkeypatch)
    output_dir = tmp_path / "playwright-job"
    output_dir.mkdir()

    def fake_run_playwright_container(
        *,
        sink,
        seeds,
        scope_include_rx,
        scope_exclude_rx,
        expand_links,
        scratch_dir,
    ):
        bodies_dir = scratch_dir / "bodies"
        bodies_dir.mkdir(parents=True, exist_ok=True)
        body_html = "<html><body><h1>Canonical Final Page</h1></body></html>"
        (bodies_dir / "record-000001.bin").write_bytes(body_html.encode("utf-8"))
        manifest = {
            "runtime": {
                "playwrightVersion": "1.50.1",
                "chromiumVersion": "147.0.7727.15",
                "viewport": {"width": 1440, "height": 900},
                "locale": "en-CA",
                "timezone": "America/Toronto",
            },
            "records": [
                {
                    "requestedUrl": "https://example.org/start",
                    "finalUrl": "https://example.org/final",
                    "statusCode": 200,
                    "headers": {"content-type": "text/html; charset=utf-8"},
                    "bodyPath": "bodies/record-000001.bin",
                    "bodySource": "network_response",
                    "cookieCount": 2,
                    "captureTimestamp": "2026-04-03T05:06:06.051Z",
                    "contentType": "text/html",
                    "discoveredUrls": [],
                }
            ],
            "failures": [],
        }
        return 0, manifest

    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._run_playwright_container",
        fake_run_playwright_container,
    )

    run_playwright_warc_capture(
        output_dir=output_dir,
        seeds=["https://example.org/start"],
        zimit_passthrough_args=["--scopeType", "host"],
    )

    with get_session() as session:
        src = Source(
            code="test",
            name="Test Source",
            base_url="https://example.org",
            description="Test",
            enabled=True,
        )
        session.add(src)
        session.flush()

        job = ArchiveJob(
            source_id=src.id,
            name="playwright-warc-job",
            output_dir=str(output_dir),
            status="completed",
        )
        session.add(job)
        session.flush()
        job_id = job.id

    assert index_job(job_id) == 0

    with get_session() as session:
        snap = session.query(Snapshot).one()
        snapshot_id = snap.id
        assert snap.url == "https://example.org/final"
        assert snap.normalized_url_group == normalize_url_for_grouping("https://example.org/final")
        assert snap.warc_path.endswith("warcs/warc-000001.warc.gz")
        assert snap.warc_record_id is not None

    resp = client.get(f"/api/snapshots/raw/{snapshot_id}")
    assert resp.status_code == 200
    assert "Canonical Final Page" in resp.text
