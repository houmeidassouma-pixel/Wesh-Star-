# Wesh Star IA — self-hosted deployment

This deployment path is the local/self-hosted path. It does not require Supabase, Stripe, Replicate, Kling, Hailuo, Runway, Anthropic, or a hosted translation/trends API.

## Requirements
- Linux server/PC (Ubuntu 24.04 LTS recommended)
- NVIDIA GPU with a compatible CUDA driver; 24 GB VRAM is a practical starting point for the bundled video worker
- Docker Engine + Docker Compose plugin
- NVIDIA Container Toolkit
- SSD storage for PostgreSQL, application files, models and generated videos
- Internet for the initial Docker/model downloads and for public web/social integrations

## Start
1. Copy `.env.example` to `.env`.
2. Replace all `change-me...` secrets.
3. Set `SELF_HOSTED_PUBLIC_BASE_URL` to your public HTTPS URL.
4. Set a strong `WESH_GPU_WORKER_TOKEN`.
5. Run `./start-self-hosted.sh`.
6. The first startup downloads the configured local AI models into persistent Docker volumes.

## What is local
- PostgreSQL: local Docker volume
- Authentication/session handling: Wesh Star IA application + PostgreSQL
- File/video storage: local `/app/storage` volume
- Text AI: local Ollama
- Video generation: local GPU worker + Wan model
- Video assembly: local FFmpeg
- Payments: Wesh Star IA Direct/manual confirmation
- Trend/autopilot fallback: bundled local topic generator
- Translation fallback: bundled dictionaries

## What cannot be made independent of the platform owner
If you enable automatic publishing, TikTok, YouTube, Instagram, Facebook, Snapchat, X, LinkedIn and Twitch are external platforms. Their official APIs/OAuth credentials are necessarily external. This is a platform requirement, not an AI/video-provider dependency.

A public website also necessarily needs Internet access and normally a domain/DNS service. Email delivery likewise requires either your own mail server or an SMTP service.

## Stripe — abonnements mensuels automatiques

Wesh Star IA reste maître des comptes, vidéos, jetons, quotas et stockage. Stripe est utilisé uniquement pour le paiement récurrent des abonnements mensuels.

Variables d'environnement requises :
- `STRIPE_SECRET_KEY` — clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` — secret du webhook Stripe
- `WESH_APP_URL` — URL publique HTTPS de Wesh Star IA, sans slash final

Créer un endpoint webhook Stripe vers : `/api/stripe/webhook` et écouter au minimum :
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Le renouvellement `invoice.paid` active/renouvelle le forfait dans Wesh Star IA et avance `quota_cycle_key`. Les crédits vidéo mensuels sont calculés par Wesh Star IA à raison de 6 crédits vidéo par minute.

Le portail `/api/stripe/portal` permet au client de gérer/annuler son abonnement Stripe.
