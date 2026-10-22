-- Wesh Star IA: blue verified badge, granted manually by the Admin only.
alter table public.profiles add column if not exists verified_badge boolean not null default false;
create index if not exists idx_profiles_verified_badge on public.profiles(verified_badge) where verified_badge;
