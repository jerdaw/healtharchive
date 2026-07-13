from __future__ import annotations

import html
import json
import re
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ha_backend.archive_storage import (
    get_job_warc_manifest_path,
    verify_warc_manifest,
)
from ha_backend.indexing.warc_discovery import discover_all_warcs_for_job
from ha_backend.models import ArchiveJob, Snapshot, Source

IntegrityStatus = Literal["pass", "incomplete", "fail"]

SCHEMA_VERSION = 1
SUCCESSFUL_JOB_STATUSES = frozenset({"completed", "indexed"})
_SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
_STATUS_RANK: dict[IntegrityStatus, int] = {"pass": 0, "incomplete": 1, "fail": 2}


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _status_for_issues(issues: Counter[str]) -> IntegrityStatus:
    failing = {
        "manifest-invalid",
        "manifest-unreadable",
        "manifest-verification-failed",
        "snapshot-warc-missing",
        "snapshot-warc-path-missing",
        "snapshot-warc-unreadable",
        "snapshot-warc-zero-byte",
    }
    if any(issues[code] for code in failing):
        return "fail"
    if issues:
        return "incomplete"
    return "pass"


def _read_manifest_summary(manifest_path: Path) -> tuple[str, int, int]:
    """Return status, entry count, and entries with syntactically valid SHA-256."""
    try:
        if not manifest_path.is_file():
            return "missing", 0, 0
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except OSError:
        return "unreadable", 0, 0
    except UnicodeError:
        return "invalid", 0, 0
    except json.JSONDecodeError:
        return "invalid", 0, 0

    if not isinstance(payload, dict) or not isinstance(payload.get("entries"), list):
        return "invalid", 0, 0

    entries = payload["entries"]
    stable_names: set[str] = set()
    checksum_entries = 0
    for entry in entries:
        if not isinstance(entry, dict):
            return "invalid", len(entries), checksum_entries
        stable_name = entry.get("stable_name")
        size_bytes = entry.get("size_bytes")
        if (
            not isinstance(stable_name, str)
            or not stable_name
            or Path(stable_name).name != stable_name
            or stable_name in stable_names
            or not isinstance(size_bytes, int)
            or isinstance(size_bytes, bool)
            or size_bytes < 0
        ):
            return "invalid", len(entries), checksum_entries
        stable_names.add(stable_name)
        checksum = entry.get("sha256")
        if isinstance(checksum, str) and _SHA256_RE.fullmatch(checksum):
            checksum_entries += 1
    return "valid", len(entries), checksum_entries


def _verify_snapshot_warc_references(paths: set[str]) -> tuple[int, Counter[str]]:
    issues: Counter[str] = Counter()
    verified = 0
    for raw_path in sorted(paths):
        if not raw_path:
            issues["snapshot-warc-path-missing"] += 1
            continue
        try:
            path = Path(raw_path)
            if not path.is_file():
                issues["snapshot-warc-missing"] += 1
                continue
            if path.stat().st_size == 0:
                issues["snapshot-warc-zero-byte"] += 1
                continue
        except OSError:
            issues["snapshot-warc-unreadable"] += 1
            continue
        verified += 1
    return verified, issues


