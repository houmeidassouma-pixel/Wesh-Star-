-- Optional visual assets for custom/approved gifts. Blank URLs keep emoji-only gifts compatible.
ALTER TABLE public.gift_proposals ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.gift_proposals ADD COLUMN IF NOT EXISTS animation_url text;

-- Enable background proposals once for existing installs, but never override a later admin choice.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'wesh_v16_gift_proposals_auto_enabled') THEN
    UPDATE public.site_settings
       SET value = jsonb_set(value, '{aiProposalsEnabled}', 'true'::jsonb, true), updated_at = now()
     WHERE key = 'creator_economy';
    INSERT INTO public.site_settings (key, value, updated_at)
      VALUES ('wesh_v16_gift_proposals_auto_enabled', '{"enabled":true}'::jsonb, now())
      ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
