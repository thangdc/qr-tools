# Client Workflow Widget

The Client Widget is a **ready-to-use, dynamic workflow UI**, not a thin API renderer.

It is designed so a customer can embed a QR Tools workflow into an existing website with one script and configuration. The widget owns the presentation and interaction flow while the QR Tools API remains responsible for business rules and authorization.

See [DYNAMIC_CLIENT_WORKFLOW_WIDGET.md](./DYNAMIC_CLIENT_WORKFLOW_WIDGET.md) for the full contract.

## Quick start

```html
<div id="qr-workflow"></div>

<script
  src="https://client.thangdc.com/widget/v1/qr-tools-widget.js"
  data-api-key="CLIENT_KEY"
  data-workflow="equipment-maintenance"
  data-container="#qr-workflow"
  defer
></script>
```

The intended default experience is a step-based workflow:

```
Chọn dữ liệu
    ↓
Tạo QR
    ↓
Preview
    ↓
Download / Print
    ↓
Quét QR
    ↓
Kết quả
    ↓
Action
```

The actual steps are dynamic and come from the workflow definition.

## Dynamic inputs

Workflows can expose different input sources, including:

- manual form
- single/multiple records
- CSV/XLSX
- JSON
- REST/API
- customer-provided data
- QR scan
- previous-step output

The widget renders the appropriate selector or input UI automatically.

## Dynamic outputs

Workflows can expose:

- PNG
- SVG
- print/printable layout
- JSON
- resolved record
- action result
- redirect
- webhook/API response
- downloadable data

## JavaScript API

```js
QrToolsWidget.mount("#qr-workflow", {
  workflow: "equipment-maintenance",
  apiKey: "CLIENT_KEY",
  initialData: [...]
});
```

Optional lifecycle callbacks include `onStepChange`, `onInput`, `onOutput`, `onScan`, `onAction`, `onComplete`, and `onError`.

## Security

Use only a client-safe/scoped API key in browser embeds. Never expose privileged server credentials.

Workflow validation, record authorization, action authorization and mutations remain server-side.

## Implementation direction

Existing QR Tools QR engine and UI primitives should be reused where practical:

- QR rendering
- QR preview
- QR scanner
- workflow-specific importers
- print/export primitives

The long-term design is:

```
Workflow Definition
       ↓
Client Workflow Renderer
       ↓
Step-specific UI primitives
       ↓
QR Tools Public API
       ↓
Workflow Runtime / Connectors
```

The current `/v1/scan` and `/v1/actions/execute` contracts remain the scan/result foundation. Dynamic data selection requires additional scoped public workflow runtime contracts.
