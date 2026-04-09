from __future__ import annotations

import io
import json
import logging
import os
import shlex
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from warcio.statusandheaders import StatusAndHeaders
from warcio.warcwriter import WARCWriter

from .constants import (
    DEFAULT_PLAYWRIGHT_LOCALE,
    DEFAULT_PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
    DEFAULT_PLAYWRIGHT_SETTLE_MS,
    DEFAULT_PLAYWRIGHT_TIMEZONE,
    DEFAULT_PLAYWRIGHT_VIEWPORT_HEIGHT,
    DEFAULT_PLAYWRIGHT_VIEWPORT_WIDTH,
    PLAYWRIGHT_CONTAINER_NODE_WORKDIR,
    PLAYWRIGHT_CONTAINER_OUTPUT_DIR,
    PLAYWRIGHT_CONTAINER_SCRIPT_DIR,
    PLAYWRIGHT_DOCKER_IMAGE,
    PLAYWRIGHT_NODE_CACHE_DIR,
    PLAYWRIGHT_WARC_PROVENANCE_DIR_NAME,
    REPO_ROOT,
    playwright_npm_version_from_image,
)
from .http_warc_backend import (
    _emit_crawl_status,
    _is_html_response,
    _normalize_target_url,
    _reason_phrase_for_status,
    _StageLogSink,
    build_scope_rules,
)

logger = logging.getLogger("website_archiver.playwright_warc")


@dataclass(frozen=True)
class PlaywrightWarcRunResult:
    exit_code: int
    crawled: int
    failed: int
    warc_path: Path
    combined_log_path: Path
    provenance_path: Path | None
    runtime: dict[str, Any]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_timestamp() -> str:
    return _utc_now().isoformat().replace("+00:00", "Z")


def _parse_capture_timestamp(raw: str | None) -> str:
    if not raw:
        return _utc_timestamp()
    text = str(raw).strip()
    if not text:
        return _utc_timestamp()
    if text.endswith("Z"):
        return text
    try:
        return (
            datetime.fromisoformat(text).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        )
    except Exception:
        return _utc_timestamp()


def _runtime_settings() -> dict[str, Any]:
    return {
        "image": PLAYWRIGHT_DOCKER_IMAGE,
        "navigationTimeoutMs": int(
            os.environ.get(
                "HEALTHARCHIVE_PLAYWRIGHT_NAVIGATION_TIMEOUT_MS",
                str(DEFAULT_PLAYWRIGHT_NAVIGATION_TIMEOUT_MS),
            )
        ),
        "settleMs": int(
            os.environ.get(
                "HEALTHARCHIVE_PLAYWRIGHT_SETTLE_MS",
                str(DEFAULT_PLAYWRIGHT_SETTLE_MS),
            )
        ),
        "viewport": {
            "width": int(
                os.environ.get(
                    "HEALTHARCHIVE_PLAYWRIGHT_VIEWPORT_WIDTH",
                    str(DEFAULT_PLAYWRIGHT_VIEWPORT_WIDTH),
                )
            ),
            "height": int(
                os.environ.get(
                    "HEALTHARCHIVE_PLAYWRIGHT_VIEWPORT_HEIGHT",
                    str(DEFAULT_PLAYWRIGHT_VIEWPORT_HEIGHT),
                )
            ),
        },
        "locale": os.environ.get("HEALTHARCHIVE_PLAYWRIGHT_LOCALE", DEFAULT_PLAYWRIGHT_LOCALE),
        "timezone": os.environ.get(
            "HEALTHARCHIVE_PLAYWRIGHT_TIMEZONE", DEFAULT_PLAYWRIGHT_TIMEZONE
        ),
    }


def _playwright_script_path() -> Path:
    return (REPO_ROOT / "scripts" / "playwright_warc_capture.js").resolve()


def _node_cache_dir() -> Path:
    return PLAYWRIGHT_NODE_CACHE_DIR.expanduser().resolve()


