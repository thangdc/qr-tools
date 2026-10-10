-- Add explicit workflow ownership for tenant-scoped developer API keys.
-- Existing rows remain unowned until an operator assigns ownership after review.
-- Customer keys fail closed against unowned workflows; legacy infrastructure
-- keys are classified as customer by default; an operator must explicitly mark
-- reviewed infrastructure keys as system before deployment if they need bypass.

alter table public.api_keys
  add column if not exists access_mode text not null default 'customer'
  check (access_mode in ('customer', 'system'));

comment on column public.api_keys.access_mode is
  'customer keys are owner-scoped; only explicitly approved infrastructure keys may use system mode.';

alter table public.workflow_definitions
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

create index if not exists workflow_definitions_owner_idx
  on public.workflow_definitions (owner_user_id, id, version);

comment on column public.workflow_definitions.owner_user_id is
  'Supabase user that owns this workflow. Required for access by developer-owned API keys.';
