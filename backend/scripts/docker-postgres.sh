#!/usr/bin/env bash
# backend 폴더 기준으로 docker-compose.postgres.yml 실행
# Compose V2: docker compose … / V1: docker-compose … 자동 선택

set -euo pipefail

BACKEND_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${BACKEND_ROOT}/docker-compose.postgres.yml"
cd "${BACKEND_ROOT}"

run_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${COMPOSE_FILE}" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${COMPOSE_FILE}" "$@"
  else
    echo "오류: 'docker compose' 또는 'docker-compose' 를 찾을 수 없습니다." >&2
    echo "  - Docker Desktop을 설치·실행한 뒤, 설정에서 Compose V2 사용을 켜 보세요." >&2
    echo "  - 또는 brew install docker-compose 로 V1 바이너리를 설치할 수 있습니다." >&2
    exit 1
  fi
}

run_compose "$@"
