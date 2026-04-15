from __future__ import annotations

import json
import sys
from io import StringIO
from pathlib import Path

from ha_backend import cli as cli_module
from ha_backend import db as db_module
from ha_backend.db import Base, get_engine, get_session
from ha_backend.job_registry import SOURCE_JOB_CONFIGS, build_job_config
from ha_backend.models import ArchiveJob, Source
from ha_backend.seeds import seed_sources


def _init_test_db(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "cli_annual_status.db"
    monkeypatch.setenv("HEALTHARCHIVE_DATABASE_URL", f"sqlite:///{db_path}")

    db_module._engine = None
    db_module._SessionLocal = None

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def _run_cli(args_list: list[str]) -> str:
    parser = cli_module.build_parser()
    args = parser.parse_args(args_list)

    stdout = StringIO()
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout
        args.func(args)
    finally:
        sys.stdout = old_stdout

    return stdout.getvalue()


def _create_annual_job(
    session,
    *,
    source_code: str,
    year: int,
    status: str,
    indexed_page_count: int = 0,
    crawler_exit_code: int | None = None,
    crawler_status: str | None = None,
    crawler_stage: str | None = None,
    retry_count: int = 0,
    last_stats_json: dict | None = None,
    execution_policy_override: dict | None = None,
) -> ArchiveJob:
    source = session.query(Source).filter_by(code=source_code).one()
    job_name = f"{source_code}-{year}0101"

    cfg = SOURCE_JOB_CONFIGS[source_code]
    job_cfg = build_job_config(cfg)
    if execution_policy_override:
        execution_policy = dict(job_cfg.get("execution_policy") or {})
        execution_policy.update(execution_policy_override)
        job_cfg["execution_policy"] = execution_policy
    job_cfg.update(
        {
            "campaign_kind": "annual",
            "campaign_year": year,
            "campaign_date": f"{year}-01-01",
            "campaign_date_utc": f"{year}-01-01T00:00:00Z",
            "scheduler_version": "v1",
        }
    )

    job = ArchiveJob(
        source=source,
        name=job_name,
        output_dir=f"/tmp/{job_name}",
        status=status,
        retry_count=retry_count,
        indexed_page_count=indexed_page_count,
        crawler_exit_code=crawler_exit_code,
        crawler_status=crawler_status,
        crawler_stage=crawler_stage,
        last_stats_json=last_stats_json,
        config=job_cfg,
    )
    session.add(job)
    session.flush()
    return job


def test_annual_status_reports_missing_jobs(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)

    out = _run_cli(["annual-status", "--year", "2027"])
    assert "Annual campaign status — 2027-01-01" in out
    assert "Ready for search: NO" in out
    assert "missing=3" in out
    assert "hc: MISSING annual job for 2027" in out
    assert "phac: MISSING annual job for 2027" in out
    assert "cihr: MISSING annual job for 2027" in out


def test_annual_status_json_summary_counts(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        session.flush()
        _create_annual_job(
            session,
            source_code="hc",
            year=2027,
            status="indexed",
            indexed_page_count=123,
            crawler_exit_code=0,
            crawler_status="success",
        )
        _create_annual_job(
            session,
            source_code="phac",
            year=2027,
            status="running",
        )
        _create_annual_job(
            session,
            source_code="cihr",
            year=2027,
            status="index_failed",
            crawler_exit_code=0,
            crawler_status="success",
        )

    out = _run_cli(["annual-status", "--year", "2027", "--json"])
    payload = json.loads(out)

    assert payload["campaignYear"] == 2027
    assert payload["campaignDate"] == "2027-01-01"

    summary = payload["summary"]
    assert summary["totalSources"] == 3
    assert summary["indexed"] == 1
    assert summary["failed"] == 1
    assert summary["missing"] == 0
    assert summary["errors"] == 0
    assert summary["inProgress"] == 1
    assert summary["readyForSearch"] is False


def test_annual_status_json_includes_rescue_and_operator_state(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        session.flush()
        _create_annual_job(
            session,
            source_code="hc",
            year=2027,
            status="running",
            crawler_stage="promoted_to_playwright_warc",
            last_stats_json={"backend": {"name": "playwright_warc"}},
            execution_policy_override={
                "capture_backend": "playwright_warc",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
                "primary_backend": "browsertrix",
                "last_promoted_from_backend": "browsertrix",
                "last_promotion_reason": "fresh_failure_budget_exhausted",
            },
        )
        _create_annual_job(
            session,
            source_code="phac",
            year=2027,
            status="retryable",
            retry_count=1,
            crawler_stage="fresh_failed",
            execution_policy_override={
                "capture_backend": "browsertrix",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
            },
        )

    out = _run_cli(["annual-status", "--year", "2027", "--json", "--sources", "hc", "phac"])
    payload = json.loads(out)

    summary = payload["summary"]
    assert summary["rescueStates"] == {
        "fallback-active": 1,
        "fresh-failed": 1,
    }
    assert summary["operatorStates"] == {
        "running-fallback": 1,
        "waiting-fresh-retry": 1,
    }

    hc_job = payload["sources"][0]["job"]
    assert hc_job["rescue"]["effectiveBackend"] == "playwright_warc"
    assert hc_job["rescue"]["status"] == "fallback-active"
    assert hc_job["rescue"]["operatorState"] == "running-fallback"

    phac_job = payload["sources"][1]["job"]
    assert phac_job["rescue"]["status"] == "fresh-failed"
    assert phac_job["rescue"]["operatorState"] == "waiting-fresh-retry"
    assert "awaiting next fresh browsertrix retry" in phac_job["rescue"]["operatorNote"]


def test_annual_status_detects_duplicate_candidates(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        session.flush()
        _create_annual_job(session, source_code="hc", year=2027, status="queued")
        _create_annual_job(session, source_code="hc", year=2027, status="queued")

    out = _run_cli(["annual-status", "--year", "2027"])
    assert "hc: ERROR - Multiple annual job candidates found" in out


def test_annual_status_sources_filter(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)

    out = _run_cli(["annual-status", "--year", "2027", "--json", "--sources", "hc"])
    payload = json.loads(out)

    assert payload["summary"]["totalSources"] == 1
    assert payload["sources"][0]["sourceCode"] == "hc"


def test_annual_status_text_surfaces_operator_state_and_note(tmp_path, monkeypatch) -> None:
    _init_test_db(tmp_path, monkeypatch)

    with get_session() as session:
        seed_sources(session)
        session.flush()
        _create_annual_job(
            session,
            source_code="phac",
            year=2027,
            status="retryable",
            retry_count=1,
            crawler_stage="fresh_failed",
            execution_policy_override={
                "capture_backend": "browsertrix",
                "fallback_backend": "playwright_warc",
                "resume_policy": "fresh_only",
                "max_fresh_failures_before_fallback": 2,
            },
        )

    out = _run_cli(["annual-status", "--year", "2027", "--sources", "phac"])
    assert "Rescue states: fresh-failed=1" in out
    assert "Operator states: waiting-fresh-retry=1" in out
    assert "operator_state=waiting-fresh-retry" in out
    assert "backend=browsertrix rescue=fresh-failed" in out
    assert "note: awaiting next fresh browsertrix retry within the configured rescue budget" in out
