# Wesh IA Star self-hosted GPU inference worker.
# Requires an NVIDIA GPU and the NVIDIA Container Toolkit.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/.cache

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install torch --index-url https://download.pytorch.org/whl/cu124 && \
    python3 -m pip install -r requirements.txt

COPY *.py ./
EXPOSE 8001
CMD ["python3", "server.py"]
