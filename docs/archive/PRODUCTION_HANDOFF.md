# Wesh Star IA — Production Handoff

This file records what was checked on the supplied V6 ZIP and what still requires the owner's real infrastructure.

## Confirmed in source

- Self-hosted PostgreSQL and application-managed authentication/session cookies.
- Local persistent storage; no S3/Supabase Storage dependency.
- Local Ollama text generation.
- Local GPU video worker with Wan model configuration.
- Local TTS worker.
- Stripe Checkout in `subscription` mode for monthly recurring plans.
- Stripe webhook handling for `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` and `customer.subscription.deleted`.
- One-time Wesh Star IA Direct token-pack flow.
- Two lifetime free 10-second generations.
- Token accounting: 1 AI generation token = 10 seconds (6 tokens = 1 minute). Gift coins are a separate wallet and cannot be used for AI generation.
- Admin-configurable monthly plans and token packs.
- Advertising/AdSense controls, campaigns and ads.txt support.
- Social autopilot routes/components for TikTok, Facebook, YouTube, Instagram, Snapchat, Twitch, X and LinkedIn, subject to each platform's own credentials/API approval.
- Spoken Wesh Star IA CTA support.
- Rate limiting and signed session/security primitives.

## Important deployment requirements

1. Install the physical NVIDIA GPU, drivers and NVIDIA Container Toolkit.
2. Download/cache the local model weights.
3. Create a production `.env` with strong random secrets.
4. Set `DATABASE_URL`, `SESSION_SECRET`, `WESH_STORAGE_SIGNING_SECRET` and `WESH_GPU_WORKER_TOKEN` to non-default values.
5. Set `WESH_APP_URL` / `NEXT_PUBLIC_SITE_URL` to the HTTPS production domain.
6. Configure Stripe production keys and `STRIPE_WEBHOOK_SECRET`; register the webhook endpoint `/api/stripe/webhook`.
7. Configure the payment methods you want to offer in Stripe Dashboard.
8. Configure SMTP if password-reset and moderator-invite email delivery is required.
9. Test signup, login, free trials, subscription checkout, renewal webhook, failed payment, cancellation, token balance and video generation.
10. Test backup/restore and monitoring before accepting real customers.

## Verification limitation

A full `npm install` could not complete in the audit environment because dependency installation timed out, so a clean Next.js production build could not be honestly certified here. The source/archive itself was inspected, including routes, providers, schema, Compose configuration and environment template. Run `npm ci`/`npm install` on the deployment machine, then `npm run build`, before the public launch.
