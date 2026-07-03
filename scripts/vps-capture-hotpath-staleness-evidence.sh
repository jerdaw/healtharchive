#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
HealthArchive VPS helper: capture evidence bundle for hot-path staleness (Errno 107).

Safe-by-default: read-only diagnostics only.

Writes a timestamped bundle directory under:
  /srv/healtharchive/ops/observability/archive-cache-staleness/
and falls back to /tmp if that path is not writable.

Usage (on the VPS):
  cd /opt/healtharchive
  ./scripts/vps-capture-hotpath-staleness-evidence.sh

Options:
  --out-root DIR        Base output directory (default: /srv/healtharchive/ops/observability/archive-cache-staleness)
  --since-minutes N     Journal window to capture (default: 240)
  --tag TAG             Optional short label for the bundle (default: "manual")
  --year YEAR           Campaign year for `vps-crawl-status.sh` capture (default: current UTC year)

Notes:
  - This script does not source /etc/healtharchive/backend.env and does not print secrets.
  - Prefer running it before making state-changing recovery actions.
EOF
}

OUT_ROOT="/srv/healtharchive/ops/observability/archive-cache-staleness"
SINCE_MINUTES="240"
TAG="manual"
YEAR="$(date -u +%Y)"
COLD_ARCHIVE_ROOT="${HEALTHARCHIVE_COLD_ARCHIVE_ROOT:-/srv/healtharchive/cold-archive}"
COLD_ARCHIVE_UNIT="${HEALTHARCHIVE_COLD_ARCHIVE_UNIT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --out-root)
      OUT_ROOT="${2:-}"
      shift 2
      ;;
    --since-minutes)
      SINCE_MINUTES="${2:-}"
      shift 2
      ;;
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --year)
      YEAR="${2:-}"
      shift 2
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! [[ "${YEAR}" =~ ^[0-9]{4}$ ]]; then
  echo "ERROR: --year must be a 4-digit year (got: ${YEAR})" >&2
  exit 2
fi

