from __future__ import annotations

import os
import stat
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "vps-deploy.sh"


def _write_executable(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def _init_fake_repo(tmp_path: Path) -> tuple[Path, Path]:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    subprocess.run(["git", "init"], cwd=repo_dir, check=True, capture_output=True, text=True)
    subprocess.run(
        ["git", "config", "user.email", "tests@example.com"],
        cwd=repo_dir,
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "HealthArchive Tests"],
        cwd=repo_dir,
        check=True,
        capture_output=True,
        text=True,
    )
    (repo_dir / "README.md").write_text("test repo\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=repo_dir, check=True, capture_output=True, text=True)
    subprocess.run(
        ["git", "commit", "-m", "init"],
        cwd=repo_dir,
        check=True,
        capture_output=True,
        text=True,
    )

    venv_bin = repo_dir / ".venv" / "bin"
    venv_bin.mkdir(parents=True)
    for tool_name in ("python3", "pip", "alembic"):
        _write_executable(
            venv_bin / tool_name,
            "#!/usr/bin/env bash\nexit 0\n",
        )
    _write_executable(
        venv_bin / "ha-backend",
        """#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "list-jobs" ]]; then
  printf '%s\n' "${HA_BACKEND_LIST_JOBS_OUTPUT:-No jobs found.}"
  exit 0
fi
exit 0
""",
    )

    env_file = tmp_path / "backend.env"
    env_file.write_text("HEALTHARCHIVE_DATABASE_URL=sqlite:////tmp/test.db\n", encoding="utf-8")
    return repo_dir, env_file


def _init_fake_bin(tmp_path: Path) -> tuple[Path, Path, Path]:
    fake_bin = tmp_path / "fake-bin"
    fake_bin.mkdir()
    systemctl_log = tmp_path / "systemctl.log"
    curl_log = tmp_path / "curl.log"
    systemctl_log.write_text("", encoding="utf-8")
    curl_log.write_text("", encoding="utf-8")

    _write_executable(
        fake_bin / "sudo",
        """#!/usr/bin/env bash
set -euo pipefail
"$@"
""",
    )
    _write_executable(
        fake_bin / "systemctl",
        """#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "${SYSTEMCTL_LOG}"
command_name="${1:-}"
shift || true
case "${command_name}" in
  daemon-reload|restart)
    exit 0
    ;;
  is-active)
    unit="${1:-}"
    if [[ "${unit}" == "healtharchive-worker" ]]; then
      state="${FAKE_WORKER_STATE:-inactive}"
      printf '%s\n' "${state}"
      if [[ "${state}" == "active" ]]; then
        exit 0
      fi
      exit 3
    fi
    printf 'active\n'
    exit 0
    ;;
  status)
    if printf '%s ' "$@" | grep -Fq "healtharchive-worker"; then
      exit "${FAKE_WORKER_STATUS_RC:-3}"
    fi
    exit 0
    ;;
esac
exit 0
""",
    )
    _write_executable(
        fake_bin / "curl",
        """#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "${CURL_LOG}"
printf '{"status":"ok"}\n'
""",
    )
    return fake_bin, systemctl_log, curl_log


def _run_vps_deploy(
    tmp_path: Path,
    *extra_args: str,
    worker_state: str = "inactive",
    worker_status_rc: int = 3,
    jobs_output: str = "No jobs found.",
) -> tuple[subprocess.CompletedProcess[str], Path, Path]:
    repo_dir, env_file = _init_fake_repo(tmp_path)
    fake_bin, systemctl_log, curl_log = _init_fake_bin(tmp_path)
    lock_file = tmp_path / "deploy.lock"

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"
    env["SYSTEMCTL_LOG"] = str(systemctl_log)
    env["CURL_LOG"] = str(curl_log)
    env["FAKE_WORKER_STATE"] = worker_state
    env["FAKE_WORKER_STATUS_RC"] = str(worker_status_rc)
    env["HA_BACKEND_LIST_JOBS_OUTPUT"] = jobs_output

    command = [
        "bash",
        str(SCRIPT_PATH),
        "--apply",
        "--repo-dir",
        str(repo_dir),
        "--env-file",
        str(env_file),
        "--health-url",
        "http://127.0.0.1:8001/api/health",
        "--lock-file",
        str(lock_file),
        "--skip-deps",
        "--skip-migrations",
        "--skip-baseline-drift",
        "--skip-public-surface-verify",
        "--no-pull",
        *extra_args,
    ]
    result = subprocess.run(command, capture_output=True, text=True, env=env)
    return result, systemctl_log, curl_log


def test_vps_deploy_allows_inactive_worker_when_restart_is_skipped(tmp_path: Path) -> None:
    result, systemctl_log, curl_log = _run_vps_deploy(
        tmp_path,
        "--skip-worker-restart",
        worker_state="inactive",
        worker_status_rc=3,
    )

    assert result.returncode == 0, result.stderr
    assert "Skipping worker restart." in result.stdout
    assert "Reporting worker status without gating deploy success." in result.stdout
    assert "status healtharchive-api healtharchive-worker" not in systemctl_log.read_text(
        encoding="utf-8"
    )
    assert "status healtharchive-api --no-pager -l" in systemctl_log.read_text(encoding="utf-8")
    assert "status healtharchive-worker --no-pager -l" in systemctl_log.read_text(
        encoding="utf-8"
    )
    assert "/api/health" in curl_log.read_text(encoding="utf-8")


def test_vps_deploy_still_gates_on_worker_status_when_restart_was_attempted(tmp_path: Path) -> None:
    result, systemctl_log, curl_log = _run_vps_deploy(
        tmp_path,
        worker_state="failed",
        worker_status_rc=3,
        jobs_output="No jobs found.",
    )

    assert result.returncode != 0
    assert "status healtharchive-worker --no-pager -l" in systemctl_log.read_text(encoding="utf-8")
    assert curl_log.read_text(encoding="utf-8") == ""
