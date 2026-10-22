-- V8 Creator (2) : salons LIVE (présence), coffres de jetons, propositions de cadeaux à valider. Idempotent.
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'LIVE',
  status text not null default 'live' check (status in ('live','ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_live_sessions_status on public.live_sessions(status, started_at desc);
-- Un seul LIVE actif par hôte (garde-fou en base, pas seulement dans le code).
create unique index if not exists uq_live_one_active_per_host on public.live_sessions(host_id) where status = 'live';

create table if not exists public.live_participants (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.chests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  depositor_id uuid not null references public.profiles(id) on delete restrict,
  max_claimants int not null check (max_claimants >= 1),
  share_tokens int not null check (share_tokens >= 1),
  reserved_tokens int not null check (reserved_tokens = share_tokens * max_claimants),
  claimed_count int not null default 0 check (claimed_count >= 0 and claimed_count <= max_claimants),
  refunded_tokens int not null default 0 check (refunded_tokens >= 0),
  status text not null default 'open' check (status in ('open','closed')),
  min_presence_seconds int not null default 0,
  min_account_age_minutes int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz
);
create index if not exists idx_chests_session on public.chests(session_id, status);

-- PRIMARY KEY (chest_id, user_id) = impossible de réclamer deux fois le même coffre, même en requêtes simultanées.
create table if not exists public.chest_claims (
  chest_id uuid not null references public.chests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tokens int not null check (tokens >= 1),
  created_at timestamptz not null default now(),
  primary key (chest_id, user_id)
);

create table if not exists public.gift_proposals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🎁',
  tokens int not null check (tokens >= 1),
  source text not null default 'ai' check (source in ('ai','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null
);
create index if not exists idx_gift_proposals_status on public.gift_proposals(status, created_at desc);
