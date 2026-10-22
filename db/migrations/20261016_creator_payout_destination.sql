-- Store payout destination securely for admin review. These details are private and must never be exposed publicly.
alter table public.creator_payout_requests add column if not exists payout_method text;
alter table public.creator_payout_requests add column if not exists payout_destination text;
alter table public.creator_payout_requests drop constraint if exists creator_payout_method_check;
alter table public.creator_payout_requests add constraint creator_payout_method_check check (payout_method is null or payout_method in ('bank_transfer','paypal','mobile_money'));
