# Workflow UI capabilities

The client widget is a workflow-specific UI, not a copy of the standalone QR Generator.

Each workflow declares the QR capabilities it is allowed to use:

- `qr.generate`
- `qr.customize`
- `qr.download`
- `qr.print`
- `qr.scan.camera`
- `qr.scan.upload`
- `api.scan`

Workflow-only UI should be built from these capabilities. Standalone QR Generator features such as History, licensing, account UI, unrelated QR types, and product purchase flows must not be pulled into the widget.

The goal is to keep the widget visually and behaviorally aligned with `qr.thangdc.com` while bundling only the capabilities required by the selected workflow.

When a new workflow is added:

1. Declare its capability set in `WorkflowRegistry.ts`.
2. Reuse existing QR UI primitives where possible.
3. Do not add standalone-only state such as history or licensing.
4. Keep API actions behind the workflow's declared capabilities.