def _sanitize_http_header_items(
    raw_headers: dict[str, Any],
    *,
    body_length: int,
    content_type: str | None,
) -> list[tuple[str, str]]:
    header_items: list[tuple[str, str]] = []
    for raw_key, raw_value in raw_headers.items():
        if raw_value is None:
            continue
        key = str(raw_key).strip()
        if not key:
            continue
        lower = key.lower()
        if lower in {"content-length", "content-encoding", "transfer-encoding"}:
            continue
        header_items.append((key, str(raw_value)))

    if content_type and not any(k.lower() == "content-type" for k, _ in header_items):
        header_items.append(("Content-Type", content_type))
    header_items.append(("Content-Length", str(body_length)))
    return header_items


def _write_response_record(
    writer: WARCWriter,
    *,
    final_url: str,
    status_code: int | None,
    headers: dict[str, Any],
    body_bytes: bytes,
    content_type: str | None,
    capture_timestamp: str,
) -> None:
    effective_status = int(status_code) if status_code is not None else 200
    http_headers = StatusAndHeaders(
        f"{effective_status} {_reason_phrase_for_status(effective_status)}",
        _sanitize_http_header_items(
            headers,
            body_length=len(body_bytes),
            content_type=content_type,
        ),
        protocol="HTTP/1.1",
    )
    record = writer.create_warc_record(
        final_url,
        "response",
        payload=io.BytesIO(body_bytes),
        http_headers=http_headers,
        warc_headers_dict={"WARC-Date": _parse_capture_timestamp(capture_timestamp)},
    )
    writer.write_record(record)


def _stream_subprocess_output(proc: subprocess.Popen[str], sink: _StageLogSink) -> None:
    if proc.stdout is None:
        return
    for line in proc.stdout:
        sink.emit(line.rstrip("\n"))


