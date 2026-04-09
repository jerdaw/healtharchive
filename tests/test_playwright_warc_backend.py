from __future__ import annotations

import json
from pathlib import Path

from archive_tool.constants import PLAYWRIGHT_DOCKER_IMAGE
from archive_tool.http_warc_backend import _StageLogSink
from archive_tool.playwright_warc_backend import (
    _run_playwright_container,
    probe_playwright_fetch,
    run_playwright_warc_capture,
)
from ha_backend.indexing.warc_reader import iter_html_records


def test_run_playwright_warc_capture_writes_warc_and_provenance(tmp_path, monkeypatch) -> None:
    out_dir = tmp_path / "playwright-warc"
    out_dir.mkdir()

    def fake_run_playwright_container(
        *,
        sink,
        seeds,
        scope_include_rx,
        scope_exclude_rx,
        expand_links,
        scratch_dir,
    ):
        assert seeds == ["https://example.org"]
        assert expand_links is True
        bodies_dir = scratch_dir / "bodies"
        bodies_dir.mkdir(parents=True, exist_ok=True)
        (bodies_dir / "record-000001.bin").write_bytes(
            b'<html><body><a href="https://example.org/page">Page</a></body></html>'
        )
        (bodies_dir / "record-000002.html").write_text(
            "<html><body>Rendered page body</body></html>",
            encoding="utf-8",
        )
        manifest = {
            "runtime": {
                "playwrightVersion": "1.50.1",
                "chromiumVersion": "147.0.7727.15",
                "viewport": {"width": 1440, "height": 900},
                "locale": "en-CA",
                "timezone": "America/Toronto",
            },
            "records": [
                {
                    "requestedUrl": "https://example.org",
                    "finalUrl": "https://example.org/final",
                    "statusCode": 200,
                    "headers": {
                        "content-type": "text/html; charset=utf-8",
                        "content-encoding": "gzip",
                    },
                    "bodyPath": "bodies/record-000001.bin",
                    "bodySource": "network_response",
                    "cookieCount": 3,
                    "captureTimestamp": "2026-04-03T05:06:06.051Z",
                    "contentType": "text/html",
                    "discoveredUrls": ["https://example.org/page"],
                },
                {
                    "requestedUrl": "https://example.org/page",
                    "finalUrl": "https://example.org/page",
                    "statusCode": 200,
                    "headers": {
                        "content-type": "text/html; charset=utf-8",
                    },
                    "bodyPath": "bodies/record-000002.html",
                    "bodySource": "rendered_dom",
                    "cookieCount": 4,
                    "captureTimestamp": "2026-04-03T05:06:07.051Z",
                    "contentType": "text/html",
                    "discoveredUrls": [],
                },
            ],
            "failures": [
                {
                    "requestedUrl": "https://example.org/broken",
                    "error": "Navigation timeout of 150000 ms exceeded",
                }
            ],
        }
        return 0, manifest

    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._run_playwright_container",
        fake_run_playwright_container,
    )

    result = run_playwright_warc_capture(
        output_dir=out_dir,
        seeds=["https://example.org"],
        zimit_passthrough_args=["--scopeType", "host"],
    )

    assert result.exit_code == 0
    assert result.warc_path.is_file()
    assert result.provenance_path is not None and result.provenance_path.is_file()

    urls = [record.url for record in iter_html_records(result.warc_path)]
    assert urls == ["https://example.org/final", "https://example.org/page"]

    provenance = json.loads(result.provenance_path.read_text(encoding="utf-8"))
    assert provenance["backend"] == "playwright_warc"
    assert provenance["runtime"]["image"] == PLAYWRIGHT_DOCKER_IMAGE
    assert provenance["counts"]["bodySourceCounts"] == {
        "network_response": 1,
        "rendered_dom": 1,
    }
    assert provenance["failures"] == [
        {
            "requestedUrl": "https://example.org/broken",
            "error": "Navigation timeout of 150000 ms exceeded",
        }
    ]
    assert provenance["records"][0]["renderedDomPath"] is None
    assert provenance["records"][1]["renderedDomPath"].endswith(".html")

    combined = Path(result.combined_log_path).read_text(encoding="utf-8")
    assert "Completed browser fallback capture" in combined
    assert '"name":"playwright_warc"' in combined


