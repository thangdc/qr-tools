-- License activation is performed by the Edge Function with its server-side Supabase client.
-- These SECURITY DEFINER functions must not be directly callable through the public Data API.
revoke execute on function public.activate_license_atomic(uuid, text, text) from public;
revoke execute on function public.rls_auto_enable() from public;
