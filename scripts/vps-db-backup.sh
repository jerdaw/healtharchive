#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
HealthArchive VPS helper: create a PostgreSQL dump without filling root.

Default behavior:
  - uses /srv/healtharchive/backups as a short local staging/cache directory
  - requires the Storage Box mirror at /srv/healtharchive/storagebox/backups/db
  - copies successful dumps to the mirror with rsync flags compatible with sshfs
  - prunes zero-byte local dumps and old local cache files

Environment:
  HEALTHARCHIVE_DATABASE_URL                 required via /etc/healtharchive/backend.env
  HEALTHARCHIVE_BACKUP_LOCAL_DIR             default: /srv/healtharchive/backups
  HEALTHARCHIVE_BACKUP_MIRROR_DIR            default: /srv/healtharchive/storagebox/backups/db
  HEALTHARCHIVE_BACKUP_REQUIRE_MIRROR        default: 1
  HEALTHARCHIVE_BACKUP_LOCAL_KEEP_SUCCESSFUL default: 2
  HEALTHARCHIVE_BACKUP_MIRROR_RETENTION_DAYS default: 30
  HEALTHARCHIVE_BACKUP_MIN_ROOT_FREE_MB      default: 8192

Usage:
  vps-db-backup.sh [--dry-run]
EOF
}

DRY_RUN="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
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

