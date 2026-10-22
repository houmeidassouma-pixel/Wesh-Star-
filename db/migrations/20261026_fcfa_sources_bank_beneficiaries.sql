-- Wesh Star IA V29 : encaissements FCFA (pièces + abonnements) dans la trésorerie,
-- et bénéficiaires bancaires. Entièrement idempotent.

-- 1) Origine de chaque encaissement FCFA (une source ne peut être créditée qu'une fois).
alter table public.treasury_ledger add column if not exists source text;
alter table public.treasury_ledger add column if not exists source_id uuid;
create unique index if not exists uq_treasury_source
  on public.treasury_ledger(source, source_id) where kind = 'payment_in' and source is not null;

-- 2) Achats de pièces payés via un prestataire local (Flutterwave).
alter table public.coin_purchases add column if not exists provider text;
alter table public.coin_purchases add column if not exists provider_ref text;
alter table public.coin_purchases add column if not exists amount_expected numeric(14,2);
create unique index if not exists uq_coin_purchases_provider_ref on public.coin_purchases(provider_ref) where provider_ref is not null;

-- 3) Abonnements payés via un prestataire local (paiement unique, sans prélèvement automatique).
alter table public.manual_subscription_payments add column if not exists provider text;
alter table public.manual_subscription_payments add column if not exists provider_ref text;
alter table public.manual_subscription_payments add column if not exists amount_expected numeric(14,2);
create unique index if not exists uq_manual_sub_provider_ref on public.manual_subscription_payments(provider_ref) where provider_ref is not null;

-- 4) Bénéficiaires : ajout du compte bancaire (IBAN / RIB / numéro de compte).
alter table public.treasury_beneficiaries add column if not exists account text;
alter table public.treasury_beneficiaries alter column phone drop not null;
alter table public.treasury_beneficiaries drop constraint if exists treasury_beneficiaries_operator_check;
alter table public.treasury_beneficiaries add constraint treasury_beneficiaries_operator_check
  check (operator in ('mtn','moov','autre','banque'));
alter table public.treasury_beneficiaries drop constraint if exists treasury_beneficiaries_target_check;
alter table public.treasury_beneficiaries add constraint treasury_beneficiaries_target_check
  check (phone is not null or account is not null);
create unique index if not exists uq_treasury_beneficiary_account
  on public.treasury_beneficiaries(account, operator) where account is not null;
