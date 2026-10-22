# Wesh Star IA GPU Engine

This is the self-hosted video-generation service used by Wesh Star IA. It runs
Wan2.1 T2V 1.3B locally on an NVIDIA GPU through Diffusers. The application
sends prompts to this service over the private Wesh Star IA worker API; it does
not call Replicate, Kling, Hailuo, Runway, or another hosted video API.

## Requirements

- Linux server with NVIDIA GPU + NVIDIA Container Toolkit
- Enough VRAM for the selected Wan model (the small 1.3B T2V model is the
  reference model; exact VRAM depends on resolution, frames and offloading)
- Disk space for the model cache and generated MP4 files

The model is downloaded from its public model repository when the worker is
first started. Inference itself runs locally on your GPU. The model used here
is `Wan-AI/Wan2.1-T2V-1.3B-Diffusers` and is Apache-2.0 licensed. See the
model's license before commercial deployment.

## Run

```bash
docker build -t wesh-ia-star-gpu-worker ./gpu-worker
docker run --gpus all --restart unless-stopped \
  -p 8001:8001 \
  -e WESH_GPU_WORKER_TOKEN='CHANGE_ME' \
  -e WESH_PUBLIC_BASE_URL='https://gpu.example.com' \
  -v wesh-model-cache:/models \
  -v wesh-video-output:/outputs \
  wesh-ia-star-gpu-worker
```

Then set in Wesh Star IA:

```env
SELF_HOSTED_VIDEO_URL=https://gpu.example.com
SELF_HOSTED_WORKER_TOKEN=CHANGE_ME
```

For multiple GPU workers, provide comma-separated URLs and run one worker per
GPU. Wesh Star IA deterministically records which worker owns each scene job.

The reference worker is intentionally optimized for short clips. Wesh Star IA's
existing Node worker assembles those clips into longer requested videos with
FFmpeg.

Image-to-video is also supported locally when `WESH_I2V_MODEL` is available. The default I2V model is `Wan-AI/Wan2.1-I2V-14B-480P-Diffusers`, which is much larger and requires substantially more GPU memory/disk than the 1.3B T2V model. If the GPU cannot load it, the job fails; it is never silently sent to an external provider.
