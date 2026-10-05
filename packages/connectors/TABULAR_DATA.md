# Tabular Data Connector

The tabular connector boundary supports CSV and Excel-style imports without coupling QR Tools Core to a parser library or browser runtime.

## Boundary

```
CSV / Excel
    ↓
TabularDataSource
    ↓
Data Mapper
    ↓
Workflow validation
    ↓
WorkflowRecord
    ↓
Persistence / QR generation
```

A connector returns raw rows. It must not contain workflow-specific mapping, validation, persistence, QR generation, or UI logic.

## Parser ownership

`CsvParser` and `ExcelParser` are injected contracts. The host application or infrastructure layer supplies the concrete parser. This keeps the connector package independent from XLSX/CSV libraries and browser APIs.

## Current scope

- CSV input contract
- Excel input contract
- provider-independent tabular source
- no new parser dependency
- no workflow-specific behavior

The next integration can adapt the existing QR Tools Excel import implementation to `ExcelParser` rather than introducing a second parsing implementation.
