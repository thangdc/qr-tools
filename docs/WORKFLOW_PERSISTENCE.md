# Workflow Persistence

The first persistence schema supports the Core contracts without introducing
customer-specific business tables.

## Tables

- `workflow_definitions`: versioned workflow metadata and field mappings, with nullable `owner_user_id` for tenant ownership.
- `workflow_records`: versioned records identified by workflow + record ID. Records inherit access scope from their workflow definition.

Records reference their workflow definition version with a composite foreign
key. Deleting a workflow definition version cascades to its records.

## Security

Both tables have RLS enabled. `anon` and `authenticated` receive no table
privileges; only the trusted API server accesses them through its database
connection. Browser/SDK clients must never receive the service-role key.

Developer API keys linked to a Supabase user can resolve only workflows whose
`owner_user_id` matches that key's `user_id`. Both scan and action execution use
the same authorization check. Unowned workflows are denied to developer keys
until ownership is explicitly assigned. Records inherit their workflow's owner;
there is no client-supplied owner field.

API keys have an explicit `access_mode`: `customer` (the default) or
`system`. Customer keys must have a `user_id` and match the workflow owner.
Only reviewed infrastructure keys may be set to `system`; do not classify keys
by name or assume that a missing `user_id` means a key is trusted. Existing keys
are migrated to `customer` by default, so any infrastructure key requiring
system access must be identified and explicitly classified before deploying the
API code.

## Migration

The ownership migration is additive. Existing workflows remain unowned and
customer API keys cannot access them until an operator assigns the correct
Supabase user owner after reviewing the production mapping. No production
migration is applied as part of the pull request.
