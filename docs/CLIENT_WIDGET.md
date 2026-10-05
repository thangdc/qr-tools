# Client Workflow Widget

The Client Widget is a **ready-to-use workflow UI** for embedding one QR Tools workflow into an existing customer website.

It is not a thin API renderer and it is not a general-purpose low-code UI builder.

See [DYNAMIC_CLIENT_WORKFLOW_WIDGET.md](./DYNAMIC_CLIENT_WORKFLOW_WIDGET.md) for the full architecture.

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

### One widget = one workflow

The customer selects exactly one workflow in configuration.

There is no workflow picker inside the widget.

To change the experience, change:

```html
data-workflow="equipment-maintenance"
```

to another supported workflow and remount/reload the widget.

## Controlled dynamic behavior

The widget is dynamic **inside the selected workflow**, while the workflow itself is controlled by QR Tools.

```
Client config
    ↓
Workflow ID
    ↓
QR Tools workflow registry
    ↓
Curated workflow UI
    ↓
Public API / runtime
```

For example, `equipment-maintenance` can provide:

```
Chọn dữ liệu
    ↓
Tạo QR
    ↓
In / Download
    ↓
Quét QR
    ↓
Kết quả
    ↓
Ghi nhận bảo trì
```

The customer does not define these steps, fields or components.

## Configuration boundary

Supported configuration is intentionally small:

- `workflow`
- `apiKey`
- `container`
- `theme`
- `locale`
- `initialData` where supported by the selected workflow

The widget does **not** accept arbitrary:

- steps
- fields
- components
- outputs
- actions
- business rules
- server endpoints

This prevents customer integrations from becoming uncontrolled custom workflow implementations.

## JavaScript API

```js
QrToolsWidget.mount("#qr-workflow", {
  workflow: "equipment-maintenance",
  apiKey: "CLIENT_KEY"
});
```

Optional configuration is only accepted when explicitly supported by the selected workflow.

## Workflow registry

QR Tools maintains a controlled workflow registry:

```ts
type ClientWorkflowId =
  | "equipment-maintenance"
  | "attendance"
  | "payment";

const workflowRegistry = {
  "equipment-maintenance": EquipmentMaintenanceWorkflow,
  "attendance": AttendanceWorkflow,
  "payment": PaymentWorkflow,
};
```

Adding a workflow means adding and testing its workflow implementation and registering its ID. The customer only changes `workflow` in their configuration.

## Reuse existing QR Tools UI

The widget should reuse existing QR Tools primitives where practical:

- workflow forms
- Excel import
- QR rendering
- QR preview
- camera/image scanning
- print / download
- CSV export
- validation
- loading/error states

## Security

Only a client-safe/scoped API key belongs in the browser.

Never expose privileged Supabase or server credentials.

The public API remains responsible for:

- authentication
- record authorization
- validation
- action authorization
- mutations
- external connectors
- rate limits

The widget owns presentation and interaction; the server owns authorization and business rules.

The existing public contracts remain the foundation:

- `POST /v1/scan`
- `POST /v1/actions/execute`

Workflow-specific runtime endpoints should be added only when a selected workflow actually requires them.

## Core rule

> **The client chooses which workflow to use. QR Tools controls how that workflow works. The API controls what the client is allowed to do.**
