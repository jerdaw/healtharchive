"""
Integration tests for archive_tool/main.py orchestration.

These tests verify:
- Run mode detection (existing ZIM handling, overwrite behavior)
- Early exit conditions (missing Docker, Docker start failures)
- Dry-run mode behavior

Note: Full stage loop tests with mocked containers are complex due to
threading in the log drain. Tests that exercise the complete stage loop
are marked with pytest.mark.slow and may timeout in CI.

Docker operations are mocked to allow testing without real containers.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path
from unittest.mock import MagicMock

import httpx
import pytest
import yaml  # type: ignore[import-untyped]

import archive_tool.docker_runner as docker_runner_mod
import archive_tool.main as archive_main
import archive_tool.utils as utils_mod
from archive_tool.state import CrawlState
from ha_backend.indexing.warc_reader import iter_html_records


@pytest.fixture
def mock_docker_check(monkeypatch):
    """Ensure Docker check always passes."""
    monkeypatch.setattr(utils_mod, "check_docker", lambda: True)


@pytest.fixture
def mock_container_stop(monkeypatch):
    """Mock container stop operations."""
    mock = MagicMock()
    monkeypatch.setattr(docker_runner_mod, "stop_docker_container", mock)
    # Reset global state
    docker_runner_mod.current_container_id = None
    docker_runner_mod.current_docker_process = None
    return mock


@pytest.fixture
def clean_stop_event():
    """Ensure stop_event is cleared before and after tests."""
    archive_main.stop_event.clear()
    yield
    archive_main.stop_event.clear()


class TestExistingZIMHandling:
    """Tests for behavior when a ZIM file already exists."""

    def test_without_overwrite_exits_when_zim_exists(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
    ):
        """Without --skip-final-build or --overwrite, existing ZIM causes exit."""
        out_dir = tmp_path / "existing_zim"
        out_dir.mkdir()

        # Create an existing ZIM file
        zim_file = out_dir / "test-job.zim"
        zim_file.write_bytes(b"fake zim")

        # Mock container start (shouldn't be called)
        container_start_called = {"value": False}

        def fake_start(*args, **kwargs):
            container_start_called["value"] = True
            return MagicMock(), "container-id"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
        ]
        monkeypatch.setattr(sys, "argv", argv)

        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        assert exc_info.value.code != 0
        # Container should NOT have been started
        assert container_start_called["value"] is False


class TestDockerStartFailures:
    """Tests for Docker container start failure scenarios."""

    def test_docker_start_exception_exits_with_error(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
    ):
        """Docker start raising exception should cause exit."""
        out_dir = tmp_path / "docker_fail"
        out_dir.mkdir()

        def fake_start(*args, **kwargs):
            raise RuntimeError("Docker start failed")

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        assert exc_info.value.code != 0

    def test_docker_start_returns_none_exits_with_error(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
    ):
        """Docker start returning None should cause exit."""
        out_dir = tmp_path / "docker_none"
        out_dir.mkdir()

        def fake_start(*args, **kwargs):
            return None, None

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        assert exc_info.value.code != 0


class TestDockerCheck:
    """Tests for Docker availability check."""

    def test_docker_unavailable_exits_with_error(
        self,
        tmp_path: Path,
        monkeypatch,
        clean_stop_event,
    ):
        """Docker check failing should cause immediate exit."""
        out_dir = tmp_path / "no_docker"
        out_dir.mkdir()

        # Mock Docker check to fail
        monkeypatch.setattr(utils_mod, "check_docker", lambda: False)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
        ]
        monkeypatch.setattr(sys, "argv", argv)

        # Should exit with error
        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        assert exc_info.value.code != 0


class TestDryRunMode:
    """Tests for --dry-run behavior (already tested in test_archive_tool_dry_run.py)."""

    def test_dry_run_skips_docker_start(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
    ):
        """Dry-run mode should not start any Docker containers."""
        out_dir = tmp_path / "dry_run"
        out_dir.mkdir()

        container_started = {"value": False}

        def fake_start(*args, **kwargs):
            container_started["value"] = True
            return MagicMock(), "container-id"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--dry-run",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        # Should complete without error
        archive_main.main()

        # Container should NOT have been started
        assert container_started["value"] is False


class TestOutputDirectoryHandling:
    """Tests for output directory validation."""

    def test_output_dir_created_if_missing(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
    ):
        """Output directory should be created if it doesn't exist (dry-run)."""
        out_dir = tmp_path / "new_output_dir"
        # Don't create it - let main() create it

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--dry-run",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        # Directory should have been created
        assert out_dir.exists()


