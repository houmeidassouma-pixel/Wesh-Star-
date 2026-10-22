-- V33 : retrait de la réserve créateurs par l'admin (écriture comptable, avec référence obligatoire côté API).
alter table public.platform_money_ledger drop constraint if exists platform_money_ledger_kind_check;
alter table public.platform_money_ledger add constraint platform_money_ledger_kind_check
  check (kind in ('coin_purchase_platform_share','coin_purchase_creator_reserve','earned_coin_regift_platform_share','creator_payout_paid','platform_withdrawal','admin_adjustment','creator_reserve_withdrawal'));
