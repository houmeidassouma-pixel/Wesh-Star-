-- Wesh Star Shop MVP: product listings and order requests.
-- Payments and shipping labels are intentionally not activated by this migration.
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 5 and 4000),
  category text not null default 'other' check (char_length(category) <= 60),
  image_url text,
  price_minor integer not null check (price_minor > 0),
  currency text not null default 'EUR' check (currency in ('EUR','XOF','USD','GBP')),
  country_code char(2) not null,
  stock_quantity integer not null default 1 check (stock_quantity between 0 and 100000),
  shipping_countries text[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shop_products drop constraint if exists shop_products_stock_quantity_check;
alter table public.shop_products add constraint shop_products_stock_quantity_check check (stock_quantity between 0 and 100000);
create index if not exists idx_shop_products_active_created on public.shop_products(status, created_at desc);
create index if not exists idx_shop_products_seller on public.shop_products(seller_id, created_at desc);
create index if not exists idx_shop_products_country on public.shop_products(country_code, status);

create table if not exists public.shop_order_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 100000),
  unit_price_minor integer not null check (unit_price_minor > 0),
  currency text not null check (currency in ('EUR','XOF','USD','GBP')),
  shipping_country char(2) not null,
  buyer_message text not null default '' check (char_length(buyer_message) <= 1000),
  status text not null default 'requested' check (status in ('requested','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);
create index if not exists idx_shop_orders_buyer on public.shop_order_requests(buyer_id, created_at desc);
create index if not exists idx_shop_orders_seller on public.shop_order_requests(seller_id, created_at desc);
