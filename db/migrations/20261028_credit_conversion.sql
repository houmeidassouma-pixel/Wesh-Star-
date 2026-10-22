-- V34 : conversion des gains créateurs (pièces gagnées) en crédits vidéo IA, validée par l'admin.
alter table public.coin_ledger drop constraint if exists coin_ledger_kind_check;
alter table public.coin_ledger add constraint coin_ledger_kind_check
  check (kind in ('purchase','gift_sent','gift_received','platform_gift_share','payout_reserve','payout_refund','admin_adjustment','chest_deposit','chest_received','chest_platform_share','chest_refund','conversion_reserve','conversion_refund','ad_revenue_share'));

create table if not exists public.credit_conversion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  coins bigint not null check (coins > 0),
  credits bigint not null check (credits > 0),
  seconds bigint not null check (seconds > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_credit_conversion_status on public.credit_conversion_requests(status, created_at desc);
create index if not exists idx_credit_conversion_user on public.credit_conversion_requests(user_id, created_at desc);
