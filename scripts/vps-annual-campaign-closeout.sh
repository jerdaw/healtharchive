#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Capture annual campaign closeout evidence on the production VPS.

This read-only helper captures deterministic closeout evidence and writes a
machine-readable summary for report drafting.

Usage:
  ./scripts/vps-annual-campaign-closeout.sh \
    --year 2026 \
    --sources hc,phac,cihr \
    --out-root /srv/healtharchive/ops/annual-closeout

Options:
  --year YYYY       Campaign year. Defaults to current UTC year.
  --sources CSV     Comma-separated source codes. Defaults to hc,phac,cihr.
  --out-root DIR    Evidence root. Defaults to /srv/healtharchive/ops/annual-closeout
                    when /srv/healtharchive exists, otherwise /tmp/ha-annual-closeout.
  --run-id ID       Evidence run id. Defaults to current UTC timestamp.
  --base-url URL    Local API base URL. Defaults to http://127.0.0.1:8001.
  --env-file FILE   Optional backend env file for commands that need DB access.
                    Defaults to /etc/healtharchive/backend.env when present.
  --allow-existing  Reuse an existing evidence directory.
  -h, --help        Show this help.

Outputs:
  closeout-summary.json
  annual-status.json
  production-validation.log
  public-surface.log
  automation-posture.log
  backup-chain.tsv
  docker-cache-metrics.prom
  timers.txt
  nasd-followup-command.txt

Notes:
  - This script does not print env values or secrets.
  - NASD validation remains operator-run on the NAS host. The exact command is
    stored in nasd-followup-command.txt and printed at the end.
EOF
}

YEAR=""
SOURCES="hc,phac,cihr"
OUT_ROOT=""
RUN_ID=""
BASE_URL="http://127.0.0.1:8001"
ENV_FILE=""
ALLOW_EXISTING="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --year)
      YEAR="$2"
      shift 2
      ;;
    --sources)
      SOURCES="$2"
      shift 2
      ;;
    --out-root)
      OUT_ROOT="$2"
      shift 2
      ;;
    --run-id)
      RUN_ID="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --allow-existing)
      ALLOW_EXISTING="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -z "${YEAR}" ]]; then
  YEAR="$(date -u +%Y)"
fi
if [[ ! "${YEAR}" =~ ^[0-9]{4}$ ]]; then
  echo "ERROR: --year must be a 4-digit year (got: ${YEAR})" >&2
  exit 2
fi

if [[ -z "${OUT_ROOT}" ]]; then
  if [[ -d "/srv/healtharchive" ]]; then
    OUT_ROOT="/srv/healtharchive/ops/annual-closeout"
  else
    OUT_ROOT="/tmp/ha-annual-closeout"
  fi
fi

if [[ -z "${RUN_ID}" ]]; then
  RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
