from __future__ import annotations

import io
import json
import logging
import os
import re
import subprocess
import tempfile
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from pathlib import Path
from typing import Iterable, Pattern
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup
from warcio.statusandheaders import StatusAndHeaders
from warcio.warcwriter import WARCWriter

logger = logging.getLogger("website_archiver.http_warc")

_HTML_MIME_TOKENS = ("text/html", "application/xhtml+xml")
_DEFAULT_BROWSER_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
)
_DEFAULT_ACCEPT_HEADER = (
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
)
_DEFAULT_ACCEPT_LANGUAGE_HEADER = "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7"
_SEED_FETCH_ATTEMPTS = 3
_DISCOVERED_FETCH_ATTEMPTS = 2
_RETRYABLE_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}
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


def _build_default_headers(user_agent: str) -> dict[str, str]:
    return {
        "User-Agent": user_agent,
        "Accept": _DEFAULT_ACCEPT_HEADER,
        "Accept-Language": _DEFAULT_ACCEPT_LANGUAGE_HEADER,
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
    }


def _reason_phrase_for_status(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return ""


def _parse_curl_response_headers(raw_headers: bytes) -> tuple[int, list[tuple[str, str]]]:
    text = raw_headers.decode("iso-8859-1", errors="replace")
    blocks = [block.strip() for block in re.split(r"\r?\n\r?\n", text) if block.strip()]
    response_blocks = [block for block in blocks if block.startswith("HTTP/")]
    if not response_blocks:
        raise ValueError("curl response headers did not include an HTTP status line")

    last_block = response_blocks[-1]
    lines = [line.strip() for line in last_block.splitlines() if line.strip()]
    status_line = lines[0]
    parts = status_line.split(" ", 2)
    if len(parts) < 2:
        raise ValueError(f"invalid curl status line: {status_line!r}")
    status_code = int(parts[1])

    header_items: list[tuple[str, str]] = []
    for line in lines[1:]:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        header_items.append((key.strip(), value.strip()))
    return status_code, header_items


def _curl_fetch_with_retries(
    *,
    sink: _StageLogSink,
    url: str,
    user_agent: str,
    connect_timeout_seconds: float,
    read_timeout_seconds: float,
    retry_backoff_seconds: float,
    max_attempts: int = 2,
) -> httpx.Response:
    headers = _build_default_headers(user_agent)
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        if attempt == 1:
            sink.emit(
                f"[http_warc] Switching {url} to curl --http1.1 transport "
                f"(attempt {attempt}/{max_attempts})."
            )
        else:
            delay = retry_backoff_seconds * float(attempt - 1)
            sink.emit(
                f"[http_warc] Retrying {url} via curl after {delay:.1f}s backoff "
                f"(attempt {attempt}/{max_attempts})."
            )
            if delay > 0:
                time.sleep(delay)

        try:
            with tempfile.TemporaryDirectory(prefix="ha-http-warc-curl-") as temp_dir:
                header_path = Path(temp_dir) / "headers.txt"
                body_path = Path(temp_dir) / "body.bin"
                cmd = [
                    "curl",
                    "--http1.1",
                    "--location",
                    "--compressed",
                    "--silent",
                    "--show-error",
                    "--dump-header",
                    str(header_path),
                    "--output",
                    str(body_path),
                    "--write-out",
                    "%{http_code}\n%{url_effective}",
                    "--connect-timeout",
                    str(int(max(1.0, round(connect_timeout_seconds)))),
                    "--max-time",
                    str(int(max(1.0, round(connect_timeout_seconds + read_timeout_seconds)))),
                    "--user-agent",
                    user_agent,
                ]
                for key, value in headers.items():
                    if key.lower() == "user-agent":
                        continue
                    cmd.extend(["--header", f"{key}: {value}"])
                cmd.append(url)

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=max(1.0, connect_timeout_seconds + read_timeout_seconds + 15.0),
                    check=False,
                )

                if result.returncode != 0:
                    stderr = (result.stderr or "").strip()
                    if result.returncode == 28:
                        last_error = httpx.ReadTimeout(
                            stderr or "curl timed out",
                            request=httpx.Request("GET", url),
                        )
                        sink.emit(
                            f"[http_warc] WARNING curl fetching {url} attempt {attempt}/{max_attempts}: "
                            f"timeout ({stderr or 'curl timed out'})"
                        )
                    else:
                        last_error = httpx.TransportError(
                            stderr or f"curl exited {result.returncode}"
                        )
                        sink.emit(
                            f"[http_warc] WARNING curl fetching {url} attempt {attempt}/{max_attempts}: "
                            f"transport error ({stderr or f'curl exited {result.returncode}'})"
                        )
                    if attempt < max_attempts:
                        continue
                    break

                stdout_lines = (result.stdout or "").splitlines()
                if not stdout_lines:
                    raise ValueError("curl write-out did not return status metadata")
                status_code = int(stdout_lines[0].strip())
                effective_url = stdout_lines[1].strip() if len(stdout_lines) > 1 else url
                raw_headers = header_path.read_bytes()
                body = body_path.read_bytes()
                parsed_status_code, header_items = _parse_curl_response_headers(raw_headers)
                if parsed_status_code != status_code:
                    status_code = parsed_status_code

                response = httpx.Response(
                    status_code,
                    headers=header_items,
                    content=body,
                    request=httpx.Request("GET", effective_url or url),
                )

                if status_code in _RETRYABLE_STATUS_CODES and attempt < max_attempts:
                    sink.emit(
                        f"[http_warc] WARNING curl fetching {url} attempt {attempt}/{max_attempts}: "
                        f"HTTP {status_code}; will retry."
                    )
                    continue

                sink.emit(
                    f"[http_warc] Curl fetch succeeded for {url} on attempt {attempt}/{max_attempts} "
                    f"with status {status_code}."
                )
                return response
        except subprocess.TimeoutExpired as exc:
            last_error = httpx.ReadTimeout(
                str(exc),
                request=httpx.Request("GET", url),
            )
            sink.emit(
                f"[http_warc] WARNING curl fetching {url} attempt {attempt}/{max_attempts}: "
                f"timeout ({exc})"
            )
            if attempt < max_attempts:
                continue
        except Exception as exc:
            last_error = exc
            sink.emit(
                f"[http_warc] WARNING curl fetching {url} attempt {attempt}/{max_attempts}: {exc}"
            )
            if attempt < max_attempts:
                continue

    if isinstance(last_error, httpx.HTTPError):
        raise last_error
    raise httpx.TransportError(str(last_error or "curl transport failed"))


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


