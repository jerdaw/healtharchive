from __future__ import annotations

import gzip
import importlib.util
import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

from sqlalchemy.orm import Session
from warcio.statusandheaders import StatusAndHeaders
from warcio.warcwriter import WARCWriter

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


def _create_mixed_warc(warc_path: Path) -> None:
    with gzip.open(warc_path, "wb") as gz:
        writer = WARCWriter(gz, gzip=True)
        records = [
            (
                "https://www.canada.ca/en/public-health/services/diseases/measles.html",
                "text/html; charset=utf-8",
                b"<html><body>measles</body></html>",
            ),
            (
                "https://www.canada.ca/content/dam/phac-aspc/documents/report.pdf",
                "application/pdf",
                b"%PDF-1.4 test",
            ),
            (
                "https://www.canada.ca/content/dam/phac-aspc/video/briefing.mp4",
                "video/mp4",
                b"000000",
            ),
            (
                "https://www.canada.ca/etc/designs/canada/wet-boew/css/theme.min.css",
                "text/css",
                b"body{color:black}",
            ),
        ]
        for url, content_type, payload in records:
            http_headers = StatusAndHeaders(
                "200 OK",
                [("Content-Type", content_type), ("Content-Length", str(len(payload)))],
                protocol="HTTP/1.1",
            )
            record = writer.create_warc_record(
                url,
                "response",
                payload=io.BytesIO(payload),
                http_headers=http_headers,
            )
            writer.write_record(record)


def _seed_job(
    db_session: Session,
    *,
    tmp_path: Path,
    source_code: str,
    name: str,
    status: str = "running",
) -> ArchiveJob:
    seed_sources(db_session)
    db_session.flush()
    source = db_session.query(Source).filter_by(code=source_code).one()
    job = ArchiveJob(
        source=source,
        name=name,
        status=status,
        started_at=datetime.now(timezone.utc),
        output_dir=str(tmp_path / "jobdir"),
        config={},
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


def test_classify_content_uses_extension_and_mime_heuristics() -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_classify",
    )

    assert mod.classify_content("https://example.com/page.html") == "html"
    assert mod.classify_content("https://example.com/app.js") == "render_asset"
    assert mod.classify_content("https://example.com/report.pdf") == "document"
    assert mod.classify_content("https://example.com/data.zip") == "archive"
    assert mod.classify_content("https://example.com/video.mp4") == "media"
    assert mod.classify_content("https://example.com/download", "application/pdf") == "document"


