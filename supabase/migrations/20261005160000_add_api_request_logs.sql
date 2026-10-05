create table public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  success boolean not null,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint api_request_logs_endpoint_check check (endpoint <> ''),
  constraint api_request_logs_method_check check (method in ('GET','POST','PUT','PATCH','DELETE')),
  constraint api_request_logs_status_code_check check (status_code between 100 and 599),
  constraint api_request_logs_duration_check check (duration_ms is null or duration_ms >= 0)
);

create index api_request_logs_api_key_created_idx
  on public.api_request_logs (api_key_id, created_at desc);

create index api_request_logs_created_idx
  on public.api_request_logs (created_at desc);

create index api_request_logs_endpoint_created_idx
  on public.api_request_logs (endpoint, created_at desc);

alter table public.api_request_logs enable row level security;
