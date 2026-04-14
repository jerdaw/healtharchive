#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import json
import os
import re
import stat
import sys
from collections import Counter, deque
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = REPO_ROOT / "src"
DEFAULT_BACKEND_ENV_FILE = Path("/etc/healtharchive/backend.env")


def _reexec_into_repo_venv() -> None:
    if __name__ != "__main__":
        return

    repo_venv = REPO_ROOT / ".venv"
    repo_python = REPO_ROOT / ".venv" / "bin" / "python3"
    if not repo_python.is_file():
        return

    try:
        current_prefix = Path(sys.prefix).resolve()
    except OSError:
        current_prefix = Path(sys.prefix)
    try:
        target_prefix = repo_venv.resolve()
    except OSError:
        target_prefix = repo_venv

    if current_prefix == target_prefix:
        return

    os.execv(
        str(repo_python),
        [str(repo_python), str(Path(__file__).resolve()), *sys.argv[1:]],
    )


def _bootstrap_local_imports() -> None:
    for entry in (REPO_ROOT, SRC_DIR):
        entry_str = str(entry)
        if entry_str not in sys.path:
            sys.path.insert(0, entry_str)


_reexec_into_repo_venv()
_bootstrap_local_imports()


def _load_backend_env_file() -> None:
    if os.environ.get("HEALTHARCHIVE_DATABASE_URL"):
        return
    if not DEFAULT_BACKEND_ENV_FILE.is_file():
        return

    env_lines = DEFAULT_BACKEND_ENV_FILE.read_text(encoding="utf-8").splitlines()
    for raw_line in env_lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key.startswith("#"):
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


_load_backend_env_file()

from warcio.archiveiterator import ArchiveIterator

from archive_tool.constants import HTTP_ERROR_PATTERNS, STATE_FILE_NAME, TIMEOUT_PATTERNS
from archive_tool.utils import discover_temp_dirs, find_all_warc_files
from ha_backend.archive_storage import get_job_warcs_dir
from ha_backend.crawl_stats import parse_crawl_log_progress
from ha_backend.db import get_session
from ha_backend.models import ArchiveJob, Source

URL_RE = re.compile(r"https?://[^\s\"'<>]+")
RESTART_MARKER_PATTERNS = (
    "Attempting adaptive container restart",
    "Max restarts",
    "container restart",
)
TIMEOUT_PATTERNS_EXTRA = (
    "Page load timed out",
    "ERR_HTTP2_PROTOCOL_ERROR",
)
RENDER_ASSET_EXTENSIONS = {
    ".avif",
    ".css",
    ".eot",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".json",
    ".png",
    ".svg",
    ".ttf",
    ".webp",
    ".woff",
    ".woff2",
}
DOCUMENT_EXTENSIONS = {".doc", ".docx", ".pdf", ".ppt", ".pptx", ".xls", ".xlsx"}
ARCHIVE_EXTENSIONS = {".7z", ".bz2", ".gz", ".rar", ".tar", ".tar.gz", ".tgz", ".xz", ".zip"}
MEDIA_EXTENSIONS = {".avi", ".m4a", ".mov", ".mp3", ".mp4", ".ogg", ".wav", ".webm"}
HTML_EXTENSIONS = {".asp", ".aspx", ".htm", ".html", ".jsp", ".php", ".xhtml"}
TOP_LIMIT = 10


def _find_combined_logs(output_dir: Path) -> list[Path]:
    try:
        st = output_dir.stat()
    except OSError:
        return []
    if not stat.S_ISDIR(st.st_mode):
        return []
    try:
        candidates = list(output_dir.glob("archive_*.combined.log"))
    except OSError:
        return []
    if not candidates:
        return []

    def _safe_mtime(path: Path) -> float:
        try:
            return float(path.stat().st_mtime)
        except OSError:
            return 0.0

    return sorted(candidates, key=_safe_mtime, reverse=True)


def _find_latest_combined_log(output_dir: Path) -> Path | None:
    logs = _find_combined_logs(output_dir)
    return logs[0] if logs else None


def _probe_readable_dir(path: Path) -> tuple[int, int]:
    try:
        st = path.stat()
    except OSError as exc:
        return 0, int(exc.errno or -1)
    if not stat.S_ISDIR(st.st_mode):
        return 0, 0
    try:
        list(path.iterdir())
    except OSError as exc:
        return 0, int(exc.errno or -1)
    return 1, -1


