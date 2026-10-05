# Workflow Persistence

The first persistence schema supports the Core contracts without introducing
customer-specific business tables.

## Tables

- `workflow_definitions`: versioned workflow metadata and field mappings.
- `workflow_records`: versioned records identified by workflow + record ID.

Records reference their workflow definition version with a composite foreign
key. Deleting a workflow definition version cascades to its records.

## Security

Both tables have RLS enabled.

The initial policy is deliberately **server-side only**: `anon` and
`authenticated` receive no table privileges. The adapter may use
`service_role` from a trusted server environment.

Browser/SDK clients must not receive the service-role key.

Customer-facing authorization policies should be introduced when authentication
and tenant ownership are part of the workflow data model. Do not make workflow
records publicly readable just to simplify the first hosted UI.

## Migration

The migration is additive and does not modify existing QR Tools business
tables.
