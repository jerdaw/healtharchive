from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ha_backend import db as db_module
from ha_backend.annual_editions import (
    generate_coverage_report,
    plan_or_create_annual_shards,
    salvage_existing_annual_jobs,
)
from ha_backend.db import Base, get_engine, get_session
from ha_backend.job_registry import SOURCE_JOB_CONFIGS, build_job_config
from ha_backend.models import ArchiveJob, Snapshot, Source
from ha_backend.seeds import seed_sources


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "annual_editions.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("HEALTHARCHIVE_ARCHIVE_ROOT", str(tmp_path / "archive-root"))

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def _annual_config(source_code: str, year: int) -> dict:
    cfg = build_job_config(SOURCE_JOB_CONFIGS[source_code])
    cfg.update(
        {
            "campaign_kind": "annual",
            "campaign_year": year,
            "campaign_date": f"{year}-01-01",
            "campaign_date_utc": f"{year}-01-01T00:00:00Z",
        }
    )
    return cfg


def test_salvage_existing_annual_jobs_attaches_legacy_job(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        source = session.query(Source).filter_by(code="phac").one()
        job = ArchiveJob(
            source=source,
            name="phac-20260101",
            output_dir=str(tmp_path / "job"),
            status="indexed",
            config=_annual_config("phac", 2026),
        )
        session.add(job)
        session.flush()

        result = salvage_existing_annual_jobs(session, year=2026, source_codes=["phac"])
        session.flush()

        assert result.created_editions == 1
        assert result.attached_jobs == 1
        assert job.edition_id is not None
        assert job.shard_key == "legacy-full-site"


def test_generate_coverage_report_writes_artifacts_and_counts_fallback(
    tmp_path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        source = session.query(Source).filter_by(code="phac").one()
        job = ArchiveJob(
            source=source,
            name="phac-20260101",
            output_dir=str(tmp_path / "job"),
            status="indexed",
            indexed_page_count=1,
            config=_annual_config("phac", 2026),
        )
        session.add(job)
        session.flush()

        result = salvage_existing_annual_jobs(session, year=2026, source_codes=["phac"])
        edition = job.edition
        assert edition is not None

        snapshot = Snapshot(
            job=job,
            source=source,
            url="https://www.canada.ca/en/public-health.html",
            normalized_url_group="https://www.canada.ca/en/public-health.html",
            capture_timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
            mime_type="text/html",
            status_code=200,
            title="Public Health",
            snippet="Public Health",
            language="en",
            warc_path=str(tmp_path / "job" / "warcs" / "warc-000001.warc.gz"),
            capture_backend="playwright_warc",
            capture_fidelity="fallback",
        )
        session.add(snapshot)
        session.flush()

        report = generate_coverage_report(session, edition=edition)

        assert result.edition_ids == [edition.id]
        assert report["status"] == "research_ready"
        assert report["counts"]["captured_urls"] == 1
        assert report["counts"]["fallback_urls"] == 1
        assert Path(report["artifacts"]["target_ledger"]).is_file()
        report_json = Path(report["artifacts"]["coverage_report_json"])
        assert json.loads(report_json.read_text(encoding="utf-8"))["edition_id"] == edition.id
        assert edition.search_ready is True
        assert edition.research_ready is True


def test_plan_or_create_annual_shards_creates_language_shards(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        plan = plan_or_create_annual_shards(
            session,
            year=2027,
            source_codes=["cihr"],
            apply=True,
        )
        session.flush()

        assert [item.shard_key for item in plan] == ["lang-en", "lang-fr"]
        jobs = session.query(ArchiveJob).order_by(ArchiveJob.shard_key.asc()).all()
        assert len(jobs) == 2
        assert {job.shard_kind for job in jobs} == {"seed_group"}
        assert all(job.edition_id is not None for job in jobs)
        assert all((job.config or {}).get("scheduler_version") == "v2-sharded" for job in jobs)
        assert all((job.config or {}).get("shard_target_url_cap") == 5000 for job in jobs)


def test_plan_or_create_annual_shards_records_custom_cap(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        plan = plan_or_create_annual_shards(
            session,
            year=2027,
            source_codes=["cihr"],
            apply=True,
            shard_target_url_cap=2500,
        )
        session.flush()

        assert [item.action for item in plan] == ["create", "create"]
        jobs = session.query(ArchiveJob).order_by(ArchiveJob.shard_key.asc()).all()
        assert all((job.config or {}).get("shard_target_url_cap") == 2500 for job in jobs)


def test_plan_or_create_annual_shards_waits_for_salvage_report(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        source = session.query(Source).filter_by(code="cihr").one()
        job = ArchiveJob(
            source=source,
            name="cihr-20260101",
            output_dir=str(tmp_path / "job"),
            status="indexed",
            config=_annual_config("cihr", 2026),
        )
        session.add(job)
        session.flush()

        salvage_existing_annual_jobs(session, year=2026, source_codes=["cihr"])
        plan = plan_or_create_annual_shards(
            session,
            year=2026,
            source_codes=["cihr"],
            apply=False,
        )

        assert [item.action for item in plan] == ["skip", "skip"]
        assert all("salvage report" in (item.reason or "") for item in plan)


def test_generate_coverage_report_keeps_status_in_progress_with_blocking_shard(
    tmp_path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        source = session.query(Source).filter_by(code="cihr").one()
        indexed_job = ArchiveJob(
            source=source,
            name="cihr-20260101-lang-en",
            output_dir=str(tmp_path / "job-en"),
            status="indexed",
            indexed_page_count=1,
            config=_annual_config("cihr", 2026),
            shard_key="lang-en",
            shard_kind="seed_group",
        )
        queued_job = ArchiveJob(
            source=source,
            name="cihr-20260101-lang-fr",
            output_dir=str(tmp_path / "job-fr"),
            status="queued",
            config=_annual_config("cihr", 2026),
            shard_key="lang-fr",
            shard_kind="seed_group",
        )
        session.add_all([indexed_job, queued_job])
        session.flush()

        salvage_existing_annual_jobs(session, year=2026, source_codes=["cihr"])
        edition = indexed_job.edition
        assert edition is not None
        session.add(
            Snapshot(
                job=indexed_job,
                source=source,
                url=((indexed_job.config or {}).get("seeds") or [])[0],
                normalized_url_group=((indexed_job.config or {}).get("seeds") or [])[0],
                capture_timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
                mime_type="text/html",
                status_code=200,
                title="CIHR",
                snippet="CIHR",
                language="en",
                warc_path=str(tmp_path / "job-en" / "warcs" / "warc-000001.warc.gz"),
                capture_backend="browsertrix",
                capture_fidelity="high",
            )
        )
        session.flush()

        report = generate_coverage_report(session, edition=edition)

        assert report["search_ready"] is True
        assert report["research_ready"] is False
        assert report["status"] == "in_progress"


def test_plan_or_create_annual_shards_skips_when_salvage_has_no_gaps(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        source = session.query(Source).filter_by(code="cihr").one()
        job = ArchiveJob(
            source=source,
            name="cihr-20260101",
            output_dir=str(tmp_path / "job"),
            status="indexed",
            indexed_page_count=2,
            config=_annual_config("cihr", 2026),
        )
        session.add(job)
        session.flush()

        salvage_existing_annual_jobs(session, year=2026, source_codes=["cihr"])
        for seed_url in (job.config or {}).get("seeds") or []:
            session.add(
                Snapshot(
                    job=job,
                    source=source,
                    url=seed_url,
                    normalized_url_group=seed_url,
                    capture_timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
                    mime_type="text/html",
                    status_code=200,
                    title="CIHR",
                    snippet="CIHR",
                    language="en",
                    warc_path=str(tmp_path / "job" / "warcs" / "warc-000001.warc.gz"),
                    capture_backend="browsertrix",
                    capture_fidelity="high",
                )
            )
        session.flush()
        edition = job.edition
        assert edition is not None
        generate_coverage_report(session, edition=edition)

        plan = plan_or_create_annual_shards(
            session,
            year=2026,
            source_codes=["cihr"],
            apply=False,
        )

        assert [item.action for item in plan] == ["skip", "skip"]
        assert all("no documented gaps" in (item.reason or "") for item in plan)


def test_plan_or_create_annual_shards_creates_only_documented_missing_seed(
    tmp_path, monkeypatch
) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        source = session.query(Source).filter_by(code="cihr").one()
        job = ArchiveJob(
            source=source,
            name="cihr-20260101",
            output_dir=str(tmp_path / "job"),
            status="indexed",
            indexed_page_count=1,
            config=_annual_config("cihr", 2026),
        )
        session.add(job)
        session.flush()

        salvage_existing_annual_jobs(session, year=2026, source_codes=["cihr"])
        first_seed = ((job.config or {}).get("seeds") or [])[0]
        session.add(
            Snapshot(
                job=job,
                source=source,
                url=first_seed,
                normalized_url_group=first_seed,
                capture_timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
                mime_type="text/html",
                status_code=200,
                title="CIHR",
                snippet="CIHR",
                language="en",
                warc_path=str(tmp_path / "job" / "warcs" / "warc-000001.warc.gz"),
                capture_backend="browsertrix",
                capture_fidelity="high",
            )
        )
        session.flush()
        edition = job.edition
        assert edition is not None
        generate_coverage_report(session, edition=edition)

        plan = plan_or_create_annual_shards(
            session,
            year=2026,
            source_codes=["cihr"],
            apply=False,
        )

        assert [item.action for item in plan] == ["skip", "create"]
        assert "already covered" in (plan[0].reason or "")
        assert plan[1].shard_key == "lang-fr"
