-- Revenue foundation for QR Tools.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  product_code text not null,
  plan text not null,
  amount integer not null check (amount > 0),
  currency text not null default 'VND',
  email text not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','expired')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_email_idx on public.orders(lower(email));

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_transaction_id text,
  order_code text not null references public.orders(order_code),
  amount integer not null,
  transfer_type text,
  content text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_transaction_id)
);

alter table public.orders enable row level security;
alter table public.payment_transactions enable row level security;
