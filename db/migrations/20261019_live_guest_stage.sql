-- Optional LIVE stage with up to nine invited guests. This is stage membership metadata;
-- real-time audio/video transport still requires a streaming/WebRTC provider or self-hosted SFU.
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS live_mode text NOT NULL DEFAULT 'solo',
  ADD COLUMN IF NOT EXISTS guest_limit smallint NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_mode_check CHECK (live_mode IN ('solo','guests'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_guest_limit_check CHECK (guest_limit BETWEEN 0 AND 9);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.live_guests (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  PRIMARY KEY (session_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_live_guests_session_status ON public.live_guests(session_id,status,requested_at);
