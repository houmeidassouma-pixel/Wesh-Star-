# Wesh Star IA — V12 changes and honest launch status

## Added in this archive

- Paid promotion workflow for a creator's public Wesh Star Feed video or their own currently active LIVE.
- Fixed promotion budgets of €5, €10, €20 and €50; durations of 24 hours, 3 days and 7 days.
- Stripe Checkout creates the payment session. A verified `checkout.session.completed` webhook checks the user, campaign/session reference, currency and paid amount before moving the campaign to `pending_review`.
- Admin panel can approve, reject, pause and resume campaigns. Sensitive admin decisions are sent to the audit log.
- Approved video campaigns are ordered ahead of ordinary posts in the community feed and visibly marked “Sponsorisé”. Approved LIVE campaigns are ordered ahead of other active lives and marked “Sponsorisé”. Expired campaigns are marked completed when promotion endpoints are requested.
- Added app navigation for promotion and private messages.
- Database schema includes the `promotion_campaigns` table. Apply `db/schema.sql` to the self-hosted PostgreSQL database before using the feature.

## Important boundaries

- A paid campaign buys placement in Wesh Star IA's own community/LIVE list, not guaranteed views and not automatic advertising on TikTok, Instagram, YouTube or other third-party networks.
- The promotion checkout in this version uses EUR via Stripe. XOF/CFA checkout for promotion has not been connected here.
- A live promotion is only selectable while the creator's LIVE is active. It does not itself create an audio/video stream.
- The existing LIVE implementation still handles rooms, presence, gifts and chests; it does not yet transport live audio/video. LIVE duels with two camera feeds, score/timer and WebRTC calls are not production-complete in this archive.
- Private messages are currently polled; this is not push-based real-time delivery. Call API routes are preparatory and `COMMUNICATIONS_ENABLED=false` remains the safe default.

## Local vs always-on operation

The app, PostgreSQL, storage, text model, TTS and GPU worker can be self-hosted using `docker-compose.self-hosted.yml`. This is local/self-managed infrastructure, not a guarantee that it runs when the physical machine is powered off. If the only host is shut down, sleeping or disconnected, its website, database, queue, GPU generation, messaging and media services stop being reachable. For 24/7 availability, run the stack on a dedicated always-on machine you control (for example, a home server with UPS and stable internet). No software change can make a powered-off computer execute jobs.

## Checks not claimed

This archive has not been certified as production-ready merely by adding these files. Run dependency installation, the full Next.js build, database migration on a test database, Stripe test-mode checkout/webhook, browser tests, and real GPU generation before launch. Real audio/video calls and LIVE streaming still require a complete WebRTC client plus a configured STUN/TURN/media-server setup and security testing.

## Verification performed for V12

- Automated test suite: **24/24 tests passed** (`npm test`). The suite includes three static regression tests for the promotion schema, signed payment confirmation, admin-only review, and promotion ordering.
- TypeScript/TSX syntax transpilation: **242 files checked, no syntax diagnostics**.
- Not run: full `next build`, type-aware `tsc --noEmit`, database migration against a live PostgreSQL instance, Stripe test-mode checkout/webhook, browser/E2E tests, and GPU/media tests. The archive does not contain installed `node_modules`, and no live database/Stripe credentials were available for this verification.
