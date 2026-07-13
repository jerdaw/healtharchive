from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Literal, cast

from archive_tool.state import CrawlState
from archive_tool.utils import find_all_warc_files, find_latest_temp_dir_fallback
from ha_backend.archive_storage import get_job_warc_manifest_path, get_job_warcs_dir
from ha_backend.models import ArchiveJob

ManifestStatus = Literal["missing", "valid", "invalid", "unreadable"]


@dataclass
class WarcDiscoveryResult:
    """
    Result of WARC discovery for a job.

    Attributes:
        warc_paths: List of discovered WARC file paths
        source: Discovery source ("stable", "temp", "fallback", "mixed", or "none")
        manifest_valid: Whether the manifest (if any) is valid
        manifest_status: Lightweight manifest parsing status
        manifest_error: Bounded error code without exception/path detail
        count: Number of WARC files discovered
    """

    warc_paths: List[Path]
    source: Literal["stable", "temp", "fallback", "mixed", "none"]
    manifest_valid: bool
    count: int
    source_counts: dict[str, int] = field(default_factory=dict)
    manifest_status: ManifestStatus = "missing"
    manifest_error: str | None = None


@dataclass(frozen=True)
class _ManifestDiscoveryMetadata:
    consolidated_source_paths: set[Path]
    status: ManifestStatus
    error: str | None = None

    @property
    def valid(self) -> bool:
        return self.status in {"missing", "valid"}


def _iter_warc_files(root: Path) -> list[Path]:
    warcs: set[Path] = set()
    if not root.is_dir():
        return []
    for ext in (".warc.gz", ".warc"):
        for warc_file in root.rglob(f"*{ext}"):
            try:
                if warc_file.is_file() and warc_file.stat().st_size > 0:
                    warcs.add(warc_file.resolve())
            except OSError:
                continue
    return sorted(warcs)


def _discover_stable_warcs_for_output_dir(host_output_dir: Path) -> list[Path]:
    stable_dir = get_job_warcs_dir(host_output_dir)
    return _iter_warc_files(stable_dir)


def _read_manifest_discovery_metadata(
    host_output_dir: Path,
) -> _ManifestDiscoveryMetadata:
    """
    Return temp source paths that already have a stable WARC manifest entry.

    Hardlink inode checks dedupe the common case. The manifest covers the
    copy-fallback case, where stable and temp files are byte-identical but have
    different inode identities.
    """
    manifest_path = get_job_warc_manifest_path(host_output_dir)
    if not manifest_path.is_file():
        return _ManifestDiscoveryMetadata(set(), "missing")

    stable_dir = get_job_warcs_dir(host_output_dir)
    try:
        manifest_text = manifest_path.read_text(encoding="utf-8")
    except OSError:
        return _ManifestDiscoveryMetadata(set(), "unreadable", "read-error")
    try:
        manifest = json.loads(manifest_text)
    except json.JSONDecodeError:
        return _ManifestDiscoveryMetadata(set(), "invalid", "invalid-json")
    if not isinstance(manifest, dict):
        return _ManifestDiscoveryMetadata(set(), "invalid", "invalid-root")

    entries = manifest.get("entries", [])
    if not isinstance(entries, list):
        return _ManifestDiscoveryMetadata(set(), "invalid", "invalid-entries")

    paths: set[Path] = set()
    invalid_entry = False
    for entry in entries:
        if not isinstance(entry, dict):
            invalid_entry = True
            continue
        source_path = entry.get("source_path")
        stable_name = entry.get("stable_name")
        if (
            not isinstance(source_path, str)
            or not source_path
            or not isinstance(stable_name, str)
            or not stable_name
            or Path(stable_name).name != stable_name
        ):
            invalid_entry = True
            continue
        stable_path = stable_dir / stable_name
        if stable_path.is_file():
            paths.add(Path(source_path).resolve())
    if invalid_entry:
        return _ManifestDiscoveryMetadata(paths, "invalid", "invalid-entry")
    return _ManifestDiscoveryMetadata(paths, "valid")


def _dedupe_warc_paths_by_file_identity(
    groups: list[tuple[str, list[Path]]],
    *,
    manifest_consolidated_sources: set[Path],
) -> list[tuple[str, Path]]:
    """
    Return unique WARC paths, preferring earlier groups for hardlinked copies.

    Consolidation stores stable WARCs as hardlinks where possible. If we simply
    union stable and temp paths after consolidation, those hardlinks would be
    indexed twice. File identity dedupe keeps the stable replay path while still
    retaining genuinely new temp WARCs that have not yet been consolidated. The
    manifest check handles copy-fallback consolidation where inode identity no
    longer matches.
    """
    seen_identities: set[tuple[int, int]] = set()
    seen_paths: set[Path] = set()
    selected: list[tuple[str, Path]] = []
    for source, paths in groups:
        for path in sorted({p.resolve() for p in paths}):
            if path in seen_paths:
                continue
            if source != "stable" and path in manifest_consolidated_sources:
                continue
            try:
                st = path.stat()
                identity = (int(st.st_dev), int(st.st_ino))
            except OSError:
                continue
            if identity in seen_identities:
                continue
            seen_paths.add(path)
            seen_identities.add(identity)
            selected.append((source, path))
    return sorted(selected, key=lambda item: item[1])


