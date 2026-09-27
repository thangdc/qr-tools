-- Atomic completion of a SePay Payment Gateway order.
create or replace function public.complete_qr_tools_order(
  p_order_code text,
  p_transaction_id text,
  p_transaction_amount integer,
  p_payment_method text,
  p_payment_reference text
)
returns table(license_key text, license_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_license_key text;
  v_license_hash text;
  v_expires_at timestamptz;
begin
  select *
    into v_order
    from public.orders
   where order_code = upper(trim(p_order_code))
   for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'paid' then
    v_license_key := coalesce(v_order.metadata->>'licenseKey', '');
    v_expires_at := nullif(v_order.metadata->>'licenseExpiresAt', '')::timestamptz;
    if v_license_key = '' then
      raise exception 'PAID_ORDER_MISSING_LICENSE';
    end if;
    return query select v_license_key, v_expires_at;
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;

  if p_transaction_amount <> v_order.amount then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  if v_order.product_code <> 'vietsoft-qr' then
    raise exception 'PRODUCT_MISMATCH';
  end if;

  select * into v_product
    from public.products
   where code = 'vietsoft-qr'
   limit 1;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  v_license_key := 'QRPRO-' || upper(replace(gen_random_uuid()::text, '-', ''));
  v_license_hash := encode(digest(v_license_key, 'sha256'), 'hex');
  v_expires_at := now() + case when v_order.plan = 'yearly' then interval '365 days' else interval '31 days' end;

  insert into public.licenses (
    product_id, license_key_hash, email, plan, status, expires_at, max_devices
  ) values (
    v_product.id, v_license_hash, v_order.email, 'pro', 'active', v_expires_at, 1
  );

  update public.orders
     set status = 'paid',
         payment_method = p_payment_method,
         payment_reference = p_payment_reference,
         paid_at = now(),
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object(
                'licenseKey', v_license_key,
                'licenseExpiresAt', v_expires_at,
                'sepayTransactionId', p_transaction_id
              )
   where id = v_order.id;

  insert into public.payment_transactions (
    provider, provider_transaction_id, order_code, amount, transfer_type, content, raw_payload
  ) values (
    'sepay_gateway', p_transaction_id, v_order.order_code, p_transaction_amount, 'in', p_payment_reference,
    jsonb_build_object('transactionId', p_transaction_id, 'reference', p_payment_reference)
  )
  on conflict (provider, provider_transaction_id) do nothing;

  return query select v_license_key, v_expires_at;
end;
$$;

revoke execute on function public.complete_qr_tools_order(text,text,integer,text,text) from public, anon, authenticated;