if ! [[ "${SINCE_MINUTES}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: --since-minutes must be an integer (got: ${SINCE_MINUTES})" >&2
  exit 2
fi

umask 0007

ts="$(date -u +%Y%m%dT%H%M%SZ)"
bundle_base="hotpath-staleness-${ts}-${TAG}"

out_dir=""
if mkdir -p "${OUT_ROOT}" 2>/dev/null; then
  out_dir="${OUT_ROOT%/}/${bundle_base}"
  mkdir -p "${out_dir}" 2>/dev/null || out_dir=""
fi

if [[ -z "${out_dir}" ]]; then
  OUT_ROOT="/tmp/healtharchive-archive-cache-staleness"
  mkdir -p "${OUT_ROOT}"
  out_dir="${OUT_ROOT%/}/${bundle_base}"
  mkdir -p "${out_dir}"
fi

echo "OK: writing evidence bundle to: ${out_dir}"

run_to_file() {
  local name="$1"
  shift
  local path="${out_dir}/${name}"
  {
    echo "\$ $*"
    "$@"
  } >"${path}" 2>&1 || {
    local rc=$?
    {
      echo ""
      echo "EXIT_CODE=${rc}"
    } >>"${path}"
    return 0
  }
}

run_shell_to_file() {
  local name="$1"
  shift
  local path="${out_dir}/${name}"
  {
    echo "\$ $*"
    bash -lc "$*"
  } >"${path}" 2>&1 || {
    local rc=$?
    {
      echo ""
      echo "EXIT_CODE=${rc}"
    } >>"${path}"
    return 0
  }
}

meta="${out_dir}/meta.txt"
{
  echo "generated_at_utc=${ts}"
  echo "hostname=$(hostname || true)"
  echo "whoami=$(whoami || true)"
  echo "cwd=$(pwd || true)"
  echo "uname=$(uname -a || true)"
  echo "uptime=$(uptime || true)"
} >"${meta}"

# Repo state (non-secret)
run_shell_to_file "repo.txt" \
  "cd /opt/healtharchive && echo sha=\$(git rev-parse --short HEAD) && git status --porcelain=v1 || true"

# Crawl status snapshot (non-secret; helps correlate staleness with live jobs)
run_shell_to_file "vps-crawl-status.txt" \
  "cd /opt/healtharchive && ./scripts/vps-crawl-status.sh --year ${YEAR} || true"

# systemd state
run_to_file "systemctl-status.txt" systemctl status --no-pager -l \
  healtharchive-warc-tiering.service \
  healtharchive-archive-cache-auto-recover.timer \
  healtharchive-archive-cache-auto-recover.service \
  healtharchive-tiering-metrics.timer \
  healtharchive-tiering-metrics.service \
  healtharchive-worker.service \
  healtharchive-api.service || true

if [[ -n "${COLD_ARCHIVE_UNIT}" ]]; then
  run_to_file "systemctl-show-cold-archive.txt" systemctl show "${COLD_ARCHIVE_UNIT}"
  run_to_file "systemctl-cat-cold-archive.txt" systemctl cat "${COLD_ARCHIVE_UNIT}" || true
else
  printf 'cold_archive_unit_configured=false\n' >"${out_dir}/systemctl-show-cold-archive.txt"
  printf 'cold_archive_unit_configured=false\n' >"${out_dir}/systemctl-cat-cold-archive.txt"
fi
run_to_file "systemctl-cat-tiering.txt" systemctl cat healtharchive-warc-tiering.service || true

# Journals (prefer sudo; fallback if not permitted)
since_arg="--since=-${SINCE_MINUTES}min"
if [[ -n "${COLD_ARCHIVE_UNIT}" ]]; then
  run_shell_to_file "journal-cold-archive.txt" "sudo journalctl -u '${COLD_ARCHIVE_UNIT}' ${since_arg} -o short-iso --no-pager -n 500 || journalctl -u '${COLD_ARCHIVE_UNIT}' ${since_arg} -o short-iso --no-pager -n 500 || true"
else
  printf 'cold_archive_unit_configured=false\n' >"${out_dir}/journal-cold-archive.txt"
fi
run_shell_to_file "journal-tiering.txt" "sudo journalctl -u healtharchive-warc-tiering.service ${since_arg} -o short-iso --no-pager -n 500 || journalctl -u healtharchive-warc-tiering.service ${since_arg} -o short-iso --no-pager -n 500 || true"
run_shell_to_file "journal-archive-cache-watchdog.txt" "sudo journalctl -u healtharchive-archive-cache-auto-recover.service ${since_arg} -o short-iso --no-pager -n 800 || journalctl -u healtharchive-archive-cache-auto-recover.service ${since_arg} -o short-iso --no-pager -n 800 || true"
run_shell_to_file "journal-worker.txt" "sudo journalctl -u healtharchive-worker.service ${since_arg} -o short-iso --no-pager -n 800 || journalctl -u healtharchive-worker.service ${since_arg} -o short-iso --no-pager -n 800 || true"

# Kernel messages can include clues about FUSE/transport resets.
run_shell_to_file "dmesg-tail.txt" "sudo dmesg -T | tail -n 250 || true"

# Mounts & filesystem state
run_to_file "mount.txt" mount
run_to_file "findmnt-cold-archive.txt" findmnt -T "${COLD_ARCHIVE_ROOT}" -o SOURCE,TARGET,FSTYPE
run_to_file "df.txt" df -hT

# Capture known state/metrics artifacts (best-effort)
run_shell_to_file "watchdog-state.json" "cat /srv/healtharchive/ops/watchdog/archive-cache-auto-recover.json 2>/dev/null || true"
run_shell_to_file "watchdog-metrics.prom" "cat /var/lib/node_exporter/textfile_collector/healtharchive_archive_cache_auto_recover.prom 2>/dev/null || true"
run_shell_to_file "tiering-binds.txt" "cat /etc/healtharchive/warc-tiering.binds 2>/dev/null || true"

# Probe readability of key paths with timeouts (avoid hanging on stale FUSE).
probe="${out_dir}/path-probes.txt"
{
  echo "NOTE: read probes use short timeouts to avoid hanging on stale mounts."
  echo ""
  for p in \
    "${COLD_ARCHIVE_ROOT}" \
    /srv/healtharchive/jobs \
    /srv/healtharchive/jobs/imports \
    /srv/healtharchive/ops/watchdog \
    /var/lib/node_exporter/textfile_collector \
  ; do
    echo "\$ timeout 5 ls -ld ${p}"
    timeout 5 ls -ld "${p}" || echo "EXIT_CODE=$?"
    echo ""
    echo "\$ timeout 5 ls -la ${p} | head -n 50"
    timeout 5 ls -la "${p}" | head -n 50 || echo "EXIT_CODE=$?"
    echo ""
  done
} >"${probe}" 2>&1 || true

# Probe any hot paths listed in the tiering manifest (2nd column).
hot_probe="${out_dir}/tiering-hotpath-probes.txt"
{
  echo "NOTE: hot path probes are derived from /etc/healtharchive/warc-tiering.binds (2nd column)."
  echo ""
  if [[ -f /etc/healtharchive/warc-tiering.binds ]]; then
    while read -r cold hot _rest; do
      [[ -z "${cold}" ]] && continue
      [[ "${cold}" == \#* ]] && continue
      [[ -z "${hot:-}" ]] && continue
      echo "\$ timeout 5 findmnt -T ${hot} -o SOURCE,TARGET,FSTYPE,OPTIONS -n"
      timeout 5 findmnt -T "${hot}" -o SOURCE,TARGET,FSTYPE,OPTIONS -n || echo "EXIT_CODE=$?"
      echo "\$ timeout 5 ls -ld ${hot}"
      timeout 5 ls -ld "${hot}" || echo "EXIT_CODE=$?"
      echo ""
    done </etc/healtharchive/warc-tiering.binds
  else
    echo "No /etc/healtharchive/warc-tiering.binds found."
  fi
} >"${hot_probe}" 2>&1 || true

# Lightweight network context (no secrets)
run_to_file "ip-addr.txt" ip addr
run_to_file "ip-route.txt" ip route
run_to_file "ss-summary.txt" ss -s

# If a user-space cold archive mount process is present, capture bounded process context.
run_shell_to_file "ps-cold-archive-mounts.txt" "ps auxww | rg -n 'sshfs|rclone|mount\\.cifs|mount\\.nfs' || true"

echo "OK: evidence bundle complete: ${out_dir}"
