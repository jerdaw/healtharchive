from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from ha_backend import cli as cli_module
from ha_backend.data_integrity_report import (
    build_data_integrity_report,
    render_data_integrity_markdown,
    serialize_data_integrity_json,
)
from ha_backend.models import ArchiveJob, Snapshot, Source

GENERATED_AT = datetime(2026, 7, 13, 16, 30, tzinfo=UTC)


def _add_job(
    session: Session,
    source: Source | None,
    output_dir: Path,
    *,
    status: str = "indexed",
    finished_at: datetime = GENERATED_AT,
) -> ArchiveJob:
    job = ArchiveJob(
        source=source,
        name="internal-job-name",
        output_dir=str(output_dir),
        status=status,
        finished_at=finished_at,
    )
    session.add(job)
    session.flush()
    return job


def _write_manifested_warc(output_dir: Path, content: bytes = b"WARC payload") -> None:
    warcs_dir = output_dir / "warcs"
    warcs_dir.mkdir(parents=True)
    warc_path = warcs_dir / "warc-000001.warc.gz"
    warc_path.write_bytes(content)
    manifest = {
        "version": 1,
        "entries": [
            {
                "source_path": "/private/source/never-publish.warc.gz",
                "stable_name": warc_path.name,
                "link_type": "copy",
                "size_bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            }
        ],
    }
    (warcs_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")


def _add_snapshot(session: Session, source: Source, job: ArchiveJob, ordinal: int) -> None:
    session.add(
        Snapshot(
            source=source,
            job=job,
            url=f"https://example.invalid/{ordinal}",
            capture_timestamp=GENERATED_AT,
            warc_path=str(Path(job.output_dir) / "warcs" / "warc-000001.warc.gz"),
        )
    )


def test_report_aggregates_sources_jobs_snapshots_and_verified_warcs(
    db_session: Session, tmp_path: Path
) -> None:
    source_b = Source(code="zeta", name="Zéta Health")
    source_a = Source(code="alpha", name="Alpha Health")
    db_session.add_all([source_b, source_a])
    db_session.flush()

    old_dir = tmp_path / "secret-old-output"
    latest_dir = tmp_path / "secret-latest-output"
    zeta_dir = tmp_path / "secret-zeta-output"
    for output_dir, content in (
        (old_dir, b"old"),
        (latest_dir, b"latest"),
        (zeta_dir, b"zeta"),
    ):
        _write_manifested_warc(output_dir, content)

    old_job = _add_job(
        db_session,
        source_a,
        old_dir,
        status="completed",
        finished_at=GENERATED_AT - timedelta(days=1),
    )
    latest_job = _add_job(db_session, source_a, latest_dir)
    _add_job(db_session, source_b, zeta_dir)
    _add_job(db_session, source_a, tmp_path / "ignored-failed", status="failed")
    _add_snapshot(db_session, source_a, old_job, 1)
    _add_snapshot(db_session, source_a, latest_job, 2)
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)

    assert report["schema_version"] == 1
    assert report["generated_at"] == "2026-07-13T16:30:00Z"
    assert report["status"] == "pass"
    assert report["checksum_verification"] == "sha256"
    assert report["summary"] == {
        "source_count": 2,
        "snapshot_count": 2,
        "unassigned_snapshot_count": 0,
        "snapshot_without_job_count": 0,
        "successful_job_count": 3,
        "unassigned_successful_job_count": 0,
        "canonical_warc_files": 3,
        "canonical_warc_bytes": 13,
        "jobs_with_manifests": 3,
        "manifest_entries": 3,
        "checksum_entries": 3,
        "checksum_verified_entries": 3,
        "snapshot_warc_references": 2,
        "snapshot_warc_references_verified": 2,
        "issues": {},
    }
    assert [source["code"] for source in report["sources"]] == ["alpha", "zeta"]
    alpha = report["sources"][0]
    assert alpha["snapshot_count"] == 2
    assert alpha["successful_job_count"] == 2
    assert alpha["latest_successful_job"] == {
        "status": "indexed",
        "finished_at": "2026-07-13T16:30:00Z",
    }

    serialized = serialize_data_integrity_json(report)
    markdown = render_data_integrity_markdown(report)
    assert serialized == serialize_data_integrity_json(report)
    assert "Zéta Health" not in markdown  # Markdown uses stable source codes only.
    for private_value in (str(tmp_path), "secret-latest-output", "internal-job-name"):
        assert private_value not in serialized
        assert private_value not in markdown


def test_missing_manifest_and_unverified_mode_are_incomplete(
    db_session: Session, tmp_path: Path
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-output"
    (output_dir / "warcs").mkdir(parents=True)
    (output_dir / "warcs" / "warc-000001.warc.gz").write_bytes(b"captured")
    _add_job(db_session, source, output_dir)
    db_session.commit()

    report = build_data_integrity_report(
        db_session, generated_at=GENERATED_AT, verify_checksums=False
    )

    assert report["status"] == "incomplete"
    assert report["checksum_verification"] == "not-checked"
    assert report["summary"]["canonical_warc_files"] == 1
    assert report["summary"]["issues"] == {
        "checksums-not-verified": 1,
        "manifest-missing": 1,
    }


def test_invalid_manifest_and_checksum_mismatch_fail_without_leaking_details(
    db_session: Session, tmp_path: Path
) -> None:
    source = Source(code="phac", name="Public Health Agency")
    db_session.add(source)
    db_session.flush()
    invalid_dir = tmp_path / "private-invalid"
    (invalid_dir / "warcs").mkdir(parents=True)
    (invalid_dir / "warcs" / "warc-000001.warc.gz").write_bytes(b"one")
    (invalid_dir / "warcs" / "manifest.json").write_text("not json", encoding="utf-8")
    mismatch_dir = tmp_path / "private-mismatch"
    _write_manifested_warc(mismatch_dir, b"expected")
    manifest_path = mismatch_dir / "warcs" / "manifest.json"
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    payload["entries"][0]["sha256"] = "0" * 64
    manifest_path.write_text(json.dumps(payload), encoding="utf-8")
    _add_job(db_session, source, invalid_dir)
    _add_job(db_session, source, mismatch_dir)
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)
    serialized = serialize_data_integrity_json(report)

    assert report["status"] == "fail"
    assert report["summary"]["issues"] == {
        "manifest-invalid": 1,
        "manifest-verification-failed": 1,
    }
    assert str(tmp_path) not in serialized
    assert "not json" not in serialized


def test_invalid_utf8_manifest_is_bounded_without_leaking_details(
    db_session: Session, tmp_path: Path
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-invalid-utf8"
    (output_dir / "warcs").mkdir(parents=True)
    (output_dir / "warcs" / "warc-000001.warc.gz").write_bytes(b"one")
    (output_dir / "warcs" / "manifest.json").write_bytes(b"\xff\xfe")
    _add_job(db_session, source, output_dir)
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)
    serialized = serialize_data_integrity_json(report)

    assert report["status"] == "fail"
    assert report["summary"]["issues"] == {
        "discovery-error": 1,
        "manifest-invalid": 1,
    }
    assert str(tmp_path) not in serialized


def test_markdown_escapes_untrusted_source_codes(
    db_session: Session,
) -> None:
    source = Source(code="hc|bad\n<script>", name="Health Canada")
    db_session.add(source)
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)
    markdown = render_data_integrity_markdown(report)

    assert "hc|bad" not in markdown
    assert "<script>" not in markdown
    assert "hc&#124;bad &lt;script&gt;" in markdown