def _probe_readable_file(path: Path) -> tuple[int, int]:
    try:
        st = path.stat()
    except OSError as exc:
        return 0, int(exc.errno or -1)
    if not stat.S_ISREG(st.st_mode):
        return 0, 0
    return 1, -1


def _tail_text(path: Path, *, max_bytes: int) -> str:
    with path.open("rb") as fh:
        size = path.stat().st_size
        fh.seek(max(0, size - max_bytes))
        return fh.read().decode("utf-8", errors="replace")


def _load_state_snapshot(output_dir: Path) -> tuple[dict[str, Any], Path, int, int]:
    state_path = output_dir / STATE_FILE_NAME
    state_ok, state_errno = _probe_readable_file(state_path)
    if state_ok != 1:
        return {}, state_path, state_ok, state_errno
    try:
        return json.loads(state_path.read_text(encoding="utf-8")), state_path, state_ok, state_errno
    except Exception:
        return {}, state_path, 0, -1


def _normalize_url(url: str, *, strip_query: bool = True) -> str:
    try:
        parsed = urlparse(url)
    except Exception:
        return url
    if not parsed.scheme or not parsed.netloc:
        return url
    if strip_query:
        parsed = parsed._replace(query="", fragment="")
    return urlunparse(parsed)


def _extension_from_url(url: str) -> str:
    try:
        path = urlparse(url).path.lower()
    except Exception:
        return "(none)"
    if path.endswith(".tar.gz"):
        return ".tar.gz"
    if path.endswith(".tar.bz2"):
        return ".tar.bz2"
    if path.endswith(".tar.xz"):
        return ".tar.xz"
    suffix = Path(path).suffix.lower()
    return suffix or "(none)"


def _content_class_from_mime(mime_type: str | None) -> str | None:
    mime = str(mime_type or "").strip().lower()
    if not mime:
        return None
    if "html" in mime or mime.endswith("/xhtml+xml"):
        return "html"
    if mime.startswith("text/css") or mime.startswith("application/javascript"):
        return "render_asset"
    if mime.startswith("image/") or "font" in mime or mime.endswith("/svg+xml"):
        return "render_asset"
    if mime.startswith("application/pdf"):
        return "document"
    if mime.startswith("video/") or mime.startswith("audio/"):
        return "media"
    if "zip" in mime or "tar" in mime or "gzip" in mime or "compressed" in mime:
        return "archive"
    return None


def classify_content(url: str, mime_type: str | None = None) -> str:
    mime_class = _content_class_from_mime(mime_type)
    if mime_class is not None:
        return mime_class

    ext = _extension_from_url(url)
    if ext in HTML_EXTENSIONS or ext == "(none)":
        return "html"
    if ext in RENDER_ASSET_EXTENSIONS:
        return "render_asset"
    if ext in DOCUMENT_EXTENSIONS:
        return "document"
    if ext in ARCHIVE_EXTENSIONS:
        return "archive"
    if ext in MEDIA_EXTENSIONS:
        return "media"
    return "unknown"


def url_family(url: str, *, depth: int = 3) -> str:
    normalized = _normalize_url(url)
    try:
        parsed = urlparse(normalized)
    except Exception:
        return normalized
    if not parsed.scheme or not parsed.netloc:
        return normalized
    parts = [part for part in parsed.path.split("/") if part]
    family_parts = parts[:depth]
    base = f"{parsed.scheme}://{parsed.netloc}"
    if not family_parts:
        return f"{base}/"
    return f"{base}/{'/'.join(family_parts)}"


def _counter_to_top(counter: Counter[str], *, limit: int = TOP_LIMIT) -> list[dict[str, Any]]:
    return [{"key": key, "count": count} for key, count in counter.most_common(limit)]


def _byte_counter_to_top(counter: Counter[str], *, limit: int = TOP_LIMIT) -> list[dict[str, Any]]:
    return [{"key": key, "bytes": count} for key, count in counter.most_common(limit)]


def _class_totals_to_dict(
    count_counter: Counter[str], byte_counter: Counter[str]
) -> dict[str, dict[str, int]]:
    keys = sorted(set(count_counter) | set(byte_counter))
    return {
        key: {
            "count": int(count_counter.get(key, 0)),
            "bytes": int(byte_counter.get(key, 0)),
        }
        for key in keys
    }


