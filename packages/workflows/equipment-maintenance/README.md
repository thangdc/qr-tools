# Equipment Maintenance Workflow

Reference workflow for QR Tools.

## Purpose

This workflow proves that a real vertical workflow can sit on top of the framework-independent Core contracts without putting maintenance-specific rules into the workflow engine.

## Canonical fields

- `assetId` — required unique equipment identifier
- `assetName` — required equipment name
- `location` — required equipment location
- `maintenanceDate` — optional maintenance date
- `maintenanceNote` — optional maintenance note

## Generation

`Input → Validate → Map → Create WorkflowRecord → QR identity`

The QR identity is intentionally not implemented here. The workflow only provides the canonical record needed by the QR Engine.

## Scan

`Scan → Decode → Verify → Resolve → Action → Output`

Typical actions:

- View equipment
- Report issue
- Record maintenance
- View history

The resolution, authorization, persistence and output connectors remain infrastructure/application concerns.

## Example

A source row:

```text
Asset ID: PUMP-001
Asset Name: Water Pump
Location: Basement B1
Maintenance Date: 2026-10-05
Maintenance Note: Replace filter
```

is mapped to the canonical workflow record:

```json
{
  "workflowId": "equipment-maintenance",
  "workflowVersion": 1,
  "recordId": "PUMP-001",
  "data": {
    "assetId": "PUMP-001",
    "assetName": "Water Pump",
    "location": "Basement B1",
    "maintenanceDate": "2026-10-05",
    "maintenanceNote": "Replace filter"
  }
}
```

## Design constraint

Do not add database, Supabase, React, browser or provider-specific code to this package.
