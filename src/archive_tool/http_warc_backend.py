from __future__ import annotations

import io
import json
import logging
import os
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Pattern
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup
from warcio.statusandheaders import StatusAndHeaders
from warcio.warcwriter import WARCWriter

logger = logging.getLogger("website_archiver.http_warc")

_HTML_MIME_TOKENS = ("text/html", "application/xhtml+xml")
_LINK_ATTRS: tuple[tuple[str, str], ...] = (
    ("a", "href"),
    ("area", "href"),
    ("link", "href"),
    ("script", "src"),
    ("img", "src"),
    ("iframe", "src"),
    ("source", "src"),
    ("video", "src"),
    ("audio", "src"),
)


@dataclass(frozen=True)
class ScopeRules:
    include_rx: Pattern[str] | None
    exclude_rx: Pattern[str] | None

    def allows(self, url: str) -> bool:
        if self.exclude_rx is not None and self.exclude_rx.search(url):
            return False
        if self.include_rx is not None and not self.include_rx.search(url):
            return False
        return True


@dataclass(frozen=True)
class HttpWarcRunResult:
    exit_code: int
    crawled: int
    failed: int
    warc_path: Path
    combined_log_path: Path


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _utc_timestamp() -> str:
    return _now_utc().isoformat().replace("+00:00", "Z")


def _normalize_target_url(raw: str) -> str | None:
    s = str(raw or "").strip()
    if not s:
        return None
    try:
        parts = urlsplit(s)
    except Exception:
        return None
    if parts.scheme.lower() not in {"http", "https"}:
        return None
    if not parts.netloc:
        return None
    path = parts.path or "/"
    return urlunsplit(
        (
            parts.scheme.lower(),
            parts.netloc.lower(),
            path,
            parts.query,
            "",
        )
    )


def _is_html_response(content_type: str | None) -> bool:
    if not content_type:
        return False
    lower = content_type.lower()
    return any(token in lower for token in _HTML_MIME_TOKENS)


def _extract_scope_value(passthrough_args: Iterable[str], flag: str) -> str | None:
    args = list(passthrough_args)
    for idx, token in enumerate(args):
        if token == flag and idx + 1 < len(args):
            return args[idx + 1]
        if token.startswith(f"{flag}="):
            return token.split("=", 1)[1]
    return None


def build_scope_rules(zimit_passthrough_args: Iterable[str]) -> ScopeRules:
    import re

    include_raw = _extract_scope_value(zimit_passthrough_args, "--scopeIncludeRx")
    exclude_raw = _extract_scope_value(zimit_passthrough_args, "--scopeExcludeRx")
    include_rx = re.compile(include_raw) if include_raw else None
    exclude_rx = re.compile(exclude_raw) if exclude_raw else None
    return ScopeRules(include_rx=include_rx, exclude_rx=exclude_rx)


class _StageLogSink:
    def __init__(self, output_dir: Path, stage_slug: str) -> None:
        timestamp = _now_utc().strftime("%Y%m%d_%H%M%S")
        log_base = output_dir / f"archive_{stage_slug}_{timestamp}"
        self.combined_log_path = log_base.with_suffix(".combined.log")
        self.stdout_log_path = log_base.with_suffix(".stdout.log")
        self._combined = self.combined_log_path.open("a", encoding="utf-8")
        self._stdout = self.stdout_log_path.open("a", encoding="utf-8")

    def emit(self, line: str) -> None:
        text = line if line.endswith("\n") else f"{line}\n"
        self._combined.write(text)
        self._combined.flush()
        self._stdout.write(text)
        self._stdout.flush()
        print(text, end="", flush=True)

    def close(self) -> None:
        try:
            self._combined.close()
        finally:
            self._stdout.close()


def _emit_crawl_status(
    sink: _StageLogSink,
    *,
    crawled: int,
    total: int,
    pending: int,
    failed: int,
) -> None:
    payload = {
        "timestamp": _utc_timestamp(),
        "logLevel": "info",
        "context": "crawlStatus",
        "message": "Crawl statistics",
        "details": {
            "crawled": int(crawled),
            "total": int(total),
            "pending": int(pending),
            "failed": int(failed),
            "limit": {"max": 0, "hit": False},
            "pendingPages": [],
        },
    }
    sink.emit(json.dumps(payload, separators=(",", ":")))


def _extract_links(base_url: str, body: bytes, content_type: str | None) -> set[str]:
    if not _is_html_response(content_type):
        return set()

    try:
        soup = BeautifulSoup(body, "html.parser")
    except Exception:
        return set()

    found: set[str] = set()
    for tag_name, attr_name in _LINK_ATTRS:
        for tag in soup.find_all(tag_name):
            raw = tag.get(attr_name)
            if not raw or not isinstance(raw, str):
                continue
            absolute = _normalize_target_url(urljoin(base_url, raw))
            if absolute:
                found.add(absolute)
    return found


