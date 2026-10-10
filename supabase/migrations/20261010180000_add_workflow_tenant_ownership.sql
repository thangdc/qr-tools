-- Add explicit workflow ownership for tenant-scoped developer API keys.
-- Existing rows remain unowned until an operator assigns ownership after review.
-- Customer keys fail closed against unowned workflows; legacy infrastructure
-- keys (user_id IS NULL) retain their current compatibility behavior for now.

alter table public.workflow_definitions
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

create index if not exists workflow_definitions_owner_idx
  on public.workflow_definitions (owner_user_id, id, version);

comment on column public.workflow_definitions.owner_user_id is
  'Supabase user that owns this workflow. Required for access by developer-owned API keys.';
