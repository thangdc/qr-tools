# Workflow data configuration foundation

This module introduces a shared, UI-independent contract for workflow data configuration.

## Supported input field types

`text`, `number`, `date`, `select`, `checkbox`, `email`, `url`, `phone`, `file`, and `qr`.

Each field declares its stable key, label, allowed sources, optional default, validation rules, and select options.

## Mapping

A mapping rule selects a source (`manual`, `excel`, `qr`, or `default`), a dot-separated source path, a target field key, and an optional transform (`trim`, `uppercase`, `lowercase`, `number`, or `date`). When no rule exists for a target field, exact field-key mapping is used as a fallback.

## Validation

The shared validator supports required, string length, numeric range, regular expression, email/URL format, select options, and allow-list rules. It returns structured issues keyed by field so the UI can render inline errors and summary messages.

## Outputs

Output definitions can request record display, QR payload, CSV, Excel-compatible CSV, print, or webhook handling. The shared builder currently prepares record, QR, and CSV/Excel-compatible payloads. Print and webhook are declared integration targets and require UI/infrastructure handlers before they can execute.

## Example

```ts
import { buildWorkflowOutput, mapWorkflowInput, validateWorkflowRecord } from './workflows/configuration';

const definition = {
  id: 'equipment-maintenance',
  name: 'Equipment maintenance',
  version: 1,
  fields: [
    { key: 'assetCode', label: 'Asset code', type: 'text', sources: ['manual', 'excel', 'qr'], validation: { required: true } },
    { key: 'hours', label: 'Operating hours', type: 'number', sources: ['manual', 'excel'], validation: { min: 0 } },
  ],
  mappings: [{ source: 'excel', from: 'Asset ID', to: 'assetCode', transform: 'trim' }],
  outputs: [{ id: 'record-csv', label: 'Export CSV', kind: 'csv', enabled: true }],
} as const;

const record = mapWorkflowInput(definition, 'excel', { 'Asset ID': ' EQ-001 ', hours: '120' });
const validation = validateWorkflowRecord(definition, record);
if (validation.valid) {
  const output = buildWorkflowOutput(definition, definition.outputs[0], record);
  // Download or route output.data in the workflow UI.
}
```

## Rollout boundary

This is the shared configuration and processing foundation. It does not yet replace each existing workflow UI or persist editable definitions. The next integration step is a workflow configuration editor, persistence/versioning, and adapters that wire these contracts into each workflow without changing the embedded `client.thangdc.com` widget.