class TestCrawlStateInitialization:
    """Tests for CrawlState behavior during startup."""

    def test_state_file_path(
        self,
        tmp_path: Path,
    ):
        """CrawlState should use correct state file path."""
        out_dir = tmp_path / "state_test"
        out_dir.mkdir()

        state = CrawlState(out_dir, initial_workers=2)
        state.save_persistent_state()

        state_file = out_dir / ".archive_state.json"
        assert state_file.exists()

    def test_state_preserves_adaptation_counts(
        self,
        tmp_path: Path,
    ):
        """CrawlState should preserve adaptation counts across loads."""
        out_dir = tmp_path / "persist_test"
        out_dir.mkdir()

        # Create state with some adaptation history
        state1 = CrawlState(out_dir, initial_workers=4)
        state1.worker_reductions_done = 2
        state1.vpn_rotations_done = 1
        state1.current_workers = 2
        state1.save_persistent_state()

        # Load state again
        state2 = CrawlState(out_dir, initial_workers=10)  # Different initial value

        # Should preserve the saved values
        assert state2.worker_reductions_done == 2
        assert state2.vpn_rotations_done == 1
        assert state2.current_workers == 2

    def test_state_tracks_temp_dirs(
        self,
        tmp_path: Path,
    ):
        """CrawlState should track temp directories."""
        out_dir = tmp_path / "temp_dir_test"
        out_dir.mkdir()

        temp_dir = out_dir / ".tmp12345"
        temp_dir.mkdir()

        state = CrawlState(out_dir, initial_workers=2)
        state.add_temp_dir(temp_dir)
        state.save_persistent_state()

        # Reload
        state2 = CrawlState(out_dir, initial_workers=2)
        temp_dirs = state2.get_temp_dir_paths()

        assert temp_dir in temp_dirs


class TestTempDirDiscovery:
    """Tests for temp directory discovery functionality."""

    def test_discover_temp_dirs_finds_tmp_dirs(
        self,
        tmp_path: Path,
    ):
        """discover_temp_dirs should find .tmp* directories."""
        out_dir = tmp_path / "discovery_test"
        out_dir.mkdir()

        # Create some temp dirs
        temp_dir1 = out_dir / ".tmp12345"
        temp_dir1.mkdir()
        temp_dir2 = out_dir / ".tmpABCDE"
        temp_dir2.mkdir()

        # Create a non-temp dir that shouldn't be found
        other_dir = out_dir / "collections"
        other_dir.mkdir()

        discovered = utils_mod.discover_temp_dirs(out_dir)

        assert len(discovered) == 2
        assert temp_dir1 in discovered
        assert temp_dir2 in discovered
        assert other_dir not in discovered

    def test_discover_temp_dirs_returns_empty_for_clean_dir(
        self,
        tmp_path: Path,
    ):
        """discover_temp_dirs should return empty list for directory with no temp dirs."""
        out_dir = tmp_path / "clean_dir"
        out_dir.mkdir()

        discovered = utils_mod.discover_temp_dirs(out_dir)

        assert discovered == []


class TestWorkerCountParsing:
    """Tests for --workers passthrough arg parsing."""

    def test_passthrough_workers_with_space(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
        capsys,
    ):
        """Passthrough --workers N should be recognized."""
        out_dir = tmp_path / "workers_space"
        out_dir.mkdir()

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--initial-workers",
            "2",
            "--dry-run",
            "--",
            "--workers",
            "5",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        # Check logs for worker count (dry-run prints effective workers)
        captured = capsys.readouterr()
        combined = captured.out + captured.err
        # Should see "Effective initial worker count set to: 5"
        assert "5" in combined

    def test_passthrough_workers_with_equals(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
        capsys,
    ):
        """Passthrough --workers=N should be recognized."""
        out_dir = tmp_path / "workers_equals"
        out_dir.mkdir()

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--initial-workers",
            "2",
            "--dry-run",
            "--",
            "--workers=7",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        # Check logs for worker count
        captured = capsys.readouterr()
        combined = captured.out + captured.err
        assert "7" in combined


