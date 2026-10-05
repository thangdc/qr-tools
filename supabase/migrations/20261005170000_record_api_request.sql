create or replace function public.record_api_request(
  p_api_key_id uuid,
  p_endpoint text,
  p_method text,
  p_status_code integer,
  p_success boolean,
  p_duration_ms integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.api_request_logs (
    api_key_id, endpoint, method, status_code, success, duration_ms
  )
  values (
    p_api_key_id, p_endpoint, p_method, p_status_code, p_success, p_duration_ms
  );
$$;

revoke all on function public.record_api_request(uuid, text, text, integer, boolean, integer) from public;
grant execute on function public.record_api_request(uuid, text, text, integer, boolean, integer) to postgres;
