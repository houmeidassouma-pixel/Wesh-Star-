-- Creator ad revenue allocations. Only revenue actually received and entered by an admin is distributable.
-- The provider does not automatically report earnings to this app in this version.
ALTER TABLE public.coin_ledger DROP CONSTRAINT IF EXISTS coin_ledger_kind_check;
ALTER TABLE public.coin_ledger ADD CONSTRAINT coin_ledger_kind_check
  CHECK (kind in ('purchase','gift_sent','gift_received','platform_gift_share','payout_reserve','payout_refund','admin_adjustment','chest_deposit','chest_received','chest_platform_share','chest_refund','conversion_reserve','conversion_refund','ad_revenue_share'));

CREATE TABLE IF NOT EXISTS public.creator_ad_revenue_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  net_revenue_cents bigint NOT NULL CHECK (net_revenue_cents >= 0),
  creator_share_pct integer NOT NULL CHECK (creator_share_pct between 0 and 100),
  creator_pool_cents bigint NOT NULL CHECK (creator_pool_cents >= 0),
  source_reference text NOT NULL CHECK (char_length(source_reference) between 3 and 160),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE(period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.creator_ad_revenue_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.creator_ad_revenue_periods(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  qualified_views bigint NOT NULL CHECK (qualified_views > 0),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, creator_id)
);
CREATE INDEX IF NOT EXISTS idx_creator_ad_allocations_creator ON public.creator_ad_revenue_allocations(creator_id, created_at DESC);
