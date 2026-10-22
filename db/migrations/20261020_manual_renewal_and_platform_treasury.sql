-- One-time manual renewals only; this table stores expected amounts and idempotency.
CREATE TABLE IF NOT EXISTS public.manual_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tier text NOT NULL,
  period text NOT NULL CHECK (period IN ('month','year')),
  period_end timestamptz NOT NULL,
  minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 600),
  amount_eur numeric(10,2) NOT NULL CHECK (amount_eur > 0),
  currency text NOT NULL DEFAULT 'EUR',
  stripe_session_id text UNIQUE,
  payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_manual_subscription_user ON public.manual_subscription_payments(user_id, created_at DESC);

-- Accounting entries only: these are not a bank balance and do not move money out of Stripe.
CREATE TABLE IF NOT EXISTS public.platform_money_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_cents bigint NOT NULL CHECK (amount_cents <> 0),
  currency text NOT NULL DEFAULT 'EUR',
  kind text NOT NULL CHECK (kind IN ('coin_purchase_platform_share','coin_purchase_creator_reserve','earned_coin_regift_platform_share','creator_payout_paid','platform_withdrawal','admin_adjustment')),
  entry_key text NOT NULL UNIQUE,
  reference_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_money_ledger_created ON public.platform_money_ledger(created_at DESC);


-- Host-appointed LIVE moderators and per-session user blocks.
CREATE TABLE IF NOT EXISTS public.live_session_moderators (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.live_session_blocks (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id,user_id)
);
