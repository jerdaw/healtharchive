from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE_PATH = (
    Path(__file__).resolve().parents[1] / "docs" / "deployment" / "pywb" / "sitecustomize.py"
)


def _load_module():
    spec = importlib.util.spec_from_file_location("healtharchive_pywb_sitecustomize", MODULE_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_is_valid_header_name_accepts_standard_http_tokens() -> None:
    module = _load_module()

    assert module._is_valid_header_name("Set-Cookie")
    assert module._is_valid_header_name("X-Archive-Orig-server")


def test_is_valid_header_name_rejects_malformed_cookie_continuation() -> None:
    module = _load_module()

    assert not module._is_valid_header_name(
        "AWSALBCORS=9ZLm1rlBJ8fMA69H; Expires=Tue, 21 Apr 2026 22: 45:48 GMT"
    )


def test_filter_headers_drops_invalid_header_names() -> None:
    module = _load_module()

    filtered = module._filter_headers(
        [
            ("content-type", "text/html"),
            ("AWSALBCORS=broken; Expires=Tue, 21 Apr 2026 22: 45:48 GMT", ""),
            ("Set-Cookie", "AWSALB=ok"),
        ]
    )

    assert filtered == [
        ("content-type", "text/html"),
        ("Set-Cookie", "AWSALB=ok"),
    ]
