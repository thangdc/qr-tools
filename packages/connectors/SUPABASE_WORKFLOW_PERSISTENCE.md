# Supabase Workflow Persistence

This adapter implements the Core persistence contracts using Supabase's REST Data
API without importing `@supabase/supabase-js`.

## Expected tables

The adapter expects these infrastructure tables:

### `workflow_records`

- `workflow_id` text
- `workflow_version` integer
- `record_id` text
- `data` jsonb
- unique key: `workflow_id, workflow_version, record_id`

### `workflow_definitions`

- `id` text
- `version` integer
- `name` text
- `input_fields` jsonb
- `mappings` jsonb
- unique key: `id, version`

The adapter does not create or alter these tables. Schema/RLS migration is an
infrastructure deployment concern and must be reviewed separately.

## Security

The adapter receives an injected REST client so the Core package has no
Supabase dependency.

Use a server-side credential for privileged writes. Never put a service-role
key in browser code. If records are exposed through the Supabase Data API,
enable RLS and grant only the operations required by the deployment.

## Flow

```
Workflow Core
  ↓
WorkflowPersistence
  ↓
SupabaseWorkflowRecordRepository / SupabaseWorkflowDefinitionRepository
  ↓
Supabase REST Data API
```