def _run_playwright_container(
    *,
    sink: _StageLogSink,
    seeds: list[str],
    scope_include_rx: str | None,
    scope_exclude_rx: str | None,
    expand_links: bool,
    scratch_dir: Path,
) -> tuple[int, dict[str, Any]]:
    script_path = _playwright_script_path()
    if not script_path.is_file():
        raise FileNotFoundError(f"Missing Playwright capture script at {script_path}")

    scratch_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = scratch_dir / "manifest.json"
    bodies_dir = scratch_dir / "bodies"
    bodies_dir.mkdir(parents=True, exist_ok=True)

    node_cache_dir = _node_cache_dir()
    node_cache_dir.mkdir(parents=True, exist_ok=True)

    runtime = _runtime_settings()
    image = str(runtime["image"])
    npm_version = playwright_npm_version_from_image(image)
    container_script = PLAYWRIGHT_CONTAINER_SCRIPT_DIR / "playwright_warc_capture.js"
    container_manifest = PLAYWRIGHT_CONTAINER_OUTPUT_DIR / "manifest.json"
    container_bodies_dir = PLAYWRIGHT_CONTAINER_OUTPUT_DIR / "bodies"

    node_args = [
        "node",
        str(container_script),
        "--manifest",
        str(container_manifest),
        "--bodies-dir",
        str(container_bodies_dir),
        "--seeds-json",
        json.dumps(seeds, separators=(",", ":")),
        "--expand-links",
        "true" if expand_links else "false",
        "--viewport-width",
        str(runtime["viewport"]["width"]),
        "--viewport-height",
        str(runtime["viewport"]["height"]),
        "--navigation-timeout-ms",
        str(runtime["navigationTimeoutMs"]),
        "--settle-ms",
        str(runtime["settleMs"]),
        "--locale",
        str(runtime["locale"]),
        "--timezone",
        str(runtime["timezone"]),
    ]
    if scope_include_rx:
        node_args.extend(["--scope-include-rx", scope_include_rx])
    if scope_exclude_rx:
        node_args.extend(["--scope-exclude-rx", scope_exclude_rx])

    node_cmd = " ".join(shlex.quote(part) for part in node_args)
    install_cmd = (
        "set -euo pipefail; "
        "if [ ! -d node_modules/playwright ]; then "
        "npm init -y >/dev/null 2>&1; "
        "npm install --silent --no-progress --no-audit --no-fund "
        f"playwright@{shlex.quote(npm_version)}; "
        "fi; "
        f"{node_cmd}"
    )

    docker_cmd = [
        "docker",
        "run",
        "--rm",
        "-e",
        "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1",
        "-e",
        f"PLAYWRIGHT_VERSION={npm_version}",
        "-v",
        f"{script_path}:{container_script}:ro",
        "-v",
        f"{scratch_dir}:{PLAYWRIGHT_CONTAINER_OUTPUT_DIR}:rw",
        "-v",
        f"{node_cache_dir}:{PLAYWRIGHT_CONTAINER_NODE_WORKDIR}:rw",
        "-w",
        str(PLAYWRIGHT_CONTAINER_NODE_WORKDIR),
        image,
        "bash",
        "-lc",
        install_cmd,
    ]

    sink.emit(f"[playwright_warc] Starting containerized browser fallback using image {image}")
    proc = subprocess.Popen(  # nosec: B603 - internal docker invocation
        docker_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    try:
        _stream_subprocess_output(proc, sink)
    finally:
        rc = proc.wait()

    if not manifest_path.is_file():
        raise RuntimeError(
            f"Playwright capture exited {rc} without writing manifest at {manifest_path}"
        )

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    runtime_manifest = manifest.get("runtime")
    if isinstance(runtime_manifest, dict):
        runtime.update(runtime_manifest)
    return rc, manifest


def _write_provenance_manifest(
    *,
    output_dir: Path,
    runtime: dict[str, Any],
    records: list[dict[str, Any]],
    failures: list[dict[str, Any]],
    scratch_dir: Path,
) -> tuple[Path, dict[str, int]]:
    timestamp = _utc_now().strftime("%Y%m%d_%H%M%S")
    provenance_dir = (
        output_dir / "provenance" / PLAYWRIGHT_WARC_PROVENANCE_DIR_NAME / f"run_{timestamp}"
    )
    provenance_dir.mkdir(parents=True, exist_ok=True)

    body_source_counts: dict[str, int] = {}
    summarized_records: list[dict[str, Any]] = []
    for idx, record in enumerate(records, start=1):
        body_source = str(record.get("bodySource") or "unknown").strip().lower() or "unknown"
        body_source_counts[body_source] = body_source_counts.get(body_source, 0) + 1
        body_rel = str(record.get("bodyPath") or "").strip()
        rendered_dom_path: str | None = None
        if body_source == "rendered_dom" and body_rel:
            scratch_body_path = (scratch_dir / body_rel).resolve()
            if scratch_body_path.is_file():
                dest = provenance_dir / f"rendered_dom_{idx:06}.html"
                dest.write_bytes(scratch_body_path.read_bytes())
                rendered_dom_path = str(dest.relative_to(output_dir))

        summarized_records.append(
            {
                "requestedUrl": record.get("requestedUrl"),
                "finalUrl": record.get("finalUrl"),
                "statusCode": record.get("statusCode"),
                "bodySource": body_source,
                "cookieCount": record.get("cookieCount"),
                "captureTimestamp": record.get("captureTimestamp"),
                "contentType": record.get("contentType"),
                "discoveredUrlCount": len(record.get("discoveredUrls") or []),
                "renderedDomPath": rendered_dom_path,
            }
        )

    payload = {
        "backend": "playwright_warc",
        "runtime": runtime,
        "counts": {
            "crawled": len(records),
            "failed": len(failures),
            "bodySourceCounts": body_source_counts,
        },
        "records": summarized_records,
        "failures": failures,
    }
    provenance_path = provenance_dir / "capture_provenance.json"
    provenance_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return provenance_path, body_source_counts


def run_playwright_warc_capture(
    *,
    output_dir: Path,
    seeds: list[str],
    zimit_passthrough_args: list[str],
) -> PlaywrightWarcRunResult:
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    warcs_dir = output_dir / "warcs"
    warcs_dir.mkdir(parents=True, exist_ok=True)
    warc_path = warcs_dir / "warc-000001.warc.gz"

    scope = build_scope_rules(zimit_passthrough_args)
    sink = _StageLogSink(output_dir, "playwright_warc_capture")

    with tempfile.TemporaryDirectory(prefix="ha-playwright-warc-", dir=output_dir) as temp_dir:
        scratch_dir = Path(temp_dir)

        try:
            rc, manifest = _run_playwright_container(
                sink=sink,
                seeds=list(seeds),
                scope_include_rx=scope.include_rx.pattern if scope.include_rx else None,
                scope_exclude_rx=scope.exclude_rx.pattern if scope.exclude_rx else None,
                expand_links=True,
                scratch_dir=scratch_dir,
            )
        except Exception as exc:
            sink.emit(f"[playwright_warc] FATAL: browser fallback crashed before WARC write: {exc}")
            sink.close()
            logger.error("playwright_warc backend crashed: %s", exc, exc_info=True)
            return PlaywrightWarcRunResult(
                exit_code=1,
                crawled=0,
                failed=0,
                warc_path=warc_path,
                combined_log_path=sink.combined_log_path,
                provenance_path=None,
                runtime={},
            )

        records = list(manifest.get("records") or [])
        failures = list(manifest.get("failures") or [])
        runtime = dict(manifest.get("runtime") or {})
        runtime["image"] = PLAYWRIGHT_DOCKER_IMAGE

        crawled = 0
        failed = len(failures)
        html_responses = 0
        last_page: dict[str, Any] | None = None
        written_records: list[dict[str, Any]] = []
        all_failures = list(failures)
        with warc_path.open("wb") as warc_stream:
            writer = WARCWriter(warc_stream, gzip=True)
            for record in records:
                requested_url = record.get("requestedUrl")
                body_rel = str(record.get("bodyPath") or "").strip()
                if not body_rel:
                    failed += 1
                    all_failures.append(
                        {
                            "requestedUrl": requested_url,
                            "error": "missing bodyPath in playwright fallback manifest",
                        }
                    )
                    sink.emit(
                        f"[playwright_warc] ERROR missing bodyPath for requested URL "
                        f"{requested_url!r}"
                    )
                    continue
                body_path = (scratch_dir / body_rel).resolve()
                if not body_path.is_file():
                    failed += 1
                    all_failures.append(
                        {
                            "requestedUrl": requested_url,
                            "error": f"missing body file {body_path}",
                        }
                    )
                    sink.emit(
                        f"[playwright_warc] ERROR missing body file {body_path} "
                        f"for requested URL {requested_url!r}"
                    )
                    continue

                body_bytes = body_path.read_bytes()
                final_url = _normalize_target_url(record.get("finalUrl")) or _normalize_target_url(
                    requested_url
                )
                if final_url is None:
                    failed += 1
                    all_failures.append(
                        {
                            "requestedUrl": requested_url,
                            "error": "invalid final URL in playwright fallback manifest",
                        }
                    )
                    sink.emit(
                        f"[playwright_warc] ERROR invalid final URL for requested URL "
                        f"{requested_url!r}"
                    )
                    continue

                headers = record.get("headers")
                if not isinstance(headers, dict):
                    headers = {}
                content_type = None
                if isinstance(record.get("contentType"), str):
                    content_type = str(record["contentType"]).strip() or None
                _write_response_record(
                    writer,
                    final_url=final_url,
                    status_code=record.get("statusCode"),
                    headers=headers,
                    body_bytes=body_bytes,
                    content_type=content_type,
                    capture_timestamp=str(record.get("captureTimestamp") or ""),
                )
                crawled += 1
                if _is_html_response(content_type):
                    html_responses += 1
                written_records.append(record)
                last_page = {
                    "requestedUrl": requested_url,
                    "finalUrl": final_url,
                    "statusCode": record.get("statusCode"),
                    "bodySource": record.get("bodySource"),
                    "cookieCount": record.get("cookieCount"),
                }

            warc_stream.flush()
            os.fsync(warc_stream.fileno())

        provenance_path, body_source_counts = _write_provenance_manifest(
            output_dir=output_dir,
            runtime=runtime,
            records=written_records,
            failures=all_failures,
            scratch_dir=scratch_dir,
        )
        sink.emit(f"[playwright_warc] Wrote provenance manifest: {provenance_path}")
        _emit_crawl_status(
            sink,
            crawled=crawled,
            total=crawled + failed,
            pending=0,
            failed=failed,
            extra_details={
                "backend": {
                    "name": "playwright_warc",
                    "image": PLAYWRIGHT_DOCKER_IMAGE,
                    "chromiumVersion": runtime.get("chromiumVersion"),
                    "playwrightVersion": runtime.get("playwrightVersion"),
                    "viewport": runtime.get("viewport"),
                    "locale": runtime.get("locale"),
                    "timezone": runtime.get("timezone"),
                },
                "captureMode": {
                    "bodySourceCounts": body_source_counts,
                    "provenancePath": str(provenance_path),
                },
                "lastPage": last_page,
            },
        )
        sink.emit(
            "[playwright_warc] Completed browser fallback capture: "
            f"crawled={crawled} failed={failed} html={html_responses} containerExitCode={rc}"
        )
        sink.close()

        exit_code = 0 if rc == 0 and crawled > 0 and html_responses > 0 else 1
        return PlaywrightWarcRunResult(
            exit_code=exit_code,
            crawled=crawled,
            failed=failed,
            warc_path=warc_path,
            combined_log_path=sink.combined_log_path,
            provenance_path=provenance_path,
            runtime=runtime,
        )


def probe_playwright_fetch(
    urls: Iterable[str],
    *,
    scope_include_rx: str | None = None,
    scope_exclude_rx: str | None = None,
) -> dict[str, Any]:
    normalized_urls: list[str] = []
    for raw_url in urls:
        normalized = _normalize_target_url(raw_url)
        if normalized is not None:
            normalized_urls.append(normalized)
    if not normalized_urls:
        raise ValueError("No valid http/https URLs supplied.")

    with tempfile.TemporaryDirectory(prefix="ha-playwright-probe-") as temp_dir:
        scratch_dir = Path(temp_dir)
        sink = _StageLogSink(scratch_dir, "playwright_warc_probe")
        try:
            _, manifest = _run_playwright_container(
                sink=sink,
                seeds=normalized_urls,
                scope_include_rx=scope_include_rx,
                scope_exclude_rx=scope_exclude_rx,
                expand_links=False,
                scratch_dir=scratch_dir,
            )
        finally:
            sink.close()

        records = list(manifest.get("records") or [])
        failures = list(manifest.get("failures") or [])
        items: list[dict[str, Any]] = []
        for record in records:
            body_rel = str(record.get("bodyPath") or "").strip()
            body_path = (scratch_dir / body_rel).resolve() if body_rel else None
            html_bytes = body_path.stat().st_size if body_path and body_path.is_file() else None
            items.append(
                {
                    "requestedUrl": record.get("requestedUrl"),
                    "finalUrl": record.get("finalUrl"),
                    "statusCode": record.get("statusCode"),
                    "cookieCount": record.get("cookieCount"),
                    "bodySource": record.get("bodySource"),
                    "htmlBytes": html_bytes,
                    "error": None,
                }
            )
        for failure in failures:
            items.append(
                {
                    "requestedUrl": failure.get("requestedUrl"),
                    "finalUrl": None,
                    "statusCode": None,
                    "cookieCount": None,
                    "bodySource": None,
                    "htmlBytes": None,
                    "error": failure.get("error"),
                }
            )
        return {
            "runtime": {
                **dict(manifest.get("runtime") or {}),
                "image": PLAYWRIGHT_DOCKER_IMAGE,
            },
            "items": items,
        }
