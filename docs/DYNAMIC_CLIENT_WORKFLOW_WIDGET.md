# Dynamic Client Workflow Widget

## Goal

The Client Widget is not a thin API renderer. It is a ready-to-use workflow UI engine that can be embedded into an existing customer website with one script and configuration.

The customer should not implement:
- step navigation
- forms
- QR generation
- QR preview
- download / print
- camera scanning
- result rendering
- action buttons
- loading / validation / error states

The customer configures a workflow and supplies or selects data. QR Tools renders the workflow experience.

## Embed

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

## Product model

A workflow is a dynamic UI definition:

```
Workflow
  ├─ inputs
  ├─ steps
  ├─ field definitions
  ├─ data sources
  ├─ transformations
  ├─ QR configuration
  ├─ outputs
  └─ actions
```

The widget is the renderer. Workflow-specific business rules remain server-side.

## Dynamic inputs

A workflow may accept one or more input sources:

- manual form
- single record
- multiple records
- CSV
- Excel/XLSX
- JSON
- REST/API source
- Google Sheets connector (future)
- customer-provided JavaScript data
- QR scan result
- previous step output

Example:

```json
{
  "type": "input",
  "id": "records",
  "source": "file",
  "accept": ["xlsx", "csv"],
  "schema": [
    { "key": "assetId", "label": "Asset ID", "type": "string", "required": true },
    { "key": "assetName", "label": "Asset Name", "type": "string", "required": true },
    { "key": "location", "label": "Location", "type": "string" }
  ]
}
```

## Dynamic steps

Steps are declarative and can be composed per workflow:

- `input`
- `select`
- `map`
- `review`
- `generate-qr`
- `preview`
- `print`
- `download`
- `scan`
- `result`
- `action`
- `complete`

Example:

```json
{
  "id": "equipment-maintenance",
  "version": 1,
  "name": "Bảo trì thiết bị",
  "steps": [
    { "id": "data", "type": "input", "title": "Chọn dữ liệu" },
    { "id": "qr", "type": "generate-qr", "title": "Tạo QR" },
    { "id": "preview", "type": "preview", "title": "Xem trước" },
    { "id": "scan", "type": "scan", "title": "Quét mã" },
    { "id": "result", "type": "result", "title": "Kết quả" }
  ]
}
```

The stepper is rendered automatically.

## Dynamic outputs

A workflow may expose several output types:

- QR image PNG
- QR SVG
- printable layout
- PDF/print payload
- JSON result
- resolved record
- action result
- redirect URL
- webhook/API response
- downloadable CSV
- customer-defined result view

Output configuration belongs to the workflow, not the host page.

## Field renderer

Reusable field types:

- text
- textarea
- number
- currency
- date
- datetime
- select
- multiselect
- checkbox
- radio
- file
- image
- URL
- email
- phone
- location
- JSON
- QR payload

Field validation is driven by the workflow definition.

## Data selection

The same workflow may expose:

- single record
- multiple records
- all records
- filter/search
- file import
- manual entry
- external source

Example Equipment Maintenance flow:

1. Upload Excel
2. Select one or more assets
3. Generate QR
4. Preview
5. Print/download
6. Scan
7. Show maintenance form
8. Save action result

## QR capabilities

The widget owns the complete QR presentation layer:

- generate QR
- preview QR
- PNG download
- SVG download
- print
- batch print
- template selection
- QR design options
- scan by camera
- scan from image
- scan result

Existing QR Tools QR engine/components should be reused where possible rather than reimplementing QR behavior.

## Actions

Actions are declared by the server and rendered by the widget.

Examples:
- View
- Record maintenance
- Report issue
- Check in
- Update status
- Submit
- Open URL

The widget never decides whether an action is allowed. It only renders server-provided actions and sends the request back to the API.

## Host integration

The host page should only need:

- workflow
- API key
- container
- optional theme / locale / initial data

Optional JavaScript API:

```js
QrToolsWidget.mount("#qr-workflow", {
  workflow: "equipment-maintenance",
  apiKey: "CLIENT_KEY",
  initialData: [...]
});
```

Optional lifecycle callbacks:

```
onStepChange
onInput
onOutput
onScan
onAction
onComplete
onError
```

## Security boundary

The browser receives only a client-safe/scoped API key.

Never put privileged Supabase or server credentials in the widget.

The API remains responsible for:
- authentication
- workflow definition
- record authorization
- validation
- action authorization
- mutations
- external connectors

## API evolution

The current `/v1/scan` and `/v1/actions/execute` endpoints cover scan/result.

The dynamic widget will need public read/runtime contracts rather than querying Supabase directly. Candidate endpoints:

- `GET /v1/workflows/:workflowId`
- `GET /v1/workflows/:workflowId/records`
- `POST /v1/workflows/:workflowId/execute`

Exact contracts must be finalized before the dynamic renderer is implemented.

## Design rule

**Workflow definitions describe what the user can do. The widget decides how to render it. The API decides whether it is allowed.**

This keeps new workflows cheap to launch and prevents customer websites from accumulating QR Tools-specific business logic.
