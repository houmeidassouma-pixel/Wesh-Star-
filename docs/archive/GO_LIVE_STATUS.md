# Wesh Star IA — What is included in this build

## Included in the ZIP
- Self-hosted PostgreSQL/auth/storage.
- Local Ollama text backend.
- Local TTS worker and voice pack architecture.
- Local GPU video worker with Wan model configuration.
- Local video editor: existing video + reference image + text instruction + object position/scale; foreground segmentation; original audio preservation.
- Subscription/hour quota accounting.
- One-time quota refund for failed video edits.
- Admin confirmation for Wesh Star IA Direct one-time token-pack payments.
- Stripe Checkout for monthly recurring subscriptions, with webhook handling for successful renewals, failed payments, subscription updates and cancellations.
- Security headers, rate limits, blocked-account checks.
- PostgreSQL backup script.
- Commercial go-live checklist and legal pages already present in the project.
- Health endpoint: `/api/health`.

## Still required outside the ZIP
- Physical NVIDIA GPU and drivers/CUDA/NVIDIA Container Toolkit.
- Local model weights downloaded and tested.
- Production domain + HTTPS.
- Real SMTP credentials for password reset/invitations.
- Production secrets changed from examples.
- Actual legal/business review for the operator.
- Backup restore test and monitoring.
- Stripe must be configured with the desired payment methods and production webhook before monthly subscriptions can be sold automatically. Wesh Star IA Direct remains a separate manual one-time token-pack flow and does not store card data.
- Text-only object creation inside the editor requires a local image-generation model. The current editor accepts a supplied reference image, which is the deterministic local mode.

## Launch interpretation
This ZIP is the application/infrastructure package, not a ready-made physical server. Commercial launch is possible after the host GPU, models, domain, secrets, SMTP, legal checks and payment operations are configured and the acceptance tests pass.

## Local AI object generation in video editor
The video editor now has two modes: upload a reference image, or **Generate object with AI**. In generation mode the GPU worker uses the local `WESH_ASSET_MODEL` (default: Stable Diffusion XL), removes the generated object's background locally with `rembg`, then sends the resulting transparent PNG directly into the local object-behind-subject video editor. No hosted image-generation API is used. A suitable NVIDIA GPU and the model weights are still required.
