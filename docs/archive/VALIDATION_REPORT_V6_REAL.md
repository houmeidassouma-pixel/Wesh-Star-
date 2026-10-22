# Validation report — Wesh Star IA V6 (audit + corrections)

## NOT executable in the audit sandbox (no network / Docker / GPU / Postgres)
npm install + npm run build, docker compose up, CUDA video generation, real TTS,
PostgreSQL, Stripe, social APIs, npm audit, user/admin end-to-end tests.
-> Run the checklist below on the target server. None of these is claimed as passed.

## Executed and passed
- Python syntax of gpu-worker/*.py and local-tts/server.py; scripts/migrate.js syntax
- docker-compose.yml parses; only wesh-ia-star publishes a port (3000)
- cron-auth.ts: fail-closed behaviour tested (5 cases)

## Defects found and fixed
1. gpu-worker image copied only server.py -> crash at startup (video_edit/asset_gen missing)
2. Default docker-compose.yml had no tts-worker -> TTS unreachable; voices never installed (tts-init added)
3. TTS audio_url pointed to a route that did not exist -> real TTS could never return audio (authenticated /v1/audio + server-side fetch)
4. /api/worker/process and /api/worker/autopilot were OPEN when CRON_SECRET was unset (fail-open) -> fail-closed, min 16 chars, constant-time
5. Nothing triggered the queue/retries/Autopilot under compose -> scheduler service added
6. Weak default secrets in compose (SESSION_SECRET, storage signing, DB password) -> now required, placeholders rejected in production
7. WESH_GPU_WORKER_TOKEN / POSTGRES_PASSWORD missing from .env.example
8. Worker token compare non-constant-time; video_edit/asset_gen were fail-open if token empty -> hmac.compare_digest, fail-closed
9. App container ran as root -> USER node
10. Removed stray artefacts: tsconfig.tsbuildinfo (showed a build run WITHOUT dependencies), __pycache__, server.py.bak

## Checklist to run on the server
1. cp .env.example .env ; set POSTGRES_PASSWORD, SESSION_SECRET, WESH_STORAGE_SIGNING_SECRET, WESH_GPU_WORKER_TOKEN, CRON_SECRET (openssl rand -hex 32)
2. npm install && npm run build ; npm audit --omit=dev
3. docker compose config && docker compose up -d --build ; docker compose ps
4. curl http://localhost:3000/api/health ; from outside the host: ports 8001/8002/5432/11434 must be closed
5. curl -i http://localhost:3000/api/worker/process -> 401 ; with Bearer CRON_SECRET -> 200
6. Signup/login/logout, quota, admin + moderator roles, TTS preview, 5 s video on GPU (nvidia-smi), retry after killing gpu-worker
7. Stripe: stripe listen --forward-to localhost:3000/api/stripe/webhook (test mode) if enabled