def test_run_playwright_warc_capture_provenance_only_counts_written_records(
    tmp_path, monkeypatch
) -> None:
    out_dir = tmp_path / "playwright-warc"
    out_dir.mkdir()

    def fake_run_playwright_container(
        *,
        sink,
        seeds,
        scope_include_rx,
        scope_exclude_rx,
        expand_links,
        scratch_dir,
    ):
        bodies_dir = scratch_dir / "bodies"
        bodies_dir.mkdir(parents=True, exist_ok=True)
        (bodies_dir / "record-000001.bin").write_bytes(b"<html><body>ok</body></html>")
        manifest = {
            "runtime": {
                "playwrightVersion": "1.50.1",
                "chromiumVersion": "147.0.7727.15",
            },
            "records": [
                {
                    "requestedUrl": "https://example.org/good",
                    "finalUrl": "https://example.org/final",
                    "statusCode": 200,
                    "headers": {"content-type": "text/html; charset=utf-8"},
                    "bodyPath": "bodies/record-000001.bin",
                    "bodySource": "network_response",
                    "cookieCount": 1,
                    "captureTimestamp": "2026-04-03T05:06:06.051Z",
                    "contentType": "text/html",
                    "discoveredUrls": [],
                },
                {
                    "requestedUrl": "https://example.org/bad",
                    "finalUrl": "notaurl",
                    "statusCode": 200,
                    "headers": {"content-type": "text/html; charset=utf-8"},
                    "bodyPath": "bodies/missing.bin",
                    "bodySource": "rendered_dom",
                    "cookieCount": 0,
                    "captureTimestamp": "2026-04-03T05:06:07.051Z",
                    "contentType": "text/html",
                    "discoveredUrls": [],
                },
            ],
            "failures": [],
        }
        return 0, manifest

    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._run_playwright_container",
        fake_run_playwright_container,
    )

    result = run_playwright_warc_capture(
        output_dir=out_dir,
        seeds=["https://example.org/good"],
        zimit_passthrough_args=["--scopeType", "host"],
    )

    assert result.exit_code == 0
    assert result.provenance_path is not None
    provenance = json.loads(result.provenance_path.read_text(encoding="utf-8"))
    assert provenance["counts"] == {
        "crawled": 1,
        "failed": 1,
        "bodySourceCounts": {"network_response": 1},
    }
    assert provenance["records"] == [
        {
            "requestedUrl": "https://example.org/good",
            "finalUrl": "https://example.org/final",
            "statusCode": 200,
            "bodySource": "network_response",
            "cookieCount": 1,
            "captureTimestamp": "2026-04-03T05:06:06.051Z",
            "contentType": "text/html",
            "discoveredUrlCount": 0,
            "renderedDomPath": None,
        }
    ]
    assert provenance["failures"][0]["requestedUrl"] == "https://example.org/bad"
    assert provenance["failures"][0]["error"].startswith("missing body file ")


def test_probe_playwright_fetch_returns_runtime_and_items(tmp_path, monkeypatch) -> None:
    def fake_run_playwright_container(
        *,
        sink,
        seeds,
        scope_include_rx,
        scope_exclude_rx,
        expand_links,
        scratch_dir,
    ):
        assert expand_links is False
        bodies_dir = scratch_dir / "bodies"
        bodies_dir.mkdir(parents=True, exist_ok=True)
        (bodies_dir / "record-000001.bin").write_bytes(b"<html><body>ok</body></html>")
        manifest = {
            "runtime": {
                "playwrightVersion": "1.50.1",
                "chromiumVersion": "147.0.7727.15",
            },
            "records": [
                {
                    "requestedUrl": seeds[0],
                    "finalUrl": seeds[0],
                    "statusCode": 200,
                    "bodyPath": "bodies/record-000001.bin",
                    "bodySource": "network_response",
                    "cookieCount": 2,
                }
            ],
            "failures": [
                {
                    "requestedUrl": "https://example.org/fail",
                    "error": "boom",
                }
            ],
        }
        return 0, manifest

    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._run_playwright_container",
        fake_run_playwright_container,
    )

    result = probe_playwright_fetch(["https://example.org"])

    assert result["runtime"]["image"] == PLAYWRIGHT_DOCKER_IMAGE
    assert result["runtime"]["chromiumVersion"] == "147.0.7727.15"
    assert result["items"] == [
        {
            "requestedUrl": "https://example.org/",
            "finalUrl": "https://example.org/",
            "statusCode": 200,
            "cookieCount": 2,
            "bodySource": "network_response",
            "htmlBytes": 28,
            "error": None,
        },
        {
            "requestedUrl": "https://example.org/fail",
            "finalUrl": None,
            "statusCode": None,
            "cookieCount": None,
            "bodySource": None,
            "htmlBytes": None,
            "error": "boom",
        },
    ]


def test_run_playwright_container_passes_playwright_version_env(tmp_path, monkeypatch) -> None:
    script_path = tmp_path / "playwright_warc_capture.js"
    script_path.write_text("// test stub\n", encoding="utf-8")
    scratch_dir = tmp_path / "scratch"
    node_cache_dir = tmp_path / "node-cache"
    captured_cmd: dict[str, list[str]] = {}

    class FakeProc:
        stdout = None

        def wait(self) -> int:
            return 0

    def fake_stream_subprocess_output(proc, sink) -> None:
        manifest = {
            "runtime": {
                "playwrightVersion": "1.50.1",
                "chromiumVersion": "147.0.7727.15",
            },
            "records": [],
            "failures": [],
        }
        (scratch_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    def fake_popen(cmd, **kwargs):
        captured_cmd["cmd"] = list(cmd)
        return FakeProc()

    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._playwright_script_path",
        lambda: script_path,
    )
    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._node_cache_dir",
        lambda: node_cache_dir,
    )
    monkeypatch.setattr(
        "archive_tool.playwright_warc_backend._stream_subprocess_output",
        fake_stream_subprocess_output,
    )
    monkeypatch.setattr("archive_tool.playwright_warc_backend.subprocess.Popen", fake_popen)

    sink = _StageLogSink(tmp_path, "playwright_warc_capture")
    rc, manifest = _run_playwright_container(
        sink=sink,
        seeds=["https://example.org"],
        scope_include_rx=None,
        scope_exclude_rx=None,
        expand_links=False,
        scratch_dir=scratch_dir,
    )

    assert rc == 0
    assert manifest["runtime"]["playwrightVersion"] == "1.50.1"
    assert "cmd" in captured_cmd
    assert "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1" in captured_cmd["cmd"]
    assert "PLAYWRIGHT_VERSION=1.50.1" in captured_cmd["cmd"]
