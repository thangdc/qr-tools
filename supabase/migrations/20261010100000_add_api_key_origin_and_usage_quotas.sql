alter table public.api_keys
  add column if not exists allowed_origins text[] not null default '{}',
  add column if not exists daily_request_limit integer
    check (daily_request_limit is null or daily_request_limit > 0),
  add column if not exists monthly_request_limit integer
    check (monthly_request_limit is null or monthly_request_limit > 0),
  add column if not exists minute_window timestamptz,
  add column if not exists minute_usage_count integer not null default 0,
  add column if not exists daily_usage_date date,
  add column if not exists daily_usage_count integer not null default 0,
  add column if not exists monthly_usage_month date,
  add column if not exists monthly_usage_count integer not null default 0;

comment on column public.api_keys.allowed_origins is
  'Optional exact browser Origin allowlist. Empty means unrestricted for backward compatibility; set it for browser-embedded keys.';
comment on column public.api_keys.daily_request_limit is
  'Optional per-key request quota per UTC calendar day.';
comment on column public.api_keys.monthly_request_limit is
  'Optional per-key request quota per UTC calendar month.';

create or replace function public.consume_api_request_quota(p_api_key_id uuid)
returns table (
  allowed boolean,
  reason text,
  reset_at timestamptz,
  remaining integer,
  rate_limit integer
)
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
    v_reset := ((v_day + 1)::timestamp at time zone 'utc');
    return query select false, 'daily'::text, v_reset, 0, v_key.rate_limit_per_minute;
    return;
  end if;
  if v_key.monthly_request_limit is not null
     and v_key.monthly_usage_count >= v_key.monthly_request_limit then
    v_reset := ((v_month + interval '1 month')::timestamp at time zone 'utc');
    return query select false, 'monthly'::text, v_reset, 0, v_key.rate_limit_per_minute;
    return;
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
grant execute on function public.consume_api_request_quota(uuid) to postgres, service_role;
