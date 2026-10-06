# Deployment

This repository contains multiple deployable applications. Keep each hosting configuration aligned with its app directory.

## Current deployment map

| Service | Source | Hosting | Purpose |
|---|---|---|---|
| `qr.thangdc.com` | repository root | GitHub Pages | QR Tools product |
| `api.thangdc.com` | `api/` | Render | Public QR Tools API |
| `client.thangdc.com` | `apps/client/` | Render Static Site | Developer Portal + browser widget |
| `admin.thangdc.com` | admin application | Render | Admin dashboard |

## client.thangdc.com

### Render configuration

The client service is a **Render Static Site**.

Do not change its Root Directory to `apps/client/` after the widget deployment change. The widget source is under `packages/widget/`, so the Render build needs repository-root access.

Use:

```text
Root Directory:
(empty)

Build Command:
npm install --no-audit --no-fund && npm run build:client

Publish Directory:
apps/client/dist
```

If Render uses a cached build after configuration changes, use **Manual Deploy → Clear build cache & deploy**.

### Build pipeline

Run:

```text
npm run build:client
```

The pipeline:

1. Installs dependencies for `apps/client`.
2. Builds the existing Developer Portal with its existing `tsc --noEmit && vite build` command.
3. Builds `packages/widget`.
4. Copies the widget bundle into:

```text
apps/client/dist/widget/v1/qr-tools-widget.js
apps/client/dist/widget/v1/qr-tools-widget.js.map
```

The existing Developer Portal remains unchanged at the site root.

The browser widget is therefore served from:

```text
https://client.thangdc.com/widget/v1/qr-tools-widget.js
```

### Important: do not use the old configuration

Do **not** configure the client service as:

```text
Root Directory: apps/client/
```

for the combined client + widget deployment. That Root Directory prevents the build from accessing `packages/widget`.

Do **not** move the client site to GitHub Pages.

Do **not** create another Render service for the widget.

The widget is intentionally served by the existing `client.thangdc.com` Static Site.

## Widget URL contract

The published browser bundle has a stable versioned path:

```text
/widget/v1/qr-tools-widget.js
```

Customer embed example:

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

## Change checklist

When changing the client/widget deployment:

1. Verify `apps/client` still builds independently.
2. Verify `packages/widget` builds independently.
3. Run `npm run build:client`.
4. Confirm `apps/client/dist/index.html` exists.
5. Confirm `apps/client/dist/widget/v1/qr-tools-widget.js` exists and is non-empty.
6. Wait for GitHub Actions to pass before merging.
7. After merge, deploy the Render Static Site.
8. Verify both:
   - `https://client.thangdc.com/`
   - `https://client.thangdc.com/widget/v1/qr-tools-widget.js`

## Architecture rule

The **hosting configuration is part of the deployment contract**.

If a service's Render Root Directory, Build Command, or Publish Directory changes, update this document in the same change. Do not rely on dashboard settings being remembered from a previous setup.
