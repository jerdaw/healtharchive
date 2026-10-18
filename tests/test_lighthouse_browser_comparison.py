from __future__ import annotations

import base64
import hashlib
import importlib.util
import json
import shutil
import stat
import subprocess
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[1]
HELPER_PATH = ROOT / "frontend/scripts/lighthouse-browser-compare-integrity.py"
SUMMARY_PATH = ROOT / "frontend/scripts/lighthouse-browser-compare-summary.cjs"
SPEC = importlib.util.spec_from_file_location("lh_compare_integrity", HELPER_PATH)
assert SPEC is not None and SPEC.loader is not None
INTEGRITY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INTEGRITY)


def test_crc32c_uses_castagnoli_vector() -> None:
    assert INTEGRITY.crc32c([b"123", b"456789"]) == 0xE3069283
    assert INTEGRITY.crc32c_base64(0xE3069283) == "4waSgw=="


def test_manifest_must_resolve_exact_versioned_official_archive(tmp_path: Path) -> None:
    manifest = {
        "version": INTEGRITY.CHROME_VERSION,
        "downloads": {"chrome": [{"platform": "linux64", "url": INTEGRITY.CHROME_ARCHIVE_URL}]},
    }
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    INTEGRITY.verify_manifest(path)

    manifest["downloads"]["chrome"][0]["url"] = "https://example.invalid/browser.zip"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ValueError, match="manifest download entry mismatch"):
        INTEGRITY.verify_manifest(path)


def test_storage_headers_must_match_pinned_generation_length_and_hashes(tmp_path: Path) -> None:
    path = tmp_path / "headers.txt"
    path.write_text(
        "HTTP/2 200\r\n"
        f"content-length: {INTEGRITY.CHROME_ARCHIVE_BYTES}\r\n"
        f"x-goog-generation: {INTEGRITY.CHROME_ARCHIVE_GENERATION}\r\n"
        f"x-goog-hash: crc32c={INTEGRITY.CHROME_ARCHIVE_CRC32C_B64}\r\n"
        f"x-goog-hash: md5={INTEGRITY.CHROME_ARCHIVE_MD5_B64}\r\n\r\n",
        encoding="ascii",
    )
    INTEGRITY.verify_storage_headers(path)

    path.write_text("HTTP/2 302\r\ncontent-length: 0\r\n\r\n", encoding="ascii")
    with pytest.raises(ValueError, match="archive response status mismatch"):
        INTEGRITY.verify_storage_headers(path)


def test_archive_verification_checks_length_md5_crc32c_and_returns_sha256(tmp_path: Path) -> None:
    content = b"small offline archive fixture"
    path = tmp_path / "archive.zip"
    path.write_bytes(content)
    expected_md5 = base64.b64encode(hashlib.md5(content).digest()).decode("ascii")
    expected_crc = INTEGRITY.crc32c_base64(INTEGRITY.crc32c([content]))

    assert (
        INTEGRITY.verify_archive(
            path,
            expected_size=len(content),
            expected_md5_b64=expected_md5,
            expected_crc32c_b64=expected_crc,
        )
        == hashlib.sha256(content).hexdigest()
    )

    with pytest.raises(ValueError, match="archive CRC32C mismatch"):
        INTEGRITY.verify_archive(
            path,
            expected_size=len(content),
            expected_md5_b64=expected_md5,
            expected_crc32c_b64="AAAAAA==",
        )


def test_zip_members_are_confined_to_chrome_root_and_include_binary(tmp_path: Path) -> None:
    path = tmp_path / "safe.zip"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("chrome-linux64/chrome", b"synthetic")
        archive.writestr("chrome-linux64/resources.pak", b"synthetic")
    INTEGRITY.validate_archive_members(path)

    unsafe = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(unsafe, "w") as archive:
        archive.writestr("chrome-linux64/chrome", b"synthetic")
        archive.writestr("chrome-linux64/../outside", b"synthetic")
    with pytest.raises(ValueError, match="archive path is outside the expected root"):
        INTEGRITY.validate_archive_members(unsafe)