def test_discovery_errors_are_bounded_and_source_without_jobs_is_incomplete(
    db_session: Session, tmp_path: Path, monkeypatch
) -> None:
    source = Source(code="hc", name="Health Canada")
    empty_source = Source(code="phac", name="Public Health Agency")
    db_session.add_all([source, empty_source])
    db_session.flush()
    output_dir = tmp_path / "private-output"
    _write_manifested_warc(output_dir)
    _add_job(db_session, source, output_dir)
    db_session.commit()

    def _raise_discovery(_job):
        raise RuntimeError("secret host /srv/private must never appear")

    monkeypatch.setattr(
        "ha_backend.data_integrity_report.discover_all_warcs_for_job", _raise_discovery
    )
    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)
    serialized = serialize_data_integrity_json(report)

    assert report["status"] == "incomplete"
    assert report["summary"]["issues"] == {
        "discovery-error": 1,
        "manifest-coverage-gap": 1,
        "no-successful-jobs": 1,
    }
    assert "secret host" not in serialized
    assert "/srv/private" not in serialized


def test_unassigned_successful_job_is_counted_but_never_inspected(
    db_session: Session, tmp_path: Path
) -> None:
    _add_job(db_session, None, tmp_path / "private-unassigned")
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)

    assert report["status"] == "incomplete"
    assert report["summary"]["successful_job_count"] == 1
    assert report["summary"]["unassigned_successful_job_count"] == 1
    assert report["summary"]["issues"] == {
        "no-sources": 1,
        "unassigned-successful-jobs": 1,
    }


