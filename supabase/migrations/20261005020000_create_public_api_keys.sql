create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  rate_limit_per_minute integer not null default 60
    check (rate_limit_per_minute between 1 and 600),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;

revoke all on public.api_keys from anon, authenticated;

create index if not exists api_keys_key_hash_idx
  on public.api_keys (key_hash);

create index if not exists api_keys_status_idx
  on public.api_keys (status);
