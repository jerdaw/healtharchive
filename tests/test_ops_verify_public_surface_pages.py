from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any


def _load_script_module() -> Any:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / "verify_public_surface.py"
    spec = importlib.util.spec_from_file_location("verify_public_surface", script_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_verify_public_surface_build_frontend_pages_includes_en_and_fr() -> None:
    module = _load_script_module()

    pages = module._build_frontend_pages("https://healtharchive.ca", first_snapshot_id=123)
    urls = {url for _name, url in pages}

    assert "https://healtharchive.ca/archive" in urls
    assert "https://healtharchive.ca/fr/archive" in urls
    assert "https://healtharchive.ca/snapshot/123" in urls
    assert "https://healtharchive.ca/fr/snapshot/123" in urls


def test_verify_public_surface_canonicalizes_www_frontend_alias() -> None:
    module = _load_script_module()

    assert (
        module._canonicalize_frontend_base("https://www.healtharchive.ca")
        == "https://healtharchive.ca"
    )
    assert (
        module._canonicalize_frontend_base("https://healtharchive.ca") == "https://healtharchive.ca"
    )


def test_verify_public_surface_uses_pages_search_fallback_for_snapshot_probe(
    monkeypatch, capsys
) -> None:
    module = _load_script_module()
    calls: list[str] = []

    def response(
        status: int,
        body: dict[str, Any] | list[Any] | str,
        content_type: str = "application/json",
    ):
        if isinstance(body, str):
            raw = body.encode("utf-8")
        else:
            import json

            raw = json.dumps(body).encode("utf-8")
        return module.HttpResponse(status=status, headers={"Content-Type": content_type}, body=raw)

    def fake_http_request(
        url: str,
        *,
        timeout_s: float,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        json_body: dict[str, Any] | None = None,
        read_limit_bytes: int = 64 * 1024,
        follow_redirects: bool = True,
    ):
        del timeout_s, method, headers, json_body, read_limit_bytes, follow_redirects
        calls.append(url)
        if url.endswith("/api/health"):
            return response(200, {"status": "ok"})
        if url.endswith("/api/stats"):
            return response(200, {"snapshotsTotal": 1})
        if url.endswith("/api/sources"):
            return response(200, [{"sourceCode": "cihr"}])
        if url.endswith("/api/search?pageSize=1"):
            return module.HttpResponse(
                status=0,
                headers={},
                body=b"",
                error="TimeoutError: The read operation timed out",
            )
        if url.endswith("/api/search?pageSize=1&view=pages"):
            return response(
                200,
                {
                    "results": [
                        {
                            "id": 123,
                            "rawSnapshotUrl": "/api/snapshots/raw/123",
                            "browseUrl": "https://replay.example/123",
                        }
                    ],
                    "total": 1,
                    "page": 1,
                    "pageSize": 1,
                },
            )
        if url.endswith("/api/snapshot/123"):
            return response(200, {"id": 123, "title": "Fallback Probe"})
        if url.endswith("/api/snapshots/raw/123"):
            return response(200, "<html>Fallback Probe</html>", "text/html; charset=utf-8")
        if url.endswith("/api/usage"):
            return response(200, {"enabled": True, "windowDays": 30})
        raise AssertionError(f"unexpected URL: {url}")

    monkeypatch.setattr(module, "_http_request", fake_http_request)

    exit_code = module.main(
        [
            "--api-base",
            "https://api.example",
            "--frontend-base",
            "https://front.example",
            "--skip-exports",
            "--skip-changes",
            "--skip-frontend",
            "--skip-replay",
        ]
    )

    output = capsys.readouterr().out
    assert exit_code == 1
    assert "FAIL api search status=0 error=TimeoutError" in output
    assert "OK   api search fallback status=200 snapshot_id=123 browseUrl=yes" in output
    assert "OK   api snapshot detail status=200 id=123" in output
    assert "OK   raw snapshot status=200 url=https://api.example/api/snapshots/raw/123" in output
    assert "https://api.example/api/search?pageSize=1&view=pages" in calls


def test_verify_public_surface_accepts_raw_snapshot_replay_redirect(monkeypatch, capsys) -> None:
    module = _load_script_module()

    def response(
        status: int,
        body: dict[str, Any] | list[Any] | str,
        content_type: str = "application/json",
        headers: dict[str, str] | None = None,
    ):
        if isinstance(body, str):
            raw = body.encode("utf-8")
        else:
            import json

            raw = json.dumps(body).encode("utf-8")
        response_headers = {"Content-Type": content_type}
        if headers:
            response_headers.update(headers)
        return module.HttpResponse(status=status, headers=response_headers, body=raw)

    def fake_http_request(
        url: str,
        *,
        timeout_s: float,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        json_body: dict[str, Any] | None = None,
        read_limit_bytes: int = 64 * 1024,
        follow_redirects: bool = True,
    ):
        del timeout_s, method, headers, json_body, read_limit_bytes
        if url.endswith("/api/health"):
            return response(200, {"status": "ok"})
        if url.endswith("/api/stats"):
            return response(200, {"snapshotsTotal": 1})
        if url.endswith("/api/sources"):
            return response(200, [{"sourceCode": "cihr"}])
        if url.endswith("/api/search?pageSize=1"):
            return response(
                200,
                {
                    "results": [
                        {
                            "id": 123,
                            "rawSnapshotUrl": "/api/snapshots/raw/123",
                            "browseUrl": "https://replay.example/job-8/20260101000000/https://example.test/#ha_snapshot=123",
                        }
                    ],
                    "total": 1,
                    "page": 1,
                    "pageSize": 1,
                },
            )
        if url.endswith("/api/snapshot/123"):
            return response(200, {"id": 123, "title": "Large Snapshot"})
        if url.endswith("/api/snapshots/raw/123"):
            assert follow_redirects is False
            return response(
                307,
                "",
                "text/plain",
                headers={
                    "Location": "https://replay.example/job-8/20260101000000/https://example.test/#ha_snapshot=123"
                },
            )
        if url.endswith("/api/usage"):
            return response(200, {"enabled": True, "windowDays": 30})
        raise AssertionError(f"unexpected URL: {url}")

    monkeypatch.setattr(module, "_http_request", fake_http_request)

    exit_code = module.main(
        [
            "--api-base",
            "https://api.example",
            "--frontend-base",
            "https://front.example",
            "--skip-exports",
            "--skip-changes",
            "--skip-frontend",
            "--skip-replay",
        ]
    )

    output = capsys.readouterr().out
    assert exit_code == 0
    assert "OK   raw snapshot redirect status=307 location=https://replay.example/" in output
