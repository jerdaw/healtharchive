"""
Tests for WARC discovery edge cases.

These tests verify the warc_discovery module handles edge cases correctly:
- Empty stable warcs directory
- Manifest exists but WARCs missing
- Mixed temp + stable discovery
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import MagicMock

from ha_backend.indexing.warc_discovery import (
    WarcDiscoveryResult,
    discover_all_warcs_for_job,
    discover_temp_warcs_for_job,
    discover_warcs_for_job,
)


def _create_job_mock(output_dir: Path) -> MagicMock:
    """Create a mock ArchiveJob with the given output_dir."""
    job = MagicMock()
    job.output_dir = str(output_dir)
    return job


class TestDiscoverWarcsForJob:
    """Tests for discover_warcs_for_job function."""

    def test_empty_stable_warcs_directory(self, tmp_path: Path):
        """Returns empty list when warcs/ exists but is empty."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        assert result == []

    def test_finds_warcs_in_stable_location(self, tmp_path: Path):
        """Finds WARCs in the stable warcs/ directory."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        # Create some WARCs
        (warcs_dir / "warc-000001.warc.gz").write_bytes(b"content1")
        (warcs_dir / "warc-000002.warc.gz").write_bytes(b"content2")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        assert len(result) == 2
        names = sorted(p.name for p in result)
        assert names == ["warc-000001.warc.gz", "warc-000002.warc.gz"]

    def test_skips_empty_files(self, tmp_path: Path):
        """Skips WARC files with zero size."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        (warcs_dir / "warc-000001.warc.gz").write_bytes(b"content")
        (warcs_dir / "warc-000002.warc.gz").write_bytes(b"")  # Empty file

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        assert len(result) == 1
        assert result[0].name == "warc-000001.warc.gz"

    def test_handles_non_existent_output_dir(self, tmp_path: Path):
        """Returns empty list for non-existent output directory."""
        output_dir = tmp_path / "does-not-exist"

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job, allow_fallback=False)

        assert result == []

    def test_fallback_to_temp_discovery(self, tmp_path: Path, monkeypatch):
        """Falls back to temp discovery when no stable warcs/ dir."""
        output_dir = tmp_path / "job-out"
        temp_dir = output_dir / ".tmp12345"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)

        # Create WARC in temp location
        (collections_dir / "rec-001.warc.gz").write_bytes(b"temp warc")

        # Create state file pointing to temp dir
        state_file = output_dir / ".archive_state.json"
        state_data = {
            "temp_dirs_host_paths": [str(temp_dir)],
            "current_workers": 2,
        }
        state_file.parent.mkdir(parents=True, exist_ok=True)
        state_file.write_text(json.dumps(state_data), encoding="utf-8")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job, allow_fallback=True)

        # Should find the temp WARC
        assert len(result) == 1
        assert result[0].name == "rec-001.warc.gz"

    def test_unions_stable_and_temp(self, tmp_path: Path, monkeypatch):
        """Includes stable and temp WARCs when both exist."""
        output_dir = tmp_path / "job-out"

        # Create stable WARCs
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)
        (warcs_dir / "stable-001.warc.gz").write_bytes(b"stable content")

        # Create temp WARCs from a later crawl phase.
        temp_dir = output_dir / ".tmp12345"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)
        (collections_dir / "temp-001.warc.gz").write_bytes(b"temp content")

        state_file = output_dir / ".archive_state.json"
        state_data = {"temp_dirs_host_paths": [str(temp_dir)], "current_workers": 2}
        state_file.write_text(json.dumps(state_data), encoding="utf-8")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job, allow_fallback=True)

        assert len(result) == 2
        assert sorted(p.name for p in result) == ["stable-001.warc.gz", "temp-001.warc.gz"]