def test_empty_database_cannot_report_a_false_pass(db_session: Session) -> None:
    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)

    assert report["status"] == "incomplete"
    assert report["summary"]["issues"] == {"no-sources": 1}


def test_unassigned_snapshot_and_missing_completion_are_incomplete(
    db_session: Session, tmp_path: Path
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-job-output"
    _write_manifested_warc(output_dir)
    job = _add_job(db_session, source, output_dir)
    job.finished_at = None
    db_session.add(
        Snapshot(
            source=None,
            job=job,
            url="https://example.invalid/unassigned",
            capture_timestamp=GENERATED_AT,
            warc_path=str(output_dir / "warcs" / "warc-000001.warc.gz"),
        )
    )
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)

    assert report["status"] == "incomplete"
    assert report["summary"]["unassigned_snapshot_count"] == 1
    assert report["summary"]["issues"] == {
        "latest-successful-finished-at-missing": 1,
        "unassigned-snapshots": 1,
    }
    assert report["sources"][0]["latest_successful_job"]["finished_at"] is None


def test_missing_snapshot_warc_reference_fails_without_leaking_path(
    db_session: Session, tmp_path: Path
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-job-output"
    _write_manifested_warc(output_dir)
    _add_job(db_session, source, output_dir)
    failed_job = _add_job(db_session, source, tmp_path / "failed-output", status="failed")
    db_session.add(
        Snapshot(
            source=source,
            job=failed_job,
            url="https://example.invalid/missing",
            capture_timestamp=GENERATED_AT,
            warc_path=str(tmp_path / "secret-missing.warc.gz"),
        )
    )
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)
    serialized = serialize_data_integrity_json(report)

    assert report["status"] == "fail"
    assert report["summary"]["snapshot_warc_references"] == 1
    assert report["summary"]["snapshot_warc_references_verified"] == 0
    assert report["summary"]["issues"] == {"snapshot-warc-missing": 1}
    assert "secret-missing" not in serialized


