-- Separate coin economy for gifts. Generation credits are not used as money/coins.
-- Append-only ledger; balances are the sum of deltas. Idempotency keys prevent duplicate credits.
create table if not exists public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('user','platform')),
  wallet_type text not null check (wallet_type in ('coins','earnings','platform')) ,
  user_id uuid references public.profiles(id) on delete restrict,
  delta bigint not null check (delta <> 0),
  kind text not null check (kind in ('purchase','gift_sent','gift_received','platform_gift_share','payout_reserve','payout_refund','admin_adjustment')),
  entry_key text not null unique,
  reference_id text,
  note text,
  created_at timestamptz not null default now(),
  check ((account_type='user' and user_id is not null and wallet_type in ('coins','earnings')) or (account_type='platform' and user_id is null and wallet_type='platform'))
);
create index if not exists idx_coin_ledger_user on public.coin_ledger(user_id, wallet_type, created_at desc) where user_id is not null;
create index if not exists idx_coin_ledger_platform on public.coin_ledger(created_at desc) where account_type='platform';

create table if not exists public.coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  pack_id text not null,
  coins bigint not null check (coins > 0),
  price_eur numeric(10,2) not null check (price_eur > 0),
  currency text not null default 'EUR',
  stripe_session_id text unique,
  payment_intent_id text,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_coin_purchases_user on public.coin_purchases(user_id, created_at desc);

create table if not exists public.creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  coins bigint not null check (coins > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  payout_reference text,
  admin_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_creator_payout_status on public.creator_payout_requests(status, created_at desc);
