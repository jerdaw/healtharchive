from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def _write_fixture_evidence(tmp_path: Path) -> Path:
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()

    annual_status = {
        "campaignYear": 2026,
        "campaignDate": "2026-01-01",
        "summary": {
            "totalSources": 1,
            "indexed": 1,
            "inProgress": 0,
            "failed": 0,
            "missing": 0,
            "errors": 0,
            "readyForSearch": True,
        },
        "sources": [
            {
                "sourceCode": "hc",
                "expectedJobName": "hc-20260101",
                "status": "indexed",
                "isSearchReady": True,
                "job": {
                    "jobId": 6,
                    "jobName": "hc-20260101",
                    "indexedPageCount": 123,
                    "rescue": {
                        "effectiveBackend": "playwright_warc",
                        "status": "fallback-active",
                        "operatorState": "search-ready",
                    },
                },
            }
        ],
    }
    (evidence_dir / "annual-status.json").write_text(
        json.dumps(annual_status, indent=2),
        encoding="utf-8",
    )

    summary = {
        "schema_version": 1,
        "year": 2026,
        "run_id": "20260527T181251Z",
        "sources": ["hc"],
        "evidence_dir": str(evidence_dir),
        "production_ref": "adddee8ad1357ca7a4063dc12ff7e6e8762bf7dc",
        "production_ref_short": "adddee8ad135",
        "annual_summary": annual_status["summary"],
        "annual_sources": [
            {
                "source": "hc",
                "job_id": 6,
                "job_name": "hc-20260101",
                "status": "indexed",
                "indexed_pages": 123,
                "backend": "playwright_warc",
                "rescue": "fallback-active",
                "operator_state": "search-ready",
                "is_search_ready": True,
            }
        ],
        "gates": [
            {
                "name": "ha_check",
                "result": "pass",
                "evidence": "production-validation.log",
                "note": "ha-check completed",
            },
            {
                "name": "annual_status",
                "result": "pass",
                "evidence": "annual-status.json",
                "note": "ready",
            },
            {
                "name": "annual_search_verify",
                "result": "pass",
                "evidence": "annual-search-verify.log",
                "note": "search ok",
            },
            {
                "name": "public_surface",
                "result": "pass",
                "evidence": "public-surface.log",
                "note": "surface ok",
            },
            {
                "name": "baseline_drift",
                "result": "pass",
                "evidence": "production-validation.log",
                "note": "no drift",
            },
            {
                "name": "automation_posture",
                "result": "pass",
                "evidence": "automation-posture.log",
                "note": "automation ok",
            },
            {
                "name": "active_healtharchive_alerts",
                "result": "pass",
                "evidence": "active-healtharchive-alerts.txt",
                "note": "none",
            },
            {
                "name": "backup_chain",
                "result": "pass",
                "evidence": "backup-chain.tsv",
                "note": "backup ok",
            },
            {
                "name": "docker_cache_metrics",
                "result": "pass",
                "evidence": "docker-cache-metrics.prom",
                "note": "metrics ok",
            },
            {
                "name": "timer_posture",
                "result": "pass",
                "evidence": "timers.txt",
                "note": "timers ok",
            },
            {
                "name": "disk_headroom",
                "result": "pass",
                "evidence": "production-validation.log",
                "note": "disk ok",
            },
        ],
        "backup_rows": [
            {
                "scope": "local_dump",
                "date": "2026-05-27",
                "size_bytes": "1978095044",
                "path_or_metric": "/srv/healtharchive/backups/healtharchive_2026-05-27T033808Z.dump",
            },
            {
                "scope": "storagebox_dump",
                "date": "2026-05-27",
                "size_bytes": "1978095044",
                "path_or_metric": "/srv/healtharchive/storagebox/backups/db/healtharchive_2026-05-27T033808Z.dump",
            },
        ],
    }
    (evidence_dir / "closeout-summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )
    (evidence_dir / "nasd-followup-command.txt").write_text(
        "find /volume1/automated-backup-ingest/service-backups/healtharchive/logical-dumps "
        "-maxdepth 1 -type f -printf '%TY-%Tm-%Td %10s %p\\n' | sort | tail -20\n",
        encoding="utf-8",
    )
    return evidence_dir


def test_render_annual_closeout_report_from_fixture(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    evidence_dir = _write_fixture_evidence(tmp_path)
    out_path = tmp_path / "2026-annual-campaign-closeout.md"

    result = subprocess.run(
        [
            sys.executable,
            str(repo_root / "scripts" / "render_annual_closeout_report.py"),
            "--year",
            "2026",
            "--evidence-dir",
            str(evidence_dir),
            "--template",
            str(repo_root / "docs" / "_templates" / "annual-campaign-closeout-report-template.md"),
            "--out",
            str(out_path),
            "--closeout-date",
            "2026-05-27",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    report = out_path.read_text(encoding="utf-8")

    assert "# 2026 Annual Campaign Closeout Report" in report
    assert "| hc | 6 | indexed | 123 | playwright_warc / fallback-active | search-ready |" in report
    assert "Total indexed annual pages: `123`" in report
    assert "Ready for search: `yes`" in report
    assert "_Review required._ Complete one subsection per source before closure." in report
    assert "NASD output still requires operator review" in report
    for heading in [
        "## Executive Summary",
        "## Campaign Results",
        "## Data Completeness and Known Limits",
        "## Validation Summary",
        "## Source Notes",
        "## Incidents, Deviations, and Accepted Gaps",
        "## Using This Dataset",
        "## Backup, Retention, and Recovery Posture",
        "## Remaining Follow-Ups",
        "## Public-Safe Summary Text",
        "## Operator Handoff Text",
        "## References",
    ]:
        assert heading in report


def test_render_annual_closeout_report_refuses_overwrite(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    evidence_dir = _write_fixture_evidence(tmp_path)
    out_path = tmp_path / "existing.md"
    out_path.write_text("existing\n", encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            str(repo_root / "scripts" / "render_annual_closeout_report.py"),
            "--year",
            "2026",
            "--evidence-dir",
            str(evidence_dir),
            "--template",
            str(repo_root / "docs" / "_templates" / "annual-campaign-closeout-report-template.md"),
            "--out",
            str(out_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 2
    assert "pass --overwrite" in result.stderr


def test_rendered_annual_closeout_report_avoids_common_secret_patterns(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    evidence_dir = _write_fixture_evidence(tmp_path)
    out_path = tmp_path / "report.md"

    subprocess.run(
        [
            sys.executable,
            str(repo_root / "scripts" / "render_annual_closeout_report.py"),
            "--year",
            "2026",
            "--evidence-dir",
            str(evidence_dir),
            "--template",
            str(repo_root / "docs" / "_templates" / "annual-campaign-closeout-report-template.md"),
            "--out",
            str(out_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    report = out_path.read_text(encoding="utf-8")
    forbidden = [
        "HEALTHARCHIVE_ADMIN_TOKEN",
        "Authorization: Bearer",
        "postgres://",
        "postgresql://",
        "HC_DB_BACKUP_URL=",
        "api_key:",
        "password:",
        "secret:",
    ]
    for pattern in forbidden:
        assert pattern not in report
