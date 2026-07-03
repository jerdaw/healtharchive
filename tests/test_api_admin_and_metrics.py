from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.models import AnnualEdition, ArchiveJob, Snapshot, Source


def _init_test_app(tmp_path: Path, monkeypatch) -> TestClient:
    """
    Configure a temporary SQLite DB and return a FastAPI TestClient.
    """
    db_path = tmp_path / "api_admin_test.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    # Reset cached engine/session so we pick up the new URL.
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


def _seed_basic_data() -> None:
    """
    Seed a single source, a couple of jobs, and some snapshots.
    """
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

        now = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)

        job1 = ArchiveJob(
            source_id=src.id,
            name="job1",
            output_dir="/tmp/job1",
            status="queued",
        )
        job2 = ArchiveJob(
            source_id=src.id,
            name="job2",
            output_dir="/tmp/job2",
            status="completed",
            pages_crawled=10,
            pages_total=20,
            pages_failed=1,
            warc_file_count=2,
            warc_bytes_total=123,
            indexed_page_count=5,
            output_bytes_total=456,
            tmp_bytes_total=789,
            tmp_non_warc_bytes_total=321,
            storage_scanned_at=now,
        )
        session.add_all([job1, job2])
        session.flush()

        snap = Snapshot(
            job_id=job2.id,
            source_id=src.id,
            url="https://www.canada.ca/en/health-canada.html",
            normalized_url_group="https://www.canada.ca/en/health-canada.html",
            capture_timestamp=now,
            mime_type="text/html",
            status_code=200,
            title="HC Home",
            snippet="Health Canada home",
            language="en",
            warc_path="/warcs/hc1.warc.gz",
            warc_record_id="hc-1",
        )
        session.add(snap)


def _allow_dev_admin_without_token(monkeypatch) -> None:
    monkeypatch.delenv("HEALTHARCHIVE_ADMIN_TOKEN", raising=False)
    monkeypatch.delenv("HEALTHARCHIVE_ENV", raising=False)
    monkeypatch.setenv("HEALTHARCHIVE_ALLOW_DEV_ADMIN_NO_TOKEN", "true")


def _seed_annual_edition() -> int:
    with get_session() as session:
        src = session.query(Source).filter(Source.code == "hc").one()
        edition = AnnualEdition(
            source=src,
            year=2026,
            status="needs_review",
            search_ready=True,
            research_ready=False,
            intended_url_count=3,
            captured_url_count=2,
            failed_url_count=1,
            missing_url_count=1,
            excluded_url_count=0,
            fallback_url_count=1,
            shard_count=1,
            indexed_shard_count=1,
            needs_review_shard_count=1,
            backend_counts={"browsertrix": 1, "playwright_warc": 1},
            coverage_summary={"standard": "documented_attainable"},
            target_ledger_path="/srv/healtharchive/editions/hc/2026/target-ledger.jsonl",
            capture_manifest_path="/srv/healtharchive/editions/hc/2026/capture-manifest.jsonl",
            coverage_report_json_path="/srv/healtharchive/editions/hc/2026/report.json",
            coverage_report_md_path="/srv/healtharchive/editions/hc/2026/report.md",
        )
        session.add(edition)
        session.flush()
        job = ArchiveJob(
            source=src,
            edition=edition,
            name="hc-20260101-lang-en",
            output_dir="/tmp/hc-shard",
            status="failed",
            shard_key="lang-en",
            shard_kind="seed_group",
            acceptance_state="needs_review",
            coverage_report_path="/srv/healtharchive/editions/hc/2026/report.json",
            indexed_page_count=2,
            pages_crawled=2,
            pages_total=3,
            pages_failed=1,
            retry_count=2,
        )
        session.add(job)
        session.flush()
        return int(edition.id)


def test_admin_jobs_fail_closed_when_no_token_by_default(tmp_path, monkeypatch) -> None:
    monkeypatch.delenv("HEALTHARCHIVE_ADMIN_TOKEN", raising=False)
    monkeypatch.delenv("HEALTHARCHIVE_ENV", raising=False)
    monkeypatch.delenv("HEALTHARCHIVE_ALLOW_DEV_ADMIN_NO_TOKEN", raising=False)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/api/admin/jobs")
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Admin token not configured for this environment"


def test_admin_jobs_open_without_token_only_with_explicit_dev_override(
    tmp_path, monkeypatch
) -> None:
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/api/admin/jobs")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 2
    assert len(body["items"]) >= 2