def test_extract_restores_only_archive_executable_bits(tmp_path: Path) -> None:
    path = tmp_path / "modes.zip"
    with zipfile.ZipFile(path, "w") as archive:
        chrome = zipfile.ZipInfo("chrome-linux64/chrome")
        chrome.external_attr = (stat.S_IFREG | 0o755) << 16
        archive.writestr(chrome, b"synthetic executable")
        data = zipfile.ZipInfo("chrome-linux64/resources.pak")
        data.external_attr = (stat.S_IFREG | 0o600) << 16
        archive.writestr(data, b"synthetic data")

    destination = tmp_path / "extracted"
    INTEGRITY.extract_archive(path, destination)
    assert destination.joinpath("chrome-linux64/chrome").stat().st_mode & 0o111
    assert not destination.joinpath("chrome-linux64/resources.pak").stat().st_mode & 0o111


def _run_summary(
    tmp_path: Path, text: str, expected_version: str = "148.0.7778.97"
) -> tuple[int, str]:
    log_path = tmp_path / "runner.log"
    log_path.write_text(text, encoding="utf-8")
    result = subprocess.run(
        ["node", str(SUMMARY_PATH), str(log_path), expected_version],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode, result.stdout


def _emitter_fixture() -> str:
    script = r"""
const diagnostics = require(process.argv[1]);
const browserMarker = diagnostics.formatDiagnosticTelemetryMarker({
  type: "browser-version", product: "headless-chrome", version: "148.0.7778.97",
});
const cdpMarker = diagnostics.formatDiagnosticTelemetryMarker({
  type: "cdp-failure", method: "DOM.resolveNode", failureClass: "protocol-timeout",
});
const browser = browserMarker.match(/^HA_LIGHTHOUSE_DIAGNOSTIC browser product=([a-z-]+) version=([0-9.]+)$/);
const cdp = cdpMarker.match(/^HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=([A-Za-z][A-Za-z0-9.]*) class=([a-z-]+)$/);
if (!browser || !cdp) process.exit(2);
process.stdout.write(
  `Lighthouse diagnostic: browser=${browser[1]} version=${browser[2]} route=home run=3 attempt=1 attribution=best-effort elapsedSec=181\n` +
  "Lighthouse diagnostic: phase=gather-get-artifact-trace-elements route=home run=3 attempt=1 elapsedSec=181\n" +
  `Lighthouse diagnostic: cdpFailure=${cdp[1]} class=${cdp[2]} route=home run=3 attempt=1 attribution=best-effort elapsedSec=181\n` +
  `Lighthouse diagnostic: cdpFailure=${cdp[1]} class=${cdp[2]} route=home run=3 attempt=1 attribution=best-effort elapsedSec=181\n`
);
"""
    result = subprocess.run(
        ["node", "-e", script, str(ROOT / "frontend/scripts/lighthouse-diagnostic-lib.cjs")],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


def _saturated_emitter_fixture() -> str:
    script = r"""
const diagnostics = require(process.argv[1]);
const routes = ["home", "archive", "snapshot"];
const lines = [];
for (let i = 0; i < 27; i += 1) {
  const route = routes[Math.floor(i / 9)];
  const run = (Math.floor(i / 3) % 3) + 1;
  const attempt = (i % 3) + 1;
  const marker = diagnostics.formatDiagnosticTelemetryMarker({
    type: "browser-version", product: "headless-chrome", version: "148.0.7778.97",
  });
  const event = marker.match(/^HA_LIGHTHOUSE_DIAGNOSTIC browser product=([a-z-]+) version=([0-9.]+)$/);
  lines.push(`Lighthouse diagnostic: browser=${event[1]} version=${event[2]} route=${route} run=${run} attempt=${attempt} attribution=best-effort elapsedSec=181`);
  lines.push(`Lighthouse diagnostic: phase=chrome-ready route=${route} run=${run} attempt=${attempt} elapsedSec=181`);
}
for (const method of [...diagnostics.SAFE_CDP_METHODS].slice(0, 16)) {
  const marker = diagnostics.formatDiagnosticTelemetryMarker({
    type: "cdp-failure", method, failureClass: "protocol-timeout",
  });
  const event = marker.match(/^HA_LIGHTHOUSE_DIAGNOSTIC cdp-failure method=([A-Za-z][A-Za-z0-9.]*) class=([a-z-]+)$/);
  lines.push(`Lighthouse diagnostic: cdpFailure=${event[1]} class=${event[2]} route=home run=1 attempt=1 attribution=best-effort elapsedSec=181`);
}
process.stdout.write(`${lines.join("\n")}\n`);
"""
    result = subprocess.run(
        ["node", "-e", script, str(ROOT / "frontend/scripts/lighthouse-diagnostic-lib.cjs")],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


def _write_realpath_shim(bin_dir: Path) -> None:
    bin_dir.mkdir(parents=True, exist_ok=True)
    realpath = bin_dir / "realpath"
    realpath.write_text(
        "#!/bin/sh\n"
        '[ "${1:-}" = -e ] && shift\n'
        "path=${1:?path required}\n"
        'cd -P "$(dirname "$path")" || exit 1\n'
        'printf \'%s/%s\\n\' "$PWD" "$(basename "$path")"\n',
        encoding="utf-8",
    )
    realpath.chmod(0o755)


def test_summary_accepts_actual_emitter_context_and_deduplicates_cdp(tmp_path: Path) -> None:
    exit_code, output = _run_summary(tmp_path, _emitter_fixture())
    assert exit_code == 0
    assert "browserMarkerCount=1 browserMarkerVersionCheck=passed" in output
    assert "safeDiagnostic=browser=headless-chrome version=148.0.7778.97" in output
    assert output.count("safeDiagnostic=cdpFailure=DOM.resolveNode") == 1
    assert "safeDiagnostic=phase=gather-get-artifact-trace-elements" in output


def test_summary_discards_hostile_or_out_of_bounds_diagnostics(tmp_path: Path) -> None:
    fixture = _emitter_fixture() + (
        "Lighthouse diagnostic: phase=run-arbitrary-command route=home run=3 attempt=1 elapsedSec=181\n"
        "Lighthouse diagnostic: cdpFailure=Local.readPrivateFile class=protocol-timeout route=home run=3 attempt=1 attribution=best-effort elapsedSec=181\n"
        "Lighthouse diagnostic: cdpFailure=DOM.resolveNode class=private-path route=home run=3 attempt=1 attribution=best-effort elapsedSec=181\n"
        "Lighthouse diagnostic: cdpFailure=DOM.resolveNode class=protocol-timeout route=home run=3 attempt=1 attribution=best-effort elapsedSec=301\n"
        "Lighthouse diagnostic: phase=gather-get-artifact-trace-elements route=home run=3 attempt=1 elapsedSec=181 private=/secret\n"
        "untrusted raw browser stderr secret\n"
    )
    exit_code, output = _run_summary(tmp_path, fixture)
    assert exit_code == 0
    assert "run-arbitrary-command" not in output
    assert "Local.readPrivateFile" not in output
    assert "private-path" not in output
    assert "elapsedSec=301" not in output
    assert "/secret" not in output and "secret" not in output
    assert output.count("safeDiagnostic=cdpFailure=DOM.resolveNode") == 1


def test_summary_requires_exact_browser_version_and_real_attribution_shape(tmp_path: Path) -> None:
    fixture = _emitter_fixture().replace(
        "version=148.0.7778.97 route=home", "version=148.0.7778.97.1 route=home", 1
    )
    exit_code, output = _run_summary(tmp_path, fixture)
    assert exit_code == 1
    assert "browserMarkerVersionCheck=failed" in output

    fixture = _emitter_fixture().replace(" attribution=best-effort", "", 1)
    exit_code, output = _run_summary(tmp_path, fixture)
    assert exit_code == 1
    assert "browserMarkerVersionCheck=failed" in output


def test_summary_truncation_is_forwarded_by_shell_arm_handoff(tmp_path: Path) -> None:
    summary_exit, summary_output = _run_summary(tmp_path, _saturated_emitter_fixture())
    assert summary_exit == 0
    assert (
        "browserMarkerCount=27 browserMarkerVersionCheck=passed summaryTruncated=true"
        in summary_output
    )
    assert sum(line.startswith("safeDiagnostic=") for line in summary_output.splitlines()) == 64

    result_path = tmp_path / "result.txt"
    result_path.write_text(
        "versionCheck=passed\nrunExit=0\nsummaryCheck=passed\n" + summary_output,
        encoding="utf-8",
    )
    summary_path = tmp_path / "step-summary.md"
    realpath_bin = tmp_path / "bin"
    _write_realpath_shim(realpath_bin)
    shell_script = ROOT / "frontend/scripts/lighthouse-browser-comparison.sh"
    source_and_report = (
        'source "$1"; GITHUB_STEP_SUMMARY="$2"; arm_failures=0; '
        "report_arm_result chrome148-cft 0 148.0.7778.97 "
        f'{"a" * 64} "$3"; printf "armFailures=%s\\n" "$arm_failures"'
    )
    result = subprocess.run(
        [
            "bash",
            "-c",
            source_and_report,
            "bash",
            str(shell_script),
            str(summary_path),
            str(result_path),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        env={"PATH": f"{realpath_bin}:/usr/bin:/bin:/usr/sbin:/sbin"},
    )
    assert result.returncode == 0
    assert "summaryTruncated=true" in result.stdout
    assert "state=failed-or-blocked" in result.stdout
    assert f"launchPathSha256={'a' * 64}" in result.stdout
    assert "armFailures=1" in result.stdout
    assert "summaryTruncated=true" in summary_path.read_text(encoding="utf-8")


def test_summary_phases_match_the_existing_run_lighthouse_allowlist() -> None:
    import re

    source = (ROOT / "frontend/scripts/run-lighthouse.mjs").read_text(encoding="utf-8")
    match = re.search(
        r"const SAFE_DIAGNOSTIC_PHASES = new Set\(\[(.*?)\]\);",
        source,
        flags=re.DOTALL,
    )
    assert match is not None
    explicit = set(re.findall(r'"([a-z0-9-]+)"', match.group(1)))
    lib = subprocess.run(
        [
            "node",
            "-e",
            "const x=require(process.argv[1]); console.log(JSON.stringify({g:[...x.SAFE_GATHER_DIAGNOSTIC_PHASES],r:[...x.LIGHTHOUSE_RUNTIME_ERROR_DIAGNOSTIC_PHASES]}))",
            str(ROOT / "frontend/scripts/lighthouse-diagnostic-lib.cjs"),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    sets = json.loads(lib.stdout)
    expected = explicit | set(sets["g"]) | set(sets["r"])
    actual = subprocess.run(
        [
            "node",
            "-e",
            "const x=require(process.argv[1]); console.log(JSON.stringify([...x.SAFE_PHASES]))",
            str(SUMMARY_PATH),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    assert expected == set(json.loads(actual.stdout))


def test_comparison_script_is_fixed_source_isolated_and_non_mutating() -> None:
    script = (ROOT / "frontend/scripts/lighthouse-browser-comparison.sh").read_text(
        encoding="utf-8"
    )
    assert 'APP_SOURCE_SHA="6d6ae6c99f606884aecf3fa698a799f1ee0a354f"' in script
    assert 'RUNNER_IMAGE_VERSION="20261012.334.1"' in script
    assert 'CHROME155_VERSION="155.0.8059.39"' in script
    assert 'CHROME148_VERSION="148.0.7778.97"' in script
    assert 'GITHUB_HEAD_REF:-}" != "$HELPER_BRANCH"' in script
    assert "unshare --net --fork" in script
    assert "ip link set lo up" in script
    assert "ip -o route show default" in script
    assert "--no-new-privs" in script
    assert 'HOME="$ARM_DIR/home" TMPDIR="$ARM_DIR/tmp"' in script
    assert "NEXT_PUBLIC_REPLAY_BASE_URL=https://replay-sentinel.invalid" in script
    assert "timeout=300" not in script
    assert "iptables" not in script and "nft " not in script
    assert "--network host" not in script
    assert 'version_text" == "Google Chrome $EXPECTED_VERSION"' in script
    assert 'version_text" == "Google Chrome for Testing $EXPECTED_VERSION"' in script
    assert 'SUMMARY_HELPER="$summary_helper"' in script
    assert 'local integrity_helper="$script_dir/lighthouse-browser-compare-integrity.py"' in script
    assert 'INTEGRITY_HELPER="$integrity_helper"' not in script
    assert "printf '%s\\n' \"$line\"" in script


def test_inside_root_dispatch_resolves_helpers_without_environment_or_namespace(
    tmp_path: Path,
) -> None:
    import subprocess

    script_dir = tmp_path / "bundle"
    script_dir.mkdir()
    mock_bin = tmp_path / "bin"
    _write_realpath_shim(mock_bin)
    script = script_dir / "lighthouse-browser-comparison.sh"
    shutil.copy2(ROOT / "frontend/scripts/lighthouse-browser-comparison.sh", script)
    (script_dir / "lighthouse-browser-compare-summary.cjs").write_text("// fixture\n")
    (script_dir / "lighthouse-browser-compare-integrity.py").write_text("# fixture\n")
    app_root = tmp_path / "app"
    arm_dir = tmp_path / "arm"
    app_root.mkdir()
    arm_dir.mkdir()
    result = subprocess.run(
        [
            "bash",
            str(script),
            "--inside-root",
            "1000",
            "1000",
            str(app_root),
            "/usr/bin/node",
            "/usr/bin",
            "chrome155-current",
            "/usr/bin/chrome",
            "155.0.8059.39",
            "chrome",
            str(arm_dir),
            "--test-paths-only",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        env={"PATH": f"{mock_bin}:/usr/bin:/bin:/usr/sbin:/sbin"},
    )
    assert result.returncode == 0
    assert result.stdout == "insideRootHelperPaths=resolved\n"
    assert result.stderr == ""

    (script_dir / "lighthouse-browser-compare-summary.cjs").unlink()
    result = subprocess.run(
        [
            "bash",
            str(script),
            "--inside-root",
            "1000",
            "1000",
            str(app_root),
            "/usr/bin/node",
            "/usr/bin",
            "chrome155-current",
            "/usr/bin/chrome",
            "155.0.8059.39",
            "chrome",
            str(arm_dir),
            "--test-paths-only",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        env={"PATH": f"{mock_bin}:/usr/bin:/bin:/usr/sbin:/sbin"},
    )
    assert result.returncode == 85
    assert result.stdout == ""


def test_workflow_keeps_ordinary_frontend_jobs_byte_for_byte_semantically_unchanged() -> None:
    import yaml

    workflow_path = ROOT / ".github/workflows/frontend-ci.yml"
    current = yaml.load(workflow_path.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
    expected_hashes = {
        # Canonical semantic hashes from verified base 6d6ae6c9; no Git history is required.
        "contract-sync": "1d4b6defe18c0eab2f6b35556930daf18687126659e6045949d38f10ddcf7f48",
        "lint-and-test": "5c0e4eb5bd5e414728fc916e9e24d1413297b39f32eb0135a550c89c5c41e9e5",
        "docker-build-smoke": "646c021df815f08cbc42cbf2d8aab92a730ad7525f635afb4765972544520890",
    }
    for job, expected in expected_hashes.items():
        canonical = json.dumps(current["jobs"][job], sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
        assert hashlib.sha256(canonical).hexdigest() == expected


def test_workflow_comparison_job_is_branch_scoped_optional_and_has_no_artifacts() -> None:
    import yaml

    workflow = yaml.load(
        (ROOT / ".github/workflows/frontend-ci.yml").read_text(encoding="utf-8"),
        Loader=yaml.BaseLoader,
    )
    job = workflow["jobs"]["lighthouse-browser-comparison"]
    assert "github.event_name == 'pull_request'" in job["if"]
    assert "github.event.pull_request.head.repo.full_name == github.repository" in job["if"]
    assert "github.event.pull_request.number == 159" in job["if"]
    assert "github.head_ref == 'fix/production-public-build-config-20261013'" in job["if"]
    assert job["runs-on"] == "ubuntu-24.04"
    assert job["timeout-minutes"] == "25"
    assert job["continue-on-error"] == "true"
    assert job["permissions"] == {"contents": "read"}
    assert "needs" not in job
    steps = job["steps"]
    assert all(
        step.get("with", {}).get("persist-credentials") == "false"
        for step in steps
        if step.get("uses", "").startswith("actions/checkout@")
    )
    assert not any(
        step.get("uses", "").startswith(("actions/cache@", "actions/upload-artifact@"))
        for step in steps
    )
    assert "frontend/scripts/lighthouse-browser-comparison.sh" in steps[-1]["run"]
    assert "app-under-test" in steps[-1]["run"]
