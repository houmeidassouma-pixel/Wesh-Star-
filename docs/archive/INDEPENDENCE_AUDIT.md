# Wesh Star IA — Independence Audit (v4)

## Core runtime

Wesh Star IA's core application is designed to run on infrastructure controlled by the owner:

- PostgreSQL: local/self-hosted Docker service (`postgres`).
- Authentication/sessions: Wesh Star IA application code; no Supabase Auth.
- File/video/image storage: local persistent Docker volumes under `/app/storage` and worker output volumes; no S3/Supabase Storage.
- Text AI: local Ollama container; no hosted LLM API required at runtime.
- Video generation: local GPU worker using Wan models; no Replicate, Kling, Hailuo, Runway, or similar generation API.
- Video processing: local FFmpeg.
- Payments: Stripe is used only for **monthly recurring subscriptions**. One-time token packs use the Wesh Star IA Direct/manual workflow. Stripe is therefore an external payment dependency for subscriptions, but not for the local video-generation/storage/database runtime.

## What is still external

These are not part of the core generation/storage/database runtime:

1. Social publishing to TikTok, Facebook, Instagram, YouTube, Snapchat, X, LinkedIn, or Twitch necessarily uses each platform's own API/OAuth when that feature is enabled.
2. Password-reset/moderator-invite emails require an SMTP server if actual email delivery is wanted. If SMTP is not configured, messages are logged locally instead.
3. The Wan/Ollama model weights and Python packages must be downloaded during initial setup. After they are installed/cached on the owner's server, generation can run locally without a per-video AI provider.
4. A domain, internet connection, electricity, and server/GPU hardware are infrastructure costs, not SaaS/API provider fees.

## External services kept deliberately

There is no mandatory paid AI/storage/database provider for the core generation stack: no Supabase, Replicate, Kling, Hailuo, Runway, OpenAI, Anthropic, S3, or Vercel dependency is required for video generation, storage, database or local text AI. **Stripe is intentionally retained for monthly recurring customer subscriptions**; it can be configured with the payment methods enabled in the Stripe account. Social APIs and SMTP remain external only when those optional features are enabled.
