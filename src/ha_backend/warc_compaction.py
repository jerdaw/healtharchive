from __future__ import annotations

import json
import os
import tempfile
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from warcio.archiveiterator import ArchiveIterator
from warcio.warcwriter import WARCWriter

from .archive_storage import (
    WARC_MANIFEST_FILENAME,
    _compute_sha256,
    get_job_warc_manifest_path,
    get_job_warcs_dir,
    load_warc_manifest,
)

DROP_LARGE_MEDIA_PREFIXES = ("video/", "audio/")


@dataclass(frozen=True)
class WarcRecordReference:
    warc_path: str
    warc_record_id: str | None
    url: str


@dataclass
class WarcContentTypeTotals:
    records: int = 0
    bytes_total: int = 0


@dataclass
class WarcCompactionFileResult:
    source_path: str
    staged_path: str | None
    original_size_bytes: int
    compacted_size_bytes: int | None
    records_total: int = 0
    records_kept: int = 0
    records_dropped: int = 0
    payload_bytes_total: int = 0
    payload_bytes_kept: int = 0
    payload_bytes_dropped: int = 0


@dataclass
class WarcCompactionResult:
    job_id: int
    output_dir: Path
    warcs_dir: Path
    staging_dir: Path | None
    profile: str
    dry_run: bool
    files: list[WarcCompactionFileResult] = field(default_factory=list)
    content_types_total: Counter[str] = field(default_factory=Counter)
    content_types_dropped: Counter[str] = field(default_factory=Counter)
    bytes_by_content_type_total: Counter[str] = field(default_factory=Counter)
    bytes_by_content_type_dropped: Counter[str] = field(default_factory=Counter)
    required_records_total: int = 0
    required_records_found: int = 0
    required_records_missing: list[WarcRecordReference] = field(default_factory=list)
    replacement_manifest_path: Path | None = None
    report_path: Path | None = None

    @property
    def original_size_bytes(self) -> int:
        return sum(file.original_size_bytes for file in self.files)

    @property
    def compacted_size_bytes(self) -> int | None:
        if any(file.compacted_size_bytes is None for file in self.files):
            return None
        return sum(file.compacted_size_bytes or 0 for file in self.files)

    @property
    def payload_bytes_dropped(self) -> int:
        return sum(file.payload_bytes_dropped for file in self.files)

    @property
    def records_dropped(self) -> int:
        return sum(file.records_dropped for file in self.files)


def _now_utc_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _record_content_type(record) -> str:
    http_headers = getattr(record, "http_headers", None)
    if http_headers is None:
        return ""
    ctype = http_headers.get_header("Content-Type") or ""
    return ctype.split(";", 1)[0].strip().lower()


def _record_payload_length(record) -> int:
    value = getattr(record, "length", None)
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def should_drop_record_for_profile(record, *, profile: str) -> bool:
    if profile != "replay-no-large-media":
        raise ValueError(f"Unsupported WARC compaction profile: {profile}")

    if record.rec_type != "response":
        return False

    ctype = _record_content_type(record)
    return ctype.startswith(DROP_LARGE_MEDIA_PREFIXES)


def _manifest_entries_by_stable_name(output_dir: Path) -> dict[str, dict]:
    manifest = load_warc_manifest(output_dir)
    entries = manifest.get("entries") or []
    return {
        str(entry.get("stable_name")): dict(entry) for entry in entries if entry.get("stable_name")
    }


def _write_json_atomic(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        delete=False,
        dir=str(path.parent),
        prefix=f".{path.name}.",
        suffix=".tmp",
        encoding="utf-8",
    ) as tmp:
        tmp_path = Path(tmp.name)
        json.dump(payload, tmp, indent=2, sort_keys=True)
        tmp.write("\n")
        tmp.flush()
        os.fsync(tmp.fileno())
    os.replace(tmp_path, path)


