#!/usr/bin/env bash
set -euo pipefail

# Emit a small set of HealthArchive tiering health metrics via the node_exporter
# textfile collector. Intended to be run via systemd timer as root.

OUT_DIR="/var/lib/node_exporter/textfile_collector"
OUT_FILE="${OUT_DIR}/healtharchive_tiering.prom"
COLD_ARCHIVE_ROOT="${HEALTHARCHIVE_COLD_ARCHIVE_ROOT:-/srv/healtharchive/cold-archive}"
COLD_ARCHIVE_UNIT="${HEALTHARCHIVE_COLD_ARCHIVE_UNIT:-}"

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

is_mounted() {
  local path="$1"
  if have_cmd mountpoint; then
    mountpoint -q "${path}"
    return $?
  fi
  mount | grep -q " on ${path} " 2>/dev/null
}

unit_ok() {
  local unit="$1"
  if ! systemctl cat "${unit}" >/dev/null 2>&1; then
    echo 0
    return 0
  fi
  local active failed
  active="$(systemctl is-active "${unit}" 2>/dev/null || true)"
  failed="$(systemctl is-failed "${unit}" 2>/dev/null || true)"
  if [[ "${active}" == "active" && "${failed}" != "failed" ]]; then
    echo 1
    return 0
  fi
  echo 0
}

unit_failed() {
  local unit="$1"
  if ! systemctl cat "${unit}" >/dev/null 2>&1; then
    echo 0
    return 0
  fi
  local failed
  failed="$(systemctl is-failed "${unit}" 2>/dev/null || true)"
  [[ "${failed}" == "failed" ]] && echo 1 || echo 0
}

cold_archive_ok=0
if is_mounted "${COLD_ARCHIVE_ROOT}"; then
  # Ensure the root is readable (catches stale mount or permission issues).
  if ls -la "${COLD_ARCHIVE_ROOT}" >/dev/null 2>&1; then
    cold_archive_ok=1
  fi
fi

cold_archive_unit_lines=""
if [[ -n "${COLD_ARCHIVE_UNIT}" ]]; then
  cold_archive_unit_ok="$(unit_ok "${COLD_ARCHIVE_UNIT}")"
  cold_archive_unit_lines="healtharchive_systemd_unit_ok{unit=\"${COLD_ARCHIVE_UNIT}\"} ${cold_archive_unit_ok}"
fi
tiering_service_ok="$(unit_ok healtharchive-warc-tiering.service)"
tiering_service_failed="$(unit_failed healtharchive-warc-tiering.service)"

mkdir -p "${OUT_DIR}"
tmp="$(mktemp "${OUT_FILE}.XXXXXX")"
cat >"${tmp}" <<EOF
# HELP healtharchive_cold_archive_root_ok 1 if the cold archive root is mounted and readable.
# TYPE healtharchive_cold_archive_root_ok gauge
healtharchive_cold_archive_root_ok ${cold_archive_ok}

# HELP healtharchive_systemd_unit_ok 1 if the unit exists and is not failed (and active when applicable).
# TYPE healtharchive_systemd_unit_ok gauge
${cold_archive_unit_lines}
healtharchive_systemd_unit_ok{unit="healtharchive-warc-tiering.service"} ${tiering_service_ok}

# HELP healtharchive_systemd_unit_failed 1 if systemd reports the unit is failed.
# TYPE healtharchive_systemd_unit_failed gauge
healtharchive_systemd_unit_failed{unit="healtharchive-warc-tiering.service"} ${tiering_service_failed}

# HELP healtharchive_tiering_metrics_timestamp_seconds UNIX timestamp when these metrics were generated.
# TYPE healtharchive_tiering_metrics_timestamp_seconds gauge
healtharchive_tiering_metrics_timestamp_seconds $(date +%s)
EOF

chmod 0644 "${tmp}"
mv "${tmp}" "${OUT_FILE}"