def test_admin_jobs_require_token_when_configured(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("HEALTHARCHIVE_ADMIN_TOKEN", "secret-token")
    monkeypatch.delenv("HEALTHARCHIVE_ENV", raising=False)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    # Missing token -> forbidden
    resp = client.get("/api/admin/jobs")
    assert resp.status_code == 403

    # Wrong token -> forbidden
    resp = client.get(
        "/api/admin/jobs",
        headers={"Authorization": "Bearer wrong"},
    )
    assert resp.status_code == 403

    # Correct token -> allowed
    resp = client.get(
        "/api/admin/jobs",
        headers={"Authorization": "Bearer secret-token"},
    )
    assert resp.status_code == 200


@pytest.mark.parametrize("path", ["/api/admin/jobs", "/metrics"])
def test_admin_surfaces_accept_x_admin_token_when_configured(
    path: str, tmp_path, monkeypatch
) -> None:
    monkeypatch.setenv("HEALTHARCHIVE_ADMIN_TOKEN", "test-token")
    monkeypatch.delenv("HEALTHARCHIVE_ENV", raising=False)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get(path, headers={"X-Admin-Token": "test-token"})
    assert resp.status_code == 200


def test_admin_job_detail_and_status_counts(tmp_path, monkeypatch) -> None:
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/api/admin/jobs")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert items
    assert "warcBytesTotal" in items[0]
    assert "storageScannedAt" in items[0]
    job_id = items[0]["id"]

    # Job detail
    detail_resp = client.get(f"/api/admin/jobs/{job_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == job_id
    assert "outputDir" in detail
    assert "status" in detail
    assert "warcBytesTotal" in detail
    assert "outputBytesTotal" in detail
    assert "tmpBytesTotal" in detail
    assert "tmpNonWarcBytesTotal" in detail
    assert "storageScannedAt" in detail

    # Status counts
    counts_resp = client.get("/api/admin/jobs/status-counts")
    assert counts_resp.status_code == 200
    counts = counts_resp.json()["counts"]
    assert "queued" in counts or "completed" in counts


def test_admin_job_snapshots_endpoint(tmp_path, monkeypatch) -> None:
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/api/admin/jobs")
    job_id = resp.json()["items"][0]["id"]

    snaps_resp = client.get(f"/api/admin/jobs/{job_id}/snapshots")
    assert snaps_resp.status_code == 200
    snapshots = snaps_resp.json()
    assert isinstance(snapshots, list)


def test_admin_annual_edition_exposes_artifacts_and_shards(tmp_path, monkeypatch) -> None:
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()
    edition_id = _seed_annual_edition()

    resp = client.get(f"/api/admin/annual-editions/{edition_id}")
    assert resp.status_code == 200
    body = resp.json()

    assert body["editionId"] == edition_id
    assert body["targetLedgerPath"].endswith("/target-ledger.jsonl")
    assert body["coverageReportJsonPath"].endswith("/report.json")
    assert body["backendCounts"] == {"browsertrix": 1, "playwright_warc": 1}
    assert body["shards"][0]["shardKey"] == "lang-en"
    assert body["shards"][0]["acceptanceState"] == "needs_review"


def test_metrics_require_token_when_configured(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("HEALTHARCHIVE_ADMIN_TOKEN", "secret-token")
    monkeypatch.delenv("HEALTHARCHIVE_ENV", raising=False)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    # Missing token -> forbidden
    resp = client.get("/metrics")
    assert resp.status_code == 403

    # Correct token -> allowed
    resp = client.get("/metrics", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200


def test_metrics_content_includes_basic_counters(tmp_path, monkeypatch) -> None:
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/metrics")
    assert resp.status_code == 200
    body = resp.text

    # We expect at least the job, snapshot, and page metrics headers.
    assert "healtharchive_jobs_total" in body
    assert "healtharchive_snapshots_total" in body
    assert "healtharchive_jobs_pages_crawled_total" in body
    assert "healtharchive_jobs_pages_failed_total" in body
    assert "healtharchive_jobs_warc_bytes_total" in body
    assert "healtharchive_jobs_storage_scanned_total" in body


def test_metrics_include_cleanup_status_labels(tmp_path, monkeypatch) -> None:
    """
    /metrics should emit cleanup_status breakdown when jobs exist with
    different cleanup_status values.
    """
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    # Mark one job as temp_cleaned to exercise the label.
    with get_session() as session:
        job = session.query(ArchiveJob).first()
        assert job is not None
        job.cleanup_status = "temp_cleaned"
        session.commit()

    resp = client.get("/metrics")
    assert resp.status_code == 200
    body = resp.text

    assert 'healtharchive_jobs_cleanup_status_total{cleanup_status="none"}' in body
    assert 'healtharchive_jobs_cleanup_status_total{cleanup_status="temp_cleaned"}' in body


def test_metrics_include_page_totals_and_per_source(tmp_path, monkeypatch) -> None:
    """
    /metrics should emit global and per-source page counters based on
    ArchiveJob.pages_* fields.
    """
    _allow_dev_admin_without_token(monkeypatch)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/metrics")
    assert resp.status_code == 200
    body = resp.text

    # From _seed_basic_data we have one job with pages_crawled=10 and pages_failed=1.
    assert "healtharchive_jobs_pages_crawled_total" in body
    assert "healtharchive_jobs_pages_failed_total" in body
    assert 'healtharchive_jobs_pages_crawled_total{source="hc"}' in body
    assert 'healtharchive_jobs_pages_failed_total{source="hc"}' in body
    assert "healtharchive_jobs_warc_bytes_total 123" in body
    assert 'healtharchive_jobs_warc_bytes_total{source="hc"} 123' in body


def test_admin_requires_token_when_env_is_production(tmp_path, monkeypatch) -> None:
    """
    In production/staging environments, admin endpoints should fail closed if
    HEALTHARCHIVE_ADMIN_TOKEN is not configured.
    """
    monkeypatch.setenv("HEALTHARCHIVE_ENV", "production")
    monkeypatch.delenv("HEALTHARCHIVE_ADMIN_TOKEN", raising=False)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get("/api/admin/jobs")
    assert resp.status_code == 500
    body = resp.json()
    assert body["detail"] == "Admin token not configured for this environment"


@pytest.mark.parametrize("env", ["production", "staging"])
@pytest.mark.parametrize("path", ["/api/admin/jobs", "/metrics"])
def test_admin_surfaces_fail_closed_when_env_requires_token(
    env: str, path: str, tmp_path, monkeypatch
) -> None:
    monkeypatch.setenv("HEALTHARCHIVE_ENV", env)
    monkeypatch.delenv("HEALTHARCHIVE_ADMIN_TOKEN", raising=False)
    client = _init_test_app(tmp_path, monkeypatch)
    _seed_basic_data()

    resp = client.get(path)
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Admin token not configured for this environment"
