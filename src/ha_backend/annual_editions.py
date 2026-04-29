from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from ha_backend.archive_contract import ArchiveJobConfig
from ha_backend.config import get_archive_tool_config
from ha_backend.job_registry import (
    build_job_config,
    build_output_dir_for_job,
    get_config_for_source,
)
from ha_backend.models import AnnualEdition, ArchiveJob, Snapshot, Source

SHARD_TARGET_URL_CAP = 5000
ANNUAL_SOURCES_ORDERED = ("hc", "phac", "cihr")
BLOCKING_JOB_STATUSES = {"queued", "retryable", "running", "completed", "indexing", "index_failed"}
REVIEW_JOB_STATUSES = {"failed", "index_failed"}
ACCEPTED_STATES = {"accepted", "accepted_gap", "excluded"}


@dataclass(frozen=True)
class ReconcileIndexingResult:
    indexed: int
    failed: int
    skipped: int
    job_ids: list[int]


@dataclass(frozen=True)
class SalvageResult:
    created_editions: int
    attached_jobs: int
    skipped_jobs: int
    edition_ids: list[int]


@dataclass(frozen=True)
class ShardPlanItem:
    source_code: str
    year: int
    shard_key: str
    shard_kind: str
    seeds: list[str]
    action: str
    reason: str | None = None
    job_id: int | None = None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _edition_artifact_dir(edition: AnnualEdition) -> Path:
    root = get_archive_tool_config().archive_root
    source_code = edition.source.code if edition.source else f"source-{edition.source_id}"
    return root / "editions" / source_code / str(edition.year)


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        value = _as_utc(value)
        return value.isoformat()
    return str(value)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso_utc(value: datetime | None) -> str | None:
    utc_value = _as_utc(value)
    return utc_value.isoformat() if utc_value is not None else None


def _write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, sort_keys=True, default=_json_default) + "\n")
            count += 1
    return count


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=_json_default) + "\n",
        encoding="utf-8",
    )


def _capture_backend_for_job(job: ArchiveJob) -> str:
    try:
        cfg = ArchiveJobConfig.from_dict(job.config or {})
        backend = str(cfg.execution_policy.capture_backend or "").strip().lower()
    except Exception:
        backend = ""
    return backend or "browsertrix"


def _capture_fidelity_for_backend(backend: str) -> str:
    if backend == "browsertrix":
        return "high"
    if backend in {"playwright_warc", "http_warc"}:
        return "fallback"
    return "unknown"


def _job_campaign_year(job: ArchiveJob) -> int | None:
    cfg = job.config or {}
    raw = cfg.get("campaign_year")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _scope_exclusions_from_jobs(jobs: list[ArchiveJob]) -> list[str]:
    exclusions: list[str] = []
    for job in jobs:
        args = list((job.config or {}).get("zimit_passthrough_args") or [])
        for i, token in enumerate(args):
            if token == "--scopeExcludeRx" and i + 1 < len(args):
                value = str(args[i + 1])
                if value and value not in exclusions:
                    exclusions.append(value)
    return exclusions


