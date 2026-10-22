-- Allow the built-in 30-minute subscription to spend its full monthly video-time quota in one day.
-- This removes the default 5-minute daily cap that prevented videos longer than 5-10 minutes.
-- The marker makes this one-time default correction safe on subsequent migrations.
DO $$
DECLARE
  existing_value jsonb;
  updated_tiers jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'wesh_v21_long_video_daily_quota_migrated') THEN
    SELECT value INTO existing_value FROM public.site_settings WHERE key = 'global';
    IF existing_value IS NOT NULL AND jsonb_typeof(existing_value #> '{plans,monthlyTiers}') = 'array' THEN
      SELECT jsonb_agg(
        CASE
          WHEN tier->>'id' = 'pro_15m' AND COALESCE((tier->>'dailyMinutes')::int, 5) = 5
            THEN jsonb_set(tier, '{dailyMinutes}', '15'::jsonb, true)
          WHEN tier->>'id' = 'pro_30m' AND COALESCE((tier->>'dailyMinutes')::int, 5) = 5
            THEN jsonb_set(tier, '{dailyMinutes}', '30'::jsonb, true)
          ELSE tier
        END ORDER BY ord
      ) INTO updated_tiers
      FROM jsonb_array_elements(existing_value #> '{plans,monthlyTiers}') WITH ORDINALITY AS rows(tier, ord);
      UPDATE public.site_settings
         SET value = jsonb_set(value, '{plans,monthlyTiers}', COALESCE(updated_tiers, '[]'::jsonb), true), updated_at = now()
       WHERE key = 'global';
    END IF;
    INSERT INTO public.site_settings (key, value, updated_at)
      VALUES ('wesh_v21_long_video_daily_quota_migrated', '{"done":true}'::jsonb, now())
      ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
