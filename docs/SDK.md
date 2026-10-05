# SDK Integration

The QR Tools SDK is the customer-facing TypeScript client for the public API.

## Package

The package name is:

```
@qr-tools/sdk
```

Build it from the repository with:

```bash
npm run build:sdk
```

The build produces JavaScript and TypeScript declarations under `packages/sdk/dist`.

## Server integration

Use a privileged API key only in a trusted server environment:

```ts
import { createQrToolsClient } from "@qr-tools/sdk";

const qr = createQrToolsClient({
  baseUrl: "https://api.example.com",
  apiKey: process.env.QR_TOOLS_API_KEY,
});

const result = await qr.scan({
  payload: scannedQrPayload,
});

await qr.executeAction({
  payload: scannedQrPayload,
  action: result.actions[0],
});
```

Never expose a privileged API key to browser code.

## Browser integration

Browser applications may use the SDK only with a dedicated client-safe key whose scopes and server policy explicitly permit browser use:

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
```

The browser owns the UI. QR Tools owns QR resolution, workflow authorization, and action validation.

## Error handling

API failures are exposed as `QrToolsApiError`:

```ts
try {
  await qr.scan({ payload });
} catch (error) {
  if (error instanceof QrToolsApiError) {
    console.error(error.status, error.code, error.message);
  }
}
```

Clients should branch on the stable `code`, not the human-readable message.

## Contract boundary

The SDK contains only serialized public API DTO shapes and HTTP client behavior. It does not import Core implementation modules.

The public API contract remains the source of truth:

- `apps/api/src/contracts/v1.ts`
- `apps/api/src/http/router.ts`
- `packages/sdk/src/index.ts`

A future generated-client step may remove manual DTO mirroring if the API contract becomes machine-generated.
