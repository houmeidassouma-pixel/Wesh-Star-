-- Optional reusable community sound attached to a generation job.
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS sound_id uuid;