def _result_to_json(result: WarcCompactionResult, *, replacement_entries: list[dict]) -> dict:
    compacted_size = result.compacted_size_bytes
    return {
        "version": 1,
        "jobId": result.job_id,
        "profile": result.profile,
        "dryRun": result.dry_run,
        "outputDir": str(result.output_dir),
        "warcsDir": str(result.warcs_dir),
        "stagingDir": str(result.staging_dir) if result.staging_dir else None,
        "originalSizeBytes": result.original_size_bytes,
        "compactedSizeBytes": compacted_size,
        "payloadBytesDropped": result.payload_bytes_dropped,
        "recordsDropped": result.records_dropped,
        "requiredRecordsTotal": result.required_records_total,
        "requiredRecordsFound": result.required_records_found,
        "requiredRecordsMissing": [
            {
                "warcPath": ref.warc_path,
                "warcRecordId": ref.warc_record_id,
                "url": ref.url,
            }
            for ref in result.required_records_missing
        ],
        "contentTypesTotal": {
            key: {
                "records": result.content_types_total[key],
                "bytes": result.bytes_by_content_type_total[key],
            }
            for key in sorted(result.content_types_total)
        },
        "contentTypesDropped": {
            key: {
                "records": result.content_types_dropped[key],
                "bytes": result.bytes_by_content_type_dropped[key],
            }
            for key in sorted(result.content_types_dropped)
        },
        "files": [
            {
                "sourcePath": file.source_path,
                "stagedPath": file.staged_path,
                "originalSizeBytes": file.original_size_bytes,
                "compactedSizeBytes": file.compacted_size_bytes,
                "recordsTotal": file.records_total,
                "recordsKept": file.records_kept,
                "recordsDropped": file.records_dropped,
                "payloadBytesTotal": file.payload_bytes_total,
                "payloadBytesKept": file.payload_bytes_kept,
                "payloadBytesDropped": file.payload_bytes_dropped,
            }
            for file in result.files
        ],
        "replacementManifestEntries": replacement_entries,
    }


