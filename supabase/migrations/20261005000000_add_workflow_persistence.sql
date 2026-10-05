-- QR Workflow persistence schema.
-- Infrastructure only: Core contracts remain provider-independent.

create table if not exists public.workflow_definitions (
  id text not null,
  version integer not null check (version >= 1),
  name text not null,
  input_fields jsonb not null default '[]'::jsonb,
  mappings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, version)
);

create table if not exists public.workflow_records (
  workflow_id text not null,
  workflow_version integer not null check (workflow_version >= 1),
  record_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workflow_id, workflow_version, record_id),
  constraint workflow_records_definition_fk
    foreign key (workflow_id, workflow_version)
    references public.workflow_definitions (id, version)
    on delete cascade
);

create index if not exists workflow_records_lookup_idx
  on public.workflow_records (workflow_id, workflow_version, record_id);

alter table public.workflow_definitions enable row level security;
alter table public.workflow_records enable row level security;

revoke all on public.workflow_definitions from anon, authenticated;
revoke all on public.workflow_records from anon, authenticated;

grant select, insert, update, delete on public.workflow_definitions to service_role;
grant select, insert, update, delete on public.workflow_records to service_role;
