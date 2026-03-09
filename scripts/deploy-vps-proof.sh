#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-}"
PORT="${PORT:-3200}"
HOST_BIND="${HOST_BIND:-127.0.0.1}"
CONTAINER_NAME="${CONTAINER_NAME:-healtharchive-frontend}"
TAG="${TAG:-healtharchive-frontend:$(date -u +%Y%m%d%H%M%S)}"

if [[ -z "${ENV_FILE}" ]]; then
  echo "usage: $(basename "$0") <env-file>" >&2
  exit 2
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "env file not found: ${ENV_FILE}" >&2
  exit 2
fi

docker build -t "${TAG}" .
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --env-file "${ENV_FILE}" \
  -p "${HOST_BIND}:${PORT}:3000" \
  "${TAG}"

echo "container=${CONTAINER_NAME}"
echo "image=${TAG}"
echo "health_url=http://${HOST_BIND}:${PORT}/archive"
