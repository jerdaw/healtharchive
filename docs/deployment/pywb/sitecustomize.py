"""HealthArchive replay startup patch for pywb.

Loaded automatically when the replay container starts with:

    PYTHONPATH=/webarchive

Some archived responses contain malformed header names from the original
capture, notably bare cookie continuation lines such as:

    AWSALBCORS=...; Expires=...

pywb can replay those verbatim. Caddy/Go rejects them while parsing the
upstream response and returns 502. Filter invalid header names before pywb
writes the response to the socket.
"""

from __future__ import annotations

import re
from typing import Any, Iterable

_HEADER_NAME_RE = re.compile(r"^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$")


def _coerce_header_name(name: Any) -> str | None:
    if isinstance(name, str):
        return name
    if isinstance(name, bytes):
        try:
            return name.decode("latin-1")
        except Exception:
            return None
    return None


def _is_valid_header_name(name: Any) -> bool:
    header_name = _coerce_header_name(name)
    return bool(header_name and _HEADER_NAME_RE.fullmatch(header_name))


def _filter_headers(headers: Iterable[tuple[Any, Any]]) -> list[tuple[Any, Any]]:
    return [(name, value) for name, value in headers if _is_valid_header_name(name)]


def _patch_header_rewriter() -> None:
    try:
        from pywb.rewrite.header_rewriter import DefaultHeaderRewriter
    except Exception:
        return

    original = getattr(DefaultHeaderRewriter, "rewrite_header", None)
    if not callable(original) or getattr(original, "_healtharchive_header_sanitized", False):
        return

    def _rewrite_header(self, name, value, rule):
        if not _is_valid_header_name(name):
            return None
        return original(self, name, value, rule)

    _rewrite_header._healtharchive_header_sanitized = True  # type: ignore[attr-defined]
    DefaultHeaderRewriter.rewrite_header = _rewrite_header


def _patch_wbresponse() -> None:
    try:
        from pywb.apps.wbrequestresponse import WbResponse
    except Exception:
        return

    original = getattr(WbResponse, "__call__", None)
    if not callable(original) or getattr(original, "_healtharchive_header_sanitized", False):
        return

    def _call(self, env, start_response):
        self.status_headers.headers = _filter_headers(self.status_headers.headers)
        return original(self, env, start_response)

    _call._healtharchive_header_sanitized = True  # type: ignore[attr-defined]
    WbResponse.__call__ = _call


_patch_header_rewriter()
_patch_wbresponse()
