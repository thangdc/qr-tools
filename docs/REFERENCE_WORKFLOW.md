# Reference Workflow

## Equipment Maintenance

Equipment Maintenance is the first reference workflow for QR Tools.

Its purpose is to validate the Core architecture with a concrete customer workflow before adding infrastructure such as databases, Google Sheets, REST APIs or hosted UI.

### Pipeline

```
Source Data
  ↓
Validate
  ↓
Map
  ↓
WorkflowRecord
  ↓
QR Identity
  ↓
Print / Distribute
  ↓
Scan
  ↓
Decode + Verify
  ↓
Resolve Record
  ↓
Actions
  ├─ View equipment
  ├─ Report issue
  ├─ Record maintenance
  └─ View history
  ↓
Output / Connector
```

### Boundary rule

The reference workflow owns:

- canonical fields
- source-to-canonical mapping
- workflow-specific validation
- workflow identity/version

The Core owns:

- workflow execution contracts
- QR identity contracts
- connector contracts
- SDK/API boundaries

Infrastructure/application layers will own:

- persistence
- authentication/authorization
- QR signing implementation
- record resolution
- external connectors
- hosted UI

### Why this workflow first?

It has a clear QR identity, repeatable records, obvious scan actions and a natural path from manual/Excel input to API/database output. It is representative enough to validate the architecture without prematurely building a generic automation platform.
