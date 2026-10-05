# QR Tools SDK Consumer Example

This is a standalone customer-style consumer of the published `@qr-tools/sdk` package.

## Run

From this directory:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

Configure:

1. The QR Tools API base URL.
2. A client-scoped API key, if required by the API.
3. A QR Tools payload.

Click **Scan QR** to exercise the SDK's public `scan()` contract.

## Security boundary

This example represents browser integration. Only use a client-scoped credential that is explicitly allowed in browser code.

Never put a privileged API key, signing key, Supabase service-role key, or connector credential in browser code.

## What this proves

The example imports only the published package:

```ts
import { createQrToolsClient } from "@qr-tools/sdk";
```

It does not import QR Tools Core, application internals, Supabase code, or repository-relative SDK source.