def _fetch_with_retries(
    *,
    client: httpx.Client,
    sink: _StageLogSink,
    url: str,
    max_attempts: int,
    retry_backoff_seconds: float,
    allow_curl_transport: bool,
    user_agent: str,
    connect_timeout_seconds: float,
    read_timeout_seconds: float,
) -> httpx.Response:
    last_exc: httpx.HTTPError | None = None

    for attempt in range(1, max_attempts + 1):
        if attempt == 1:
            sink.emit(f"[http_warc] Fetching {url}")
        else:
            delay = retry_backoff_seconds * float(attempt - 1)
            sink.emit(
                f"[http_warc] Retrying {url} after {delay:.1f}s backoff "
                f"(attempt {attempt}/{max_attempts})."
            )
            if delay > 0:
                time.sleep(delay)

        try:
            response = client.get(url)
        except httpx.TimeoutException as exc:
            last_exc = exc
            sink.emit(
                f"[http_warc] WARNING fetching {url} attempt {attempt}/{max_attempts}: "
                f"timeout ({exc})"
            )
            if attempt < max_attempts:
                continue
            break
        except httpx.TransportError as exc:
            last_exc = exc
            sink.emit(
                f"[http_warc] WARNING fetching {url} attempt {attempt}/{max_attempts}: "
                f"transport error ({exc})"
            )
            if attempt < max_attempts:
                continue
            break

        if response.status_code in _RETRYABLE_STATUS_CODES and attempt < max_attempts:
            sink.emit(
                f"[http_warc] WARNING fetching {url} attempt {attempt}/{max_attempts}: "
                f"HTTP {response.status_code}; will retry."
            )
            continue

        if attempt > 1:
            sink.emit(
                f"[http_warc] Fetch succeeded for {url} on attempt {attempt}/{max_attempts} "
                f"with status {response.status_code}."
            )
        return response

    if last_exc is not None:
        if allow_curl_transport:
            return _curl_fetch_with_retries(
                sink=sink,
                url=url,
                user_agent=user_agent,
                connect_timeout_seconds=connect_timeout_seconds,
                read_timeout_seconds=read_timeout_seconds,
                retry_backoff_seconds=retry_backoff_seconds,
            )
        raise last_exc
    raise httpx.HTTPError(f"Failed to fetch {url}")


def run_http_warc_capture(
    *,
    output_dir: Path,
    seeds: list[str],
    zimit_passthrough_args: list[str],
    user_agent: str = _DEFAULT_BROWSER_USER_AGENT,
    connect_timeout_seconds: float = 20.0,
    read_timeout_seconds: float = 120.0,
    retry_backoff_seconds: float = 5.0,
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
    seed_urls = set(seen)

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
                http2=False,
                timeout=timeout,
                headers=_build_default_headers(user_agent),
            ) as client,
        ):
            writer = WARCWriter(warc_stream, gzip=True)
            while queued:
                url = queued.popleft()
                try:
                    response = _fetch_with_retries(
                        client=client,
                        sink=sink,
                        url=url,
                        max_attempts=(
                            _SEED_FETCH_ATTEMPTS if url in seed_urls else _DISCOVERED_FETCH_ATTEMPTS
                        ),
                        retry_backoff_seconds=retry_backoff_seconds,
                        allow_curl_transport=url in seed_urls,
                        user_agent=user_agent,
                        connect_timeout_seconds=connect_timeout_seconds,
                        read_timeout_seconds=read_timeout_seconds,
                    )
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
