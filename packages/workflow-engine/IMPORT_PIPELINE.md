# Workflow Import Pipeline

The import pipeline connects a data source to workflow persistence and QR identity generation without coupling the workflow engine to a concrete connector or parser.

## Flow

```
WorkflowImportSource
      ↓
load raw rows
      ↓
WorkflowImportMapper
      ↓
create WorkflowRecord
      ↓
WorkflowImportValidator
      ↓
persistence.records.save()
      ↓
QrPayloadEncoder
      ↓
QR identity payloads
```

The service owns orchestration only. Concrete parsers, connectors, persistence implementations, and QR cryptography remain injected dependencies.

## Equipment Maintenance

`packages/workflows/equipment-maintenance/src/import.ts` binds the generic pipeline to the reference workflow. A CSV or Excel connector can therefore be passed in without putting parser or storage logic into the workflow definition.

## Failure behavior

Rows are processed sequentially. A validation failure stops the import and returns an error before that invalid record is persisted or a QR payload is produced.

Persistence writes happen before QR payload generation so a generated QR always points at a record that has been accepted by the workflow persistence boundary.