BACKEND_ENV="${BACKEND_ENV:-/etc/healtharchive/backend.env}"
if [[ -f "${BACKEND_ENV}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${BACKEND_ENV}"
  set +a
fi

if [[ -z "${HEALTHARCHIVE_DATABASE_URL:-}" ]]; then
  echo "ERROR: HEALTHARCHIVE_DATABASE_URL is not set." >&2
  exit 1
fi
PG_DUMP_DATABASE_URL="${HEALTHARCHIVE_DATABASE_URL}"
case "${PG_DUMP_DATABASE_URL}" in
  postgresql+psycopg://*)
    PG_DUMP_DATABASE_URL="postgresql://${PG_DUMP_DATABASE_URL#postgresql+psycopg://}"
    ;;
  postgresql+psycopg2://*)
    PG_DUMP_DATABASE_URL="postgresql://${PG_DUMP_DATABASE_URL#postgresql+psycopg2://}"
    ;;
esac

LOCAL_DIR="${HEALTHARCHIVE_BACKUP_LOCAL_DIR:-/srv/healtharchive/backups}"
MIRROR_DIR="${HEALTHARCHIVE_BACKUP_MIRROR_DIR:-/srv/healtharchive/storagebox/backups/db}"
MIRROR_ROOT="${HEALTHARCHIVE_BACKUP_MIRROR_ROOT:-/srv/healtharchive/storagebox}"
REQUIRE_MIRROR="${HEALTHARCHIVE_BACKUP_REQUIRE_MIRROR:-1}"
LOCAL_KEEP_SUCCESSFUL="${HEALTHARCHIVE_BACKUP_LOCAL_KEEP_SUCCESSFUL:-2}"
MIRROR_RETENTION_DAYS="${HEALTHARCHIVE_BACKUP_MIRROR_RETENTION_DAYS:-30}"
MIN_ROOT_FREE_MB="${HEALTHARCHIVE_BACKUP_MIN_ROOT_FREE_MB:-8192}"

log() {
  printf '%s\n' "$*"
}

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    printf '+'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

root_free_mb() {
  df -Pm / | awk 'NR == 2 {print $4}'
}

prune_zero_byte_local_dumps() {
  run find "${LOCAL_DIR}" -maxdepth 1 -type f -name 'healtharchive_*.dump' -size 0 -delete
}

prune_local_cache() {
  local keep
  keep="${LOCAL_KEEP_SUCCESSFUL}"
  if ! [[ "${keep}" =~ ^[0-9]+$ ]]; then
    echo "ERROR: HEALTHARCHIVE_BACKUP_LOCAL_KEEP_SUCCESSFUL must be an integer." >&2
    exit 1
  fi
  if [[ "${keep}" -lt 1 ]]; then
    keep=1
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    log "+ prune local backup cache to newest ${keep} non-empty dump(s)"
    return 0
  fi

  find "${LOCAL_DIR}" -maxdepth 1 -type f -name 'healtharchive_*.dump' -size +0c \
    -printf '%T@ %p\n' \
    | sort -rn \
    | awk -v keep="${keep}" 'NR > keep {sub(/^[^ ]+ /, ""); print}' \
    | while IFS= read -r old_dump; do
        rm -f -- "${old_dump}"
      done
}

prune_mirror_retention() {
  local days
  days="${MIRROR_RETENTION_DAYS}"
  if ! [[ "${days}" =~ ^[0-9]+$ ]]; then
    echo "ERROR: HEALTHARCHIVE_BACKUP_MIRROR_RETENTION_DAYS must be an integer." >&2
    exit 1
  fi
  if [[ "${days}" -lt 1 ]]; then
    log "Skipping mirror retention prune because retention days < 1."
    return 0
  fi
  run find "${MIRROR_DIR}" -maxdepth 1 -type f -name 'healtharchive_*.dump' \
    -mtime "+${days}" -delete
}

write_metrics() {
  local status="$1"
  local local_bytes mirror_bytes now metrics_dir metrics_path tmp_path latest_mtime
  metrics_dir="${NODE_EXPORTER_TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
  metrics_path="${metrics_dir}/healtharchive_db_backup.prom"
  tmp_path="${metrics_path}.$$"
  now="$(date +%s)"

  if [[ "${DRY_RUN}" == "true" ]]; then
    log "+ write backup metrics to ${metrics_path}"
    return 0
  fi

  local_bytes="$(du -sb "${LOCAL_DIR}" 2>/dev/null | awk '{print $1}' || printf '0')"
  mirror_bytes="$(du -sb "${MIRROR_DIR}" 2>/dev/null | awk '{print $1}' || printf '0')"
  latest_mtime="$(find "${LOCAL_DIR}" "${MIRROR_DIR}" -maxdepth 1 -type f -name 'healtharchive_*.dump' -size +0c -printf '%T@\n' 2>/dev/null | sort -nr | head -n 1 | cut -d. -f1)"
  latest_mtime="${latest_mtime:-0}"

  mkdir -p "${metrics_dir}"
  {
    echo "# HELP healtharchive_db_backup_last_success 1 if the latest backup run succeeded."
    echo "# TYPE healtharchive_db_backup_last_success gauge"
    if [[ "${status}" == "success" ]]; then
      echo "healtharchive_db_backup_last_success 1"
    else
      echo "healtharchive_db_backup_last_success 0"
    fi
    echo "# HELP healtharchive_db_backup_last_run_timestamp_seconds Last backup run timestamp."
    echo "# TYPE healtharchive_db_backup_last_run_timestamp_seconds gauge"
    echo "healtharchive_db_backup_last_run_timestamp_seconds ${now}"
    echo "# HELP healtharchive_db_backup_latest_dump_mtime_seconds Newest non-empty dump mtime."
    echo "# TYPE healtharchive_db_backup_latest_dump_mtime_seconds gauge"
    echo "healtharchive_db_backup_latest_dump_mtime_seconds ${latest_mtime}"
    echo "# HELP healtharchive_db_backup_local_bytes Bytes used by the local backup cache."
    echo "# TYPE healtharchive_db_backup_local_bytes gauge"
    echo "healtharchive_db_backup_local_bytes ${local_bytes}"
    echo "# HELP healtharchive_db_backup_mirror_bytes Bytes used by the backup mirror."
    echo "# TYPE healtharchive_db_backup_mirror_bytes gauge"
    echo "healtharchive_db_backup_mirror_bytes ${mirror_bytes}"
  } >"${tmp_path}"
  mv "${tmp_path}" "${metrics_path}"
}

fail() {
  echo "ERROR: $*" >&2
  write_metrics failure || true
  exit 1
}

run install -d -m 2770 -o root -g healtharchive "${LOCAL_DIR}"
run install -d -m 2770 -o root -g healtharchive "${LOCAL_DIR}/.tmp"

if [[ "${REQUIRE_MIRROR}" == "1" ]]; then
  if ! mountpoint -q "${MIRROR_ROOT}"; then
    fail "Required backup mirror root is not mounted: ${MIRROR_ROOT}"
  fi
fi
if [[ "${DRY_RUN}" == "true" ]]; then
  log "+ mkdir -p ${MIRROR_DIR}"
else
  mkdir -p "${MIRROR_DIR}"
  chmod 2770 "${MIRROR_DIR}" 2>/dev/null || true
  chgrp healtharchive "${MIRROR_DIR}" 2>/dev/null || true
fi

prune_zero_byte_local_dumps
prune_local_cache

free_mb="$(root_free_mb)"
if [[ "${free_mb}" -lt "${MIN_ROOT_FREE_MB}" ]]; then
  fail "Root free space is ${free_mb}MiB, below required ${MIN_ROOT_FREE_MB}MiB; refusing to create another local dump."
fi

ts="$(date -u +%Y-%m-%dT%H%M%SZ)"
tmp_dump="${LOCAL_DIR}/.tmp/healtharchive_${ts}.dump.incomplete"
final_dump="${LOCAL_DIR}/healtharchive_${ts}.dump"

log "Creating PostgreSQL dump: ${final_dump}"
if [[ "${DRY_RUN}" == "true" ]]; then
  log "+ pg_dump -Fc HEALTHARCHIVE_DATABASE_URL > ${tmp_dump}"
else
  pg_dump -Fc "${PG_DUMP_DATABASE_URL}" >"${tmp_dump}" || {
    rm -f -- "${tmp_dump}"
    fail "pg_dump failed."
  }
  if [[ ! -s "${tmp_dump}" ]]; then
    rm -f -- "${tmp_dump}"
    fail "pg_dump produced an empty file."
  fi
  mv "${tmp_dump}" "${final_dump}"
  chmod 0640 "${final_dump}" || true
  chgrp healtharchive "${final_dump}" || true
fi

if [[ -d "${MIRROR_DIR}" ]]; then
  log "Mirroring dump to ${MIRROR_DIR}"
  run rsync -rt --size-only --partial --inplace "${final_dump}" "${MIRROR_DIR}/" || {
    fail "Failed to mirror dump to ${MIRROR_DIR}."
  }
  prune_mirror_retention
elif [[ "${REQUIRE_MIRROR}" == "1" ]]; then
  fail "Required backup mirror dir is unavailable: ${MIRROR_DIR}"
fi

prune_zero_byte_local_dumps
prune_local_cache
write_metrics success

log "OK: backup complete."
