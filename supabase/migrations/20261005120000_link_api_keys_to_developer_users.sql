alter table public.api_keys
  add column user_id uuid references auth.users(id) on delete cascade;

create index api_keys_user_id_idx on public.api_keys(user_id);

create policy "Developers can read their own API keys"
  on public.api_keys
  for select
  to authenticated
  using ((select auth.uid()) = user_id);