def _job_integrity(job: ArchiveJob, *, verify_checksums: bool) -> dict[str, Any]:
    issues: Counter[str] = Counter()
    canonical_count = 0
    canonical_bytes = 0
    manifest_entries = 0
    checksum_entries = 0
    checksum_verified_entries = 0
    manifest_present = False
    try:
        discovery = discover_all_warcs_for_job(job)
        canonical_count = discovery.count
        if discovery.manifest_status == "unreadable":
            issues["manifest-unreadable"] = 1
        elif discovery.manifest_status == "invalid":
            issues["manifest-invalid"] = 1
        for warc_path in discovery.warc_paths:
            try:
                canonical_bytes += warc_path.stat().st_size
            except OSError:
                issues["warc-stat-error"] += 1
    except Exception:
        # Deliberately do not retain or expose exception text or filesystem paths.
        discovery = None
        issues["discovery-error"] += 1

    if discovery is not None and canonical_count == 0:
        issues["no-canonical-warcs"] += 1

    manifest_path = get_job_warc_manifest_path(Path(job.output_dir))
    manifest_status, manifest_entries, checksum_entries = _read_manifest_summary(manifest_path)
    manifest_present = manifest_status != "missing"
    if manifest_status == "missing":
        issues["manifest-missing"] += 1
    elif manifest_status == "unreadable":
        issues["manifest-unreadable"] = 1
    elif manifest_status == "invalid":
        issues["manifest-invalid"] = 1
    else:
        try:
            verification = verify_warc_manifest(
                Path(job.output_dir), check_size=True, check_hash=verify_checksums
            )
        except Exception:
            issues["manifest-verification-failed"] += 1
        else:
            zero_byte = list(getattr(verification, "zero_byte", []))
            hard_failures = (
                len(verification.missing)
                + len(verification.size_mismatches)
                + len(verification.hash_mismatches)
                + len(verification.errors)
                + len(zero_byte)
            )
            if hard_failures:
                issues["manifest-verification-failed"] += 1
            if verification.orphaned:
                issues["manifest-coverage-gap"] += len(verification.orphaned)
            if verify_checksums:
                checksum_verified_entries = verification.entries_verified

    if manifest_status == "valid" and manifest_entries != canonical_count:
        issues["manifest-coverage-gap"] += 1
    if checksum_entries != manifest_entries:
        issues["checksum-missing"] += manifest_entries - checksum_entries
    if not verify_checksums:
        issues["checksums-not-verified"] += 1

    return {
        "status": _status_for_issues(issues),
        "canonical_warc_files": canonical_count,
        "canonical_warc_bytes": canonical_bytes,
        "manifest_present": manifest_present,
        "manifest_entries": manifest_entries,
        "checksum_entries": checksum_entries,
        "checksum_verified_entries": checksum_verified_entries,
        "issues": dict(sorted(issues.items())),
    }


