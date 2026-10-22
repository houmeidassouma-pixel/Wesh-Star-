-- Wesh Star IA: persist the user's target publishing platform so generation and GPU rendering use the matching aspect ratio.
alter table public.generations add column if not exists target_platform text not null default 'tiktok';
