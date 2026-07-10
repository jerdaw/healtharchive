# WARC Report Discovery Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the read-only crawl content report count the same deduplicated stable, tracked-temp, and latest-fallback WARC union as indexing.

**Architecture:** Extract the existing filesystem union into a pure output-directory helper that accepts already-known temp paths. The job wrapper retains `CrawlState` maintenance before delegation, while the report reads state JSON without writes and delegates to the same helper.

**Tech Stack:** Python 3.11+, pathlib, SQLAlchemy model wrappers, archive_tool filesystem helpers, pytest, MkDocs.

## Global Constraints

- Preserve indexing's existing `CrawlState.get_temp_dir_paths()` pruning and persistence.
- The shared output-directory helper must not instantiate `CrawlState` or write files.
- Preserve stable-path preference, hardlink deduplication, and manifest-copy deduplication.
- Include only the latest untracked `.tmp*` fallback directory, matching canonical indexing semantics.
- Keep the report JSON schema unchanged; `warc_discovery_source` may correctly become `mixed`.
- Leave `.archive_state.json` byte-for-byte unchanged during report generation.
- Do not change database, API, worker, cleanup, deployment, or private operations behavior.

---

### Task 1: Extract Pure Output-Directory Union Discovery

**Files:**
- Modify: `tests/test_warc_discovery.py`
- Modify: `src/ha_backend/indexing/warc_discovery.py`

**Interfaces:**
- Consumes: `Path host_output_dir`, `Sequence[Path] tracked_temp_dirs`, `bool allow_fallback`
- Produces: `discover_all_warcs_for_output_dir(...) -> WarcDiscoveryResult`
- Preserves: `discover_all_warcs_for_job(job, allow_fallback=...) -> WarcDiscoveryResult`

- [ ] **Step 1: Write the failing pure-helper test**

Add the module import and test:

```python
from ha_backend.indexing import warc_discovery


def test_output_dir_discovery_unions_stable_tracked_and_latest_fallback(
    tmp_path: Path,
) -> None:
    output_dir = tmp_path / "job-out"
    stable_dir = output_dir / "warcs"
    stable_dir.mkdir(parents=True)
    (stable_dir / "stable-001.warc.gz").write_bytes(b"stable")

    tracked_temp = output_dir / ".tmp-tracked"
    tracked_archive = tracked_temp / "collections" / "crawl-1" / "archive"
    tracked_archive.mkdir(parents=True)
    (tracked_archive / "tracked-001.warc.gz").write_bytes(b"tracked")

    fallback_temp = output_dir / ".tmp-fallback"
    fallback_archive = fallback_temp / "collections" / "crawl-2" / "archive"
    fallback_archive.mkdir(parents=True)
    (fallback_archive / "fallback-001.warc.gz").write_bytes(b"fallback")
    os.utime(tracked_temp, (100, 100))
    os.utime(fallback_temp, (200, 200))

    result = warc_discovery.discover_all_warcs_for_output_dir(
        output_dir,
        tracked_temp_dirs=[tracked_temp],
    )

    assert result.source == "mixed"
    assert result.count == 3
    assert sorted(path.name for path in result.warc_paths) == [
        "fallback-001.warc.gz",
        "stable-001.warc.gz",
        "tracked-001.warc.gz",
    ]
    assert result.source_counts == {"fallback": 1, "stable": 1, "temp": 1}
```

- [ ] **Step 2: Prove the helper test fails**

Run:

```bash
python -m pytest -q tests/test_warc_discovery.py::test_output_dir_discovery_unions_stable_tracked_and_latest_fallback
```

Expected: FAIL with `AttributeError` because `discover_all_warcs_for_output_dir` does not exist.

- [ ] **Step 3: Add the pure helper and delegate from the job wrapper**

Add `Sequence` to the typing import and implement:

```python
def _existing_temp_dirs(paths: Sequence[Path]) -> list[Path]:
    existing: set[Path] = set()
    for path in paths:
        try:
            if path.is_dir():
                existing.add(path.resolve())
        except (OSError, RuntimeError, ValueError):
            continue
    return sorted(existing)


def discover_all_warcs_for_output_dir(
    host_output_dir: Path,
    *,
    tracked_temp_dirs: Sequence[Path] = (),
    allow_fallback: bool = True,
) -> WarcDiscoveryResult:
    """Discover the canonical WARC union without reading or writing crawl state."""
    host_output_dir = host_output_dir.resolve()
    stable_warcs = _discover_stable_warcs_for_output_dir(host_output_dir)
    temp_dirs = _existing_temp_dirs(tracked_temp_dirs)
    temp_warcs = find_all_warc_files(temp_dirs) if temp_dirs else []
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
    selected_warcs = _dedupe_warc_paths_by_file_identity(
        groups,
        manifest_consolidated_sources=_manifest_consolidated_source_paths(host_output_dir),
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
            manifest_valid=not bool(fallback_warcs),
            count=len(warc_paths),
            source_counts=source_counts,
        )

    return WarcDiscoveryResult(
        warc_paths=[],
        source="none",
        manifest_valid=True,
        count=0,
        source_counts={},
    )
```

