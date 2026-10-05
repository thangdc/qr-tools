# XLSX Connector

The XLSX connector provides a concrete implementation of the `ExcelParser` contract using the repository's existing `jszip` dependency.

## Scope

- reads the first worksheet from `.xlsx`
- uses the first row as column headers
- supports shared strings, inline strings, booleans, and numeric cells
- returns `TabularRow[]`
- does not know about workflows, persistence, QR generation, or UI

## Pipeline

```
.xlsx
  ↓
XlsxParser
  ↓
ExcelDataSource
  ↓
WorkflowImportService
  ↓
Equipment Maintenance
```

This keeps spreadsheet parsing at the connector/infrastructure boundary while the workflow engine remains provider-independent.

The parser intentionally does not add an XLSX package because `jszip` is already a production dependency in QR Tools.
