-- Wesh Star IA V28: restore the original brand and set configurable feed-ad limits.
-- Safe for existing installs: only replaces the temporary default name if it is still present.
UPDATE public.site_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{site,name}', '"Wesh Star IA"'::jsonb, true),
    '{site,ads,feedAdEveryPosts}', '5'::jsonb, true
  ),
  '{site,ads,maxFeedAdsPerVisit}', '3'::jsonb, true
), updated_at = now()
WHERE key = 'global'
  AND value #>> '{site,name}' = 'Westa IA';

-- Add the ad controls even if the existing brand name was already customized.
UPDATE public.site_settings
SET value = jsonb_set(
  jsonb_set(value, '{site,ads,feedAdEveryPosts}', COALESCE(value #> '{site,ads,feedAdEveryPosts}', '5'::jsonb), true),
  '{site,ads,maxFeedAdsPerVisit}', COALESCE(value #> '{site,ads,maxFeedAdsPerVisit}', '3'::jsonb), true
), updated_at = now()
WHERE key = 'global';
