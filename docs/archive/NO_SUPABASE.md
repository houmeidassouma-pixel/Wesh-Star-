# Wesh Star IA — 100% independent from Supabase

Wesh Star IA no longer uses Supabase in any form (not Supabase Cloud, not a
self-hosted Supabase stack). Everything runs on infrastructure Wesh Star IA
owns directly:

| Before                          | Now                                                      |
|----------------------------------|-----------------------------------------------------------|
| Supabase Postgres (managed)      | Your own PostgreSQL container (`postgres` service)         |
| Supabase Auth (GoTrue)           | `src/lib/auth/*` — scrypt password hashing, signed session cookies (`src/lib/auth/session.ts`), own `/api/auth/*` routes |
| Supabase Storage                 | Already self-hosted filesystem storage (`src/lib/storage.ts`) — unchanged |
| `@supabase/supabase-js`, `@supabase/ssr` | Removed from `package.json`; replaced by `pg` (direct Postgres) + `nodemailer` (email) |

## What changed, file by file
- `src/lib/db/pool.ts`, `src/lib/db/query.ts` — new: direct PostgreSQL connection + a small query-builder that mimics the exact `.from()/.rpc()` calls the app already used, so **no business-logic file (routes, pages, worker) needed to change**.
- `src/lib/auth/*` — new: password hashing, signed sessions, one-time tokens, email sending.
- `src/lib/supabase/admin.ts`, `server.ts`, `client.ts` — rewritten internals, **same function names/paths**, so every existing `import { createAdminClient } from "@/lib/supabase/admin"` etc. still works untouched.
- `src/middleware.ts` — verifies Wesh Star IA's own session cookie instead of Supabase's.
- `src/app/api/auth/*` — new: signup, login, logout, forgot-password, set-password.
- `src/app/(marketing)/reset/page.tsx` — one small, unavoidable change: it now reads a `token` from the email link URL and sends it along (there is no more Supabase "magic session" to rely on). Everything else on that page is untouched.
- `db/schema.sql` — added `auth_users` + `password_reset_tokens` tables; removed the handful of statements that only made sense behind Supabase's PostgREST (RLS policies keyed on `auth.uid()`, grants to the `anon`/`authenticated`/`service_role` roles, the `auth.users` trigger). Every actual data table, index and business function is untouched. Authorization itself hasn't changed: it was already enforced in application code (`src/lib/access.ts`) before this change, not by those Supabase-only policies.
- `docker-compose.yml`, `docker-compose.self-hosted.yml`, `Dockerfile` — added a `postgres` service (your own database container) and run the schema migration automatically on startup.
- `.env.example`, `package.json` — Supabase variables/packages replaced by `DATABASE_URL`, `SESSION_SECRET`, `SMTP_*`.

## Deploy steps
1. Copy `.env.example` to `.env`, set `DATABASE_URL` (or leave the docker-compose default), a strong `SESSION_SECRET` (`openssl rand -hex 32`), and SMTP settings if you want real password-reset emails (otherwise they're just logged to the console).
2. `docker compose -f docker-compose.self-hosted.yml up -d --build` — this also creates the `postgres` container and applies `db/schema.sql` automatically before the app starts.
3. Sign up once through the website, then promote yourself to admin:
   ```sql
   docker compose -f docker-compose.self-hosted.yml exec postgres psql -U wesh -d wesh_star \
     -c "update public.profiles set role = 'admin' where email = 'you@example.com';"
   ```

## Honest limitation
I could not run `npm install` or a real build in this sandbox (no network access here), so this hasn't been compiled/tested end-to-end. The code follows the exact same request/response shapes your existing routes already expected, but please run `npm install && npm run build` on your own machine/server (which has network access) before relying on it in production, and watch the first-boot logs for the migration step.