class TestRunModeDetection:
    """Tests for run mode detection logic (Fresh, Resume, New-with-Consolidation, Overwrite)."""

    def test_fresh_crawl_no_artifacts(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
        capsys,
    ):
        """Fresh crawl when no artifacts exist (no ZIM, no config.yaml, no temp dirs)."""
        out_dir = tmp_path / "fresh"
        out_dir.mkdir()

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--dry-run",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        # In dry-run mode, it should show configuration summary
        assert "Dry run" in combined and "Configuration summary" in combined

    def test_dry_run_persists_managed_browsertrix_config(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
        capsys,
    ):
        out_dir = tmp_path / "managed-browsertrix"
        out_dir.mkdir()

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--dry-run",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        managed_config = out_dir / ".browsertrix_managed_config.yaml"
        assert managed_config.is_file()
        assert '"extraChromeArgs"' in managed_config.read_text(encoding="utf-8")

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        assert "Managed Browsertrix config" in combined

    def test_resume_mode_with_config_yaml(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
        capsys,
    ):
        """Resume mode when config.yaml exists."""
        out_dir = tmp_path / "resume"
        out_dir.mkdir()

        # Create a resume config file
        config_file = out_dir / ".zimit_resume.yaml"
        config_file.write_text("---\nresumeKey: abc123\n")

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--dry-run",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        # Should detect resume mode
        assert "resume" in combined.lower()

    def test_resume_mode_merges_managed_browsertrix_config_into_stable_resume_config(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
    ):
        out_dir = tmp_path / "resume-managed-browsertrix"
        out_dir.mkdir()

        config_file = out_dir / ".zimit_resume.yaml"
        config_file.write_text(
            """
seeds:
  - https://example.org
scopeType: custom
extraChromeArgs:
  - --existing-flag
""".strip()
            + "\n",
            encoding="utf-8",
        )

        captured: dict[str, object] = {}

        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = None
                self.returncode = 32

            def poll(self):
                return 32

            def wait(self, timeout=None):
                return 32

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(docker_image, host_output_dir, zimit_args, run_name, **kwargs):
            captured["docker_image"] = docker_image
            captured["host_output_dir"] = host_output_dir
            captured["zimit_args"] = list(zimit_args)
            captured["run_name"] = run_name
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        assert exc_info.value.code == 1

        zimit_args = captured["zimit_args"]
        assert isinstance(zimit_args, list)
        assert "--config" in zimit_args
        config_index = zimit_args.index("--config")
        assert zimit_args[config_index + 1] == "/output/.zimit_resume.yaml"

        merged_resume = yaml.safe_load(config_file.read_text(encoding="utf-8"))
        assert merged_resume["extraChromeArgs"] == ["--disable-http2", "--existing-flag"]

    def test_overwrite_mode_with_existing_zim(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        clean_stop_event,
        capsys,
    ):
        """Overwrite mode when existing ZIM exists and --overwrite is specified."""
        out_dir = tmp_path / "overwrite"
        out_dir.mkdir()

        # Create an existing ZIM file
        zim_file = out_dir / "test-job.zim"
        zim_file.write_bytes(b"fake zim")

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--overwrite",
            "--dry-run",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        # Should allow overwrite
        assert "overwrite" in combined.lower() or "Dry-run" in combined

    def test_dry_run_skips_poisoned_resume_queue_and_uses_new_crawl_phase(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        out_dir = tmp_path / "poisoned-resume"
        out_dir.mkdir()

        (out_dir / ".zimit_resume.yaml").write_text(
            "seeds:\n  - https://www.canada.ca/en/public-health.html\n",
            encoding="utf-8",
        )

        temp_dir = out_dir / ".tmpresume"
        archive_dir = temp_dir / "collections" / "crawl-1" / "archive"
        archive_dir.mkdir(parents=True)
        (archive_dir / "sample.warc.gz").write_bytes(b"warc-bytes")

        latest_log = out_dir / "archive_resume_crawl_-_attempt_100_20260324_050558.combined.log"
        latest_log.write_text(
            "\n".join(
                [
                    '{"timestamp":"2026-03-24T05:06:06.051Z","logLevel":"info","context":"crawlStatus","message":"Crawl statistics","details":{"crawled":0,"total":2,"pending":0,"failed":2,"limit":{"max":0,"hit":false},"pendingPages":[]}}',
                    "[warc2zim::2026-03-24 05:06:06,262] ERROR:No entry found to push to the ZIM, WARC file(s) is unprocessable and looks probably mostly empty",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

        captured_start: dict[str, object] = {}

        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = None
                self.returncode = None
                self._polled = False

            def poll(self):
                if self._polled:
                    self.returncode = 32
                    return 32
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 32
                return 32

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(docker_image, host_output_dir, zimit_args, run_name, **kwargs):
            captured_start["zimit_args"] = list(zimit_args)
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://www.canada.ca/en/public-health.html",
            "https://www.canada.ca/fr/sante-publique.html",
            "--name",
            "phac-20260101",
            "--output-dir",
            str(out_dir),
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        exit_code: int | str | None = None
        try:
            archive_main.main()
            exit_code = 0
        except SystemExit as exc:
            exit_code = exc.code

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        assert exit_code == 0
        assert "poisoned resume queue" in combined.lower()
        assert "Run Mode: NEW crawl phase" in combined
        zimit_args = captured_start["zimit_args"]
        assert isinstance(zimit_args, list)
        assert "--config" in zimit_args
        config_index = zimit_args.index("--config")
        assert zimit_args[config_index + 1] == "/output/.browsertrix_managed_config.yaml"

    def test_dry_run_skips_poisoned_resume_queue_when_latest_stats_are_unusable(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        out_dir = tmp_path / "poisoned-resume-empty-stats"
        out_dir.mkdir()

        (out_dir / ".zimit_resume.yaml").write_text(
            "seeds:\n  - https://www.canada.ca/en/public-health.html\n",
            encoding="utf-8",
        )

        temp_dir = out_dir / ".tmpresume"
        archive_dir = temp_dir / "collections" / "crawl-1" / "archive"
        archive_dir.mkdir(parents=True)
        (archive_dir / "sample.warc.gz").write_bytes(b"warc-bytes")

        latest_log = out_dir / "archive_resume_crawl_-_attempt_101_20260402_020415.combined.log"
        latest_log.write_text(
            "\n".join(
                [
                    '{"timestamp":"2026-03-24T05:06:06.051Z","logLevel":"info","context":"crawlStatus","message":"Crawl statistics","details":{"crawled":0,"total":2,"pending":0,"failed":2,"limit":{"max":0,"hit":false},"pendingPages":[]}}',
                    '{"timestamp":"2026-04-02T02:04:16.009Z","logLevel":"warning","context":"crawlStatus","message":"Crawl statistics","details":{}}',
                    "[warc2zim::2026-04-02 02:04:16,262] ERROR:No entry found to push to the ZIM, WARC file(s) is unprocessable and looks probably mostly empty",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

        captured_start: dict[str, object] = {}

        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = None
                self.returncode = None
                self._polled = False

            def poll(self):
                if self._polled:
                    self.returncode = 32
                    return 32
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 32
                return 32

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(docker_image, host_output_dir, zimit_args, run_name, **kwargs):
            captured_start["zimit_args"] = list(zimit_args)
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://www.canada.ca/en/public-health.html",
            "https://www.canada.ca/fr/sante-publique.html",
            "--name",
            "phac-20260101",
            "--output-dir",
            str(out_dir),
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        exit_code: int | str | None = None
        try:
            archive_main.main()
            exit_code = 0
        except SystemExit as exc:
            exit_code = exc.code

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        assert exit_code == 0
        assert "poisoned resume queue" in combined.lower()
        assert "Run Mode: NEW crawl phase" in combined
        zimit_args = captured_start["zimit_args"]
        assert isinstance(zimit_args, list)
        assert "--config" in zimit_args
        config_index = zimit_args.index("--config")
        assert zimit_args[config_index + 1] == "/output/.browsertrix_managed_config.yaml"

    def test_fresh_only_auto_reset_discards_resume_state_and_preserves_warcs(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        out_dir = tmp_path / "fresh-only-reset"
        out_dir.mkdir()

        state_file = out_dir / ".archive_state.json"
        resume_file = out_dir / ".zimit_resume.yaml"
        temp_dir = out_dir / ".tmpstale"
        archive_dir = temp_dir / "collections" / "crawl-1" / "archive"
        archive_dir.mkdir(parents=True)
        (archive_dir / "sample.warc.gz").write_bytes(b"warc-bytes")
        resume_file.write_text("seeds:\n  - https://www.canada.ca/en/public-health.html\n")

        state = CrawlState(out_dir, initial_workers=2)
        state.add_temp_dir(temp_dir)
        state.save_persistent_state()
        assert state_file.exists()

        captured_start: dict[str, object] = {}

        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = io.StringIO('Output to tempdir: "/output/.tmpfresh"\n')
                self.returncode = None
                self._polled = False

            def poll(self):
                if self._polled:
                    self.returncode = 32
                    return 32
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 32
                return 32

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(docker_image, host_output_dir, zimit_args, run_name, **kwargs):
            captured_start["zimit_args"] = list(zimit_args)
            new_temp_dir = Path(host_output_dir) / ".tmpfresh"
            new_archive_dir = new_temp_dir / "collections" / "crawl-2" / "archive"
            new_archive_dir.mkdir(parents=True, exist_ok=True)
            (new_archive_dir / "fresh.warc.gz").write_bytes(b"fresh-warc")
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://www.canada.ca/en/public-health.html",
            "--name",
            "phac-20260101",
            "--output-dir",
            str(out_dir),
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--resume-policy",
            "fresh_only",
            "--auto-reset-poisoned-state",
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        assert exc_info.value.code == 0
        assert "fresh_only" in combined
        assert not temp_dir.exists()
        assert not resume_file.exists()
        stable_warcs = sorted((out_dir / "warcs").glob("*.warc.gz"))
        assert len(stable_warcs) == 1
        zimit_args = captured_start["zimit_args"]
        assert isinstance(zimit_args, list)
        assert "--config" in zimit_args
        config_index = zimit_args.index("--config")
        assert zimit_args[config_index + 1] == "/output/.browsertrix_managed_config.yaml"

    def test_http_warc_backend_skips_docker_and_writes_warc(
        self,
        tmp_path: Path,
        monkeypatch,
        clean_stop_event,
    ):
        out_dir = tmp_path / "http-warc"
        out_dir.mkdir()

        pages = {
            "https://example.org/": httpx.Response(
                200,
                headers={"content-type": "text/html; charset=utf-8"},
                content=b'<html><body><a href="/page">Page</a></body></html>',
                request=httpx.Request("GET", "https://example.org/"),
            ),
            "https://example.org/page": httpx.Response(
                200,
                headers={"content-type": "text/html; charset=utf-8"},
                content=b"<html><body>Page body</body></html>",
                request=httpx.Request("GET", "https://example.org/page"),
            ),
        }

        class FakeClient:
            def __init__(self, *args, **kwargs):
                pass

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def get(self, url):
                return pages[url]

        def fail_docker_check():
            raise AssertionError("Docker check should not run for http_warc backend")

        monkeypatch.setattr(utils_mod, "check_docker", fail_docker_check)
        monkeypatch.setattr(
            "archive_tool.http_warc_backend.httpx.Client",
            FakeClient,
        )
        monkeypatch.setattr(
            docker_runner_mod,
            "start_docker_container",
            lambda *args, **kwargs: (_ for _ in ()).throw(
                AssertionError("Docker should not be used for http_warc backend")
            ),
        )

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org/",
            "--name",
            "example-http-warc",
            "--output-dir",
            str(out_dir),
            "--capture-backend",
            "http_warc",
            "--resume-policy",
            "fresh_only",
            "--auto-reset-poisoned-state",
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        archive_main.main()

        warc_path = out_dir / "warcs" / "warc-000001.warc.gz"
        assert warc_path.is_file()
        urls = [rec.url for rec in iter_html_records(warc_path)]
        assert urls == ["https://example.org/", "https://example.org/page"]

        combined_logs = sorted(out_dir.glob("archive_http_warc_capture_*.combined.log"))
        assert combined_logs
        log_text = combined_logs[-1].read_text(encoding="utf-8")
        assert '"context":"crawlStatus"' in log_text

    def test_fresh_only_browsertrix_promotes_inline_to_http_warc_after_budget(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        out_dir = tmp_path / "fresh-to-fallback"
        out_dir.mkdir()

        docker_starts: list[list[str]] = []

        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = io.StringIO("")
                self.returncode = None
                self._polled = False

            def poll(self):
                if self._polled:
                    self.returncode = 4
                    return 4
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 4
                return 4

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(docker_image, host_output_dir, zimit_args, run_name, **kwargs):
            docker_starts.append(list(zimit_args))
            return FakeProcess(), "test-container"

        class FallbackResult:
            exit_code = 0
            crawled = 2
            failed = 0
            warc_path = out_dir / "warcs" / "warc-000001.warc.gz"

        fallback_called: dict[str, object] = {}

        def fake_http_warc_capture(*, output_dir, seeds, zimit_passthrough_args):
            fallback_called["output_dir"] = output_dir
            fallback_called["seeds"] = list(seeds)
            fallback_called["zimit_passthrough_args"] = list(zimit_passthrough_args)
            (Path(output_dir) / "warcs").mkdir(parents=True, exist_ok=True)
            FallbackResult.warc_path.write_bytes(b"fallback-warc")
            return FallbackResult()

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)
        monkeypatch.setattr(
            "archive_tool.http_warc_backend.run_http_warc_capture",
            fake_http_warc_capture,
        )

        argv = [
            "archive-tool",
            "--seeds",
            "https://www.canada.ca/en/public-health.html",
            "https://www.canada.ca/fr/sante-publique.html",
            "--name",
            "phac-20260101",
            "--output-dir",
            str(out_dir),
            "--browsertrix-config-json",
            '{"extraChromeArgs":["--disable-http2"]}',
            "--resume-policy",
            "fresh_only",
            "--fallback-backend",
            "http_warc",
            "--max-fresh-failures-before-fallback",
            "2",
            "--backoff-delay-minutes",
            "0",
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        with pytest.raises(SystemExit) as exc_info:
            archive_main.main()

        captured = capsys.readouterr()
        combined = captured.out + captured.err
        assert exc_info.value.code == 0
        assert len(docker_starts) == 2
        assert "Promoting this run to fallback backend 'http_warc'" in combined
        assert fallback_called["seeds"] == [
            "https://www.canada.ca/en/public-health.html",
            "https://www.canada.ca/fr/sante-publique.html",
        ]
        assert FallbackResult.warc_path.is_file()


class TestStageLoopExitCodes:
    """Tests for stage loop exit code handling (ACCEPTABLE_CRAWLER_EXIT_CODES)."""

    def test_acceptable_exit_code_32_size_limit(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        """Exit code 32 (size limit) should be treated as acceptable completion."""
        out_dir = tmp_path / "size_limit"
        out_dir.mkdir()

        # Mock container that exits with RC 32
        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = None
                self.returncode = None
                self._polled = False

            def poll(self):
                # First poll returns None (running), second returns 32
                if self._polled:
                    self.returncode = 32
                    return 32
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 32
                return 32

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(*args, **kwargs):
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        # Should complete without error (acceptable exit code)
        exit_code: int | str | None = None
        try:
            archive_main.main()
            exit_code = 0
        except SystemExit as e:
            exit_code = e.code

        captured = capsys.readouterr()
        combined = captured.out + captured.err

        # Should mention acceptable exit code or complete successfully
        assert exit_code == 0 or "acceptable" in combined.lower()

    def test_acceptable_exit_code_33_time_limit(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        """Exit code 33 (time limit) should be treated as acceptable completion."""
        out_dir = tmp_path / "time_limit"
        out_dir.mkdir()

        # Mock container that exits with RC 33
        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = None
                self.returncode = None
                self._polled = False

            def poll(self):
                if self._polled:
                    self.returncode = 33
                    return 33
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 33
                return 33

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(*args, **kwargs):
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        exit_code: int | str | None = None
        try:
            archive_main.main()
            exit_code = 0
        except SystemExit as e:
            exit_code = e.code

        captured = capsys.readouterr()
        combined = captured.out + captured.err

        # Should mention acceptable exit code or complete successfully
        assert exit_code == 0 or "acceptable" in combined.lower()

    def test_acceptable_exit_code_16_disk_utilization(
        self,
        tmp_path: Path,
        monkeypatch,
        mock_docker_check,
        mock_container_stop,
        clean_stop_event,
        capsys,
    ):
        """Exit code 16 (disk utilization) should be treated as acceptable completion."""
        out_dir = tmp_path / "disk_util"
        out_dir.mkdir()

        # Mock container that exits with RC 16
        class FakeProcess:
            def __init__(self):
                self.pid = 12345
                self.stdout = None
                self.returncode = None
                self._polled = False

            def poll(self):
                if self._polled:
                    self.returncode = 16
                    return 16
                self._polled = True
                return None

            def wait(self, timeout=None):
                self.returncode = 16
                return 16

            def communicate(self, timeout=None):
                return (b"", b"")

        def fake_start(*args, **kwargs):
            return FakeProcess(), "test-container"

        monkeypatch.setattr(docker_runner_mod, "start_docker_container", fake_start)

        argv = [
            "archive-tool",
            "--seeds",
            "https://example.org",
            "--name",
            "test-job",
            "--output-dir",
            str(out_dir),
            "--skip-final-build",
        ]
        monkeypatch.setattr(sys, "argv", argv)

        exit_code: int | str | None = None
        try:
            archive_main.main()
            exit_code = 0
        except SystemExit as e:
            exit_code = e.code

        captured = capsys.readouterr()
        combined = captured.out + captured.err

        # Should mention acceptable exit code or complete successfully
        assert exit_code == 0 or "acceptable" in combined.lower()