def build_data_integrity_report(
    session: Session,
    *,
    generated_at: datetime | None = None,
    verify_checksums: bool = True,
) -> dict[str, Any]:
    """Build a deterministic, aggregate, public-safe archive integrity report."""
    generated_at = generated_at or datetime.now(UTC)
    sources = list(session.scalars(select(Source).order_by(Source.code, Source.id)))
    snapshot_counts: dict[int | None, int] = {
        source_id: int(count)
        for source_id, count in session.execute(
            select(Snapshot.source_id, func.count(Snapshot.id)).group_by(Snapshot.source_id)
        )
    }
    snapshots_total = int(session.scalar(select(func.count(Snapshot.id))) or 0)
    unassigned_snapshots = int(snapshot_counts.get(None, 0))
    snapshots_without_jobs = int(
        session.scalar(select(func.count(Snapshot.id)).where(Snapshot.job_id.is_(None))) or 0
    )
    jobs = list(
        session.scalars(
            select(ArchiveJob)
            .where(ArchiveJob.status.in_(SUCCESSFUL_JOB_STATUSES))
            .order_by(ArchiveJob.source_id, ArchiveJob.finished_at, ArchiveJob.id)
        )
    )

    jobs_by_source: dict[int, list[ArchiveJob]] = {}
    unassigned_jobs = 0
    for job in jobs:
        if job.source_id is None:
            unassigned_jobs += 1
        else:
            jobs_by_source.setdefault(job.source_id, []).append(job)

    snapshot_paths_by_source: dict[int | None, set[str]] = {}
    for source_id, warc_path in session.execute(
        select(Snapshot.source_id, Snapshot.warc_path).distinct()
    ):
        snapshot_paths_by_source.setdefault(source_id, set()).add(
            str(warc_path) if warc_path is not None else ""
        )

    source_reports: list[dict[str, Any]] = []
    report_issue_counts: Counter[str] = Counter()
    summary_totals: Counter[str] = Counter()
    for source in sources:
        source_jobs = jobs_by_source.get(source.id, [])
        latest = max(
            source_jobs,
            key=lambda job: (job.finished_at or job.updated_at or job.created_at, job.id),
            default=None,
        )
        job_reports = [
            _job_integrity(job, verify_checksums=verify_checksums) for job in source_jobs
        ]
        source_issues: Counter[str] = Counter()
        for job_report in job_reports:
            source_issues.update(job_report["issues"])
        source_snapshot_paths = snapshot_paths_by_source.get(source.id, set())
        snapshot_warc_references_verified, snapshot_reference_issues = (
            _verify_snapshot_warc_references(source_snapshot_paths)
        )
        source_issues.update(snapshot_reference_issues)

        source_status: IntegrityStatus = "pass"
        for job_report in job_reports:
            if _STATUS_RANK[job_report["status"]] > _STATUS_RANK[source_status]:
                source_status = job_report["status"]
        if not source_jobs:
            source_status = "incomplete"
            source_issues["no-successful-jobs"] += 1
        elif latest is not None and latest.finished_at is None:
            source_issues["latest-successful-finished-at-missing"] += 1
            if source_status == "pass":
                source_status = "incomplete"
        snapshot_reference_status = _status_for_issues(snapshot_reference_issues)
        if _STATUS_RANK[snapshot_reference_status] > _STATUS_RANK[source_status]:
            source_status = snapshot_reference_status

        canonical_files = sum(item["canonical_warc_files"] for item in job_reports)
        canonical_bytes = sum(item["canonical_warc_bytes"] for item in job_reports)
        manifest_jobs = sum(bool(item["manifest_present"]) for item in job_reports)
        manifest_entries = sum(item["manifest_entries"] for item in job_reports)
        checksum_entries = sum(item["checksum_entries"] for item in job_reports)
        checksum_verified = sum(item["checksum_verified_entries"] for item in job_reports)
        snapshot_warc_references = len(source_snapshot_paths)
        report_issue_counts.update(source_issues)
        summary_totals.update(
            {
                "canonical_warc_files": canonical_files,
                "canonical_warc_bytes": canonical_bytes,
                "jobs_with_manifests": manifest_jobs,
                "manifest_entries": manifest_entries,
                "checksum_entries": checksum_entries,
                "checksum_verified_entries": checksum_verified,
                "snapshot_warc_references": snapshot_warc_references,
                "snapshot_warc_references_verified": snapshot_warc_references_verified,
            }
        )
        source_reports.append(
            {
                "code": source.code,
                "name": source.name,
                "status": source_status,
                "snapshot_count": int(snapshot_counts.get(source.id, 0)),
                "successful_job_count": len(source_jobs),
                "latest_successful_job": (
                    {
                        "status": latest.status,
                        "finished_at": _isoformat(latest.finished_at),
                    }
                    if latest is not None
                    else None
                ),
                "canonical_warc_files": canonical_files,
                "canonical_warc_bytes": canonical_bytes,
                "jobs_with_manifests": manifest_jobs,
                "manifest_entries": manifest_entries,
                "checksum_entries": checksum_entries,
                "checksum_verified_entries": checksum_verified,
                "snapshot_warc_references": snapshot_warc_references,
                "snapshot_warc_references_verified": snapshot_warc_references_verified,
                "issues": dict(sorted(source_issues.items())),
            }
        )

    if unassigned_jobs:
        report_issue_counts["unassigned-successful-jobs"] += unassigned_jobs
    unassigned_snapshot_paths = snapshot_paths_by_source.get(None, set())
    unassigned_references_verified, unassigned_reference_issues = _verify_snapshot_warc_references(
        unassigned_snapshot_paths
    )
    report_issue_counts.update(unassigned_reference_issues)
    summary_totals.update(
        {
            "snapshot_warc_references": len(unassigned_snapshot_paths),
            "snapshot_warc_references_verified": unassigned_references_verified,
        }
    )
    known_source_ids = {source.id for source in sources}
    unknown_source_reference_status: IntegrityStatus = "pass"
    for source_id in sorted(
        source_id
        for source_id in snapshot_paths_by_source
        if source_id is not None and source_id not in known_source_ids
    ):
        unknown_paths = snapshot_paths_by_source[source_id]
        unknown_verified, unknown_issues = _verify_snapshot_warc_references(unknown_paths)
        report_issue_counts.update(unknown_issues)
        report_issue_counts["snapshots-with-missing-source"] += int(
            snapshot_counts.get(source_id, 0)
        )
        summary_totals.update(
            {
                "snapshot_warc_references": len(unknown_paths),
                "snapshot_warc_references_verified": unknown_verified,
            }
        )
        candidate_status = _status_for_issues(unknown_issues)
        if candidate_status == "pass":
            candidate_status = "incomplete"
        if _STATUS_RANK[candidate_status] > _STATUS_RANK[unknown_source_reference_status]:
            unknown_source_reference_status = candidate_status
    if unassigned_snapshots:
        report_issue_counts["unassigned-snapshots"] += unassigned_snapshots
    if snapshots_without_jobs:
        report_issue_counts["snapshots-without-jobs"] += snapshots_without_jobs
    if not sources:
        report_issue_counts["no-sources"] += 1
    overall_status: IntegrityStatus = "pass"
    for source_report in source_reports:
        if _STATUS_RANK[source_report["status"]] > _STATUS_RANK[overall_status]:
            overall_status = source_report["status"]
    unassigned_reference_status = _status_for_issues(unassigned_reference_issues)
    if _STATUS_RANK[unassigned_reference_status] > _STATUS_RANK[overall_status]:
        overall_status = unassigned_reference_status
    if _STATUS_RANK[unknown_source_reference_status] > _STATUS_RANK[overall_status]:
        overall_status = unknown_source_reference_status
    if unassigned_jobs and overall_status == "pass":
        overall_status = "incomplete"
    if unassigned_snapshots and overall_status == "pass":
        overall_status = "incomplete"
    if snapshots_without_jobs and overall_status == "pass":
        overall_status = "incomplete"
    if not sources:
        overall_status = "incomplete"

    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _isoformat(generated_at),
        "status": overall_status,
        "checksum_verification": "sha256" if verify_checksums else "not-checked",
        "summary": {
            "source_count": len(sources),
            "snapshot_count": snapshots_total,
            "unassigned_snapshot_count": unassigned_snapshots,
            "snapshot_without_job_count": snapshots_without_jobs,
            "successful_job_count": len(jobs),
            "unassigned_successful_job_count": unassigned_jobs,
            "canonical_warc_files": summary_totals["canonical_warc_files"],
            "canonical_warc_bytes": summary_totals["canonical_warc_bytes"],
            "jobs_with_manifests": summary_totals["jobs_with_manifests"],
            "manifest_entries": summary_totals["manifest_entries"],
            "checksum_entries": summary_totals["checksum_entries"],
            "checksum_verified_entries": summary_totals["checksum_verified_entries"],
            "snapshot_warc_references": summary_totals["snapshot_warc_references"],
            "snapshot_warc_references_verified": summary_totals[
                "snapshot_warc_references_verified"
            ],
            "issues": dict(sorted(report_issue_counts.items())),
        },
        "sources": source_reports,
    }


