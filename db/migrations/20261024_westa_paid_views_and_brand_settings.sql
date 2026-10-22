-- Westa V27: admin pricing for qualified sponsored views and unique view delivery tracking.
ALTER TABLE public.promotion_campaigns DROP CONSTRAINT IF EXISTS promotion_campaigns_budget_eur_check;
ALTER TABLE public.promotion_campaigns ADD CONSTRAINT promotion_campaigns_budget_eur_check CHECK (budget_eur >= 1 AND budget_eur <= 100000);
ALTER TABLE public.promotion_campaigns ADD COLUMN IF NOT EXISTS target_views bigint NOT NULL DEFAULT 0 CHECK (target_views >= 0);
CREATE TABLE IF NOT EXISTS public.promotion_impressions (
  campaign_id uuid NOT NULL REFERENCES public.promotion_campaigns(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_promotion_impressions_campaign ON public.promotion_impressions(campaign_id, created_at DESC);