def test_load_backend_env_file_sets_database_url_when_missing(monkeypatch, tmp_path: Path) -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_env_autoload",
    )

    env_file = tmp_path / "backend.env"
    env_file.write_text(
        "\n".join(
            [
                "# comment",
                "HEALTHARCHIVE_DATABASE_URL=postgresql://example/db",
                "HEALTHARCHIVE_ADMIN_TOKEN='secret-token'",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.delenv("HEALTHARCHIVE_DATABASE_URL", raising=False)
    monkeypatch.delenv("HEALTHARCHIVE_ADMIN_TOKEN", raising=False)
    monkeypatch.setattr(mod, "DEFAULT_BACKEND_ENV_FILE", env_file)

    mod._load_backend_env_file()

    assert os.environ["HEALTHARCHIVE_DATABASE_URL"] == "postgresql://example/db"
    assert os.environ["HEALTHARCHIVE_ADMIN_TOKEN"] == "secret-token"


def test_load_backend_env_file_does_not_override_existing_database_url(
    monkeypatch, tmp_path: Path
) -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_env_preserve",
    )

    env_file = tmp_path / "backend.env"
    env_file.write_text(
        "HEALTHARCHIVE_DATABASE_URL=postgresql://from-file/db\n",
        encoding="utf-8",
    )

    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", "postgresql://existing/db")
    monkeypatch.setattr(mod, "DEFAULT_BACKEND_ENV_FILE", env_file)

    mod._load_backend_env_file()

    assert os.environ["HEALTHARCHIVE_DATABASE_URL"] == "postgresql://existing/db"


def test_summarize_log_text_groups_repeated_failing_families() -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_logs",
    )
    text = "\n".join(
        [
            "Navigation timeout at https://www.canada.ca/en/public-health/services/diseases/measles.html",
            "net::ERR_HTTP2_PROTOCOL_ERROR https://www.canada.ca/content/dam/phac-aspc/video/briefing.mp4",
            "Attempting adaptive container restart after timeout churn",
            "Navigation timeout at https://www.canada.ca/en/public-health/services/diseases/measles.html?utm_source=x",
        ]
    )

    summary = mod.summarize_log_text(text)

    assert summary["timeout_count"] == 3
    assert summary["http_network_count"] == 0
    assert summary["repeated_failing_url_families"][0]["key"].endswith("/en/public-health/services")
    assert summary["restart_adjacent_url_families"]


def test_main_emits_json_report_without_mutating_state(
    db_session: Session, tmp_path: Path, capsys
) -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_main",
    )
    job = _seed_job(
        db_session,
        tmp_path=tmp_path,
        source_code="phac",
        name="phac-20260101",
    )
    output_dir = Path(job.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    state_path = output_dir / ".archive_state.json"
    tmp_dir = output_dir / ".tmpcrawl"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    state_path.write_text(
        json.dumps({"container_restarts_done": 4, "temp_dirs_host_paths": [str(tmp_dir)]}),
        encoding="utf-8",
    )
    original_state = state_path.read_text(encoding="utf-8")

    log_path = output_dir / "archive_resume_crawl_attempt_1.combined.log"
    log_path.write_text(
        "\n".join(
            [
                '{"timestamp":"2026-03-23T10:00:00Z","context":"crawlStatus","message":"Crawl statistics","details":{"crawled":100,"total":500,"pending":400,"failed":1}}',
                "Navigation timeout at https://www.canada.ca/content/dam/phac-aspc/documents/report.pdf",
                "Navigation timeout at https://www.canada.ca/content/dam/phac-aspc/video/briefing.mp4",
                "Attempting adaptive container restart after timeout churn",
                '{"timestamp":"2026-03-23T10:10:00Z","context":"crawlStatus","message":"Crawl statistics","details":{"crawled":100,"total":500,"pending":399,"failed":2}}',
            ]
        ),
        encoding="utf-8",
    )

    warc_dir = tmp_dir / "collections" / "crawl-123" / "archive"
    warc_dir.mkdir(parents=True, exist_ok=True)
    _create_mixed_warc(warc_dir / "sample.warc.gz")

    json_out = tmp_path / "report.json"
    rc = mod.main(["--job-id", str(job.id), "--json-out", str(json_out), "--max-warc-files", "4"])
    assert rc == 0

    report = json.loads(json_out.read_text(encoding="utf-8"))
    assert report["job_metadata"]["job_id"] == job.id
    assert report["job_metadata"]["source"] == "phac"
    assert report["crawl_health_summary"]["container_restarts_done"] == 4
    assert report["content_cost_summary"]["warc_count_total"] == 1
    assert report["content_cost_summary"]["class_totals"]["document"]["count"] >= 1
    assert report["content_cost_summary"]["class_totals"]["media"]["count"] >= 1
    assert report["recommendation_hints"]
    assert state_path.read_text(encoding="utf-8") == original_state

    out = capsys.readouterr().out
    assert "HealthArchive crawl content-cost report" in out
    assert "job_id=" in out


def test_report_scans_previous_logs_when_latest_log_is_quiet(
    db_session: Session, tmp_path: Path
) -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_multilog",
    )
    job = _seed_job(
        db_session,
        tmp_path=tmp_path,
        source_code="phac",
        name="phac-20260101",
    )
    output_dir = Path(job.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / ".archive_state.json").write_text(
        json.dumps({"container_restarts_done": 30}),
        encoding="utf-8",
    )

    older_log = output_dir / "archive_resume_crawl_-_attempt_52_20260323_160000.combined.log"
    older_log.write_text(
        "\n".join(
            [
                "Navigation timeout at https://www.canada.ca/content/dam/phac-aspc/documents/report.pdf",
                "Navigation timeout at https://www.canada.ca/content/dam/phac-aspc/video/briefing.mp4",
                "Attempting adaptive container restart after timeout churn",
            ]
        ),
        encoding="utf-8",
    )

    latest_log = output_dir / "archive_resume_crawl_-_attempt_53_20260323_163136.combined.log"
    latest_log.write_text(
        '{"timestamp":"2026-03-23T16:31:36Z","message":"Resume stage still running"}\n',
        encoding="utf-8",
    )
    os.utime(older_log, (1_711_209_600, 1_711_209_600))
    os.utime(latest_log, (1_711_209_601, 1_711_209_601))

    report = mod.generate_report(
        job_id=job.id,
        year=None,
        source_code=None,
        max_log_bytes=1024 * 1024,
        max_log_files=4,
        max_warc_files=1,
    )

    assert report["job_metadata"]["combined_log_path"].endswith(
        "archive_resume_crawl_-_attempt_53_20260323_163136.combined.log"
    )
    assert report["job_metadata"]["combined_log_count_total"] == 2
    assert report["error_family_summary"]["combined_log_count_scanned"] == 2
    assert report["error_family_summary"]["timeout_count"] == 2
    assert report["error_family_summary"]["repeated_failing_url_families"]
    assert report["error_family_summary"]["repeated_failing_url_families"][0]["key"].endswith(
        "/content/dam/phac-aspc"
    )


def test_main_can_lookup_annual_job_by_year_and_source(
    db_session: Session, tmp_path: Path, capsys
) -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_lookup",
    )
    job = _seed_job(
        db_session,
        tmp_path=tmp_path,
        source_code="hc",
        name="hc-20260101",
        status="retryable",
    )
    output_dir = Path(job.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / ".archive_state.json").write_text("{}", encoding="utf-8")
    warcs_dir = output_dir / "warcs"
    warcs_dir.mkdir(parents=True, exist_ok=True)
    _create_mixed_warc(warcs_dir / "stable.warc.gz")

    rc = mod.main(["--year", "2026", "--source", "hc", "--max-warc-files", "4"])
    assert rc == 0
    out = capsys.readouterr().out
    assert "source=hc" in out
