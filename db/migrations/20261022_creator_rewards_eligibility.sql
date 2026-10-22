-- Wesh Star Creator Rewards: 30-day eligibility metrics and application review.
-- Views are deduplicated per signed-in viewer and post; qualified only after 5 seconds.
alter table public.profiles add column if not exists creator_age_verified boolean not null default false;
alter table public.profiles add column if not exists creator_monetization_status text not null default 'not_applied';
alter table public.profiles drop constraint if exists profiles_creator_monetization_status_check;
alter table public.profiles add constraint profiles_creator_monetization_status_check
  check (creator_monetization_status in ('not_applied','pending','approved','rejected','suspended'));

create table if not exists public.creator_video_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  max_watched_seconds numeric(10,2) not null default 0,
  qualified_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(post_id, viewer_id),
  check (creator_id <> viewer_id)
);
create index if not exists idx_creator_views_qualified_date on public.creator_video_views(qualified_at desc) where qualified_at is not null;
create index if not exists idx_creator_views_creator_date on public.creator_video_views(creator_id, qualified_at desc) where qualified_at is not null;

create table if not exists public.creator_monetization_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text not null default ''
);
create index if not exists idx_creator_monetization_apps_status on public.creator_monetization_applications(status, submitted_at desc);