fi
if [[ ! "${RUN_ID}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "ERROR: --run-id must match ^[A-Za-z0-9._-]+$ (got: ${RUN_ID})" >&2
  exit 2
fi

IFS=',' read -r -a SOURCE_ARRAY_RAW <<<"${SOURCES}"
SOURCE_ARRAY=()
for source_code in "${SOURCE_ARRAY_RAW[@]}"; do
  trimmed="$(printf '%s' "${source_code}" | tr -d '[:space:]')"
  if [[ -n "${trimmed}" ]]; then
    SOURCE_ARRAY+=("${trimmed}")
  fi
done
if [[ ${#SOURCE_ARRAY[@]} -eq 0 ]]; then
  echo "ERROR: --sources must include at least one source code" >&2
  exit 2
fi

PYTHON_BIN="python3"
if [[ -x "${REPO_ROOT}/.venv/bin/python3" ]]; then
  PYTHON_BIN="${REPO_ROOT}/.venv/bin/python3"
elif [[ -x "${REPO_ROOT}/.venv/bin/python" ]]; then
  PYTHON_BIN="${REPO_ROOT}/.venv/bin/python"
fi

HA_BACKEND_BIN=""
if [[ -x "${REPO_ROOT}/.venv/bin/healtharchive" ]]; then
  HA_BACKEND_BIN="${REPO_ROOT}/.venv/bin/healtharchive"
elif command -v healtharchive >/dev/null 2>&1; then
  HA_BACKEND_BIN="healtharchive"
else
  echo "ERROR: healtharchive CLI not found. Activate the venv or install dependencies." >&2
  exit 1
fi

if [[ -z "${HEALTHARCHIVE_DATABASE_URL:-}" ]]; then
  auto_env="/etc/healtharchive/backend.env"
  if [[ -n "${ENV_FILE}" ]]; then
    if [[ ! -f "${ENV_FILE}" ]]; then
      echo "ERROR: --env-file not found: ${ENV_FILE}" >&2
      exit 2
    fi
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  elif [[ -f "${auto_env}" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${auto_env}"
    set +a
  fi
fi

YEAR_DIR="${OUT_ROOT%/}/${YEAR}"
EVIDENCE_DIR="${YEAR_DIR%/}/${RUN_ID}"
if [[ -e "${EVIDENCE_DIR}" && "${ALLOW_EXISTING}" != "true" ]]; then
  echo "ERROR: Evidence directory already exists: ${EVIDENCE_DIR}" >&2
  echo "Hint: pass --allow-existing or choose a new --run-id." >&2
  exit 2
fi
mkdir -p "${YEAR_DIR}"
mkdir -p "${EVIDENCE_DIR}"

PRODUCTION_LOG="${EVIDENCE_DIR}/production-validation.log"
ANNUAL_STATUS_JSON="${EVIDENCE_DIR}/annual-status.json"
PUBLIC_SURFACE_LOG="${EVIDENCE_DIR}/public-surface.log"
AUTOMATION_LOG="${EVIDENCE_DIR}/automation-posture.log"
BACKUP_CHAIN_TSV="${EVIDENCE_DIR}/backup-chain.tsv"
DOCKER_CACHE_METRICS="${EVIDENCE_DIR}/docker-cache-metrics.prom"
TIMERS_TXT="${EVIDENCE_DIR}/timers.txt"
NASD_COMMAND_TXT="${EVIDENCE_DIR}/nasd-followup-command.txt"
GATES_TSV="${EVIDENCE_DIR}/gates.tsv"
SUMMARY_JSON="${EVIDENCE_DIR}/closeout-summary.json"

: >"${PRODUCTION_LOG}"
: >"${GATES_TSV}"

failures=0

record_gate() {
  local gate="$1"
  local result="$2"
  local evidence="$3"
  local note="${4:-}"
  printf '%s\t%s\t%s\t%s\n' "${gate}" "${result}" "${evidence}" "${note}" >>"${GATES_TSV}"
  if [[ "${result}" == "pass" ]]; then
    echo "OK   ${gate}"
  else
    failures=$((failures + 1))
    echo "FAIL ${gate}: ${note}" >&2
  fi
}

append_section() {
  local label="$1"
  shift
  {
    echo
    echo "== ${label} =="
    "$@"
  } >>"${PRODUCTION_LOG}" 2>&1
}

append_shell_section() {
  local label="$1"
  local script="$2"
  {
    echo
    echo "== ${label} =="
    bash -lc "${script}"
  } >>"${PRODUCTION_LOG}" 2>&1
}

echo "HealthArchive annual campaign closeout capture"
echo "------------------------------------------------"
echo "year=${YEAR}"
echo "sources=$(IFS=,; echo "${SOURCE_ARRAY[*]}")"
echo "evidence_dir=${EVIDENCE_DIR}"
echo

append_section "closeout timestamp" date -u
append_section "deployed repo" git -C "${REPO_ROOT}" rev-parse HEAD
append_section "repo status" git -C "${REPO_ROOT}" status --short --branch

if command -v ha-check >/dev/null 2>&1; then
  if append_section "ha-check" ha-check; then
    record_gate "ha_check" "pass" "production-validation.log" "ha-check completed"
  else
    record_gate "ha_check" "fail" "production-validation.log" "ha-check failed"
  fi
else
  record_gate "ha_check" "fail" "production-validation.log" "ha-check command not found"
fi

if "${HA_BACKEND_BIN}" annual-status --year "${YEAR}" --json --sources "${SOURCE_ARRAY[@]}" >"${ANNUAL_STATUS_JSON}" 2>>"${PRODUCTION_LOG}"; then
  if "${PYTHON_BIN}" - "${ANNUAL_STATUS_JSON}" >>"${PRODUCTION_LOG}" 2>&1 <<'PY'; then
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
ready = bool(payload.get("summary", {}).get("readyForSearch"))
print(f"annual_status_ready={ready}")
sys.exit(0 if ready else 1)
PY
    record_gate "annual_status" "pass" "annual-status.json" "all requested sources are search-ready"
  else
    record_gate "annual_status" "fail" "annual-status.json" "annual-status returned readyForSearch=false"
  fi
else
  record_gate "annual_status" "fail" "annual-status.json" "annual-status command failed"
fi

if append_section "api health" curl -fsS "${BASE_URL%/}/api/health"; then
  record_gate "api_health" "pass" "production-validation.log" "${BASE_URL%/}/api/health"
else
  record_gate "api_health" "fail" "production-validation.log" "API health check failed"
fi

if append_section "prometheus ready" curl -fsS "http://127.0.0.1:9090/-/ready"; then
  record_gate "prometheus_ready" "pass" "production-validation.log" "Prometheus ready"
else
  record_gate "prometheus_ready" "fail" "production-validation.log" "Prometheus readiness failed"
fi

if append_section "alertmanager ready" curl -fsS "http://127.0.0.1:9093/-/ready"; then
  record_gate "alertmanager_ready" "pass" "production-validation.log" "Alertmanager ready"
else
  record_gate "alertmanager_ready" "fail" "production-validation.log" "Alertmanager readiness failed"
fi

if append_section "baseline drift" "${PYTHON_BIN}" "${REPO_ROOT}/scripts/check_baseline_drift.py" --mode live --no-write; then
  record_gate "baseline_drift" "pass" "production-validation.log" "no baseline drift"
else
  record_gate "baseline_drift" "fail" "production-validation.log" "baseline drift check failed"
fi

search_verify_dir="${EVIDENCE_DIR}/search-eval"
if "${REPO_ROOT}/scripts/annual-search-verify.sh" \
  --year "${YEAR}" \
  --out-root "${search_verify_dir}" \
  --base-url "${BASE_URL}" \
  --run-id "${RUN_ID}" >"${EVIDENCE_DIR}/annual-search-verify.log" 2>&1; then
  record_gate "annual_search_verify" "pass" "annual-search-verify.log" "annual search verification passed"
else
  record_gate "annual_search_verify" "fail" "annual-search-verify.log" "annual search verification failed"
fi

public_surface_args=("${PYTHON_BIN}" "${REPO_ROOT}/scripts/verify_public_surface.py")
for source_code in "${SOURCE_ARRAY[@]}"; do
  public_surface_args+=(--require-source "${source_code}")
done
if "${public_surface_args[@]}" >"${PUBLIC_SURFACE_LOG}" 2>&1; then
  record_gate "public_surface" "pass" "public-surface.log" "public API/frontend surface passed"
else
  record_gate "public_surface" "fail" "public-surface.log" "public surface verification failed"
fi

if "${REPO_ROOT}/scripts/verify_ops_automation.sh" >"${AUTOMATION_LOG}" 2>&1; then
  record_gate "automation_posture" "pass" "automation-posture.log" "ops automation posture passed"
else
  record_gate "automation_posture" "fail" "automation-posture.log" "ops automation posture failed"
fi

if curl -fsS "http://127.0.0.1:9090/api/v1/alerts" >"${EVIDENCE_DIR}/active-alerts.json"; then
  if "${PYTHON_BIN}" - "${EVIDENCE_DIR}/active-alerts.json" >"${EVIDENCE_DIR}/active-healtharchive-alerts.txt" <<'PY'; then
import json
import sys
from pathlib import Path

alerts = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")).get("data", {}).get("alerts", [])
healtharchive_alerts = [
    alert
    for alert in alerts
    if str(alert.get("labels", {}).get("alertname", "")).startswith("HealthArchive")
]
if not healtharchive_alerts:
    print("OK: no active HealthArchive alerts")
    sys.exit(0)
for alert in healtharchive_alerts:
    labels = alert.get("labels", {})
    print(
        alert.get("state", ""),
        labels.get("alertname", ""),
        labels.get("severity", ""),
        alert.get("activeAt", ""),
    )
sys.exit(1)
PY
    record_gate "active_healtharchive_alerts" "pass" "active-healtharchive-alerts.txt" "no active HealthArchive alerts"
  else
    record_gate "active_healtharchive_alerts" "fail" "active-healtharchive-alerts.txt" "active HealthArchive alerts found"
  fi
else
  record_gate "active_healtharchive_alerts" "fail" "active-alerts.json" "could not query Prometheus alerts"
fi

{
  printf 'scope\tdate\tsize_bytes\tpath_or_metric\n'
  if [[ -d /srv/healtharchive/backups ]]; then
    find /srv/healtharchive/backups -maxdepth 1 -type f -printf 'local_dump\t%TY-%Tm-%Td\t%s\t%p\n' | sort
  fi
  if [[ -d /srv/healtharchive/storagebox/backups/db ]]; then
    find /srv/healtharchive/storagebox/backups/db -maxdepth 1 -type f -printf 'storagebox_dump\t%TY-%Tm-%Td\t%s\t%p\n' | sort
  fi
  curl -fsS http://127.0.0.1:9100/metrics 2>/dev/null \
    | grep '^healtharchive_db_backup_' \
    | sed 's/^/metric\t\t\t/'
} >"${BACKUP_CHAIN_TSV}" || true
if grep -q '^metric.*healtharchive_db_backup_last_success 1' "${BACKUP_CHAIN_TSV}" \
  && grep -q '^local_dump' "${BACKUP_CHAIN_TSV}" \
  && grep -q '^storagebox_dump' "${BACKUP_CHAIN_TSV}"; then
  record_gate "backup_chain" "pass" "backup-chain.tsv" "local and Storage Box backup evidence present"
else
  record_gate "backup_chain" "fail" "backup-chain.tsv" "backup chain evidence incomplete or latest success missing"
fi

if curl -fsS http://127.0.0.1:9100/metrics \
  | grep -E '^healtharchive_docker_|^healtharchive_frontend_cache_|^node_textfile_scrape_error' \
  >"${DOCKER_CACHE_METRICS}"; then
  if grep -q '^node_textfile_scrape_error 0' "${DOCKER_CACHE_METRICS}"; then
    record_gate "docker_cache_metrics" "pass" "docker-cache-metrics.prom" "docker/cache metrics exported and readable"
  else
    record_gate "docker_cache_metrics" "fail" "docker-cache-metrics.prom" "node_exporter textfile scrape error is not zero"
  fi
else
  record_gate "docker_cache_metrics" "fail" "docker-cache-metrics.prom" "docker/cache metrics missing"
fi

if systemctl list-timers --all | grep 'healtharchive-' >"${TIMERS_TXT}"; then
  record_gate "timer_posture" "pass" "timers.txt" "healtharchive timers captured"
else
  record_gate "timer_posture" "fail" "timers.txt" "no healtharchive timers captured"
fi

if append_shell_section "disk headroom" "df -h /; df -h /srv/healtharchive/storagebox 2>/dev/null || true"; then
  record_gate "disk_headroom" "pass" "production-validation.log" "disk headroom captured"
else
  record_gate "disk_headroom" "fail" "production-validation.log" "disk headroom capture failed"
fi

cat >"${NASD_COMMAND_TXT}" <<'EOF'
find /volume1/automated-backup-ingest/service-backups/healtharchive/logical-dumps \
  -maxdepth 1 -type f -printf '%TY-%Tm-%Td %10s %p\n' | sort | tail -20
EOF

"${PYTHON_BIN}" - \
  "${SUMMARY_JSON}" \
  "${GATES_TSV}" \
  "${ANNUAL_STATUS_JSON}" \
  "${BACKUP_CHAIN_TSV}" \
  "${NASD_COMMAND_TXT}" \
  "${EVIDENCE_DIR}" \
  "${YEAR}" \
  "${RUN_ID}" \
  "$(IFS=,; echo "${SOURCE_ARRAY[*]}")" \
  "${REPO_ROOT}" <<'PY'
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

summary_path = Path(sys.argv[1])
gates_path = Path(sys.argv[2])
annual_status_path = Path(sys.argv[3])
backup_chain_path = Path(sys.argv[4])
nasd_command_path = Path(sys.argv[5])
evidence_dir = Path(sys.argv[6])
year = int(sys.argv[7])
run_id = sys.argv[8]
sources = [s for s in sys.argv[9].split(",") if s]
repo_root = Path(sys.argv[10])


def git_value(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo_root), *args],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


gates = []
for line in gates_path.read_text(encoding="utf-8").splitlines():
    parts = line.split("\t", 3)
    while len(parts) < 4:
        parts.append("")
    name, result, evidence, note = parts
    gates.append(
        {
            "name": name,
            "result": result,
            "evidence": evidence,
            "note": note,
        }
    )

annual_status = read_json(annual_status_path)
annual_sources = []
for source in annual_status.get("sources", []):
    if not isinstance(source, dict):
        continue
    job = source.get("job") if isinstance(source.get("job"), dict) else {}
    rescue = job.get("rescue") if isinstance(job.get("rescue"), dict) else {}
    annual_sources.append(
        {
            "source": source.get("sourceCode"),
            "expected_job_name": source.get("expectedJobName"),
            "job_id": job.get("jobId"),
            "job_name": job.get("jobName"),
            "status": source.get("status"),
            "indexed_pages": job.get("indexedPageCount"),
            "backend": rescue.get("effectiveBackend"),
            "rescue": rescue.get("status"),
            "operator_state": rescue.get("operatorState"),
            "is_search_ready": bool(source.get("isSearchReady")),
        }
    )

backup_rows = []
if backup_chain_path.exists():
    for line in backup_chain_path.read_text(encoding="utf-8", errors="replace").splitlines()[1:]:
        parts = line.split("\t")
        if len(parts) >= 4:
            backup_rows.append(
                {
                    "scope": parts[0],
                    "date": parts[1],
                    "size_bytes": parts[2],
                    "path_or_metric": "\t".join(parts[3:]),
                }
            )

files = {
    "annual_status": "annual-status.json",
    "production_validation": "production-validation.log",
    "public_surface": "public-surface.log",
    "automation_posture": "automation-posture.log",
    "backup_chain": "backup-chain.tsv",
    "docker_cache_metrics": "docker-cache-metrics.prom",
    "timers": "timers.txt",
    "nasd_followup_command": "nasd-followup-command.txt",
}

summary = {
    "schema_version": 1,
    "generated_at_utc": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "year": year,
    "run_id": run_id,
    "sources": sources,
    "evidence_dir": str(evidence_dir),
    "production_ref": git_value("rev-parse", "HEAD"),
    "production_ref_short": git_value("rev-parse", "--short=12", "HEAD"),
    "repo_status": git_value("status", "--short", "--branch"),
    "gates": gates,
    "required_gates_ok": all(gate["result"] == "pass" for gate in gates),
    "annual_summary": annual_status.get("summary", {}),
    "annual_sources": annual_sources,
    "backup_rows": backup_rows,
    "files": files,
    "nasd_followup_command": nasd_command_path.read_text(encoding="utf-8").strip(),
}
summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY

echo
echo "Evidence written: ${EVIDENCE_DIR}"
echo "Summary: ${SUMMARY_JSON}"
echo
echo "Run this NASD follow-up command on the NAS host and paste/store the output with closeout evidence:"
cat "${NASD_COMMAND_TXT}"

if [[ ${failures} -gt 0 ]]; then
  echo >&2
  echo "ERROR: annual closeout capture completed with ${failures} failed gate(s)." >&2
  exit 1
fi

echo
echo "OK: annual closeout evidence capture completed."
