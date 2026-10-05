# Controlled Client Workflow Widget

## Goal

The Client Widget is a **ready-to-use workflow UI**, not a thin API renderer and not a general-purpose low-code UI builder.

A customer embeds one selected QR Tools workflow into an existing website. The customer does not build the workflow UI themselves.

The customer should not implement:
- step navigation
- workflow forms
- QR generation
- QR preview
- download / print
- camera scanning
- result rendering
- action buttons
- loading / validation / error states

QR Tools owns these behaviors.

## Product model

**One widget instance = one workflow.**

The client selects the workflow at configuration time:

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

There is **no workflow picker inside the widget**.

To change the workflow, the host changes `data-workflow` (or the equivalent JavaScript configuration) and reloads/remounts the widget.

This keeps the customer integration simple and keeps each workflow fully controllable by QR Tools.

## Controlled dynamic architecture

The widget is dynamic **at the workflow level**, not arbitrary at the component level:

```
Client config
    ↓
Workflow ID
    ↓
QR Tools workflow registry
    ↓
Curated workflow definition + UI
    ↓
Workflow-specific renderer
    ↓
Public API / workflow runtime
```

For example:

```
equipment-maintenance
    ↓
EquipmentMaintenanceWorkflow
    ↓
Data → Generate QR → Print → Scan → Result → Maintenance Action
```

A new workflow is added by QR Tools as a new productized workflow implementation.

### Important control boundary

The host **must not** provide arbitrary:
- steps
- fields
- component types
- output definitions
- action definitions
- business rules
- server endpoints

Do not turn the Client Widget into a customer-defined low-code canvas.

The host may only use documented, whitelisted configuration options such as:
- `workflow`
- `apiKey`
- `container`
- `theme`
- `locale`
- `initialData` where supported by that workflow

The exact supported options are controlled by QR Tools.

## Workflow-specific experience

Each workflow can have its own controlled stepper, inputs, outputs and actions.

### Equipment Maintenance

```
① Chọn dữ liệu
   ├─ Upload Excel
   ├─ Chọn thiết bị
   └─ Nhập thủ công

② Tạo QR
   └─ Preview thiết bị đã chọn

③ In / Download

④ Quét QR

⑤ Kết quả
   ├─ Thông tin thiết bị
   ├─ Lịch sử
   └─ Ghi nhận bảo trì
```

### Check-in

```
① Nhập danh sách
② Tạo QR
③ In
④ Quét liên tục
⑤ Kết quả
⑥ Xuất CSV
```

### Thu tiền

```
① Chọn căn hộ
② Nhập kỳ
③ Tạo QR
④ Preview
⑤ Thanh toán
⑥ Kết quả
```

These are examples of **curated workflow products**, not arbitrary configurations that the customer can assemble.

## Reuse existing QR Tools UI

The Client Widget should reuse existing QR Tools workflow and QR primitives where practical:

- workflow-specific forms
- Excel import
- QR rendering
- QR preview
- QR scanner
- scan result handling
- print / download
- CSV export
- validation and loading states

The widget should not reimplement QR behavior already present in QR Tools.

## JavaScript API

The equivalent JavaScript configuration is intentionally small:

```js
QrToolsWidget.mount("#qr-workflow", {
  workflow: "equipment-maintenance",
  apiKey: "CLIENT_KEY"
});
```

Optional values are only accepted when explicitly supported by the selected workflow:

```js
QrToolsWidget.mount("#qr-workflow", {
  workflow: "equipment-maintenance",
  apiKey: "CLIENT_KEY",
  theme: "default",
  locale: "vi",
  initialData: [...]
});
```

The widget does not accept arbitrary UI schemas.

## Workflow registry

The implementation should have a controlled registry similar to:

```ts
type ClientWorkflowId =
  | "equipment-maintenance"
  | "attendance"
  | "payment"
  | ...;

const workflowRegistry = {
  "equipment-maintenance": EquipmentMaintenanceWorkflow,
  "attendance": AttendanceWorkflow,
  "payment": PaymentWorkflow,
};
```

The registry is owned by QR Tools.

Adding a workflow means adding and testing its renderer and registering the supported workflow ID. Customers do not need to change their application architecture.

## API boundary

The browser receives only a client-safe/scoped API key.

Never put privileged Supabase or server credentials in the widget.

The public API remains responsible for:
- authentication
- workflow/record authorization
- validation
- action authorization
- mutations
- external connectors
- rate limits

The widget is responsible for presentation and interaction.

The existing scan/action contracts remain the foundation:

- `POST /v1/scan`
- `POST /v1/actions/execute`

Workflow-specific data/runtime endpoints should be added only when a selected workflow actually requires them.

Do not expose Supabase directly to the widget.

## Security and control principles

1. **One widget instance, one workflow.**
2. **Workflow choice happens in client configuration.**
3. **Workflow UI is owned and versioned by QR Tools.**
4. **No arbitrary customer-defined UI schema.**
5. **Actions are validated server-side.**
6. **Client keys are scoped and safe for browser use.**
7. **Business logic stays outside the host website.**

## Design rule

> **The client chooses which workflow to use. QR Tools controls how that workflow works. The API controls what the client is allowed to do.**

This gives customers a simple integration while keeping QR Tools workflows consistent, testable and maintainable.