def _write_response_record(
    writer: WARCWriter,
    *,
    url: str,
    response: httpx.Response,
) -> None:
    header_items = [(k, v) for k, v in response.headers.items()]
    if not any(k.lower() == "content-length" for k, _ in header_items):
        header_items.append(("Content-Length", str(len(response.content))))

    http_headers = StatusAndHeaders(
        f"{response.status_code} {response.reason_phrase}",
        header_items,
        protocol="HTTP/1.1",
    )
    record = writer.create_warc_record(
        url,
        "response",
        payload=io.BytesIO(response.content),
        http_headers=http_headers,
        warc_headers_dict={"WARC-Date": _utc_timestamp()},
    )
    writer.write_record(record)


def run_http_warc_capture(
    *,
    output_dir: Path,
    seeds: list[str],
    zimit_passthrough_args: list[str],
    user_agent: str = "HealthArchiveHttpWarc/1.0",
    connect_timeout_seconds: float = 20.0,
    read_timeout_seconds: float = 60.0,
) -> HttpWarcRunResult:
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    warcs_dir = output_dir / "warcs"
    warcs_dir.mkdir(parents=True, exist_ok=True)
    warc_path = warcs_dir / "warc-000001.warc.gz"

    scope = build_scope_rules(zimit_passthrough_args)
    sink = _StageLogSink(output_dir, "http_warc_capture")

    crawled = 0
    failed = 0
    html_responses = 0
    queued: deque[str] = deque()
    seen: set[str] = set()

    for seed in seeds:
        normalized = _normalize_target_url(seed)
        if normalized is None:
            continue
        if scope.allows(normalized):
            queued.append(normalized)
            seen.add(normalized)

    sink.emit("[http_warc] Starting fallback capture backend.")
    sink.emit(
        f"[http_warc] Scope include={scope.include_rx.pattern if scope.include_rx else '(none)'}"
    )
    sink.emit(
        f"[http_warc] Scope exclude={scope.exclude_rx.pattern if scope.exclude_rx else '(none)'}"
    )
    _emit_crawl_status(
        sink,
        crawled=crawled,
        total=len(seen),
        pending=len(queued),
        failed=failed,
    )

    timeout = httpx.Timeout(
        60.0,
        connect=connect_timeout_seconds,
        read=read_timeout_seconds,
        write=30.0,
        pool=30.0,
    )

    try:
        with (
            warc_path.open("wb") as warc_stream,
            httpx.Client(
                follow_redirects=True,
                timeout=timeout,
                headers={"User-Agent": user_agent},
            ) as client,
        ):
            writer = WARCWriter(warc_stream, gzip=True)
            while queued:
                url = queued.popleft()
                sink.emit(f"[http_warc] Fetching {url}")
                try:
                    response = client.get(url)
                    _write_response_record(writer, url=url, response=response)
                    crawled += 1
                    content_type = response.headers.get("content-type")
                    if _is_html_response(content_type):
                        html_responses += 1
                    for discovered in sorted(
                        _extract_links(url, response.content, content_type),
                    ):
                        if discovered in seen:
                            continue
                        if not scope.allows(discovered):
                            continue
                        seen.add(discovered)
                        queued.append(discovered)
                except httpx.HTTPError as exc:
                    failed += 1
                    sink.emit(f"[http_warc] ERROR fetching {url}: {exc}")

                _emit_crawl_status(
                    sink,
                    crawled=crawled,
                    total=max(len(seen), crawled + failed + len(queued)),
                    pending=len(queued),
                    failed=failed,
                )
            warc_stream.flush()
            os.fsync(warc_stream.fileno())
    except Exception as exc:
        sink.emit(f"[http_warc] FATAL: fallback capture crashed: {exc}")
        sink.close()
        logger.error("http_warc fallback crashed: %s", exc, exc_info=True)
        return HttpWarcRunResult(
            exit_code=1,
            crawled=crawled,
            failed=failed,
            warc_path=warc_path,
            combined_log_path=sink.combined_log_path,
        )

    sink.emit(
        f"[http_warc] Completed fallback capture: crawled={crawled} failed={failed} html={html_responses}"
    )
    sink.close()

    exit_code = 0 if crawled > 0 and html_responses > 0 else 1
    return HttpWarcRunResult(
        exit_code=exit_code,
        crawled=crawled,
        failed=failed,
        warc_path=warc_path,
        combined_log_path=sink.combined_log_path,
    )