def serialize_data_integrity_json(report: dict[str, Any]) -> str:
    """Serialize a report reproducibly for an atomic-write caller."""
    return json.dumps(report, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def _escape_markdown_table_cell(value: object) -> str:
    """Render untrusted text as one inert Markdown table cell."""
    normalized = str(value).replace("\r", " ").replace("\n", " ")
    return html.escape(normalized, quote=False).replace("|", "&#124;")


def render_data_integrity_markdown(report: dict[str, Any]) -> str:
    """Render the aggregate report without exposing artifact or host paths."""
    summary = report["summary"]
    lines = [
        "# HealthArchive data integrity report",
        "",
        f"Generated: {report['generated_at']}",
        f"Overall status: **{str(report['status']).upper()}**",
        f"Checksum verification: {report['checksum_verification']}",
        "",
        "## Summary",
        "",
        f"- Sources: {summary['source_count']}",
        f"- Snapshots: {summary['snapshot_count']}",
        f"- Unassigned snapshots: {summary['unassigned_snapshot_count']}",
        f"- Snapshots without jobs: {summary['snapshot_without_job_count']}",
        f"- Successful jobs: {summary['successful_job_count']}",
        f"- Canonical WARCs: {summary['canonical_warc_files']}",
        f"- Canonical WARC bytes: {summary['canonical_warc_bytes']}",
        f"- Jobs with manifests: {summary['jobs_with_manifests']}",
        f"- Manifest entries: {summary['manifest_entries']}",
        f"- Checksum entries: {summary['checksum_entries']}",
        f"- Checksum entries verified: {summary['checksum_verified_entries']}",
        f"- Snapshot WARC references: {summary['snapshot_warc_references']}",
        f"- Snapshot WARC references readable: {summary['snapshot_warc_references_verified']}",
        "",
        "## Sources",
        "",
        "| Source | Status | Snapshots | Successful jobs | WARCs | Manifest entries | Checksums verified | Latest successful completion |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for source in report["sources"]:
        latest = source["latest_successful_job"]
        latest_at = latest["finished_at"] if latest is not None else "—"
        source_code = _escape_markdown_table_cell(source["code"])
        lines.append(
            f"| {source_code} | {str(source['status']).upper()} | "
            f"{source['snapshot_count']} | {source['successful_job_count']} | "
            f"{source['canonical_warc_files']} | {source['manifest_entries']} | "
            f"{source['checksum_verified_entries']} | {latest_at or '—'} |"
        )
    if summary["issues"]:
        lines.extend(["", "## Aggregate findings", ""])
        for code, count in summary["issues"].items():
            lines.append(f"- `{code}`: {count}")
    return "\n".join(lines) + "\n"


__all__ = [
    "SCHEMA_VERSION",
    "SUCCESSFUL_JOB_STATUSES",
    "build_data_integrity_report",
    "render_data_integrity_markdown",
    "serialize_data_integrity_json",
]
