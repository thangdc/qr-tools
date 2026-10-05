# Public API

QR Tools exposes a versioned API boundary for customer-owned applications.

## Boundary

The public API is an application-layer boundary. It may call the Core, but the Core does not depend on HTTP, authentication providers, Supabase, or browser code.

Customer UI / Script → Public API → Workflow Engine → QR Engine / Persistence / Connectors

## Versioning

The current public API version is **v1**. The base path is `/v1`.

Breaking contract changes require a new API version. Additive, backward-compatible fields may be introduced within the same version.

## Endpoints

### POST /v1/qr/scan

Resolve a QR payload to its workflow identity, record, and currently allowed actions.

Request:

    {
      "payload": "qrtools:..."
    }

Response:

    {
      "identity": {
        "version": 1,
        "workflowId": "equipment-maintenance",
        "recordId": "ASSET-001"
      },
      "record": {
        "workflowId": "equipment-maintenance",
        "workflowVersion": 1,
        "recordId": "ASSET-001",
        "data": {}
      },
      "actions": [
        {
          "type": "view",
          "data": { "recordId": "ASSET-001" }
        }
      ]
    }

A valid QR may resolve to no record. In that case `record` is `null` and `actions` is empty.

### POST /v1/qr/actions/execute

Execute one action that is currently allowed for the supplied QR payload.

Request:

    {
      "payload": "qrtools:...",
      "action": {
        "type": "view",
        "data": { "recordId": "ASSET-001" }
      }
    }

The API must re-resolve and validate the QR/action combination before delegating to an action handler. A client must never be trusted to declare that an action is allowed.

Response:

    {
      "success": true
    }

## Errors

Errors use one stable envelope:

    {
      "error": {
        "code": "QR_IDENTITY_INVALID",
        "message": "QR identity verification failed."
      }
    }

Error codes are part of the public contract. Error messages are informational and must not be used by clients for program logic.

## Authentication

Authentication is a separate API concern and is not implemented by the contract-only layer.

Authenticated requests use:

```
Authorization: Bearer <api-key>
```

API keys and other credentials are never embedded in QR payloads.

The browser SDK may use a dedicated, least-privileged client key when the integration explicitly permits browser-side authentication. Privileged/server-only keys must never be shipped to browsers.

## Authorization

Authentication and authorization are separate:

- authentication establishes the caller identity
- scopes authorize a specific API capability

The current endpoint scopes are:

- `qr:scan` — required by `POST /v1/qr/scan`
- `qr:action:execute` — required by `POST /v1/qr/actions/execute`

The API layer provides `requireScope(principal, scope)` for endpoint-level authorization.

Authentication implementations must never return or expose the raw API key after validation.

## Rate limiting

Every authenticated public API request must pass through a rate-limit policy before privileged Core operations execute.

Rate limiting is provider-independent. The API layer depends only on the `ApiRateLimiter` contract.

The default rate-limit identity is the authenticated `principal.keyId`. Raw API keys must never be used as externally visible rate-limit identifiers.

Rate-limit policy is separate from storage and algorithm implementation. Redis, Supabase, in-memory counters, token buckets, fixed windows, and other implementations belong outside the Core.

When a request is rejected by policy, the public API uses the stable error code:

    RATE_LIMIT_EXCEEDED

HTTP response headers such as `Retry-After` are transport concerns.

## Customer integration

The intended integration is deliberately simple:

Customer system → authenticate → POST /v1/qr/scan → render returned record/actions → POST /v1/qr/actions/execute

This lets customers keep ownership of their UI while QR Tools provides QR resolution and workflow capabilities.

### TypeScript / browser SDK

The customer-facing SDK lives at `packages/sdk/src/index.ts`.

Example:

```ts
import { createQrToolsClient } from "@qr-tools/sdk";

const qr = createQrToolsClient({
  baseUrl: "https://api.example.com",
  apiKey: "client-scoped-key",
});

const result = await qr.scan({
  payload: scannedQrPayload,
});

if (result.record) {
  renderRecord(result.record);
}

await qr.executeAction({
  payload: scannedQrPayload,
  action: result.actions[0],
});
```

The SDK:

- calls only the versioned public API
- does not duplicate workflow or QR business logic
- uses standard `fetch`
- supports an injected `fetch` implementation for tests/custom runtimes
- exposes typed API errors with HTTP status and stable error code
- does not store credentials or application data

The SDK is safe to use as a browser integration layer only with credentials explicitly intended for client-side use. Never embed privileged server keys.

## Source of truth

The TypeScript public API contract lives at `apps/api/src/contracts/v1.ts`.

Authentication lives at `apps/api/src/auth/index.ts`. Rate-limit policy lives at `apps/api/src/policy/rate-limit.ts`.

The HTTP boundary is implemented by `apps/api/src/http/index.ts` and the versioned route dispatcher lives at `apps/api/src/http/router.ts`.

The SDK implementation lives at `packages/sdk/src/index.ts`.

Concrete credential storage, rate-limit storage/algorithm, and infrastructure adapters remain separate concerns.