def summarize_log_text(text: str) -> dict[str, Any]:
    timeout_regexes = [re.compile(pattern, re.IGNORECASE) for pattern in TIMEOUT_PATTERNS]
    timeout_regexes.extend(re.compile(pattern, re.IGNORECASE) for pattern in TIMEOUT_PATTERNS_EXTRA)
    http_regexes = [re.compile(pattern, re.IGNORECASE) for pattern in HTTP_ERROR_PATTERNS]

    timeout_count = 0
    http_count = 0
    repeated_url_counts: Counter[str] = Counter()
    repeated_family_counts: Counter[str] = Counter()
    repeated_extension_counts: Counter[str] = Counter()
    repeated_class_counts: Counter[str] = Counter()
    restart_adjacent_family_counts: Counter[str] = Counter()
    recent_error_families: deque[str] = deque(maxlen=5)

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        matched_timeout = any(rx.search(line) for rx in timeout_regexes)
        matched_http = any(rx.search(line) for rx in http_regexes)
        if matched_timeout:
            timeout_count += 1
        elif matched_http:
            http_count += 1

        if any(marker in line for marker in RESTART_MARKER_PATTERNS):
            for family in set(recent_error_families):
                restart_adjacent_family_counts[family] += 1

        if not (matched_timeout or matched_http):
            continue

        urls = [_normalize_url(match.group(0)) for match in URL_RE.finditer(line)]
        for url in urls:
            repeated_url_counts[url] += 1
            family = url_family(url)
            repeated_family_counts[family] += 1
            repeated_extension_counts[_extension_from_url(url)] += 1
            repeated_class_counts[classify_content(url)] += 1
            recent_error_families.append(family)

    return {
        "timeout_count": timeout_count,
        "http_network_count": http_count,
        "repeated_failing_urls": _counter_to_top(repeated_url_counts),
        "repeated_failing_url_families": _counter_to_top(repeated_family_counts),
        "restart_adjacent_url_families": _counter_to_top(restart_adjacent_family_counts),
        "dominant_failing_extensions": _counter_to_top(repeated_extension_counts),
        "dominant_failing_classes": _counter_to_top(repeated_class_counts),
    }


def summarize_recent_logs(
    log_paths: list[Path],
    *,
    max_log_files: int,
    max_bytes_per_log: int,
) -> dict[str, Any]:
    scanned_logs: list[dict[str, Any]] = []
    text_chunks: list[str] = []

    for path in log_paths[:max_log_files]:
        ok, err = _probe_readable_file(path)
        scanned_logs.append(
            {
                "path": str(path),
                "ok": ok,
                "errno": err,
            }
        )
        if ok != 1:
            continue
        try:
            text_chunks.append(_tail_text(path, max_bytes=max_bytes_per_log))
        except Exception:
            continue

    summary = summarize_log_text("\n".join(text_chunks))
    summary["combined_logs_scanned"] = scanned_logs
    summary["combined_log_count_scanned"] = len(scanned_logs)
    summary["combined_log_tail_bytes_per_file"] = max_bytes_per_log
    return summary


def _stable_warc_paths(output_dir: Path) -> list[Path]:
    warcs_dir = get_job_warcs_dir(output_dir)
    if not warcs_dir.is_dir():
        return []
    warc_paths: set[Path] = set()
    for ext in (".warc.gz", ".warc"):
        for path in warcs_dir.rglob(f"*{ext}"):
            try:
                if path.is_file() and path.stat().st_size > 0:
                    warc_paths.add(path.resolve())
            except OSError:
                continue
    return sorted(warc_paths)


def discover_warcs_read_only(
    output_dir: Path, state_data: dict[str, Any]
) -> tuple[list[Path], str]:
    stable_paths = _stable_warc_paths(output_dir)
    if stable_paths:
        return stable_paths, "stable"

    temp_dirs_raw = state_data.get("temp_dirs_host_paths", [])
    temp_dirs: list[Path] = []
    if isinstance(temp_dirs_raw, list):
        for raw in temp_dirs_raw:
            try:
                path = Path(str(raw))
            except Exception:
                continue
            try:
                if path.is_dir():
                    temp_dirs.append(path.resolve())
            except OSError:
                continue
    if temp_dirs:
        return find_all_warc_files(temp_dirs), "temp"

    fallback_dirs = discover_temp_dirs(output_dir)
    if fallback_dirs:
        return find_all_warc_files(fallback_dirs), "fallback"
    return [], "none"


