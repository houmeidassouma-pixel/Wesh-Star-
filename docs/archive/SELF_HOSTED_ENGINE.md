# Wesh Star IA — self-hosted video engine

Wesh Star IA now defaults to a **self-hosted video engine**. The application does
not contain or require Replicate/Kling/Hailuo/Runway credentials.

Architecture:

User → Wesh Star IA Next.js → Wesh Star IA GPU worker → local video model → MP4 →
Wesh Star IA storage → FFmpeg assembly

The reference GPU worker is in `gpu-worker/` and uses the local
`Wan-AI/Wan2.1-T2V-1.3B-Diffusers` model. The bundled configuration targets an
NVIDIA CUDA GPU in the 24 GB VRAM class. The optional larger image-to-video
path uses CPU offload so the whole I2V pipeline does not have to reside in VRAM. The model is fetched once to
the GPU server's local cache; generation is performed locally on the GPU.

## Important deployment distinction

The ZIP contains the application-side integration and a reference GPU worker,
but it does **not** contain the multi-gigabyte model weights. Those weights
must be downloaded to the GPU server during deployment. This is intentional:
a Git/ZIP application should not embed tens of gigabytes of model weights.

There is no per-video Replicate charge in this architecture. Your costs are
now your own GPU/server, storage, network and electricity/cloud-infrastructure
costs.

## Production scaling

- Run one GPU worker per GPU.
- Put the worker URLs in `SELF_HOSTED_VIDEO_URL`, comma-separated.
- Increase `WESH_MAX_CONCURRENT` only when the GPU has enough VRAM.
- Keep workers private behind HTTPS/firewall/VPN where possible.
- Use a strong `SELF_HOSTED_WORKER_TOKEN`.
- The existing Node queue remains responsible for scene retries and final
  FFmpeg assembly.

## Model capability

The included reference model is text-to-video. It is deliberately used instead
of silently falling back to a hosted provider. Image-to-video requires a
separate self-hosted I2V-capable model and should be added as another local
engine before enabling that path.

## Self-hosted storage (added)

Wesh Star IA utilise exclusivement son stockage natif : les vidéos générées, clips de scènes et images importées sont écrits directement sur le serveur Wesh Star IA dans `/app/storage`. Docker monte le volume persistant `wesh-ia-star-storage`. Aucun stockage objet tiers (Supabase Storage, S3, etc.) n’est utilisé. Configurez `SELF_HOSTED_PUBLIC_BASE_URL` et `WESH_STORAGE_SIGNING_SECRET` pour les URLs signées.
