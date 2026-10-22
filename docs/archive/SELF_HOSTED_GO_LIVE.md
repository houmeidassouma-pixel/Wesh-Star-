# Wesh Star IA — local go-live checklist

1. Install Ubuntu 24.04 LTS (recommended) on the server/PC.
2. Install the NVIDIA driver and NVIDIA Container Toolkit.
3. Install Docker Engine + Compose plugin.
4. Copy `.env.example` to `.env`.
5. Set strong values for `SESSION_SECRET`, `WESH_GPU_WORKER_TOKEN`, `WESH_STORAGE_SIGNING_SECRET` and `CRON_SECRET`.
6. Set `SELF_HOSTED_PUBLIC_BASE_URL` to the public HTTPS URL.
7. Run `./start-self-hosted.sh`.
8. The stack starts PostgreSQL, local storage, Ollama and the GPU worker. Ollama automatically pulls the configured local model on first start.
9. The GPU worker downloads its Wan model on first generation and keeps it in the persistent local model volume.
10. Test a short generation before opening the service to users.
11. Configure social OAuth only if automatic publishing is enabled.

Core video generation, text generation, database and storage do not require a hosted AI provider.
