#!/usr/bin/env bash
set -euo pipefail

# Wesh Star IA — start on the physical NVIDIA GPU installed in this server.
# No cloud GPU is provisioned by this script.

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "ERROR: no usable NVIDIA driver/GPU detected on this physical server."
  exit 1
fi

docker info >/dev/null 2>&1 || { echo "ERROR: Docker is not running."; exit 2; }

./VERIFY_PHYSICAL_GPU.sh

echo "Starting Wesh Star IA on the local physical NVIDIA GPU..."
docker compose -f docker-compose.self-hosted.yml up -d --build

echo "Wesh Star IA is starting. GPU worker health: http://localhost:8001/health"
