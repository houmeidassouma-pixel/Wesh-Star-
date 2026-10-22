# Wesh Star IA V5 — Feature & Product Specification

This V5 layer is additive: existing generation, video credits, subscriptions, moderation, self-hosted storage and social automation are preserved.

## 1. Video-time economy
- Store generation allowance internally in seconds for accurate accounting.
- Customer credit packs are **1–60 minutes**, configurable by admin.
- **60 credits = 1 minute**.
- Charge only the actual requested generation time.
- Failed generations refund consumed seconds/credits.
- Subscription allowance and purchased video credits remain separate.
- Normal-user single-video generation is capped at **10 minutes (600 seconds)**.
- No “unlimited” marketing promise by default; plans use explicit monthly quotas/jobs.
- Admin/moderator generation remains elevated and is protected by technical safety ceilings.

## 2. Smart GPU queue
- Pending/processing/done/failed states.
- Position in queue and estimated wait time UI.
- Retry policy with bounded attempts.
- Admin telemetry: active jobs, queue depth, generated time, failures, storage.

## 3. Video Factory / Auto Creator
- Create a production batch of multiple videos.
- Topic, language, duration, character, emotion, platform and CTA presets.
- Queue jobs sequentially so a local GPU is not overloaded.
- Batch progress: completed / queued / failed.
- Multi-platform adaptation after generation.

## 4. Persistent characters
- Reusable character profiles.
- Persistent voice + mannequin/appearance mapping.
- Character personality and style presets.
- Reuse the same identity across many videos.

## 5. Brand Kit
- Logo, colors, font, watermark and default CTA.
- Apply brand defaults to generated videos.
- Separate brand kits for creators/teams.

## 6. Social repurposing
- One source video -> TikTok, Reels, Shorts, Facebook, YouTube, X and LinkedIn variants.
- Platform-specific aspect ratio, title, description, hashtags and CTA.
- Scheduling and retry handling.
- Per-moderator permission for autopilot/publishing.

## 7. AI content tools
- Script generation.
- Script improvement.
- Hook generator.
- Automatic scene planning.
- Dialogue/person mapping.
- Automatic subtitles.
- Translation/dubbing workflow.

## 8. Payments
Wesh Star IA Direct remains available for bank transfer/manual confirmation.

The V5 payment architecture is provider-neutral and can expose: Visa / Mastercard, American Express, PayPal, Apple Pay, Google Pay, SEPA Direct Debit, bank transfer, country-specific methods where supported, and optional BNPL such as Klarna.

Card/payment credentials must never be stored by Wesh Star IA itself. Provider integrations require merchant accounts and server-side secrets. Until configured, a method is shown as “Not configured” rather than pretending it is active.

## 9. Admin finance dashboard
- Payment status.
- Revenue by period.
- Active subscriptions.
- Purchased video credits.
- Failed payments.
- Refunds.
- Method used.
- Invoice/reference history.

## 10. Admin infrastructure dashboard
- GPU utilization.
- VRAM.
- Queue length.
- Active workers.
- Generated time.
- Failed jobs.
- Storage consumption.
- Daily generation cap.
- Per-plan usage.

## 11. UX simplification
Normal users see a **10-second free trial** and paid single-video durations from **10 seconds to 10 minutes**, in 10-second increments. The purchase grid is also limited to **1–60 minute credit packs**.
Advanced/Autopilot duration values remain available where platform-specific automation requires longer runtimes.
Technical GPU and infrastructure information is admin-only.

## 12. Independence boundary
- Local Wesh Star IA filesystem storage: preserved.
- Self-hosted PostgreSQL: preserved.
- Local GPU worker: preserved.
- No Supabase Storage.
- Payment providers are optional integrations; they are not required for the local/manual Wesh Star IA Direct method.


Note: les packs de crédits peuvent aller jusqu’à 60 minutes, mais une génération Studio utilisateur est limitée à 10 minutes maximum.
