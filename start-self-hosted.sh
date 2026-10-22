#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Edit the secrets before production."
fi

required=(SESSION_SECRET WESH_GPU_WORKER_TOKEN WESH_STORAGE_SIGNING_SECRET CRON_SECRET)
for key in "${required[@]}"; do
  value="$(grep -E "^${key}=" .env | tail -1 | cut -d= -f2- || true)"
  if [[ -z "$value" || "$value" == change-me* || "$value" == replace-with* ]]; then
    echo "ERROR: set a strong value for ${key} in .env before starting Wesh Star IA."
    exit 1
  fi
done

docker compose -f docker-compose.self-hosted.yml up -d --build

echo
echo "Wesh Star IA local/self-hosted stack is starting."
echo "  docker compose -f docker-compose.self-hosted.yml ps"
echo "  docker compose -f docker-compose.self-hosted.yml logs -f gpu-worker"
echo
echo "Core generation/storage services are local: PostgreSQL + Ollama + GPU worker + local storage."
