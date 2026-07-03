#!/usr/bin/env bash
set -euo pipefail

# Read-only diagnostics for WARC tiering + cold archive mounts.
#
# This script is safe to run while crawls are ongoing: it does not restart
# services or modify mounts. It prints a compact report for copy/paste.

MANIFEST="/etc/healtharchive/warc-tiering.binds"
COLD_ARCHIVE_ROOT="${HEALTHARCHIVE_COLD_ARCHIVE_ROOT:-/srv/healtharchive/cold-archive}"
UNIT_TIERING="healtharchive-warc-tiering.service"
COLD_ARCHIVE_UNIT="${HEALTHARCHIVE_COLD_ARCHIVE_UNIT:-}"

usage() {
  cat <<'EOF'
HealthArchive VPS helper: diagnose WARC tiering failures (read-only)

Usage:
  ./scripts/vps-diagnose-warc-tiering.sh [--manifest FILE] [--cold-archive-root DIR] [--cold-archive-unit UNIT]

Defaults:
  --manifest          /etc/healtharchive/warc-tiering.binds
  --cold-archive-root /srv/healtharchive/cold-archive
  --cold-archive-unit optional; defaults to HEALTHARCHIVE_COLD_ARCHIVE_UNIT

Notes:
  - Safe: does not restart services, does not change mounts.
  - If you need to apply/repair binds, use:
      sudo ./scripts/vps-warc-tiering-bind-mounts.sh --apply --repair-stale-mounts
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --manifest) MANIFEST="${2:-}"; shift 2 ;;
    --cold-archive-root) COLD_ARCHIVE_ROOT="${2:-}"; shift 2 ;;
    --cold-archive-unit) COLD_ARCHIVE_UNIT="${2:-}"; shift 2 ;;
    *)
      echo "ERROR: Unknown arg: $1" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

have_cmd() { command -v "$1" >/dev/null 2>&1; }

echo "HealthArchive – WARC Tiering Diagnostics"
echo "----------------------------------------"
date -u +"UTC now: %Y-%m-%dT%H:%M:%SZ"
echo "manifest=${MANIFEST}"
echo "cold_archive_root=${COLD_ARCHIVE_ROOT}"
echo "cold_archive_unit=${COLD_ARCHIVE_UNIT:-}"
echo ""

echo "Systemd:"
units=("${UNIT_TIERING}")
if [[ -n "${COLD_ARCHIVE_UNIT}" ]]; then
  units=("${COLD_ARCHIVE_UNIT}" "${UNIT_TIERING}")
fi
for u in "${units[@]}"; do
  if systemctl cat "${u}" >/dev/null 2>&1; then
    echo "  unit=${u} active=$(systemctl is-active "${u}" 2>/dev/null || true) failed=$(systemctl is-failed "${u}" 2>/dev/null || true) enabled=$(systemctl is-enabled "${u}" 2>/dev/null || true)"
  else
    echo "  unit=${u} (missing)"
  fi
done
echo ""

echo "Tiering unit status (if present):"
systemctl status --no-pager -l "${UNIT_TIERING}" 2>/dev/null || true
echo ""

echo "Tiering unit journal (last 200 lines):"
journalctl -u "${UNIT_TIERING}" -n 200 --no-pager 2>/dev/null || true
echo ""

echo "Cold archive root:"
if have_cmd mountpoint; then
  if mountpoint -q "${COLD_ARCHIVE_ROOT}" 2>/dev/null; then
    echo "  mounted=1 (mountpoint)"
  else
    echo "  mounted=0 (mountpoint)"
  fi
else
  echo "  mountpoint(1) not found; using mount(8) output"
  if mount | rg -n " on ${COLD_ARCHIVE_ROOT} " >/dev/null 2>&1; then
    echo "  mounted=1 (mount)"
  else
    echo "  mounted=0 (mount)"
  fi
fi
mount | rg -n " on ${COLD_ARCHIVE_ROOT} " || true
echo ""

echo "Cold archive readability probe:"
ls -la "${COLD_ARCHIVE_ROOT}" 2>&1 | sed -n '1,20p' || true
echo ""

echo "Tiering manifest:"
ls -la "${MANIFEST}" 2>/dev/null || true
if [[ -f "${MANIFEST}" ]]; then
  echo "---"
  sed -n '1,80p' "${MANIFEST}" || true
  echo "---"
else
  echo "  (missing)"
fi
echo ""

echo "Hot-path probes from manifest (first 50 entries):"
if [[ -f "${MANIFEST}" ]]; then
  n=0
  while IFS= read -r raw || [[ -n "${raw}" ]]; do
    line="$(echo "${raw}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ -z "${line}" ]] && continue
    [[ "${line}" == \#* ]] && continue
    cold="$(echo "${line}" | awk '{print $1}')"
    hot="$(echo "${line}" | awk '{print $2}')"
    [[ -z "${cold}" || -z "${hot}" ]] && continue
    n=$((n + 1))
    if [[ "${n}" -gt 50 ]]; then
      echo "  (truncated at 50 entries)"
      break
    fi
    echo "  entry=${n}"
    echo "    cold=${cold}"
    echo "    hot=${hot}"
    (ls -ld "${cold}" 2>&1 | sed 's/^/    cold_ls: /') || true
    (ls -ld "${hot}" 2>&1 | sed 's/^/    hot_ls: /') || true
    (mount | rg -n " on ${hot} " | sed 's/^/    hot_mount: /') || true
  done <"${MANIFEST}"
fi
echo ""

echo "Next actions:"
cat <<EOF
  - If ${UNIT_TIERING} is failed: sudo systemctl reset-failed ${UNIT_TIERING} && sudo systemctl start ${UNIT_TIERING}
  - If the cold archive root is unmounted/unreadable: restart or repair the configured cold archive mount unit
  - Manual repair/apply (will modify mounts; do this during a safe window):
      sudo /opt/healtharchive/scripts/vps-warc-tiering-bind-mounts.sh --apply --repair-stale-mounts --cold-archive-root ${COLD_ARCHIVE_ROOT}
EOF
