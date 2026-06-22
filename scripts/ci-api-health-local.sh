#!/usr/bin/env bash
set -euo pipefail

HEALTHARCHIVE_DATABASE_URL="${HEALTHARCHIVE_DATABASE_URL:-sqlite:///./ci-api-health.db}"
HEALTHARCHIVE_ARCHIVE_ROOT="${HEALTHARCHIVE_ARCHIVE_ROOT:-/tmp/healtharchive-api-health}"
export HEALTHARCHIVE_DATABASE_URL
export HEALTHARCHIVE_ARCHIVE_ROOT

mkdir -p "${HEALTHARCHIVE_ARCHIVE_ROOT}"
mkdir -p .tmp/ci-api-health-local

PYTHON_BIN="${PYTHON_BIN:-python}"
API_HOST="${API_HOST:-127.0.0.1}"

pick_free_port() {
  "${PYTHON_BIN}" - <<'PY'
import socket

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
}

API_PORT="${API_PORT:-$(pick_free_port)}"
API_BASE="http://${API_HOST}:${API_PORT}"
BACKEND_LOG=".tmp/ci-api-health-local/backend.log"

alembic upgrade head
healtharchive seed-sources

"${PYTHON_BIN}" -m uvicorn ha_backend.api:app \
  --host "${API_HOST}" \
  --port "${API_PORT}" \
  --log-level warning >"${BACKEND_LOG}" 2>&1 &
UVICORN_PID=$!
trap 'kill "${UVICORN_PID}" >/dev/null 2>&1 || true' EXIT

for i in {1..30}; do
  if curl -fsS "${API_BASE}/api/health" > /dev/null 2>&1; then
    break
  fi
  if [ "${i}" -eq 30 ]; then
    echo "Backend server failed to start"
    tail -n 200 "${BACKEND_LOG}" >&2 || true
    exit 1
  fi
  sleep 1
done

python scripts/verify_public_surface.py \
  --api-base "${API_BASE}" \
  --timeout-seconds 10 \
  --raw-timeout-seconds 10 \
  --skip-frontend \
  --allow-empty-index \
  --allow-usage-disabled \
  --allow-exports-disabled \
  --allow-change-tracking-disabled
