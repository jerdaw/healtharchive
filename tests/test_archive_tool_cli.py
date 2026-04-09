from __future__ import annotations

import pytest

from archive_tool.cli import parse_arguments


def test_parse_arguments_accepts_skip_final_build_docker_shm_and_browsertrix_config(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "sys.argv",
        [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "example",
            "--output-dir",
            "/tmp/example",
            "--skip-final-build",
            "--docker-shm-size",
            "1g",
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--capture-backend",
            "http_warc",
            "--resume-policy",
            "fresh_only",
            "--fallback-backend",
            "http_warc",
            "--max-fresh-failures-before-fallback",
            "2",
            "--auto-reset-poisoned-state",
            "--max-temp-dirs-before-reset",
            "25",
            "--scopeType",
            "host",
        ],
    )

    script_args, zimit_passthrough = parse_arguments()
    assert script_args.skip_final_build is True
    assert script_args.docker_shm_size == "1g"
    assert script_args.browsertrix_config_json == '{"extraChromeArgs":["--disable-http2"]}'
    assert script_args.capture_backend == "http_warc"
    assert script_args.resume_policy == "fresh_only"
    assert script_args.fallback_backend == "http_warc"
    assert script_args.max_fresh_failures_before_fallback == 2
    assert script_args.auto_reset_poisoned_state is True
    assert script_args.max_temp_dirs_before_reset == 25
    assert zimit_passthrough == ["--scopeType", "host"]


def test_parse_arguments_rejects_adaptive_without_monitoring(monkeypatch) -> None:
    monkeypatch.setattr(
        "sys.argv",
        [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "example",
            "--output-dir",
            "/tmp/example",
            "--enable-adaptive-restart",
        ],
    )

    with pytest.raises(SystemExit):
        parse_arguments()


def test_parse_arguments_rejects_non_positive_temp_dir_reset_threshold(monkeypatch) -> None:
    monkeypatch.setattr(
        "sys.argv",
        [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "example",
            "--output-dir",
            "/tmp/example",
            "--max-temp-dirs-before-reset",
            "0",
        ],
    )

    with pytest.raises(SystemExit):
        parse_arguments()


def test_parse_arguments_accepts_playwright_warc_backends(monkeypatch) -> None:
    monkeypatch.setattr(
        "sys.argv",
        [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "example",
            "--output-dir",
            "/tmp/example",
            "--capture-backend",
            "playwright_warc",
            "--fallback-backend",
            "playwright_warc",
        ],
    )

    script_args, zimit_passthrough = parse_arguments()
    assert script_args.capture_backend == "playwright_warc"
    assert script_args.fallback_backend == "playwright_warc"
    assert zimit_passthrough == []