class TestDiscoverTempWarcsForJob:
    """Tests for discover_temp_warcs_for_job function."""

    def test_no_state_file(self, tmp_path: Path):
        """Returns empty list when no state file exists."""
        output_dir = tmp_path / "job-out"
        output_dir.mkdir(parents=True)

        job = _create_job_mock(output_dir)
        result = discover_temp_warcs_for_job(job, allow_fallback=False)

        assert result == []

    def test_discovers_from_state_file(self, tmp_path: Path):
        """Discovers WARCs from temp dirs listed in state file."""
        output_dir = tmp_path / "job-out"
        temp_dir = output_dir / ".tmpABCDE"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)

        (collections_dir / "rec-001.warc.gz").write_bytes(b"warc1")
        (collections_dir / "rec-002.warc.gz").write_bytes(b"warc2")

        state_file = output_dir / ".archive_state.json"
        state_data = {
            "temp_dirs_host_paths": [str(temp_dir)],
            "current_workers": 2,
        }
        state_file.write_text(json.dumps(state_data), encoding="utf-8")

        job = _create_job_mock(output_dir)
        result = discover_temp_warcs_for_job(job, allow_fallback=False)

        assert len(result) == 2

    def test_handles_stale_temp_dir(self, tmp_path: Path):
        """Handles state file referencing non-existent temp dir."""
        output_dir = tmp_path / "job-out"
        output_dir.mkdir(parents=True)

        # State file points to non-existent temp dir
        state_file = output_dir / ".archive_state.json"
        state_data = {
            "temp_dirs_host_paths": ["/does/not/exist"],
            "current_workers": 2,
        }
        state_file.write_text(json.dumps(state_data), encoding="utf-8")

        job = _create_job_mock(output_dir)
        result = discover_temp_warcs_for_job(job, allow_fallback=False)

        assert result == []


class TestDiscoveryEdgeCases:
    """Tests for edge cases in WARC discovery."""

    def test_handles_permission_error_on_file(self, tmp_path: Path):
        """Gracefully handles permission errors on individual files."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        # Create a valid WARC
        (warcs_dir / "good.warc.gz").write_bytes(b"content")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        # Should still find the good file
        assert len(result) == 1

    def test_handles_symlink_to_missing_file(self, tmp_path: Path):
        """Handles symlinks pointing to non-existent files."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        # Create a valid WARC
        (warcs_dir / "good.warc.gz").write_bytes(b"content")

        # Create broken symlink
        broken_link = warcs_dir / "broken.warc.gz"
        broken_link.symlink_to("/does/not/exist")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        # Should only find the good file
        assert len(result) == 1
        assert result[0].name == "good.warc.gz"

    def test_recursive_discovery_in_subdirs(self, tmp_path: Path):
        """Discovers WARCs in subdirectories of warcs/."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        subdir = warcs_dir / "batch-001"
        subdir.mkdir(parents=True)

        (subdir / "warc-001.warc.gz").write_bytes(b"content")
        (warcs_dir / "warc-002.warc.gz").write_bytes(b"content2")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        assert len(result) == 2

    def test_handles_warc_without_gz_extension(self, tmp_path: Path):
        """Discovers .warc files (not just .warc.gz)."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        (warcs_dir / "uncompressed.warc").write_bytes(b"content")
        (warcs_dir / "compressed.warc.gz").write_bytes(b"content2")

        job = _create_job_mock(output_dir)
        result = discover_warcs_for_job(job)

        assert len(result) == 2
        names = sorted(p.name for p in result)
        assert names == ["compressed.warc.gz", "uncompressed.warc"]