def _seed_rows_for_jobs(jobs: list[ArchiveJob], captured_urls: set[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for job in jobs:
        for seed in list((job.config or {}).get("seeds") or []):
            url = str(seed)
            if not url or url in seen:
                continue
            seen.add(url)
            rows.append(
                {
                    "url": url,
                    "intent_source": "seed",
                    "status": "captured" if url in captured_urls else "missing",
                    "job_id": job.id,
                    "shard_key": job.shard_key,
                    "shard_kind": job.shard_kind,
                }
            )
    return rows


def _missing_seed_urls_from_ledger(edition: AnnualEdition) -> set[str] | None:
    if not edition.target_ledger_path:
        return None
    path = Path(edition.target_ledger_path)
    if not path.is_file():
        return None

    missing: set[str] = set()
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                if row.get("intent_source") == "seed" and row.get("status") == "missing":
                    url = str(row.get("url") or "")
                    if url:
                        missing.add(url)
    except (OSError, json.JSONDecodeError):
        return None
    return missing


def get_or_create_annual_edition(
    session: Session,
    *,
    source: Source,
    year: int,
) -> tuple[AnnualEdition, bool]:
    edition = (
        session.query(AnnualEdition)
        .filter(AnnualEdition.source_id == source.id, AnnualEdition.year == int(year))
        .one_or_none()
    )
    if edition is not None:
        return edition, False

    edition = AnnualEdition(
        source=source,
        year=int(year),
        status="planning",
        search_ready=False,
        research_ready=False,
    )
    session.add(edition)
    session.flush()
    return edition, True


def attach_job_to_edition(
    session: Session,
    *,
    job: ArchiveJob,
    edition: AnnualEdition,
    shard_key: str | None = None,
    shard_kind: str = "legacy_full_site",
) -> bool:
    changed = False
    if job.edition_id != edition.id:
        job.edition = edition
        job.edition_id = edition.id
        changed = True
    if shard_key and job.shard_key != shard_key:
        job.shard_key = shard_key
        changed = True
    if job.shard_kind != shard_kind:
        job.shard_kind = shard_kind
        changed = True
    if not job.acceptance_state:
        job.acceptance_state = "pending"
        changed = True
    cfg = dict(job.config or {})
    if cfg.get("campaign_kind") == "annual" and cfg.get("campaign_year") == edition.year:
        cfg.setdefault("edition_id", edition.id)
        cfg.setdefault("campaign_shard_key", job.shard_key or shard_key)
        cfg.setdefault("campaign_shard_kind", job.shard_kind or shard_kind)
        if cfg != (job.config or {}):
            job.config = cfg
            changed = True
    return changed


def salvage_existing_annual_jobs(
    session: Session,
    *,
    year: int,
    source_codes: Iterable[str] | None = None,
) -> SalvageResult:
    requested = [s.strip().lower() for s in (source_codes or ANNUAL_SOURCES_ORDERED) if s.strip()]
    created_editions = 0
    attached_jobs = 0
    skipped_jobs = 0
    edition_ids: list[int] = []

    for source_code in requested:
        source = session.query(Source).filter(Source.code == source_code).one_or_none()
        if source is None:
            continue
        edition, created = get_or_create_annual_edition(session, source=source, year=year)
        if created:
            created_editions += 1
        edition_ids.append(int(edition.id))

        jobs = (
            session.query(ArchiveJob)
            .filter(ArchiveJob.source_id == source.id)
            .order_by(ArchiveJob.created_at.asc(), ArchiveJob.id.asc())
            .all()
        )
        matches = [
            job
            for job in jobs
            if _job_campaign_year(job) == int(year)
            and (job.config or {}).get("campaign_kind") == "annual"
        ]
        for index, job in enumerate(matches, start=1):
            shard_key = job.shard_key or (
                "legacy-full-site" if len(matches) == 1 else f"legacy-full-site-{index}"
            )
            configured_shard_kind = str((job.config or {}).get("campaign_shard_kind") or "").strip()
            shard_kind = configured_shard_kind or str(job.shard_kind or "").strip()
            if not configured_shard_kind and shard_kind in {"", "full_site"}:
                shard_kind = "legacy_full_site"
            changed = attach_job_to_edition(
                session,
                job=job,
                edition=edition,
                shard_key=shard_key,
                shard_kind=shard_kind,
            )
            if changed:
                attached_jobs += 1
            else:
                skipped_jobs += 1

    session.flush()
    return SalvageResult(
        created_editions=created_editions,
        attached_jobs=attached_jobs,
        skipped_jobs=skipped_jobs,
        edition_ids=sorted(set(edition_ids)),
    )


def generate_coverage_report(
    session: Session,
    *,
    edition: AnnualEdition,
) -> dict[str, Any]:
    jobs = (
        session.query(ArchiveJob)
        .filter(ArchiveJob.edition_id == edition.id)
        .order_by(ArchiveJob.shard_key.asc().nullsfirst(), ArchiveJob.id.asc())
        .all()
    )
    job_ids = [int(job.id) for job in jobs]
    snapshots = []
    if job_ids:
        snapshots = (
            session.query(Snapshot)
            .filter(Snapshot.job_id.in_(job_ids))
            .order_by(Snapshot.url.asc(), Snapshot.id.asc())
            .all()
        )

    captured_urls = {snap.url for snap in snapshots}
    seed_rows = _seed_rows_for_jobs(jobs, captured_urls)
    captured_seed_urls = {row["url"] for row in seed_rows if row["status"] == "captured"}
    ledger_rows = list(seed_rows)
    for url in sorted(captured_urls):
        if url in captured_seed_urls:
            continue
        ledger_rows.append(
            {
                "url": url,
                "intent_source": "captured",
                "status": "captured",
            }
        )

    backend_counts: Counter[str] = Counter()
    fidelity_counts: Counter[str] = Counter()
    for snap in snapshots:
        backend = str(snap.capture_backend or "browsertrix")
        fidelity = str(snap.capture_fidelity or _capture_fidelity_for_backend(backend))
        backend_counts[backend] += 1
        fidelity_counts[fidelity] += 1

    shard_summaries: list[dict[str, Any]] = []
    for job in jobs:
        job_backend = _capture_backend_for_job(job)
        shard_summaries.append(
            {
                "job_id": job.id,
                "name": job.name,
                "status": job.status,
                "acceptance_state": job.acceptance_state,
                "shard_key": job.shard_key,
                "shard_kind": job.shard_kind,
                "capture_backend": job_backend,
                "capture_fidelity": _capture_fidelity_for_backend(job_backend),
                "indexed_page_count": int(job.indexed_page_count or 0),
                "pages_crawled": int(job.pages_crawled or 0),
                "pages_total": int(job.pages_total or 0),
                "pages_failed": int(job.pages_failed or 0),
                "retry_count": int(job.retry_count or 0),
                "crawler_status": job.crawler_status,
                "crawler_stage": job.crawler_stage,
                "output_dir": job.output_dir,
            }
        )

    intended_url_count = len({str(row["url"]) for row in ledger_rows})
    captured_url_count = len(captured_urls)
    missing_url_count = len({row["url"] for row in seed_rows if row["status"] == "missing"})
    failed_url_count = int(sum(int(job.pages_failed or 0) for job in jobs))
    excluded_rules = _scope_exclusions_from_jobs(jobs)
    excluded_url_count = len(excluded_rules)
    fallback_url_count = int(sum(count for key, count in fidelity_counts.items() if key != "high"))
    needs_review = [
        job
        for job in jobs
        if job.status in REVIEW_JOB_STATUSES and job.acceptance_state not in ACCEPTED_STATES
    ]
    blocking = [
        job
        for job in jobs
        if job.status in BLOCKING_JOB_STATUSES and job.acceptance_state not in ACCEPTED_STATES
    ]
    indexed_shards = [job for job in jobs if job.status == "indexed"]
    search_ready = bool(indexed_shards and captured_url_count > 0)
    research_ready = search_ready and not blocking and not needs_review
    if research_ready:
        status = "research_ready"
    elif needs_review:
        status = "needs_review"
    elif blocking:
        status = "in_progress"
    elif search_ready:
        status = "search_ready"
    elif jobs:
        status = "in_progress"
    else:
        status = "planning"

    generated_at = _now_utc()
    artifact_dir = _edition_artifact_dir(edition)
    target_ledger_path = artifact_dir / "target-ledger.jsonl"
    capture_manifest_path = artifact_dir / "capture-manifest.jsonl"
    coverage_report_json_path = artifact_dir / "coverage-report.json"
    coverage_report_md_path = artifact_dir / "coverage-report.md"

    _write_jsonl(target_ledger_path, ledger_rows)
    _write_jsonl(
        capture_manifest_path,
        (
            {
                "snapshot_id": snap.id,
                "url": snap.url,
                "job_id": snap.job_id,
                "capture_timestamp": snap.capture_timestamp,
                "status_code": snap.status_code,
                "warc_path": snap.warc_path,
                "warc_record_id": snap.warc_record_id,
                "capture_backend": snap.capture_backend,
                "capture_fidelity": snap.capture_fidelity,
                "provenance": snap.provenance_json,
            }
            for snap in snapshots
        ),
    )

    source = edition.source
    report: dict[str, Any] = {
        "edition_id": edition.id,
        "source": {
            "id": source.id if source else edition.source_id,
            "code": source.code if source else None,
            "name": source.name if source else None,
        },
        "year": edition.year,
        "status": status,
        "search_ready": search_ready,
        "research_ready": research_ready,
        "standard": "documented_attainable",
        "generated_at": generated_at,
        "counts": {
            "intended_urls": intended_url_count,
            "captured_urls": captured_url_count,
            "failed_urls": failed_url_count,
            "missing_urls": missing_url_count,
            "excluded_rules": excluded_url_count,
            "fallback_urls": fallback_url_count,
            "shards": len(jobs),
            "indexed_shards": len(indexed_shards),
            "needs_review_shards": len(needs_review),
        },
        "backend_counts": dict(sorted(backend_counts.items())),
        "fidelity_counts": dict(sorted(fidelity_counts.items())),
        "exclusion_rules": excluded_rules,
        "shards": shard_summaries,
        "artifacts": {
            "target_ledger": str(target_ledger_path),
            "capture_manifest": str(capture_manifest_path),
            "coverage_report_json": str(coverage_report_json_path),
            "coverage_report_md": str(coverage_report_md_path),
        },
        "notes": [
            "The target ledger is v1 evidence built from configured seeds, scope rules, and captured URLs.",
            "Fallback captures count toward coverage when labeled with backend/fidelity provenance.",
        ],
    }
    _write_json(coverage_report_json_path, report)
    coverage_report_md_path.write_text(_render_coverage_markdown(report), encoding="utf-8")

    edition.status = status
    edition.search_ready = search_ready
    edition.research_ready = research_ready
    edition.intended_url_count = intended_url_count
    edition.captured_url_count = captured_url_count
    edition.failed_url_count = failed_url_count
    edition.missing_url_count = missing_url_count
    edition.excluded_url_count = excluded_url_count
    edition.fallback_url_count = fallback_url_count
    edition.shard_count = len(jobs)
    edition.indexed_shard_count = len(indexed_shards)
    edition.needs_review_shard_count = len(needs_review)
    edition.backend_counts = dict(sorted(backend_counts.items()))
    edition.coverage_summary = {
        "fidelity_counts": dict(sorted(fidelity_counts.items())),
        "exclusion_rules": excluded_rules,
        "standard": "documented_attainable",
    }
    edition.target_ledger_path = str(target_ledger_path)
    edition.capture_manifest_path = str(capture_manifest_path)
    edition.coverage_report_json_path = str(coverage_report_json_path)
    edition.coverage_report_md_path = str(coverage_report_md_path)
    edition.generated_at = generated_at

    for job in jobs:
        job.coverage_report_path = str(coverage_report_json_path)
        if job.status in REVIEW_JOB_STATUSES and job.acceptance_state not in ACCEPTED_STATES:
            job.acceptance_state = "needs_review"

    return report


def _render_coverage_markdown(report: dict[str, Any]) -> str:
    counts = report["counts"]
    source = report["source"]
    lines = [
        f"# {source.get('code', 'source')} {report['year']} Coverage Report",
        "",
        f"- Status: {report['status']}",
        f"- Search ready: {str(report['search_ready']).lower()}",
        f"- Research ready: {str(report['research_ready']).lower()}",
        f"- Standard: {report['standard']}",
        f"- Generated at: {_json_default(report['generated_at'])}",
        "",
        "## Counts",
        "",
        f"- Intended URLs: {counts['intended_urls']}",
        f"- Captured URLs: {counts['captured_urls']}",
        f"- Missing seed URLs: {counts['missing_urls']}",
        f"- Failed URLs reported by crawlers: {counts['failed_urls']}",
        f"- Fallback-captured snapshots: {counts['fallback_urls']}",
        f"- Shards: {counts['shards']}",
        f"- Shards needing review: {counts['needs_review_shards']}",
        "",
        "## Backend Mix",
        "",
    ]
    backend_counts = report.get("backend_counts") or {}
    if backend_counts:
        for backend, count in backend_counts.items():
            lines.append(f"- {backend}: {count}")
    else:
        lines.append("- No indexed captures yet.")
    lines.extend(["", "## Shards", ""])
    for shard in report.get("shards") or []:
        lines.append(
            "- "
            f"{shard.get('shard_key') or shard.get('job_id')}: "
            f"job={shard.get('job_id')} status={shard.get('status')} "
            f"backend={shard.get('capture_backend')} indexed={shard.get('indexed_page_count')}"
        )
    if not report.get("shards"):
        lines.append("- No shards attached.")
    lines.append("")
    return "\n".join(lines)


def report_public_payload(edition: AnnualEdition) -> dict[str, Any]:
    return {
        "editionId": edition.id,
        "sourceCode": edition.source.code if edition.source else None,
        "sourceName": edition.source.name if edition.source else None,
        "year": edition.year,
        "status": edition.status,
        "searchReady": bool(edition.search_ready),
        "researchReady": bool(edition.research_ready),
        "intendedUrlCount": int(edition.intended_url_count or 0),
        "capturedUrlCount": int(edition.captured_url_count or 0),
        "failedUrlCount": int(edition.failed_url_count or 0),
        "missingUrlCount": int(edition.missing_url_count or 0),
        "excludedUrlCount": int(edition.excluded_url_count or 0),
        "fallbackUrlCount": int(edition.fallback_url_count or 0),
        "shardCount": int(edition.shard_count or 0),
        "indexedShardCount": int(edition.indexed_shard_count or 0),
        "needsReviewShardCount": int(edition.needs_review_shard_count or 0),
        "backendCounts": edition.backend_counts or {},
        "coverageSummary": edition.coverage_summary or {},
        "generatedAt": _iso_utc(edition.generated_at),
    }


def reconcile_completed_job_indexing(
    *,
    source_code: str | None = None,
    limit: int | None = None,
) -> ReconcileIndexingResult:
    from ha_backend.db import get_session
    from ha_backend.indexing import index_job

    with get_session() as session:
        query = session.query(ArchiveJob).join(Source).filter(ArchiveJob.status == "completed")
        if source_code:
            query = query.filter(Source.code == source_code.strip().lower())
        query = query.order_by(ArchiveJob.finished_at.asc().nullsfirst(), ArchiveJob.id.asc())
        if limit is not None:
            query = query.limit(int(limit))
        job_ids = [int(job.id) for job in query.all()]

    indexed = 0
    failed = 0
    for job_id in job_ids:
        rc = index_job(job_id)
        if rc == 0:
            indexed += 1
        else:
            failed += 1
    return ReconcileIndexingResult(
        indexed=indexed,
        failed=failed,
        skipped=0,
        job_ids=job_ids,
    )


def _seed_shard_key(source_code: str, seed: str, index: int) -> str:
    lower = seed.lower()
    if "/en/" in lower or "/e/" in lower:
        base = "lang-en"
    elif "/fr/" in lower or "/f/" in lower:
        base = "lang-fr"
    else:
        base = f"seed-{index}"
    safe = re.sub(r"[^a-z0-9_-]+", "-", base).strip("-")
    return safe or f"seed-{index}"


def plan_or_create_annual_shards(
    session: Session,
    *,
    year: int,
    source_codes: Iterable[str] | None = None,
    apply: bool = False,
    shard_target_url_cap: int = SHARD_TARGET_URL_CAP,
) -> list[ShardPlanItem]:
    requested = [s.strip().lower() for s in (source_codes or ANNUAL_SOURCES_ORDERED) if s.strip()]
    planned: list[ShardPlanItem] = []
    target_url_cap = int(shard_target_url_cap)
    if target_url_cap < 1:
        raise ValueError("shard_target_url_cap must be >= 1")
    campaign_dt = datetime(int(year), 1, 1, tzinfo=timezone.utc)
    scheduled_at = _now_utc().replace(microsecond=0)
    archive_root = get_archive_tool_config().archive_root

    for source_code in requested:
        source_cfg = get_config_for_source(source_code)
        source = session.query(Source).filter(Source.code == source_code).one_or_none()
        if source_cfg is None or source is None:
            planned.append(
                ShardPlanItem(
                    source_code=source_code,
                    year=year,
                    shard_key="missing-source",
                    shard_kind="seed_group",
                    seeds=[],
                    action="error",
                    reason="missing source registry config or Source row",
                )
            )
            continue

        edition, _created = get_or_create_annual_edition(session, source=source, year=year)
        existing = {
            job.shard_key: job
            for job in session.query(ArchiveJob).filter(ArchiveJob.edition_id == edition.id).all()
            if job.shard_key
        }
        existing_jobs = list(existing.values())
        has_legacy_salvage = any(
            str(job.shard_kind or "").replace("-", "_") == "legacy_full_site"
            for job in existing_jobs
        )
        if has_legacy_salvage and not edition.generated_at:
            for index, seed in enumerate(source_cfg.default_seeds, start=1):
                planned.append(
                    ShardPlanItem(
                        source_code=source_code,
                        year=year,
                        shard_key=_seed_shard_key(source_code, seed, index),
                        shard_kind="seed_group",
                        seeds=[seed],
                        action="skip",
                        reason="legacy salvage report must be generated before fill-gap shards",
                    )
                )
            continue
        if (
            has_legacy_salvage
            and edition.generated_at
            and int(edition.missing_url_count or 0) == 0
            and int(edition.failed_url_count or 0) == 0
            and int(edition.needs_review_shard_count or 0) == 0
        ):
            for index, seed in enumerate(source_cfg.default_seeds, start=1):
                planned.append(
                    ShardPlanItem(
                        source_code=source_code,
                        year=year,
                        shard_key=_seed_shard_key(source_code, seed, index),
                        shard_kind="seed_group",
                        seeds=[seed],
                        action="skip",
                        reason="legacy salvage report has no documented gaps",
                    )
                )
            continue
        missing_seed_urls = _missing_seed_urls_from_ledger(edition) if has_legacy_salvage else None

        for index, seed in enumerate(source_cfg.default_seeds, start=1):
            shard_key = _seed_shard_key(source_code, seed, index)
            if (
                has_legacy_salvage
                and missing_seed_urls is not None
                and seed not in missing_seed_urls
            ):
                planned.append(
                    ShardPlanItem(
                        source_code=source_code,
                        year=year,
                        shard_key=shard_key,
                        shard_kind="seed_group",
                        seeds=[seed],
                        action="skip",
                        reason="seed already covered by legacy salvage report",
                    )
                )
                continue
            if shard_key in existing:
                planned.append(
                    ShardPlanItem(
                        source_code=source_code,
                        year=year,
                        shard_key=shard_key,
                        shard_kind="seed_group",
                        seeds=[seed],
                        action="skip",
                        reason=f"existing job id={existing[shard_key].id}",
                        job_id=existing[shard_key].id,
                    )
                )
                continue

            job_name = f"{source_code}-{year}0101-{shard_key}"
            output_dir = build_output_dir_for_job(
                source_code,
                job_name,
                archive_root=archive_root,
                now=scheduled_at,
            )
            job_config = build_job_config(source_cfg, extra_seeds=[])
            job_config["seeds"] = [seed]
            job_config.update(
                {
                    "campaign_kind": "annual",
                    "campaign_year": int(year),
                    "campaign_date": campaign_dt.date().isoformat(),
                    "campaign_date_utc": f"{campaign_dt.date().isoformat()}T00:00:00Z",
                    "scheduler_version": "v2-sharded",
                    "edition_id": edition.id,
                    "campaign_shard_key": shard_key,
                    "campaign_shard_kind": "seed_group",
                    "shard_target_url_cap": target_url_cap,
                }
            )

            if apply:
                job = ArchiveJob(
                    source=source,
                    edition=edition,
                    name=job_name,
                    output_dir=str(output_dir),
                    status="queued",
                    queued_at=scheduled_at,
                    config=job_config,
                    shard_key=shard_key,
                    shard_kind="seed_group",
                    acceptance_state="pending",
                )
                session.add(job)
                session.flush()
                planned.append(
                    ShardPlanItem(
                        source_code=source_code,
                        year=year,
                        shard_key=shard_key,
                        shard_kind="seed_group",
                        seeds=[seed],
                        action="create",
                        job_id=job.id,
                    )
                )
            else:
                planned.append(
                    ShardPlanItem(
                        source_code=source_code,
                        year=year,
                        shard_key=shard_key,
                        shard_kind="seed_group",
                        seeds=[seed],
                        action="create",
                    )
                )

    return planned


def count_pending_index_jobs(session: Session) -> int:
    return int(
        session.query(func.count(ArchiveJob.id)).filter(ArchiveJob.status == "completed").scalar()
        or 0
    )


__all__ = [
    "ACCEPTED_STATES",
    "BLOCKING_JOB_STATUSES",
    "REVIEW_JOB_STATUSES",
    "ReconcileIndexingResult",
    "SalvageResult",
    "ShardPlanItem",
    "attach_job_to_edition",
    "count_pending_index_jobs",
    "generate_coverage_report",
    "get_or_create_annual_edition",
    "plan_or_create_annual_shards",
    "reconcile_completed_job_indexing",
    "report_public_payload",
    "salvage_existing_annual_jobs",
]