def compact_warcs_for_job(
    *,
    job_id: int,
    output_dir: Path,
    warc_paths: list[Path],
    required_records: list[WarcRecordReference],
    profile: str = "replay-no-large-media",
    apply: bool = False,
    staging_dir: Path | None = None,
) -> WarcCompactionResult:
    output_dir = output_dir.resolve()
    warcs_dir = get_job_warcs_dir(output_dir).resolve()
    warc_paths = sorted({path.resolve() for path in warc_paths})

    if apply:
        staging_dir = (
            staging_dir.resolve()
            if staging_dir is not None
            else output_dir / "warcs_compacted" / _now_utc_slug()
        )
        staging_dir.mkdir(parents=True, exist_ok=True)
    else:
        staging_dir = staging_dir.resolve() if staging_dir is not None else None

    required_by_warc: dict[str, list[WarcRecordReference]] = {}
    for ref in required_records:
        required_by_warc.setdefault(str(Path(ref.warc_path).resolve()), []).append(ref)

    remaining_required_ids: dict[str, set[str]] = {}
    remaining_required_urls: dict[str, set[str]] = {}
    for warc_path, refs in required_by_warc.items():
        remaining_required_ids[warc_path] = {
            ref.warc_record_id for ref in refs if ref.warc_record_id
        }
        remaining_required_urls[warc_path] = {ref.url for ref in refs if not ref.warc_record_id}

    result = WarcCompactionResult(
        job_id=job_id,
        output_dir=output_dir,
        warcs_dir=warcs_dir,
        staging_dir=staging_dir,
        profile=profile,
        dry_run=not apply,
        required_records_total=len(required_records),
    )

    manifest_by_stable_name = _manifest_entries_by_stable_name(output_dir)
    replacement_entries: list[dict] = []
    original_manifest_path = get_job_warc_manifest_path(output_dir)
    original_manifest = load_warc_manifest(output_dir)

    for source_path in warc_paths:
        try:
            rel = source_path.relative_to(warcs_dir)
        except ValueError:
            rel = Path(source_path.name)

        staged_path = staging_dir / rel if staging_dir is not None else None
        source_size = source_path.stat().st_size
        file_result = WarcCompactionFileResult(
            source_path=str(source_path),
            staged_path=str(staged_path) if staged_path else None,
            original_size_bytes=source_size,
            compacted_size_bytes=None,
        )

        writer: WARCWriter | None = None
        out_fh = None
        tmp_path: Path | None = None
        if apply:
            assert staged_path is not None
            staged_path.parent.mkdir(parents=True, exist_ok=True)
            out_fh = tempfile.NamedTemporaryFile(
                mode="wb",
                delete=False,
                dir=str(staged_path.parent),
                prefix=f".{staged_path.name}.",
                suffix=".tmp",
            )
            tmp_path = Path(out_fh.name)
            writer = WARCWriter(out_fh, gzip=source_path.name.endswith(".gz"))

        try:
            with source_path.open("rb") as fh:
                for record in ArchiveIterator(fh):
                    file_result.records_total += 1
                    ctype = _record_content_type(record) or "unknown"
                    payload_length = _record_payload_length(record)
                    file_result.payload_bytes_total += payload_length
                    result.content_types_total[ctype] += 1
                    result.bytes_by_content_type_total[ctype] += payload_length

                    record_id = record.rec_headers.get_header("WARC-Record-ID")
                    target_uri = record.rec_headers.get_header("WARC-Target-URI") or ""
                    drop = should_drop_record_for_profile(record, profile=profile)
                    if drop:
                        file_result.records_dropped += 1
                        file_result.payload_bytes_dropped += payload_length
                        result.content_types_dropped[ctype] += 1
                        result.bytes_by_content_type_dropped[ctype] += payload_length
                        continue

                    file_result.records_kept += 1
                    file_result.payload_bytes_kept += payload_length
                    warc_key = str(source_path)
                    if record_id:
                        remaining_required_ids.get(warc_key, set()).discard(record_id)
                    if target_uri:
                        remaining_required_urls.get(warc_key, set()).discard(target_uri)
                    if writer is not None:
                        writer.write_record(record)

            if out_fh is not None:
                out_fh.flush()
                os.fsync(out_fh.fileno())
                out_fh.close()
                assert tmp_path is not None and staged_path is not None
                os.replace(tmp_path, staged_path)
                file_result.compacted_size_bytes = staged_path.stat().st_size
            result.files.append(file_result)

            entry = manifest_by_stable_name.get(source_path.name, {})
            replacement_entry = {
                **entry,
                "source_path": entry.get("source_path") or str(source_path),
                "stable_name": source_path.name,
                "link_type": "compacted",
                "compaction_profile": profile,
                "original_size_bytes": source_size,
                "size_bytes": file_result.compacted_size_bytes
                if file_result.compacted_size_bytes is not None
                else None,
                "sha256": _compute_sha256(staged_path)
                if apply and staged_path is not None
                else None,
            }
            replacement_entries.append(replacement_entry)
        finally:
            if out_fh is not None and not out_fh.closed:
                out_fh.close()
            if tmp_path is not None and tmp_path.exists():
                tmp_path.unlink(missing_ok=True)

    missing: list[WarcRecordReference] = []
    for warc_path, refs in required_by_warc.items():
        missing_ids = remaining_required_ids.get(warc_path, set())
        missing_urls = remaining_required_urls.get(warc_path, set())
        for ref in refs:
            if ref.warc_record_id and ref.warc_record_id in missing_ids:
                missing.append(ref)
            elif not ref.warc_record_id and ref.url in missing_urls:
                missing.append(ref)

    result.required_records_missing = missing
    result.required_records_found = result.required_records_total - len(missing)

    if apply:
        assert staging_dir is not None
        manifest_payload = {
            **original_manifest,
            "version": original_manifest.get("version") or 1,
            "output_dir": str(output_dir),
            "warcs_dir": str(warcs_dir),
            "original_manifest_path": str(original_manifest_path),
            "compacted_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "compaction_profile": profile,
            "entries": sorted(replacement_entries, key=lambda item: str(item.get("stable_name"))),
        }
        result.replacement_manifest_path = staging_dir / WARC_MANIFEST_FILENAME
        _write_json_atomic(result.replacement_manifest_path, manifest_payload)

        report_payload = _result_to_json(result, replacement_entries=replacement_entries)
        result.report_path = staging_dir / "compaction-report.json"
        _write_json_atomic(result.report_path, report_payload)

    return result