def test_blank_snapshot_warc_reference_is_a_bounded_failure(
    db_session: Session, tmp_path: Path
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-job-output"
    _write_manifested_warc(output_dir)
    job = _add_job(db_session, source, output_dir)
    db_session.add(
        Snapshot(
            source=source,
            job=job,
            url="https://example.invalid/blank",
            capture_timestamp=GENERATED_AT,
            warc_path="",
        )
    )
    db_session.commit()

    report = build_data_integrity_report(db_session, generated_at=GENERATED_AT)

    assert report["status"] == "fail"
    assert report["summary"]["issues"] == {"snapshot-warc-path-missing": 1}


def test_cli_writes_public_safe_json_and_markdown_atomically(
    db_session: Session, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-job-output"
    _write_manifested_warc(output_dir)
    _add_job(db_session, source, output_dir)
    db_session.commit()
    json_out = tmp_path / "published" / "integrity.json"
    markdown_out = tmp_path / "published" / "integrity.md"

    args = cli_module.build_parser().parse_args(
        [
            "data-integrity-report",
            "--json-out",
            str(json_out),
            "--markdown-out",
            str(markdown_out),
            "--stdout-format",
            "json",
        ]
    )
    args.func(args)

    stdout_payload = json.loads(capsys.readouterr().out)
    file_payload = json.loads(json_out.read_text(encoding="utf-8"))
    markdown = markdown_out.read_text(encoding="utf-8")
    assert stdout_payload == file_payload
    assert file_payload["status"] == "pass"
    assert "Overall status: **PASS**" in markdown
    for private_value in (str(tmp_path), "private-job-output", "/private/source"):
        assert private_value not in json_out.read_text(encoding="utf-8")
        assert private_value not in markdown
    assert list((tmp_path / "published").glob(".*.tmp.*")) == []


def test_cli_refuses_partial_overwrite_before_collecting(
    db_session: Session, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    json_out = tmp_path / "integrity.json"
    markdown_out = tmp_path / "integrity.md"
    markdown_out.write_text("keep me\n", encoding="utf-8")
    args = cli_module.build_parser().parse_args(
        [
            "data-integrity-report",
            "--json-out",
            str(json_out),
            "--markdown-out",
            str(markdown_out),
        ]
    )

    with pytest.raises(SystemExit) as exc_info:
        args.func(args)

    assert exc_info.value.code == 2
    assert not json_out.exists()
    assert markdown_out.read_text(encoding="utf-8") == "keep me\n"
    assert "Refusing to overwrite" in capsys.readouterr().err


def test_cli_rolls_back_artifact_set_when_destination_appears_during_publish(
    db_session: Session,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-job-output"
    _write_manifested_warc(output_dir)
    _add_job(db_session, source, output_dir)
    db_session.commit()
    json_out = tmp_path / "integrity.json"
    markdown_out = tmp_path / "integrity.md"
    real_link = cli_module.os.link

    def racing_link(source_path, destination_path):
        if Path(destination_path) == markdown_out:
            markdown_out.write_text("concurrent publisher\n", encoding="utf-8")
        return real_link(source_path, destination_path)

    monkeypatch.setattr(cli_module.os, "link", racing_link)
    args = cli_module.build_parser().parse_args(
        [
            "data-integrity-report",
            "--json-out",
            str(json_out),
            "--markdown-out",
            str(markdown_out),
        ]
    )

    with pytest.raises(SystemExit) as exc_info:
        args.func(args)

    assert exc_info.value.code == 1
    assert not json_out.exists()
    assert markdown_out.read_text(encoding="utf-8") == "concurrent publisher\n"
    assert "Failed to write" in capsys.readouterr().err


def test_artifact_staging_failure_removes_partial_temp_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    destination = tmp_path / "integrity.json"

    def fail_fsync(_file_descriptor: int) -> None:
        raise OSError("simulated fsync failure")

    monkeypatch.setattr(cli_module.os, "fsync", fail_fsync)

    with pytest.raises(OSError, match="simulated fsync failure"):
        cli_module._write_data_integrity_artifacts(
            [(destination, "partial content")], overwrite=False
        )

    assert not destination.exists()
    assert list(tmp_path.glob(".integrity.json.tmp.*")) == []


def test_cli_fast_inventory_is_explicitly_incomplete(
    db_session: Session, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = Source(code="hc", name="Health Canada")
    db_session.add(source)
    db_session.flush()
    output_dir = tmp_path / "private-job-output"
    _write_manifested_warc(output_dir)
    _add_job(db_session, source, output_dir)
    db_session.commit()
    args = cli_module.build_parser().parse_args(
        ["data-integrity-report", "--skip-checksums", "--stdout-format", "json"]
    )

    with pytest.raises(SystemExit) as exc_info:
        args.func(args)

    assert exc_info.value.code == 2
    payload = json.loads(capsys.readouterr().out)
    assert payload["status"] == "incomplete"
    assert payload["checksum_verification"] == "not-checked"