Replace the filesystem logic in `discover_all_warcs_for_job` with:

```python
host_output_dir = Path(job.output_dir).resolve()
state = CrawlState(host_output_dir, initial_workers=1)
return discover_all_warcs_for_output_dir(
    host_output_dir,
    tracked_temp_dirs=state.get_temp_dir_paths(),
    allow_fallback=allow_fallback,
)
```

Add `discover_all_warcs_for_output_dir` to `__all__`.

- [ ] **Step 4: Prove the helper and compatibility suites pass**

Run:

```bash
python -m pytest -q tests/test_warc_discovery.py
```

Expected: all discovery tests pass, including existing mixed, hardlink, and manifest-copy cases.

- [ ] **Step 5: Run focused static checks**

```bash
python -m ruff check src/ha_backend/indexing/warc_discovery.py tests/test_warc_discovery.py
python -m ruff format --check src/ha_backend/indexing/warc_discovery.py tests/test_warc_discovery.py
python -m mypy src/ha_backend/indexing/warc_discovery.py
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the shared helper**

```bash
git add src/ha_backend/indexing/warc_discovery.py tests/test_warc_discovery.py
git commit -m "refactor: share canonical WARC union discovery"
```

### Task 2: Rewire The Read-Only Content Report

**Files:**
- Modify: `tests/test_ops_crawl_content_report.py`
- Modify: `scripts/vps-crawl-content-report.py`

**Interfaces:**
- Consumes: `discover_all_warcs_for_output_dir(...)`
- Preserves: `discover_warcs_read_only(output_dir, state_data) -> tuple[list[Path], str]`
- Preserves: report version and all JSON field names

- [ ] **Step 1: Write the failing mixed-layout report test**

```python
def test_read_only_discovery_unions_stable_tracked_and_fallback_without_state_write(
    tmp_path: Path,
) -> None:
    mod = _load_script_module(
        "vps-crawl-content-report.py",
        module_name="ha_test_vps_crawl_content_report_union",
    )
    output_dir = tmp_path / "jobdir"
    stable_dir = output_dir / "warcs"
    stable_dir.mkdir(parents=True)
    (stable_dir / "stable-001.warc.gz").write_bytes(b"stable")

    tracked_temp = output_dir / ".tmp-tracked"
    tracked_archive = tracked_temp / "collections" / "crawl-1" / "archive"
    tracked_archive.mkdir(parents=True)
    (tracked_archive / "tracked-001.warc.gz").write_bytes(b"tracked")

    fallback_temp = output_dir / ".tmp-fallback"
    fallback_archive = fallback_temp / "collections" / "crawl-2" / "archive"
    fallback_archive.mkdir(parents=True)
    (fallback_archive / "fallback-001.warc.gz").write_bytes(b"fallback")
    os.utime(tracked_temp, (100, 100))
    os.utime(fallback_temp, (200, 200))

    state_path = output_dir / ".archive_state.json"
    state_data = {"temp_dirs_host_paths": [str(tracked_temp)]}
    state_path.write_text(json.dumps(state_data), encoding="utf-8")
    original_state = state_path.read_text(encoding="utf-8")

    warc_paths, source = mod.discover_warcs_read_only(output_dir, state_data)

    assert source == "mixed"
    assert sorted(path.name for path in warc_paths) == [
        "fallback-001.warc.gz",
        "stable-001.warc.gz",
        "tracked-001.warc.gz",
    ]
    assert state_path.read_text(encoding="utf-8") == original_state
