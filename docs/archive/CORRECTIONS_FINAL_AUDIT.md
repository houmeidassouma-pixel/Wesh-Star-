# Final audit corrections (no function removed)
1. scripts/migrate.js now also applies db/migrations/*.sql (sorted, idempotent).
2. .env.example documents DATABASE_POOL_MAX, FFMPEG_BIN, WESH_APP_URL, NEXT_PUBLIC_APP_URL, TWITCH_STREAM_KEY, WESH_SUBSCRIPTION_DAYS; stripe.ts falls back to NEXT_PUBLIC_SITE_URL.
3. /api/moderator/autopilot: a moderator with only the "promotion" permission can now manage their own promotion/outro toggle (never autopilot itself).
4. /api/admin/role: admin cannot change own role; demoting to "user" clears permissions and autopilot.
Still to run on the server: npm install, build, docker compose, Postgres, GPU, Stripe (see VALIDATION_REPORT_V6_REAL.md).
