# Workflow Model

## Canonical Pipeline

Input → Validate → Map → Transform → Encode → Output

For scan workflows:

Scan → Decode → Verify → Resolve → Action → Output

## Core Concepts

### Workflow
A versioned definition describing inputs, processing and outputs.

### Input
A source of records, such as manual entry, Excel/CSV, Google Sheets or REST API.

### Validation
Checks required fields, types, formats, uniqueness and business constraints.

### Mapping
Maps source fields to canonical workflow fields.

Example:
source `Asset Code` → canonical `assetId`.

### Transform
Deterministic operations such as normalization, formatting, filtering and derived values.

### QR Encoding
Converts a validated record/workflow reference into a QR payload.

### Resolve
Takes a QR payload and identifies the workflow and record.

### Action
An operation after resolution, such as viewing a record, submitting maintenance data, calling an API or triggering a webhook.

### Output
A result such as QR image, PDF/print data, API response, Google Sheet update or webhook.

## Reference Workflow: Equipment Maintenance

Input:
Asset ID, asset name, location, maintenance information.

Generation:
Validate → map → create QR identity → generate printable QR.

Scan:
Verify → resolve asset → show customer-defined fields/actions.

Actions:
- View equipment
- Report issue
- Record maintenance
- View history

Outputs:
API, database/workflow record, webhook or configured external connector.

## Design Rule

Workflow primitives should be reusable across verticals. Maintenance-specific behavior should be configuration on top of the engine, not hardcoded into the engine.
