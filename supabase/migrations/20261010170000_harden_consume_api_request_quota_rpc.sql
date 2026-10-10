-- Harden the SECURITY DEFINER quota function against search_path object shadowing.
-- All application tables referenced by the function are schema-qualified.
alter function public.consume_api_request_quota(uuid)
  set search_path = '';

revoke execute on function public.consume_api_request_quota(uuid)
  from public, anon, authenticated;

grant execute on function public.consume_api_request_quota(uuid)
  to postgres, service_role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.consume_api_request_quota(uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon must not be able to execute public.consume_api_request_quota';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.consume_api_request_quota(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not be able to execute public.consume_api_request_quota';
  end if;

  if not has_function_privilege(
    'postgres',
    'public.consume_api_request_quota(uuid)',
    'EXECUTE'
  ) then
    raise exception 'postgres must retain execute permission for API quota enforcement';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.consume_api_request_quota(uuid)',
    'EXECUTE'
  ) then
    raise exception 'service_role must retain execute permission for API quota enforcement';
  end if;
end;
$$;
