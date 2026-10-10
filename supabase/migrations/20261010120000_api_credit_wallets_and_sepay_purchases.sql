-- API credits purchased through SePay bank-transfer QR.
-- All balance changes happen in the payment RPC, never from the browser.
create table if not exists public.api_credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits_balance bigint not null default 0 check (credits_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique references public.orders(order_code) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  pack_code text not null check (pack_code in ('starter','growth','business')),
  credits bigint not null check (credits > 0),
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','expired','cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists api_credit_purchases_user_created_idx
  on public.api_credit_purchases(user_id, created_at desc);

alter table public.api_credit_wallets enable row level security;
alter table public.api_credit_purchases enable row level security;

revoke all on public.api_credit_wallets from anon, authenticated;
revoke all on public.api_credit_purchases from anon, authenticated;

create or replace function public.complete_api_credit_order(
  p_order_code text,
  p_transaction_id text,
  p_transaction_amount bigint,
  p_payment_reference text default null
)
returns table(completed boolean, credits_added bigint, balance bigint, already_paid boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.api_credit_purchases%rowtype;
  v_order public.orders%rowtype;
  v_balance bigint;
begin
  select * into v_purchase
  from public.api_credit_purchases
  where order_code = p_order_code
  for update;

  if not found then
    raise exception 'API credit purchase not found';
  end if;

  select * into v_order
  from public.orders
  where order_code = p_order_code
  for update;

  if not found or v_order.product_code <> 'qr-tools-api-credits' then
    raise exception 'Invalid API credit order';
  end if;

  if v_purchase.status = 'paid' or v_order.status = 'paid' then
    select coalesce(w.credits_balance, 0) into v_balance
    from public.api_credit_wallets w where w.user_id = v_purchase.user_id;
    return query select true, v_purchase.credits, coalesce(v_balance, 0), true;
    return;
  end if;

  if v_order.status <> 'pending' or v_purchase.status <> 'pending' then
    raise exception 'API credit order is not pending';
  end if;
  if p_transaction_amount <> v_purchase.amount or p_transaction_amount <> v_order.amount then
    raise exception 'Payment amount does not match order';
  end if;

  update public.orders
  set status = 'paid',
      payment_method = 'sepay',
      payment_reference = coalesce(nullif(p_payment_reference, ''), p_transaction_id),
      paid_at = now(),
      updated_at = now()
  where order_code = p_order_code;

  update public.api_credit_purchases
  set status = 'paid', paid_at = now()
  where order_code = p_order_code;

  insert into public.api_credit_wallets(user_id, credits_balance, updated_at)
  values (v_purchase.user_id, v_purchase.credits, now())
  on conflict (user_id) do update
    set credits_balance = public.api_credit_wallets.credits_balance + excluded.credits_balance,
        updated_at = now()
  returning credits_balance into v_balance;

  return query select true, v_purchase.credits, v_balance, false;
end;
$$;

revoke all on function public.complete_api_credit_order(text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.complete_api_credit_order(text,text,bigint,text) to service_role;

create or replace function public.consume_api_request_quota(p_api_key_id uuid)
returns table(allowed boolean, reason text, reset_at timestamptz, remaining integer, rate_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.api_keys%rowtype;
  v_now timestamptz := clock_timestamp();
  v_minute timestamptz := date_trunc('minute', clock_timestamp() at time zone 'utc') at time zone 'utc';
  v_day date := (clock_timestamp() at time zone 'utc')::date;
  v_month date := date_trunc('month', clock_timestamp() at time zone 'utc')::date;
  v_reset timestamptz;
  v_over_free_quota boolean := false;
  v_balance bigint := 0;
begin
  select * into v_key
  from public.api_keys
  where id = p_api_key_id
  for update;

  if not found or v_key.status <> 'active'
     or (v_key.expires_at is not null and v_key.expires_at <= v_now) then
    return query select false, 'invalid_key'::text, null::timestamptz, 0, null::integer;
    return;
  end if;

  if v_key.minute_window is distinct from v_minute then
    v_key.minute_window := v_minute;
    v_key.minute_usage_count := 0;
  end if;
  if v_key.daily_usage_date is distinct from v_day then
    v_key.daily_usage_date := v_day;
    v_key.daily_usage_count := 0;
  end if;
  if v_key.monthly_usage_month is distinct from v_month then
    v_key.monthly_usage_month := v_month;
    v_key.monthly_usage_count := 0;
  end if;

  if v_key.minute_usage_count >= v_key.rate_limit_per_minute then
    v_reset := v_minute + interval '1 minute';
    return query select false, 'minute'::text, v_reset, 0, v_key.rate_limit_per_minute;
    return;
  end if;

  if v_key.daily_request_limit is not null
     and v_key.daily_usage_count >= v_key.daily_request_limit then
    v_over_free_quota := true;
    v_reset := ((v_day + 1)::timestamp at time zone 'utc');
  end if;
  if v_key.monthly_request_limit is not null
     and v_key.monthly_usage_count >= v_key.monthly_request_limit then
    v_over_free_quota := true;
    v_reset := ((v_month + interval '1 month')::timestamp at time zone 'utc');
  end if;

  if v_over_free_quota then
    -- Only customer-owned keys can spend prepaid credits. System keys have no wallet.
    if v_key.user_id is null then
      return query select false,
        case when v_key.daily_request_limit is not null and v_key.daily_usage_count >= v_key.daily_request_limit
          then 'daily'::text else 'monthly'::text end,
        v_reset, 0, v_key.rate_limit_per_minute;
      return;
    end if;

    update public.api_credit_wallets
    set credits_balance = credits_balance - 1, updated_at = now()
    where user_id = v_key.user_id and credits_balance > 0
    returning credits_balance into v_balance;

    if not found then
      return query select false,
        case when v_key.daily_request_limit is not null and v_key.daily_usage_count >= v_key.daily_request_limit
          then 'daily'::text else 'monthly'::text end,
        v_reset, 0, v_key.rate_limit_per_minute;
      return;
    end if;
  end if;

  v_key.minute_usage_count := v_key.minute_usage_count + 1;
  v_key.daily_usage_count := v_key.daily_usage_count + 1;
  v_key.monthly_usage_count := v_key.monthly_usage_count + 1;
  update public.api_keys set
    minute_window = v_key.minute_window,
    minute_usage_count = v_key.minute_usage_count,
    daily_usage_date = v_key.daily_usage_date,
    daily_usage_count = v_key.daily_usage_count,
    monthly_usage_month = v_key.monthly_usage_month,
    monthly_usage_count = v_key.monthly_usage_count
  where id = p_api_key_id;

  return query select true, null::text, null::timestamptz,
    greatest(0, v_key.rate_limit_per_minute - v_key.minute_usage_count),
    v_key.rate_limit_per_minute;
end;
$$;

revoke all on function public.consume_api_request_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_api_request_quota(uuid) to service_role;
