-- V8 Creator : sons réutilisables + favoris, cadeaux en jetons (partage 60/40), effets payants.
-- Idempotent : peut être rejoué sans effet de bord.

-- ---------- Sons importés par les créateurs ----------
create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Son original',
  audio_path text not null,
  mime text not null default 'audio/mpeg',
  allow_reuse boolean not null default true,
  rights_confirmed_at timestamptz not null,
  status text not null default 'active' check (status in ('active','hidden','removed')),
  uses_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_sounds_owner on public.sounds(owner_id, created_at desc);

create table if not exists public.sound_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sound_id uuid not null references public.sounds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, sound_id)
);
create index if not exists idx_sound_favorites_user on public.sound_favorites(user_id, created_at desc);

alter table public.community_posts add column if not exists sound_id uuid references public.sounds(id) on delete set null;
create index if not exists idx_community_posts_sound on public.community_posts(sound_id) where sound_id is not null;

-- ---------- Cadeaux (en jetons) ----------
-- Journal append-only. Les parts créateur / plateforme et le pourcentage appliqué sont figés
-- au moment du cadeau : changer le pourcentage plus tard ne modifie jamais l'historique.
-- live_session_id est réservé pour la future version Live (aucun Live n'existe encore).
create table if not exists public.gift_transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete restrict,
  receiver_id uuid not null references public.profiles(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete set null,
  live_session_id uuid,
  gift_id text not null,
  gift_name text not null,
  tokens int not null check (tokens > 0),
  creator_pct numeric(5,2) not null check (creator_pct >= 0 and creator_pct <= 100),
  creator_tokens int not null check (creator_tokens >= 0),
  platform_tokens int not null check (platform_tokens >= 0),
  created_at timestamptz not null default now(),
  check (creator_tokens + platform_tokens = tokens),
  check (sender_id <> receiver_id)
);
create index if not exists idx_gift_tx_receiver on public.gift_transactions(receiver_id, created_at desc);
create index if not exists idx_gift_tx_sender on public.gift_transactions(sender_id, created_at desc);
create index if not exists idx_gift_tx_post on public.gift_transactions(post_id);

-- ---------- Effets payants débloqués ----------
create table if not exists public.effect_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  effect_id text not null,
  tokens_paid int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, effect_id)
);

-- ---------- Montage automatique : suivi des jobs ----------
alter table public.generations add column if not exists job_kind text;
create index if not exists idx_generations_kind on public.generations(job_kind, status) where job_kind is not null;
