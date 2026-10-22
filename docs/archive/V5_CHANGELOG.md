# Wesh Star IA V5 — Changes in this ZIP

## Preserved
- Existing self-hosted/local storage architecture
- PostgreSQL database and existing account/auth flow
- Local GPU worker and generation queue
- Video generation studio and long-video/hour-credit logic
- Existing subscriptions and admin plan controls
- Wesh Star IA Direct payment requests
- Moderator permissions and social autopilot
- Existing social accounts/retry/performance panels

## Added
- `V5_FEATURES.md`: complete V5 product specification
- `/v5`: V5 feature center for logged-in users
- Admin V5 section inside `/admin`
- Multi-payment-method readiness panel
- Explicit configured/not-configured status for payment methods
- Product design for Video Factory, Brand Kit, persistent characters, AI hooks, subtitles/translation, social repurposing, GPU queue telemetry and finance dashboard

## Payment note
Only Wesh Star IA Direct/manual bank transfer is marked configured in this build. Visa/Mastercard, PayPal, Apple Pay, Google Pay, SEPA, Klarna and local payment methods are shown as integration-ready but not falsely activated. Real processing requires merchant/provider accounts and secrets.

## Validation
A full `npm run build` could not be completed in this environment because dependency installation did not finish within the available execution window. Source files were inspected after modification. Run `npm install` and `npm run build` in the deployment environment before production deployment.
