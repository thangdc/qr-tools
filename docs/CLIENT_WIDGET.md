# Client Widget

QR Tools provides a copy-paste browser widget for customers who want to embed a workflow UI without writing API integration code.

## Quick start

```html
<div data-qr-tools data-payload="qrtools:YOUR_QR_PAYLOAD"></div>

<script
  src="https://client.thangdc.com/widget/v1/qr-tools-widget.js"
  data-api-key="YOUR_CLIENT_SAFE_API_KEY"
  data-base-url="https://api.thangdc.com"
  defer
></script>
```

The script automatically finds `[data-qr-tools]` elements, calls `POST /v1/scan`, renders the record, and shows the allowed actions. Action buttons call `POST /v1/actions/execute`.

## Configuration

Script-level configuration:

- `data-api-key`: required client-safe/scoped key.
- `data-base-url`: optional; defaults to `https://api.thangdc.com`.
- `data-selector`: optional; defaults to `[data-qr-tools]`.
- `data-theme`: `light`, `dark`, or `auto`.
- `data-show-actions`: `false` hides action buttons.
- `data-auto-init="false"`: disables automatic initialization.

Element-level configuration can override `data-api-key`, `data-base-url`, `data-payload`, `data-workflow-id`, `data-theme`, and `data-show-actions`.

## JavaScript API

```js
QrToolsWidget.init({
  apiKey: "YOUR_CLIENT_SAFE_API_KEY",
  baseUrl: "https://api.thangdc.com",
});

await QrToolsWidget.scan(payload, {
  apiKey: "YOUR_CLIENT_SAFE_API_KEY",
  baseUrl: "https://api.thangdc.com",
});
```

## Security boundary

Browser embeds must use a client-safe API key whose scope and server policy allow browser use. Never expose a privileged server key in HTML, JavaScript, or a public repository.

The widget is intentionally thin: workflow rules and action authorization stay on `api.thangdc.com`; the widget only consumes the public contract and renders it.

## Hosting

The widget package builds an IIFE bundle named `qr-tools-widget.js`. The planned public distribution URL is:

`https://client.thangdc.com/widget/v1/qr-tools-widget.js`

Deployment of that static asset is separate from the public API and should not require exposing server credentials.