def discover_temp_warcs_for_job(
    job: ArchiveJob,
    *,
    allow_fallback: bool = True,
) -> List[Path]:
    """
    Discover WARCs under archive_tool's `.tmp*` crawl directories for a job.

    This is the legacy discovery method and intentionally ignores the stable
    `warcs/` directory that may be present after consolidation.
    """
    host_output_dir = Path(job.output_dir).resolve()

    state = CrawlState(host_output_dir, initial_workers=1)
    temp_dirs = state.get_temp_dir_paths()

    if not temp_dirs and allow_fallback:
        latest = find_latest_temp_dir_fallback(host_output_dir)
        if latest is not None:
            temp_dirs = [latest]

    if not temp_dirs:
        return []

    return find_all_warc_files(temp_dirs)


def discover_warcs_for_job(
    job: ArchiveJob,
    *,
    allow_fallback: bool = True,
) -> List[Path]:
    """
    Discover all WARC files associated with a given ArchiveJob.

    This uses archive_tool's CrawlState and utility helpers so we respect the
    same layout and temp-dir tracking that the crawler uses. These helpers
    live in the in-repo ``archive_tool`` package and are expected to evolve
    in tandem with this indexing code.
    """
    result = discover_all_warcs_for_job(job, allow_fallback=allow_fallback)
    return result.warc_paths


def discover_all_warcs_for_output_dir(
    host_output_dir: Path,
    *,
    temp_dirs: list[Path],
    allow_fallback: bool = True,
) -> WarcDiscoveryResult:
    """
    Discover all WARC files for one output directory with detailed metadata.

    ``temp_dirs`` must be the existing temp directories tracked by crawl state.
    When fallback is enabled, the latest untracked ``.tmp*`` directory is also
    included. Stable, tracked-temp, and fallback WARCs are then deduplicated by
    path, file identity, and consolidation-manifest source metadata.
    """
    host_output_dir = host_output_dir.resolve()

    stable_warcs = _discover_stable_warcs_for_output_dir(host_output_dir)
    temp_warcs: list[Path] = find_all_warc_files(temp_dirs) if temp_dirs else []
    fallback_warcs: list[Path] = []

    if allow_fallback:
        latest = find_latest_temp_dir_fallback(host_output_dir)
        temp_dir_set = {path.resolve() for path in temp_dirs}
        if latest is not None and latest.resolve() not in temp_dir_set:
            fallback_warcs = find_all_warc_files([latest])

    groups = [
        ("stable", stable_warcs),
        ("temp", temp_warcs),
        ("fallback", fallback_warcs),
    ]
    manifest_metadata = _read_manifest_discovery_metadata(host_output_dir)
    selected_warcs = _dedupe_warc_paths_by_file_identity(
        groups,
        manifest_consolidated_sources=manifest_metadata.consolidated_source_paths,
    )
    warc_paths = [path for _source, path in selected_warcs]
    source_counts = dict(sorted(Counter(source for source, _path in selected_warcs).items()))
    if warc_paths:
        non_empty_sources = list(source_counts)
        source: Literal["stable", "temp", "fallback", "mixed", "none"]
        source = (
            cast(Literal["stable", "temp", "fallback"], non_empty_sources[0])
            if len(non_empty_sources) == 1
            else "mixed"
        )
        return WarcDiscoveryResult(
            warc_paths=warc_paths,
            source=source,
            manifest_valid=manifest_metadata.valid,
            count=len(warc_paths),
            manifest_status=manifest_metadata.status,
            manifest_error=manifest_metadata.error,
            source_counts=source_counts,
        )

    # No WARCs found
    return WarcDiscoveryResult(
        warc_paths=[],
        source="none",
        manifest_valid=manifest_metadata.valid,
        count=0,
        manifest_status=manifest_metadata.status,
        manifest_error=manifest_metadata.error,
        source_counts={},
    )


def discover_all_warcs_for_job(
    job: ArchiveJob,
    *,
    allow_fallback: bool = True,
) -> WarcDiscoveryResult:
    """Discover all WARC files for a job with detailed source metadata."""
    host_output_dir = Path(job.output_dir).resolve()
    state = CrawlState(host_output_dir, initial_workers=1)
    return discover_all_warcs_for_output_dir(
        host_output_dir,
        temp_dirs=state.get_temp_dir_paths(),
        allow_fallback=allow_fallback,
    )


__all__ = [
    "discover_temp_warcs_for_job",
    "discover_warcs_for_job",
    "discover_all_warcs_for_job",
    "discover_all_warcs_for_output_dir",
    "ManifestStatus",
    "WarcDiscoveryResult",
]
