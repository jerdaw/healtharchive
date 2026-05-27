from __future__ import annotations

import os
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class _SearchMetrics:
    lock: Lock = field(default_factory=Lock)

    count: int = 0
    error_count: int = 0

    # Error type breakdown for better SLA tracking
    error_server: int = 0  # 500-class errors (internal errors)
    error_client: int = 0  # 400-class errors (bad requests, validation)
    error_timeout: int = 0  # Timeout errors
    error_unknown: int = 0  # Unclassified errors

    duration_seconds_sum: float = 0.0
    duration_seconds_max: float = 0.0

    # Prometheus-style cumulative histogram buckets.
    bucket_le_005: int = 0
    bucket_le_01: int = 0
    bucket_le_03: int = 0
    bucket_le_1: int = 0
    bucket_le_3: int = 0
    bucket_le_inf: int = 0

    # Simple breakdown counters.
    relevance_fts: int = 0
    relevance_fallback: int = 0
    relevance_fuzzy: int = 0
    boolean: int = 0
    url: int = 0
    pages_fastpath: int = 0
    newest: int = 0


SEARCH_METRICS = _SearchMetrics()


def _labels(**values: str) -> str:
    joined = ",".join(f'{key}="{value}"' for key, value in values.items())
    return f"{{{joined}}}"


def _sample(name: str, value: int | float, **labels: str) -> str:
    return f"{name}{_labels(**labels)} {value}"


def observe_search_request(
    *, duration_seconds: float, mode: str, ok: bool, error_type: str | None = None
) -> None:
    """
    Record a single /api/search request observation.

    Notes:
    - These metrics are per-process and reset on restart.
    - We keep the label-space intentionally small to avoid cardinality issues.

    Args:
        duration_seconds: Request duration
        mode: Search mode used (relevance_fts, boolean, etc.)
        ok: True if request succeeded, False otherwise
        error_type: If ok=False, categorizes the error:
            - "server": 500-class internal errors
            - "client": 400-class client errors (validation, bad requests)
            - "timeout": Timeout errors
            - None or other: Unclassified errors
    """
    m = SEARCH_METRICS
    with m.lock:
        m.count += 1
        if not ok:
            m.error_count += 1
            # Categorize error type
            if error_type == "server":
                m.error_server += 1
            elif error_type == "client":
                m.error_client += 1
            elif error_type == "timeout":
                m.error_timeout += 1
            else:
                m.error_unknown += 1

        m.duration_seconds_sum += float(duration_seconds)
        m.duration_seconds_max = max(m.duration_seconds_max, float(duration_seconds))

        if duration_seconds <= 0.05:
            m.bucket_le_005 += 1
        if duration_seconds <= 0.1:
            m.bucket_le_01 += 1
        if duration_seconds <= 0.3:
            m.bucket_le_03 += 1
        if duration_seconds <= 1.0:
            m.bucket_le_1 += 1
        if duration_seconds <= 3.0:
            m.bucket_le_3 += 1
        m.bucket_le_inf += 1

        if mode.startswith("relevance_fts"):
            m.relevance_fts += 1
        elif mode.startswith("relevance_fallback"):
            m.relevance_fallback += 1
        elif mode.startswith("relevance_fuzzy"):
            m.relevance_fuzzy += 1
        elif mode == "boolean":
            m.boolean += 1
        elif mode == "url":
            m.url += 1
        elif mode == "pages_fastpath":
            m.pages_fastpath += 1
        else:
            m.newest += 1


def render_search_metrics_prometheus() -> list[str]:
    """
    Render search-related metrics in Prometheus text exposition format.
    """
    m = SEARCH_METRICS
    with m.lock:
        lines = []
        pid = str(os.getpid())

        lines.append("# HELP healtharchive_search_requests_total Total /api/search requests")
        lines.append("# TYPE healtharchive_search_requests_total counter")
        lines.append(_sample("healtharchive_search_requests_total", m.count, pid=pid))

        lines.append(
            "# HELP healtharchive_search_errors_total Total /api/search requests that raised an error"
        )
        lines.append("# TYPE healtharchive_search_errors_total counter")
        lines.append(_sample("healtharchive_search_errors_total", m.error_count, pid=pid))

        lines.append(
            "# HELP healtharchive_search_errors_by_type Error breakdown by type (per-process)"
        )
        lines.append("# TYPE healtharchive_search_errors_by_type counter")
        lines.append(
            _sample("healtharchive_search_errors_by_type", m.error_server, type="server", pid=pid)
        )
        lines.append(
            _sample("healtharchive_search_errors_by_type", m.error_client, type="client", pid=pid)
        )
        lines.append(
            _sample(
                "healtharchive_search_errors_by_type",
                m.error_timeout,
                type="timeout",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_errors_by_type",
                m.error_unknown,
                type="unknown",
                pid=pid,
            )
        )

        lines.append(
            "# HELP healtharchive_search_duration_seconds /api/search latency histogram (per-process)"
        )
        lines.append("# TYPE healtharchive_search_duration_seconds histogram")
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_bucket",
                m.bucket_le_005,
                le="0.05",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_bucket",
                m.bucket_le_01,
                le="0.1",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_bucket",
                m.bucket_le_03,
                le="0.3",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_bucket",
                m.bucket_le_1,
                le="1",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_bucket",
                m.bucket_le_3,
                le="3",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_bucket",
                m.bucket_le_inf,
                le="+Inf",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_sum",
                m.duration_seconds_sum,
                pid=pid,
            )
        )
        lines.append(_sample("healtharchive_search_duration_seconds_count", m.count, pid=pid))

        lines.append(
            "# HELP healtharchive_search_mode_total /api/search mode breakdown (per-process)"
        )
        lines.append("# TYPE healtharchive_search_mode_total counter")
        lines.append(
            _sample(
                "healtharchive_search_mode_total",
                m.relevance_fts,
                mode="relevance_fts",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_mode_total",
                m.relevance_fallback,
                mode="relevance_fallback",
                pid=pid,
            )
        )
        lines.append(
            _sample(
                "healtharchive_search_mode_total",
                m.relevance_fuzzy,
                mode="relevance_fuzzy",
                pid=pid,
            )
        )
        lines.append(_sample("healtharchive_search_mode_total", m.boolean, mode="boolean", pid=pid))
        lines.append(_sample("healtharchive_search_mode_total", m.url, mode="url", pid=pid))
        lines.append(
            _sample(
                "healtharchive_search_mode_total",
                m.pages_fastpath,
                mode="pages_fastpath",
                pid=pid,
            )
        )
        lines.append(_sample("healtharchive_search_mode_total", m.newest, mode="newest", pid=pid))

        lines.append(
            "# HELP healtharchive_search_duration_seconds_max Max observed /api/search latency (seconds)"
        )
        lines.append("# TYPE healtharchive_search_duration_seconds_max gauge")
        lines.append(
            _sample(
                "healtharchive_search_duration_seconds_max",
                m.duration_seconds_max,
                pid=pid,
            )
        )

        return lines


__all__ = ["observe_search_request", "render_search_metrics_prometheus"]