```

- [ ] **Step 2: Prove the report test fails**

Run:

```bash
python -m pytest -q tests/test_ops_crawl_content_report.py::test_read_only_discovery_unions_stable_tracked_and_fallback_without_state_write
```

Expected: FAIL because the stable-first implementation returns only `stable-001.warc.gz` and source `stable`.

- [ ] **Step 3: Delegate report discovery to the pure helper**

Remove the report's imports of `discover_temp_dirs`, `find_all_warc_files`, and
`get_job_warcs_dir`. Import `discover_all_warcs_for_output_dir`, delete
`_stable_warc_paths`, and replace `discover_warcs_read_only` with:

```python
def discover_warcs_read_only(
    output_dir: Path, state_data: dict[str, Any]
) -> tuple[list[Path], str]:
    temp_dirs_raw = state_data.get("temp_dirs_host_paths", [])
    tracked_temp_dirs: list[Path] = []
    if isinstance(temp_dirs_raw, list):
        for raw in temp_dirs_raw:
            value = str(raw).strip()
            if value:
                tracked_temp_dirs.append(Path(value))

    result = discover_all_warcs_for_output_dir(
        output_dir,
        tracked_temp_dirs=tracked_temp_dirs,
    )
    return result.warc_paths, result.source
```

- [ ] **Step 4: Prove report parity and read-only behavior pass**

Run:

```bash
python -m pytest -q tests/test_ops_crawl_content_report.py
python -m pytest -q tests/test_warc_discovery.py tests/test_ops_crawl_content_report.py
```

Expected: all report and discovery tests pass.

- [ ] **Step 5: Run focused static checks**

```bash
python -m ruff check scripts/vps-crawl-content-report.py tests/test_ops_crawl_content_report.py
python -m ruff format --check scripts/vps-crawl-content-report.py tests/test_ops_crawl_content_report.py
python -m mypy scripts/vps-crawl-content-report.py
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit report parity**

```bash
git add scripts/vps-crawl-content-report.py tests/test_ops_crawl_content_report.py
git commit -m "fix: align crawl report WARC discovery"
```

### Task 3: Document And Close The Delivered Follow-Through

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/planning/roadmap.md`
- Modify: `docs/planning/implemented/2026-01-29-warc-discovery-consistency.md`
- Modify: `docs/planning/README.md`
- Modify: `docs/planning/implemented/README.md`
- Archive: `docs/planning/2026-07-10-warc-report-discovery-parity.md`

**Interfaces:**
- Consumes: completed shared helper and report behavior
- Produces: accurate canonical architecture and an explicit remaining manifest-reporting backlog item

- [ ] **Step 1: Update canonical architecture**

Replace the temp-only discovery description with the two-layer contract:

```text
discover_all_warcs_for_output_dir performs a read-only union of stable,
tracked-temp, and latest untracked fallback WARCs, preferring stable paths when
inode or manifest identity proves a duplicate. discover_all_warcs_for_job keeps
CrawlState validation/pruning and delegates to that helper. Read-only operator
reports parse tracked paths without CrawlState and call the pure helper.
```

- [ ] **Step 2: Make backlog state precise**

Replace the generic WARC-discovery consistency roadmap bullet with an explicit
manifest-status/error-reporting item that records:

```text
Current gap: malformed or unreadable consolidation manifests are treated as
having no copy-deduplication entries, and manifest_valid still conflates
fallback discovery with manifest state. Done when missing, valid, and invalid
manifest states are distinguished additively and surfaced in operator output.
```

Update `implemented/2026-01-29-warc-discovery-consistency.md` to mark structured
result semantics and operator-script alignment complete, leaving only manifest
status/error reporting deferred and linking this implemented plan.

- [ ] **Step 3: Run focused functional validation**

```bash
python -m pytest -q tests/test_warc_discovery.py tests/test_ops_crawl_content_report.py
```

Expected: all focused tests pass.

- [ ] **Step 4: Run complete validation**

```bash
make backend-ci
make docs-coverage-strict
make docs-build-strict
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 5: Archive the plan and update indexes**

Move this plan to
`docs/planning/implemented/2026-07-10-warc-report-discovery-parity.md`, compress
it to the implemented-plan summary format, remove it from the active-plan list,
and add it to both implemented-plan indexes.

- [ ] **Step 6: Commit the closeout**

```bash
git add docs/architecture.md docs/planning/roadmap.md \
  docs/planning/implemented/2026-01-29-warc-discovery-consistency.md \
  docs/planning/README.md docs/planning/implemented/README.md \
  docs/planning/2026-07-10-warc-report-discovery-parity.md \
  docs/planning/implemented/2026-07-10-warc-report-discovery-parity.md
git commit -m "docs: close WARC report discovery follow-up"
```

- [ ] **Step 7: Re-run full validation on the committed tree**

Repeat Steps 3 and 4, then run:

```bash
git status --short --branch
```

Expected: all validation passes and the branch is clean.
