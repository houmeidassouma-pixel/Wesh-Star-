-- Wesh Star IA: independent community auto-publishing + cross-posting flags.
-- Safe to run repeatedly on an existing self-hosted PostgreSQL database.
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS auto_publish_to_community boolean NOT NULL DEFAULT false;
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS auto_publish_all_platforms boolean NOT NULL DEFAULT false;
