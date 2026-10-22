#!/usr/bin/env bash
set -euo pipefail

echo "=== Wesh Star IA: physical NVIDIA GPU verification ==="
if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "ERROR: nvidia-smi is unavailable. Install the NVIDIA driver on this physical server."
  exit 10
fi
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed. Run SELF_HOSTED_SETUP.sh first."
  exit 11
fi

echo "Testing physical GPU passthrough into Docker..."
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

echo "OK: Wesh Star IA can access a physical NVIDIA GPU on this server."