class TestDiscoverAllWarcsForJob:
    """Tests for discover_all_warcs_for_job function with metadata."""

    def test_stable_discovery_result(self, tmp_path: Path):
        """Returns correct metadata for stable WARC discovery."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)

        (warcs_dir / "warc-001.warc.gz").write_bytes(b"content1")
        (warcs_dir / "warc-002.warc.gz").write_bytes(b"content2")

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job)

        assert isinstance(result, WarcDiscoveryResult)
        assert result.source == "stable"
        assert result.manifest_valid is True
        assert result.count == 2
        assert len(result.warc_paths) == 2

    def test_temp_discovery_result(self, tmp_path: Path):
        """Returns correct metadata for temp WARC discovery."""
        output_dir = tmp_path / "job-out"
        temp_dir = output_dir / ".tmp12345"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)

        (collections_dir / "rec-001.warc.gz").write_bytes(b"temp warc")

        state_file = output_dir / ".archive_state.json"
        state_data = {
            "temp_dirs_host_paths": [str(temp_dir)],
            "current_workers": 2,
        }
        state_file.write_text(json.dumps(state_data), encoding="utf-8")

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job, allow_fallback=True)

        assert result.source == "temp"
        assert result.manifest_valid is True
        assert result.count == 1

    def test_fallback_discovery_result(self, tmp_path: Path):
        """Returns correct metadata for fallback WARC discovery."""
        output_dir = tmp_path / "job-out"
        temp_dir = output_dir / ".tmp-latest"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)

        (collections_dir / "rec-001.warc.gz").write_bytes(b"fallback warc")

        # No state file, so it will use fallback discovery

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job, allow_fallback=True)

        assert result.source == "fallback"
        assert result.manifest_valid is False
        assert result.count == 1

    def test_empty_discovery_result(self, tmp_path: Path):
        """Returns empty result when no WARCs found."""
        output_dir = tmp_path / "job-out"
        output_dir.mkdir(parents=True)

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job, allow_fallback=False)

        assert result.source == "none"
        assert result.manifest_valid is True
        assert result.count == 0
        assert result.warc_paths == []

    def test_mixed_discovery_result(self, tmp_path: Path):
        """Reports mixed source metadata when stable and temp WARCs are both present."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)
        (warcs_dir / "stable-001.warc.gz").write_bytes(b"stable content")

        temp_dir = output_dir / ".tmp12345"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)
        (collections_dir / "temp-001.warc.gz").write_bytes(b"temp content")

        state_file = output_dir / ".archive_state.json"
        state_file.write_text(
            json.dumps({"temp_dirs_host_paths": [str(temp_dir)], "current_workers": 2}),
            encoding="utf-8",
        )

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job, allow_fallback=True)

        assert result.source == "mixed"
        assert result.count == 2
        assert result.source_counts == {"stable": 1, "temp": 1}

    def test_manifest_dedupes_copied_stable_warc_from_temp_source(self, tmp_path: Path):
        """Prefers stable WARC when manifest says a temp source was already copied."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)
        stable_warc = warcs_dir / "warc-000001.warc.gz"
        stable_warc.write_bytes(b"same bytes")

        temp_dir = output_dir / ".tmp12345"
        collections_dir = temp_dir / "collections" / "crawl-1" / "archive"
        collections_dir.mkdir(parents=True)
        temp_warc = collections_dir / "rec-001.warc.gz"
        temp_warc.write_bytes(b"same bytes")

        (warcs_dir / "manifest.json").write_text(
            json.dumps(
                {
                    "entries": [
                        {
                            "source_path": str(temp_warc.resolve()),
                            "stable_name": stable_warc.name,
                            "link_type": "copy",
                            "size_bytes": stable_warc.stat().st_size,
                            "sha256": "unused",
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        (output_dir / ".archive_state.json").write_text(
            json.dumps({"temp_dirs_host_paths": [str(temp_dir)], "current_workers": 2}),
            encoding="utf-8",
        )

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job, allow_fallback=True)

        assert result.source == "stable"
        assert result.count == 1
        assert result.warc_paths == [stable_warc.resolve()]
        assert result.source_counts == {"stable": 1}

    def test_mixed_discovery_includes_untracked_fallback_temp_dir(self, tmp_path: Path):
        """Includes latest orphan temp WARCs even when state tracks older temp dirs."""
        output_dir = tmp_path / "job-out"
        warcs_dir = output_dir / "warcs"
        warcs_dir.mkdir(parents=True)
        (warcs_dir / "stable-001.warc.gz").write_bytes(b"stable content")

        tracked_temp = output_dir / ".tmp-tracked"
        tracked_archive = tracked_temp / "collections" / "crawl-1" / "archive"
        tracked_archive.mkdir(parents=True)
        (tracked_archive / "tracked-001.warc.gz").write_bytes(b"tracked content")

        orphan_temp = output_dir / ".tmp-orphan"
        orphan_archive = orphan_temp / "collections" / "crawl-1" / "archive"
        orphan_archive.mkdir(parents=True)
        (orphan_archive / "orphan-001.warc.gz").write_bytes(b"orphan content")
        orphan_mtime = tracked_temp.stat().st_mtime + 10
        os.utime(orphan_temp, (orphan_mtime, orphan_mtime))

        state_file = output_dir / ".archive_state.json"
        state_file.write_text(
            json.dumps({"temp_dirs_host_paths": [str(tracked_temp)], "current_workers": 2}),
            encoding="utf-8",
        )

        job = _create_job_mock(output_dir)
        result = discover_all_warcs_for_job(job, allow_fallback=True)

        assert result.source == "mixed"
        assert result.count == 3
        assert sorted(p.name for p in result.warc_paths) == [
            "orphan-001.warc.gz",
            "stable-001.warc.gz",
            "tracked-001.warc.gz",
        ]
        assert result.source_counts == {"stable": 1, "temp": 1, "fallback": 1}
