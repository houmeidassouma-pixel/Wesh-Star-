# Wesh Star IA — Physical GPU Only

This deployment profile is designed for a **physical server owned or controlled by the operator**.

## What it does
- Uses the NVIDIA GPU physically installed in this server through the NVIDIA Container Toolkit.
- Runs the Wesh Star IA GPU worker locally with Docker GPU passthrough (`gpus: all`).
- Keeps model cache and generated video volumes on this server.
- Does **not** provision, rent, or call a GPU cloud/hosted video-generation provider.
- The video worker has no Replicate/Runway/Kling/Hailuo fallback.

## What is still external
The physical GPU does not eliminate the Internet. A public website, domain, email delivery, and social-network publishing may still use their respective infrastructure/APIs. Those services are separate from video generation.

## Hardware required
- A physical Linux server (Ubuntu 22.04/24.04 recommended).
- Compatible NVIDIA GPU with enough VRAM for the selected Wan model.
- NVIDIA driver installed on the host.
- Sufficient RAM, SSD storage, cooling and power.

The ZIP contains the software/configuration; it cannot contain the physical GPU or the model weights themselves.

## Verify before starting
Run:

```bash
sudo bash VERIFY_PHYSICAL_GPU.sh
```

The script fails if `nvidia-smi` cannot see a physical NVIDIA GPU or if Docker cannot pass that GPU into a container.

Then:

```bash
sudo bash SELF_HOSTED_SETUP.sh
./start-physical-gpu.sh
```
