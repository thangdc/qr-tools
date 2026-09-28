-- Reuse a previously deactivated device row when re-activating the same license/device.
-- activations_license_id_device_id_key is unique across all rows, including deactivated rows.
create or replace function public.activate_license_atomic(
  p_license_id uuid,
  p_device_id text,
  p_activation_token_hash text
)
returns table(activation_token_hash text, active_devices integer, max_devices integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_max integer;
  v_active integer;
  v_id uuid;
begin
  select l.max_devices
    into v_max
  from public.licenses l
  where l.id = p_license_id
    and l.status = 'active'
    and (l.expires_at is null or l.expires_at > now())
  for update;

  if not found then
    raise exception 'LICENSE_INVALID';
  end if;

  -- Reuse the currently active row when this device is already active.
  select a.id
    into v_id
  from public.activations a
  where a.license_id = p_license_id
    and a.device_id = p_device_id
    and a.deactivated_at is null
  order by a.activated_at desc
  limit 1
  for update;

  if v_id is null then
    select count(*)
      into v_active
    from public.activations a
    where a.license_id = p_license_id
      and a.deactivated_at is null;

    if v_active >= greatest(1, coalesce(v_max, 2)) then
      raise exception 'DEVICE_LIMIT';
    end if;

    -- A historical/deactivated row may already exist because (license_id, device_id)
    -- is globally unique. Reuse it instead of inserting a duplicate row.
    select a.id
      into v_id
    from public.activations a
    where a.license_id = p_license_id
      and a.device_id = p_device_id
    order by a.activated_at desc
    limit 1
    for update;

    if v_id is not null then
      update public.activations
      set activation_token_hash = p_activation_token_hash,
          activated_at = now(),
          last_seen_at = now(),
          deactivated_at = null
      where id = v_id;
    else
      insert into public.activations(
        license_id,
        device_id,
        activation_token_hash,
        activated_at,
        last_seen_at
      )
      values (
        p_license_id,
        p_device_id,
        p_activation_token_hash,
        now(),
        now()
      );
    end if;
  else
    update public.activations
    set activation_token_hash = p_activation_token_hash,
        activated_at = now(),
        last_seen_at = now(),
        deactivated_at = null
    where id = v_id;
  end if;

  select count(*)
    into v_active
  from public.activations a
  where a.license_id = p_license_id
    and a.deactivated_at is null;

  return query
  select p_activation_token_hash,
         v_active,
         greatest(1, coalesce(v_max, 2));
end;
$function$;
