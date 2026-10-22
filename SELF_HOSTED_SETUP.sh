#!/usr/bin/env bash
set -euo pipefail

# Wesh Star IA — self-hosted GPU setup helper (Ubuntu 22.04/24.04)
# This script prepares Docker + NVIDIA Container Toolkit and starts the
# complete self-hosted stack. It does NOT create third-party accounts or
# invent API credentials.

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash SELF_HOSTED_SETUP.sh"
  exit 1
fi

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "NVIDIA driver is not installed. Install a compatible NVIDIA driver first."
  exit 2
fi

apt-get update
apt-get install -y ca-certificates curl gnupg docker.io docker-compose-plugin
systemctl enable --now docker

if ! command -v nvidia-ctk >/dev/null 2>&1; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update
  apt-get install -y nvidia-container-toolkit
fi

nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

echo "Detected physical NVIDIA GPU(s):"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
echo "Testing NVIDIA access from Docker..."
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi

echo
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Edit it before production launch."
fi

echo "This setup is for the physical NVIDIA GPU installed in this server; no cloud GPU is provisioned."
echo "Next: set WESH_GPU_WORKER_TOKEN, SELF_HOSTED_PUBLIC_BASE_URL and other required values in .env."
echo "Then run: docker compose -f docker-compose.self-hosted.yml up -d --build"
