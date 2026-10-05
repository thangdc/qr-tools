# @qr-tools/sdk

Customer-facing TypeScript SDK for the QR Tools public API.

## Install

The package is intended to be installed from npm:

```bash
npm install @qr-tools/sdk
```

The package is currently prepared for publishing but is not published by this repository change.

## Usage

### Browser

Use only a client-safe API credential with scopes and policy that explicitly allow browser use.

```ts
import { createQrToolsClient } from "@qr-tools/sdk";

const qr = createQrToolsClient({
  baseUrl: "https://api.example.com",
  apiKey: "client-scoped-key",
});

const result = await qr.scan({
  payload: scannedQrPayload,
});

renderRecord(result.record);
renderActions(result.actions);
```

Never put a privileged API key in browser code.

### Server

Privileged API credentials must stay on the server:

```ts
import { createQrToolsClient } from "@qr-tools/sdk";

const qr = createQrToolsClient({
  baseUrl: "https://api.example.com",
  apiKey: process.env.QR_TOOLS_API_KEY,
});

const result = await qr.scan({
  payload: scannedQrPayload,
});
```

## Build

From the repository root:

```bash
npm run build:sdk
```

The distributable output is written to `packages/sdk/dist`.

## Package validation

Run:

```bash
npm run pack:check --prefix packages/sdk
```

This builds the SDK and performs an npm package dry-run. It verifies the package contents without publishing anything.

## API boundary

The SDK exposes the stable public API contract:

- `scan()`
- `executeAction()`
- `QrToolsApiError`

The SDK does not expose or depend on QR Tools Core implementation details.

For the complete integration flow, see:

- `docs/SDK.md`
- `docs/SDK_EXAMPLE.md`

## Publishing

Publishing is a separate release operation. This package change does **not** publish to npm.

Before the first release:

1. Verify the package metadata and package contents.
2. Verify CI is green.
3. Confirm the intended version.
4. Authenticate to npm using a secure release environment.
5. Publish only the SDK package.
6. Verify the published package can be installed by a clean consumer project.

Never commit npm tokens or other release credentials to the repository.
