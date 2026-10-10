-- Restrict API request telemetry writes to the trusted API database role.
-- The function is SECURITY DEFINER and accepts an api_key_id argument, so it must
-- not be executable by browser-facing Supabase roles.
revoke execute on function public.record_api_request(
  uuid, text, text, integer, boolean, integer
) from public, anon, authenticated;

-- The function body schema-qualifies api_request_logs, so an empty search_path
-- is safe and avoids name-resolution surprises inside SECURITY DEFINER code.
alter function public.record_api_request(
  uuid, text, text, integer, boolean, integer
) set search_path = '';

-- Keep the trusted direct database connection able to record API telemetry.
grant execute on function public.record_api_request(
  uuid, text, text, integer, boolean, integer
) to postgres;

-- Fail the migration if a browser-facing role can still execute the RPC.
do $$
begin
  if has_function_privilege(
    'anon',
    'public.record_api_request(uuid, text, text, integer, boolean, integer)',
    'EXECUTE'
  ) then
    raise exception 'anon must not be able to execute public.record_api_request';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.record_api_request(uuid, text, text, integer, boolean, integer)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not be able to execute public.record_api_request';
  end if;

  if not has_function_privilege(
    'postgres',
    'public.record_api_request(uuid, text, text, integer, boolean, integer)',
    'EXECUTE'
  ) then
    raise exception 'postgres must retain execute permission for API telemetry';
  end if;
end;
$$;
