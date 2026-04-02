from __future__ import annotations

import io
import sys
from pathlib import Path

from warcio.statusandheaders import StatusAndHeaders
from warcio.warcwriter import WARCWriter

from archive_tool.constants import RESUME_CONFIG_FILE_NAME
from archive_tool.state import CrawlState
from ha_backend import cli as cli_module
from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.job_registry import create_job_for_source
from ha_backend.models import ArchiveJob
from ha_backend.seeds import seed_sources


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "cli_reset_crawl_state.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def _write_test_warc(path: Path, *, url: str, html: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        writer = WARCWriter(f, gzip=True)
        headers = StatusAndHeaders(
            "200 OK",
            [("Content-Type", "text/html; charset=utf-8")],
            protocol="HTTP/1.1",
        )
        record = writer.create_warc_record(
            url,
            "response",
            payload=io.BytesIO(html.encode("utf-8")),
            http_headers=headers,
        )
        writer.write_record(record)


def test_reset_crawl_state_consolidates_warcs_and_removes_temp_state(
    tmp_path: Path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)
    archive_root = tmp_path / "jobs"
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(archive_root))

    with get_session() as session:
        seed_sources(session)
        job_row = create_job_for_source("phac", session=session)
        job_id = job_row.id
        output_dir = tmp_path / "job-output"
        output_dir.mkdir(parents=True, exist_ok=True)
        job_row.output_dir = str(output_dir)
        session.flush()

    temp_dir = output_dir / ".tmpcapture"
    archive_dir = temp_dir / "collections" / "crawl-1" / "archive"
    archive_dir.mkdir(parents=True)
    _write_test_warc(
        archive_dir / "sample.warc.gz",
        url="https://www.canada.ca/en/public-health.html",
        html="<html><body>PHAC</body></html>",
    )

    state = CrawlState(output_dir, initial_workers=1)
    state.add_temp_dir(temp_dir)
    state.save_persistent_state()
    (output_dir / RESUME_CONFIG_FILE_NAME).write_text(
        "seeds:\n  - https://www.canada.ca/en/public-health.html\n",
        encoding="utf-8",
    )

    parser = cli_module.build_parser()
    args = parser.parse_args(["reset-crawl-state", "--id", str(job_id), "--apply"])

    stdout = io.StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        args.func(args)
    finally:
        sys.stdout = old_stdout

    out = stdout.getvalue()
    assert "Consolidated WARCs into" in out
    assert "[APPLIED]" in out
    assert not temp_dir.exists()
    assert not (output_dir / RESUME_CONFIG_FILE_NAME).exists()
    assert not (output_dir / ".archive_state.json").exists()

    stable_warcs = sorted((output_dir / "warcs").glob("*.warc.gz"))
    assert len(stable_warcs) == 1

    with get_session() as session:
        job = session.get(ArchiveJob, job_id)
        assert job is not None
        assert job.crawler_stage == "state_reset"
        assert job.state_file_path is None
        assert job.combined_log_path is None
