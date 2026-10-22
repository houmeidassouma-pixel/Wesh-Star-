-- Wesh Star IA - database schema (v4, production-hardened)
-- Run automatically by Wesh Star IA on the local PostgreSQL service

-- ---------- Wesh Star IA Direct Payments (no Stripe) ----------
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reference text not null unique,
  kind text not null check (kind in ('subscription','hours','minutes')),
  tier text,
  hours numeric(12,4) check (hours >= 0.01 and hours <= 240),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_payment_requests_user on public.payment_requests(user_id);
create index if not exists idx_payment_requests_status on public.payment_requests(status);

-- Pack duration is stored as hours for legacy compatibility; fractional hours
-- are required for minute packs (for example 30 min = 0.5 h).
alter table public.payment_requests alter column hours type numeric(12,4) using hours::numeric;
alter table public.payment_requests drop constraint if exists payment_requests_hours_check;
alter table public.payment_requests add constraint payment_requests_hours_check check (hours is null or (hours >= 0.01 and hours <= 240));
alter table public.payment_requests drop constraint if exists payment_requests_kind_check;
alter table public.payment_requests add constraint payment_requests_kind_check check (kind in ('subscription','hours','minutes'));

-- ---------- Wesh Star IA's own accounts/auth (replaces Supabase Auth) ----------
-- Password hashes (scrypt) live here; never stored in plaintext. The public
-- app server (src/lib/auth/*) is the only thing that ever reads this table.
create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- One-time tokens for "forgot password" and moderator-invite links. Only a
-- SHA-256 hash of the token is stored; the raw token exists only in the
-- emailed link and is deleted (used_at set) the moment it's redeemed.
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('reset','invite')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_password_reset_tokens_user on public.password_reset_tokens(user_id);

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references public.auth_users(id) on delete cascade,
  email text,
  username text,
  country_code text,
  role text not null default 'user' check (role in ('user', 'viewer', 'editor', 'moderator', 'admin')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('active', 'inactive', 'past_due')),
  subscription_tier text check (subscription_tier in ('starter','basic','pro','creator','studio','business','agency','enterprise')),
  current_period_end timestamptz,
  quota_cycle_key text,
  stripe_customer_id text,
  stripe_subscription_id text,
  hour_credits_seconds bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists country_code text;
UPDATE public.profiles p SET username = lower(regexp_replace(split_part(coalesce(p.email,''),'@',1),'[^a-zA-Z0-9_]+','_','g')) || '_' || left(p.id::text,6) WHERE username IS NULL OR btrim(username)='';
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uq ON public.profiles (lower(username)) WHERE username IS NOT NULL;

alter table public.profiles add column if not exists quota_cycle_key text;

-- ---------- Generations ----------
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null,
  video_type text not null default 'short' check (video_type in ('short', 'long')),
  target_seconds int not null default 3,
  scenes int not null default 1 check (scenes between 1 and 25000),
  clips jsonb not null default '[]',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed', 'cancelled')),
  error text,
  video_path text,
  locked_at timestamptz,
  attempts int not null default 0,
  idempotency_key text,
  quota_refunded boolean not null default false,
  quota_source text not null default 'plan' check (quota_source in ('plan','credits','trial','staff','none')),
  quota_seconds bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration-safe column adds (no-op on fresh databases)
alter table public.generations add column if not exists attempts int not null default 0;
alter table public.generations add column if not exists idempotency_key text;
alter table public.generations add column if not exists quota_refunded boolean not null default false;
alter table public.generations add column if not exists quota_source text not null default 'plan';
alter table public.generations add column if not exists quota_seconds bigint not null default 0;
alter table public.generations add column if not exists quota_period text;
alter table public.generations drop constraint if exists generations_quota_source_check;
alter table public.generations add constraint generations_quota_source_check check (quota_source in ('plan','credits','trial','staff','none'));
alter table public.generations add column if not exists video_language text not null default 'auto';
alter table public.generations add column if not exists input_image text;
alter table public.generations add column if not exists input_images jsonb;
alter table public.generations add column if not exists sound_id uuid;
alter table public.generations add column if not exists color_scheme text not null default 'gelb';
alter table public.generations add column if not exists target_platform text not null default 'tiktok';
alter table public.generations add column if not exists voice text not null default 'auto';
alter table public.generations add column if not exists character text not null default 'banani';
alter table public.generations add column if not exists scene_mode text not null default 'single' check (scene_mode in ('single','dialogue'));
alter table public.generations add column if not exists dialogue_lines jsonb;
alter table public.generations add column if not exists dialogue_persons int not null default 2;
alter table public.generations add column if not exists persons int not null default 2 check (persons between 1 and 30);
alter table public.generations add column if not exists persons_meta jsonb;
alter table public.generations add column if not exists natural_scene jsonb;
alter table public.generations add column if not exists line_speakers jsonb;
-- Raise the persons cap 30 -> 50 (matches the app's MAX_CAST). Needed as a
-- separate step: `add column if not exists` above does NOT update the CHECK
-- on a column that already exists from an earlier deploy.
alter table public.generations drop constraint if exists generations_persons_check;
alter table public.generations add constraint generations_persons_check check (persons between 1 and 50);
alter table public.generations add column if not exists image_mode boolean not null default false;
alter table public.generations add column if not exists auto_publish boolean not null default false;
alter table public.generations add column if not exists auto_publish_to_community boolean not null default false;
alter table public.generations add column if not exists auto_publish_all_platforms boolean not null default false;
alter table public.generations add column if not exists autopilot_platform text;
alter table public.generations add column if not exists promotion_cta text;
alter table public.generations add column if not exists publish_status jsonb not null default '{}';
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles drop constraint if exists profiles_subscription_tier_check;
-- Monthly plans are dynamic and are created by the admin panel, so tier IDs
-- must not be restricted to the legacy starter/basic/pro/... list.
-- Keep the column textual and validate the selected tier against site settings
-- in the application/webhook layer.

create unique index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists idx_profiles_stripe_subscription on public.profiles(stripe_subscription_id) where stripe_subscription_id is not null;
alter table public.profiles add column if not exists permissions jsonb not null default '[]';
alter table public.profiles add column if not exists autopilot_enabled boolean not null default false;
alter table public.profiles add column if not exists autopilot_settings jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists warnings int not null default 0;
alter table public.profiles add column if not exists blocked boolean not null default false;
alter table public.profiles add column if not exists verified_badge boolean not null default false;
alter table public.profiles add column if not exists hour_credits_seconds bigint not null default 0;
alter table public.profiles add column if not exists free_trial_uses int not null default 0;
alter table public.generations drop constraint if exists generations_status_check;
alter table public.generations add constraint generations_status_check
  check (status in ('pending', 'processing', 'done', 'failed', 'cancelled'));

-- Idempotency: one active key per user (partial index, NULLs allowed)
create unique index if not exists idx_generations_idempotency
  on public.generations(user_id, idempotency_key)
  where idempotency_key is not null;

-- ---------- Atomic usage counters (monthly + daily) ----------
create table if not exists public.usage_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,              -- 'YYYY-MM' or 'YYYY-MM-DD'
  count int not null default 0,
  primary key (user_id, period)
);

-- ---------- Moderation log ----------
create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  prompt text,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------- Site settings ----------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists idx_generations_user on public.generations(user_id);
create index if not exists idx_generations_queue on public.generations(status, created_at);

-- NOTE: Wesh Star IA no longer uses Supabase Storage. Video/image files are
-- written to Wesh Star IA's own filesystem storage (see src/lib/storage.ts,
-- WESH_STORAGE_ROOT, served through /api/storage/[...path]). the old Supabase architecture here
-- is only the Postgres database + Auth (accounts, generation records,
-- quotas) — no storage.buckets / storage.objects are created or used.

-- ---------- Row Level Security ----------
-- NOTE: Wesh Star IA no longer sits behind PostgREST/Supabase, so there is no
-- anon/authenticated JWT role reaching Postgres directly — only Wesh Star IA's
-- own Next.js server connects (see src/lib/db/pool.ts), and it enforces
-- who can read/write what in application code (src/lib/access.ts) before
-- ever running a query. Row Level Security / per-role grants are therefore
-- not needed here; removing them changes nothing about who can access what,
-- since the browser was never able to reach this database directly.

-- Defense in depth: even if a policy ever allows an UPDATE, this trigger
-- blocks sensitive-field changes from end-user sessions (service role
-- bypasses it, so the system and admin APIs keep working).
drop trigger if exists profiles_guard_update on public.profiles;
drop function if exists public.profiles_guard_sensitive();
-- The above used Supabase's `auth.role()` (PostgREST JWT claim), which does
-- not exist on a plain self-hosted Postgres. The protection it provided
-- (only system/admin code may change role/subscription/Stripe fields) still
-- holds: only src/app/api/admin/* routes update those columns, and every
-- one of them already checks access.isAdmin (see src/lib/access.ts) before
-- doing so — no ordinary user request path touches this table's write side.

-- ---------- Lifetime free trial (atomic, exactly 2 uses) ----------
create or replace function public.consume_free_trial(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set free_trial_uses = free_trial_uses + 1
   where id = p_user_id and free_trial_uses < 2;
  return found;
end;
$$;

create or replace function public.refund_free_trial(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set free_trial_uses = greatest(0, free_trial_uses - 1)
   where id = p_user_id;
$$;

-- ---------- Purchased hour credits (atomic) ----------
create or replace function public.consume_hour_credits(p_user_id uuid, p_seconds bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare c bigint;
begin
  if p_seconds <= 0 then return true; end if;
  select hour_credits_seconds into c from public.profiles where id = p_user_id for update;
  if coalesce(c,0) < p_seconds then return false; end if;
  update public.profiles set hour_credits_seconds = hour_credits_seconds - p_seconds where id = p_user_id;
  return true;
end;
$$;

create or replace function public.add_hour_credits(p_user_id uuid, p_seconds bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set hour_credits_seconds = greatest(0, hour_credits_seconds + greatest(0,p_seconds)) where id = p_user_id;
$$;

create or replace function public.refund_hour_credits(p_user_id uuid, p_seconds bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set hour_credits_seconds = greatest(0, hour_credits_seconds + greatest(0,p_seconds)) where id = p_user_id;
$$;

-- ---------- QUOTA FUNCTION (atomic) ----------
-- Serializes per user (row lock), checks BOTH limits, then increments BOTH.
-- Returns false WITHOUT side effects when a limit is reached -> no race
-- condition: concurrent requests can never exceed the quota.
create or replace function public.consume_generation_quota(
  p_user_id uuid, p_month text, p_day text, p_max_month int, p_max_day int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m_count int;
  d_count int;
begin
  perform id from public.profiles where id = p_user_id for update;
  if not found then return false; end if;

  select count into m_count from public.usage_counters
    where user_id = p_user_id and period = p_month;
  select count into d_count from public.usage_counters
    where user_id = p_user_id and period = p_day;

  if coalesce(m_count, 0) >= p_max_month or coalesce(d_count, 0) >= p_max_day then
    return false;
  end if;

  insert into public.usage_counters (user_id, period, count)
    values (p_user_id, p_month, 1)
    on conflict (user_id, period) do update
      set count = public.usage_counters.count + 1;
  insert into public.usage_counters (user_id, period, count)
    values (p_user_id, p_day, 1)
    on conflict (user_id, period) do update
      set count = public.usage_counters.count + 1;
  return true;
end;
$$;

-- Refund one generation (failed job / rejected request). Floor at 0.
create or replace function public.refund_generation_quota(
  p_user_id uuid, p_month text, p_day text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usage_counters set count = greatest(count - 1, 0)
    where user_id = p_user_id and period = p_month;
  update public.usage_counters set count = greatest(count - 1, 0)
    where user_id = p_user_id and period = p_day;
end;
$$;

-- ---------- GLOBAL DAILY CIRCUIT BREAKER ----------
-- Platform-wide cap on new generations per day (protects against runaway
-- spend). Advisory lock serializes the check.
create or replace function public.check_global_daily_cap(p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare c int;
begin
  perform pg_advisory_xact_lock(hashtext('nb_global_daily_cap'));
  select count(*) into c from public.generations
    where created_at >= date_trunc('day', now());
  return c < p_max;
end;
$$;

-- ---------- QUEUE CLAIM (atomic, no double-processing) ----------
create or replace function public.claim_generation_job()
returns setof public.generations
language plpgsql
security definer
set search_path = public
as $$
declare
  job_id uuid;
begin
  select id into job_id
  from public.generations
  where status in ('pending', 'processing')
    and (locked_at is null or locked_at < now() - interval '15 minutes')
  order by created_at asc
  limit 1
  for update skip locked;

  if job_id is null then return; end if;

  update public.generations
  set locked_at = now(), status = 'processing', updated_at = now()
  where id = job_id;

  return query select * from public.generations where id = job_id;
end;
$$;

-- NOTE: profiles used to be created by a trigger on Supabase's auth.users
-- table. There is no such table anymore — src/app/api/auth/signup/route.ts
-- and the moderator-invite path (src/lib/supabase/admin.ts) now insert the
-- auth_users row and its matching profiles row together, in one Postgres
-- transaction, so a profile can never exist without a matching account (or
-- vice versa).


-- Migration-safe: raise scene ceiling (technical safety valve for very long admin videos)
alter table public.generations drop constraint if exists generations_scenes_check;
alter table public.generations add constraint generations_scenes_check check (scenes between 1 and 25000);

-- Migration-safe: allow 'moderator' role on existing databases
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'viewer', 'editor', 'moderator', 'admin'));

-- NOTE: the "revoke from public / grant to service_role" lockdown that used
-- to live here made sense when anon/authenticated JWT roles could reach
-- Postgres directly through PostgREST. Now only Wesh Star IA's own server
-- connects (one regular Postgres role — see DATABASE_URL), so it already
-- has EXECUTE on these functions by default; no extra grants are needed.

-- FIRST ADMIN / MODERATOR: after signing up on the site, run once:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--   (or 'moderator' for the moderation-only role)

-- ---------- Social accounts (OAuth-linked tokens, server-only) ----------
-- Not exposed to anon/authenticated roles. Read/written exclusively by the
-- service-role server client (OAuth callbacks, admin token entry, worker).
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('tiktok','facebook','snapchat','youtube','instagram','twitch','x','linkedin')),
  user_id uuid references public.profiles(id) on delete cascade,
  access_token text,
  refresh_token text,
  account_name text,
  page_id text,
  connected boolean not null default false,
  connected_at timestamptz,
  meta jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
-- Migration-safe: existing deployments used `platform` as the primary key
-- for the admin/global account. Keep those rows as user_id=NULL, then allow
-- one private social account per platform for each moderator/user.
alter table public.social_accounts add column if not exists id uuid default gen_random_uuid();
alter table public.social_accounts add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.social_accounts alter column id set default gen_random_uuid();
update public.social_accounts set id = gen_random_uuid() where id is null;
alter table public.social_accounts alter column id set not null;
alter table public.social_accounts drop constraint if exists social_accounts_pkey;
alter table public.social_accounts add constraint social_accounts_pkey primary key (id);
create unique index if not exists social_accounts_user_platform_uidx
  on public.social_accounts(user_id, platform)
  where user_id is not null;
create unique index if not exists social_accounts_global_platform_uidx
  on public.social_accounts(platform)
  where user_id is null;
-- Migration-safe: extend the platform allow-list for Instagram on existing databases.
alter table public.social_accounts drop constraint if exists social_accounts_platform_check;
alter table public.social_accounts add constraint social_accounts_platform_check
  check (platform in ('tiktok','facebook','snapchat','youtube','instagram','twitch','x','linkedin'));

-- OAuth tokens here are only ever read/written server-side
-- (src/lib/social-tokens.ts) via Wesh Star IA's own DB connection; the browser
-- never has a path to this table (no PostgREST/anon role exists anymore).

-- ---------- Social publication queue / automatic retries ----------
create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('tiktok','facebook','youtube','snapchat','instagram','twitch','x','linkedin')),
  status text not null default 'pending' check (status in ('pending','publishing','published','failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  next_retry_at timestamptz,
  error text,
  published_url text,
  video_url text not null,
  caption text not null,
  fallback_global boolean not null default false,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_id, platform)
);

create index if not exists idx_social_publications_queue
  on public.social_publications(status, next_retry_at, created_at);
create index if not exists idx_social_publications_generation
  on public.social_publications(generation_id);

-- Server-only table (see note near social_accounts above).

-- ---------- Social performance / optimization ----------
create table if not exists public.social_metrics (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid references public.social_publications(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('tiktok','facebook','instagram','snapchat','youtube','twitch','x','linkedin')),
  external_post_id text, views bigint not null default 0, likes bigint not null default 0,
  comments bigint not null default 0, shares bigint not null default 0, saves bigint not null default 0,
  watch_time_seconds numeric not null default 0, video_seconds numeric not null default 0,
  format_profile text, hook_style text, caption_style text, language text,
  collected_at timestamptz not null default now(), score numeric not null default 0
);
create index if not exists idx_social_metrics_platform_score on public.social_metrics(platform, score desc, collected_at desc);
create index if not exists idx_social_metrics_generation on public.social_metrics(generation_id, platform);
-- Server-only table (see note near social_accounts above).



-- Claims one due publication atomically. Stale publishing locks are returned
-- to the queue so a crashed worker cannot leave a publication stuck forever.
create or replace function public.claim_social_publication_job()
returns setof public.social_publications
language plpgsql
security definer
set search_path = public
as $$
declare r public.social_publications;
begin
  select * into r
  from public.social_publications
  where (
    status = 'pending' and (next_retry_at is null or next_retry_at <= now())
  ) or (
    status = 'publishing' and locked_at < now() - interval '10 minutes'
  )
  order by coalesce(next_retry_at, created_at), created_at
  for update skip locked
  limit 1;

  if r.id is null then return; end if;

  update public.social_publications
  set status = 'publishing', attempts = attempts + 1,
      locked_at = now(), updated_at = now()
  where id = r.id
  returning * into r;

  return next r;
end;
$$;

-- ---------- Wesh Star IA video-time quotas ----------
-- Monthly/daily video time is tracked in seconds. 3600 seconds = 1 hour.
alter table public.usage_counters add column if not exists seconds bigint not null default 0;

create or replace function public.consume_generation_time_quota(
  p_user_id uuid, p_month text, p_day text, p_seconds bigint,
  p_max_month_seconds bigint, p_max_day_seconds bigint,
  p_max_month_jobs int, p_max_day_jobs int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m_seconds bigint;
  d_seconds bigint;
  m_count int;
  d_count int;
begin
  if p_seconds <= 0 then return false; end if;
  perform id from public.profiles where id = p_user_id for update;
  if not found then return false; end if;

  select coalesce(seconds,0), coalesce(count,0) into m_seconds, m_count
    from public.usage_counters where user_id = p_user_id and period = p_month;
  select coalesce(seconds,0), coalesce(count,0) into d_seconds, d_count
    from public.usage_counters where user_id = p_user_id and period = p_day;

  if coalesce(m_seconds,0) + p_seconds > p_max_month_seconds
     or coalesce(d_seconds,0) + p_seconds > p_max_day_seconds
     or coalesce(m_count,0) >= p_max_month_jobs
     or coalesce(d_count,0) >= p_max_day_jobs then
    return false;
  end if;

  insert into public.usage_counters (user_id, period, count, seconds)
    values (p_user_id, p_month, 1, p_seconds)
    on conflict (user_id, period) do update
      set count = public.usage_counters.count + 1,
          seconds = public.usage_counters.seconds + excluded.seconds;
  insert into public.usage_counters (user_id, period, count, seconds)
    values (p_user_id, p_day, 1, p_seconds)
    on conflict (user_id, period) do update
      set count = public.usage_counters.count + 1,
          seconds = public.usage_counters.seconds + excluded.seconds;
  return true;
end;
$$;

create or replace function public.refund_generation_time_quota(
  p_user_id uuid, p_month text, p_day text, p_seconds bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usage_counters
    set count = greatest(count - 1, 0), seconds = greatest(seconds - greatest(p_seconds,0), 0)
    where user_id = p_user_id and period = p_month;
  update public.usage_counters
    set count = greatest(count - 1, 0), seconds = greatest(seconds - greatest(p_seconds,0), 0)
    where user_id = p_user_id and period = p_day;
end;
$$;


-- ---------- V5 multi-tier subscriptions (5 to 50 EUR/month) ----------
-- Migration-safe: replaces the old Basic/Pro-only tier checks.
alter table public.payment_requests drop constraint if exists payment_requests_tier_check;
alter table public.payment_requests add constraint payment_requests_tier_check
  check (tier is null or tier in ('starter','basic','pro','creator','studio','business','agency','enterprise'));
alter table public.profiles drop constraint if exists profiles_subscription_tier_check;
-- Dynamic monthly tier IDs are validated against site_settings by the app/webhook.



-- ---------- Advertising / AdSense controls ----------
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists ad_preferences jsonb not null default '{"personalized":true,"adsFree":false,"hiddenCampaignIds":[]}'::jsonb;
create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('impression','click','hide','report','about')),
  created_at timestamptz not null default now()
);
create index if not exists idx_ad_events_campaign on public.ad_events(campaign_id, created_at);
create index if not exists idx_ad_events_type on public.ad_events(event_type, created_at);

-- ---------- Community Feed ----------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  title text not null default 'Ma vidéo',
  description text not null default '',
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, generation_id)
);
create index if not exists idx_community_posts_feed on public.community_posts(status, visibility, created_at desc);
create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.community_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),
  check(follower_id<>following_id)
);
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(post_id,reporter_id)
);

-- ---------- Trésorerie Wesh Star (solde FCFA/XOF central + EUR) ----------
-- Registre comptable (ledger) : solde = somme des écritures non échouées.
-- amount > 0 : entrée, amount < 0 : sortie. Aucune ligne n'est jamais modifiée
-- sauf le statut d'un virement (pending -> completed/failed).
create table if not exists public.treasury_ledger (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('payment_in','payout','fx_out','fx_in','adjustment')),
  currency text not null check (currency in ('XOF','EUR')),
  amount numeric(18,2) not null check (amount <> 0),
  status text not null default 'completed' check (status in ('pending','completed','failed')),
  payment_request_id uuid references public.payment_requests(id) on delete set null,
  fx_group uuid,
  rate numeric(14,6),
  destination jsonb,
  provider text,
  provider_ref text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_treasury_currency_status on public.treasury_ledger(currency, status);
create index if not exists idx_treasury_created on public.treasury_ledger(created_at desc);
-- Idempotence : un paiement ne peut être crédité qu'une seule fois.
create unique index if not exists uq_treasury_payment_in on public.treasury_ledger(payment_request_id) where kind = 'payment_in';

-- ---------- Portefeuille FCFA par utilisateur (solde interne) ----------
-- Solde interne Wesh Star, géré par l'administrateur. Non retirable en argent réel.
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('admin_credit','admin_debit','transfer_in','transfer_out')),
  amount numeric(18,2) not null check (amount <> 0),
  counterparty_id uuid references public.profiles(id) on delete set null,
  transfer_group uuid,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_user on public.wallet_ledger(user_id, created_at desc);
create index if not exists idx_wallet_created on public.wallet_ledger(created_at desc);

-- ---------- Paid creator promotions (videos + LIVE) ----------
-- Payment is confirmed by the signed Stripe webhook; campaigns remain pending_review
-- until an administrator approves them. No guaranteed view count is promised.
create table if not exists public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('video','live')),
  target_id uuid not null,
  budget_eur numeric(10,2) not null check (budget_eur >= 1 and budget_eur <= 100000),
  target_views bigint not null default 0 check (target_views >= 0),
  duration_hours int not null check (duration_hours in (24,72,168)),
  currency text not null default 'EUR' check (currency = 'EUR'),
  status text not null default 'pending_payment' check (status in ('pending_payment','pending_review','active','paused','rejected','completed','payment_failed')),
  stripe_session_id text unique,
  payment_intent_id text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_promotion_campaigns_user on public.promotion_campaigns(user_id, created_at desc);
create index if not exists idx_promotion_campaigns_status on public.promotion_campaigns(status, created_at desc);

create table if not exists public.promotion_impressions (
  campaign_id uuid not null references public.promotion_campaigns(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, viewer_id)
);
create index if not exists idx_promotion_impressions_campaign on public.promotion_impressions(campaign_id, created_at desc);

-- ---------- Bénéficiaires enregistrés (virements FCFA) ----------
create table if not exists public.treasury_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  name text,
  operator text not null default 'autre' check (operator in ('mtn','moov','autre')),
  phone text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(phone, operator)
);
create index if not exists idx_treasury_beneficiaries_active on public.treasury_beneficiaries(active, created_at desc);
-- Un encaissement (paiement) ne peut être crédité qu'une fois : index déjà existant (uq_treasury_payment_in).
