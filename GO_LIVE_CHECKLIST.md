# Wesh Star IA — Commercial Go-Live Checklist

## Required infrastructure
- [ ] Physical NVIDIA GPU installed and visible with `nvidia-smi`.
- [ ] Docker + NVIDIA Container Toolkit installed.
- [ ] Wan video model(s) downloaded locally.
- [ ] Local TTS voice models installed.
- [ ] Ollama model downloaded locally.
- [ ] Persistent PostgreSQL, storage, model-cache and output volumes configured.
- [ ] Domain + HTTPS configured.
- [ ] Production secrets changed from every `change-me` example.

## Application acceptance test
- [ ] Signup/login/logout works.
- [ ] Password reset email works with real SMTP.
- [ ] Video generation works end-to-end on the physical GPU.
- [ ] Local TTS works.
- [ ] Video download works.
- [ ] Video editor works: upload video + reference image + instruction + local render.
- [ ] Failed generation/edit refunds the quota exactly once.
- [ ] Subscription confirmation activates the tier and period end.
- [ ] Hour-pack confirmation adds credits exactly once.
- [ ] Admin/moderator permissions are tested.
- [ ] Rate limits and blocked-account checks are tested.

## Commercial payment
The bundled `wesh_direct` payment mode is intentionally self-hosted and does not store card numbers. It creates a payment request and admin confirmation flow. A fully automatic card/SEPA checkout requires a regulated payment processor or a separately licensed/acquired payment gateway; it cannot be made automatic merely by adding frontend code.

## Legal / operations
- [ ] Impressum, Datenschutz, AGB and Widerruf reviewed for the actual business/operator.
- [ ] Refund/cancellation policy matches the real payment flow.
- [ ] Content moderation / abuse process defined.
- [ ] Daily PostgreSQL + storage backups tested.
- [ ] Restore-from-backup test completed.
- [ ] Monitoring/alerts configured.

## Final launch gate
Do not advertise "fully automatic payments" or "text-only generative video editing" until those exact capabilities have been tested in production. The current local editor supports inserting a supplied reference image behind a detected foreground subject; text-only generation of a new object image requires an additional local image-generation model.