def _open_warc_stream(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rb")
    return path.open("rb")


def summarize_warc_content(
    warc_paths: list[Path],
    *,
    max_warc_files: int,
) -> dict[str, Any]:
    warc_count_total = len(warc_paths)
    warc_bytes_total = 0
    newest_paths: list[Path] = []
    for path in warc_paths:
        try:
            warc_bytes_total += int(path.stat().st_size)
            newest_paths.append(path)
        except OSError:
            continue
    newest_paths.sort(key=lambda path: path.stat().st_mtime if path.exists() else 0.0, reverse=True)
    scanned_paths = newest_paths[:max_warc_files]

    extension_count: Counter[str] = Counter()
    extension_bytes: Counter[str] = Counter()
    family_bytes: Counter[str] = Counter()
    class_count: Counter[str] = Counter()
    class_bytes: Counter[str] = Counter()
    scanned_response_records = 0

    for warc_path in scanned_paths:
        try:
            with _open_warc_stream(warc_path) as fh:
                for record in ArchiveIterator(fh):
                    if getattr(record, "rec_type", None) != "response":
                        continue
                    url = record.rec_headers.get_header("WARC-Target-URI")
                    if not url:
                        continue
                    http_headers = getattr(record, "http_headers", None)
                    mime_type = None
                    if http_headers is not None:
                        content_type = http_headers.get_header("Content-Type")
                        if content_type:
                            mime_type = content_type.split(";", 1)[0].strip().lower()

                    normalized_url = _normalize_url(url)
                    extension = _extension_from_url(normalized_url)
                    content_class = classify_content(normalized_url, mime_type)
                    estimated_bytes = int(getattr(record, "length", 0) or 0)

                    extension_count[extension] += 1
                    extension_bytes[extension] += estimated_bytes
                    family_bytes[url_family(normalized_url)] += estimated_bytes
                    class_count[content_class] += 1
                    class_bytes[content_class] += estimated_bytes
                    scanned_response_records += 1
        except Exception:
            continue

    return {
        "warc_count_total": warc_count_total,
        "warc_bytes_total": warc_bytes_total,
        "warc_files_scanned": len(scanned_paths),
        "warc_files_sampled": len(scanned_paths) < warc_count_total,
        "sample_mode": "lightweight",
        "sample_note": (
            "Record-level classification scans the newest WARC files only to stay safe mid-crawl."
        ),
        "response_records_scanned": scanned_response_records,
        "top_extensions_by_url_count": _counter_to_top(extension_count),
        "top_extensions_by_estimated_bytes": _byte_counter_to_top(extension_bytes),
        "top_path_families_by_estimated_bytes": _byte_counter_to_top(family_bytes),
        "class_totals": _class_totals_to_dict(class_count, class_bytes),
    }


def _job_for_args(
    *, job_id: int | None, year: int | None, source_code: str | None
) -> dict[str, Any] | None:
    with get_session() as session:
        if job_id is not None:
            job = session.get(ArchiveJob, job_id)
        else:
            assert year is not None
            assert source_code is not None
            annual_name = f"{source_code.lower()}-{year}0101"
            job = (
                session.query(ArchiveJob)
                .join(Source)
                .filter(Source.code == source_code.lower(), ArchiveJob.name == annual_name)
                .order_by(ArchiveJob.id.desc())
                .first()
            )
        if job is None:
            return None
        source = job.source.code if job.source else None
        return {
            "job_id": int(job.id),
            "source": source,
            "name": job.name,
            "status": job.status,
            "output_dir": job.output_dir,
            "combined_log_path": job.combined_log_path,
        }


def build_recommendation_hints(report: dict[str, Any]) -> list[dict[str, str]]:
    hints: list[dict[str, str]] = []

    probes = report["job_metadata"]
    output_errno = int(probes.get("output_dir_errno", -1))
    log_errno = int(probes.get("combined_log_errno", -1))
    state_errno = int(probes.get("state_file_errno", -1))
    if 107 in {output_errno, log_errno, state_errno}:
        hints.append(
            {
                "kind": "likely_storage_issue",
                "confidence": "medium",
                "reason": "One or more job paths reported errno 107 / unreadable hot-path signals.",
            }
        )

    error_summary = report["error_family_summary"]
    content_summary = report["content_cost_summary"]
    class_totals = content_summary.get("class_totals", {})
    doc_media_archive_bytes = sum(
        int(class_totals.get(name, {}).get("bytes", 0)) for name in ("document", "archive", "media")
    )
    total_estimated_bytes = sum(int(item.get("bytes", 0)) for item in class_totals.values())
    failing_classes = {
        item["key"]: item["count"] for item in error_summary["dominant_failing_classes"]
    }
    binary_failures = sum(failing_classes.get(name, 0) for name in ("document", "archive", "media"))
    html_failures = failing_classes.get("html", 0)

    if total_estimated_bytes > 0 and doc_media_archive_bytes * 100 >= total_estimated_bytes * 45:
        hints.append(
            {
                "kind": "likely_binary_download_frontier_issue",
                "confidence": "medium",
                "reason": "Document/media/archive classes dominate the sampled WARC byte estimate.",
            }
        )
    elif binary_failures >= 3 and binary_failures > html_failures:
        hints.append(
            {
                "kind": "likely_binary_download_frontier_issue",
                "confidence": "low",
                "reason": "Recent failing URL classes skew toward document/media/archive paths.",
            }
        )

    if html_failures >= max(3, binary_failures):
        hints.append(
            {
                "kind": "likely_html_runtime_issue",
                "confidence": "low",
                "reason": "Recent failures are concentrated on HTML-like pages rather than download/media URLs.",
            }
        )

    if not hints:
        hints.append(
            {
                "kind": "mixed_or_low_confidence",
                "confidence": "low",
                "reason": "The lightweight report does not isolate a single dominant cause yet.",
            }
        )

    return hints


def generate_report(
    *,
    job_id: int | None,
    year: int | None,
    source_code: str | None,
    max_log_bytes: int,
    max_log_files: int,
    max_warc_files: int,
) -> dict[str, Any]:
    job_data = _job_for_args(job_id=job_id, year=year, source_code=source_code)
    if job_data is None:
        raise SystemExit("job not found")

    output_dir = Path(str(job_data.get("output_dir") or "")).resolve()
    output_dir_ok, output_dir_errno = _probe_readable_dir(output_dir)
    combined_logs = _find_combined_logs(output_dir) if output_dir_ok == 1 else []
    latest_log = combined_logs[0] if combined_logs else None
    log_ok, log_errno = _probe_readable_file(latest_log) if latest_log is not None else (0, 0)
    state_data, state_path, state_ok, state_errno = _load_state_snapshot(output_dir)

    progress_summary: dict[str, Any] = {}
    if latest_log is not None and log_ok == 1:
        progress = parse_crawl_log_progress(latest_log, max_bytes=max_log_bytes)
        if progress is not None:
            progress_summary = {
                "crawl_rate_ppm": round(progress.crawl_rate_ppm, 3),
                "last_crawled": int(progress.last_status.crawled),
                "last_total": int(progress.last_status.total),
                "last_pending": (
                    int(progress.last_status.pending)
                    if progress.last_status.pending is not None
                    else None
                ),
                "last_failed": (
                    int(progress.last_status.failed)
                    if progress.last_status.failed is not None
                    else None
                ),
                "last_progress_age_seconds": round(progress.last_progress_age_seconds(), 1),
            }

    log_summary = summarize_recent_logs(
        combined_logs,
        max_log_files=max_log_files,
        max_bytes_per_log=max_log_bytes,
    )
    warc_paths, warc_source = discover_warcs_read_only(output_dir, state_data)
    warc_summary = summarize_warc_content(warc_paths, max_warc_files=max_warc_files)

    report: dict[str, Any] = {
        "report_version": 1,
        "scan_mode": "lightweight",
        "job_metadata": {
            "job_id": int(job_data["job_id"]),
            "source": job_data["source"],
            "name": job_data["name"],
            "status": job_data["status"],
            "output_dir": str(output_dir),
            "output_dir_ok": output_dir_ok,
            "output_dir_errno": output_dir_errno,
            "combined_log_path": str(latest_log) if latest_log is not None else None,
            "combined_log_ok": log_ok,
            "combined_log_errno": log_errno,
            "combined_log_count_total": len(combined_logs),
            "state_file_path": str(state_path),
            "state_file_ok": state_ok,
            "state_file_errno": state_errno,
            "warc_discovery_source": warc_source,
        },
        "crawl_health_summary": {
            "container_restarts_done": int(state_data.get("container_restarts_done", 0) or 0),
            **progress_summary,
        },
        "error_family_summary": log_summary,
        "content_cost_summary": warc_summary,
    }
    report["recommendation_hints"] = build_recommendation_hints(report)
    return report


def _print_human_summary(report: dict[str, Any]) -> None:
    meta = report["job_metadata"]
    health = report["crawl_health_summary"]
    errors = report["error_family_summary"]
    content = report["content_cost_summary"]

    print("HealthArchive crawl content-cost report")
    print("--------------------------------------")
    print(f"job_id={meta['job_id']} source={meta['source']} status={meta['status']}")
    print(f"output_dir={meta['output_dir']}")
    print(f"combined_log={meta['combined_log_path'] or '(missing)'}")
    print(f"combined_log_count_total={meta['combined_log_count_total']}")
    print(f"warc_discovery_source={meta['warc_discovery_source']}")
    print("")
    print("[crawl health]")
    print(f"container_restarts_done={health.get('container_restarts_done', 0)}")
    if "crawl_rate_ppm" in health:
        print(f"crawl_rate_ppm={health['crawl_rate_ppm']}")
        print(f"last_progress_age_seconds={health['last_progress_age_seconds']}")
        print(f"last_crawled={health['last_crawled']} last_total={health['last_total']}")
    else:
        print("crawl_progress=(no crawlStatus parsed from bounded log window)")
    print("")
    print("[error families]")
    print(f"timeouts={errors['timeout_count']} http_or_network={errors['http_network_count']}")
    for item in errors["repeated_failing_url_families"][:5]:
        print(f"family count={item['count']} {item['key']}")
    if not errors["repeated_failing_url_families"]:
        print("family count=0 (no repeated failing URLs parsed)")
    print("")
    print("[content cost]")
    print(
        f"warc_count_total={content['warc_count_total']} warc_bytes_total={content['warc_bytes_total']}"
    )
    print(
        "warc_files_scanned="
        f"{content['warc_files_scanned']} sampled={int(content['warc_files_sampled'])}"
    )
    for item in content["top_extensions_by_estimated_bytes"][:5]:
        print(f"ext bytes={item['bytes']} {item['key']}")
    if not content["top_extensions_by_estimated_bytes"]:
        print("ext bytes=0 (no WARC response records classified)")
    print("")
    print("[recommendation hints]")
    for hint in report["recommendation_hints"]:
        print(f"{hint['kind']} confidence={hint['confidence']} reason={hint['reason']}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "HealthArchive VPS helper: read-only crawl content-cost report for annual jobs."
        )
    )
    parser.add_argument("--job-id", type=int, help="Specific ArchiveJob id to inspect.")
    parser.add_argument("--year", type=int, help="Annual campaign year.")
    parser.add_argument("--source", help="Source code for annual job lookup (hc/phac/cihr).")
    parser.add_argument(
        "--json-out",
        help="Optional path to write the structured report JSON.",
    )
    parser.add_argument(
        "--max-log-bytes",
        type=int,
        default=256 * 1024,
        help="Maximum combined-log tail bytes to inspect (default: 262144).",
    )
    parser.add_argument(
        "--max-log-files",
        type=int,
        default=3,
        help="Maximum newest combined logs to scan for failure families (default: 3).",
    )
    parser.add_argument(
        "--max-warc-files",
        type=int,
        default=3,
        help="Maximum newest WARC files to sample at record level (default: 3).",
    )
    args = parser.parse_args(argv)

    if args.job_id is None and (args.year is None or not args.source):
        parser.error("pass either --job-id or both --year and --source")
    if args.job_id is not None and (args.year is not None or args.source):
        parser.error("use --job-id or --year/--source, not both")
    if args.max_log_bytes <= 0:
        parser.error("--max-log-bytes must be > 0")
    if args.max_log_files <= 0:
        parser.error("--max-log-files must be > 0")
    if args.max_warc_files <= 0:
        parser.error("--max-warc-files must be > 0")

    report = generate_report(
        job_id=args.job_id,
        year=args.year,
        source_code=args.source.lower() if args.source else None,
        max_log_bytes=args.max_log_bytes,
        max_log_files=args.max_log_files,
        max_warc_files=args.max_warc_files,
    )
    _print_human_summary(report)

    if args.json_out:
        out_path = Path(args.json_out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
