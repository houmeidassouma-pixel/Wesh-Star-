-- Wesh Star IA Community Feed + owner-controlled rollout + account controls.
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
create index if not exists idx_community_posts_user on public.community_posts(user_id, created_at desc);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id, user_id)
);
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_community_comments_post on public.community_comments(post_id, created_at desc);

create table if not exists public.community_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  check (follower_id <> following_id)
);
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(post_id, reporter_id)
);

-- Owner-only feature flags. Defaults are deliberately OFF for community publishing.
-- Existing profile "blocked" remains the per-account disable flag.
