-- V15: Les jetons IA sont une unité de temps (1 jeton = 10 secondes).
-- Run the legacy chest refund only once, before adding the V15 creator_pct marker.
-- This keeps the migration safe when the deploy script re-applies all SQL files.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='chests' AND column_name='creator_pct'
  ) THEN
    -- V14 used 30 seconds per generation token; return unclaimed portions to generation credits.
    UPDATE public.profiles p
    SET hour_credits_seconds = COALESCE(p.hour_credits_seconds, 0) + legacy.refund_tokens * 30
    FROM (
      SELECT depositor_id, SUM(GREATEST(0, max_claimants - claimed_count) * share_tokens)::bigint AS refund_tokens
      FROM public.chests WHERE status = 'open' GROUP BY depositor_id
    ) legacy
    WHERE p.id = legacy.depositor_id AND legacy.refund_tokens > 0;
    UPDATE public.chests
    SET status = 'closed', refunded_tokens = GREATEST(0, max_claimants - claimed_count) * share_tokens, closed_at = now()
    WHERE status = 'open';
  END IF;
END $$;

-- Les pièces cadeaux/LIVE utilisent exclusivement coin_ledger, jamais hour_credits_seconds.
ALTER TABLE public.chests
  ADD COLUMN IF NOT EXISTS debited_purchased_coins bigint NOT NULL DEFAULT 0 CHECK (debited_purchased_coins >= 0),
  ADD COLUMN IF NOT EXISTS debited_earned_coins bigint NOT NULL DEFAULT 0 CHECK (debited_earned_coins >= 0),
  ADD COLUMN IF NOT EXISTS creator_pct numeric(5,2) NOT NULL DEFAULT 60 CHECK (creator_pct >= 0 AND creator_pct <= 100);

-- Ajouter les opérations du portefeuille liées aux coffres au registre comptable.
ALTER TABLE public.coin_ledger DROP CONSTRAINT IF EXISTS coin_ledger_kind_check;
ALTER TABLE public.coin_ledger ADD CONSTRAINT coin_ledger_kind_check
  CHECK (kind IN ('purchase','gift_sent','gift_received','platform_gift_share','payout_reserve','payout_refund','admin_adjustment','chest_deposit','chest_received','chest_platform_share','chest_refund'));

COMMENT ON COLUMN public.chests.share_tokens IS 'Nombre brut de pièces par participant (nom historique conservé). Les pièces ne sont pas des jetons IA.';
COMMENT ON COLUMN public.profiles.hour_credits_seconds IS 'Crédits de génération IA conservés en secondes; 1 jeton IA affiché = 10 secondes.';
