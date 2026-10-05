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

Authentication is a separate API concern and is not implemented by this contract-only layer.

Future authenticated requests will use `Authorization: Bearer <api-key>`.

API keys and other secrets are never embedded in QR payloads or browser-side source code.

## Customer integration goal

The intended integration is deliberately simple:

Customer system → POST /v1/qr/scan → render returned record/actions → POST /v1/qr/actions/execute

This lets customers keep ownership of their UI while QR Tools provides QR resolution and workflow capabilities.

## Source of truth

The TypeScript contract lives at `apps/api/src/contracts/v1.ts`.

The HTTP implementation, authentication, rate limiting, and infrastructure adapters will be added in later Phase 3 PRs.


## Authentication boundary

Every public API request that accesses customer data or workflow operations must be authenticated.

The Core does not know how API keys are stored or validated. The API layer depends only on the provider-independent `ApiAuthenticator` contract:

```ts
interface ApiAuthenticator {
  authenticate(request: {
    authorization: string | null;
  }): Promise<ApiPrincipal | null>;
}
```

The request header is:

```
Authorization: Bearer <api-key>
```

The API layer converts a successful authentication into an `ApiPrincipal` containing a non-secret key identifier and granted scopes.

Authentication implementations must never return or expose the raw API key after validation.

### Authorization

Authentication and authorization are separate:

- authentication establishes the caller identity
- scopes authorize a specific API capability

The current boundary provides `requireScope(principal, scope)` for endpoint-level authorization. Scope names remain API policy and can evolve without coupling the Core to an authentication provider.

### Security rules

- API keys are server-side credentials.
- Never place API keys in QR payloads.
- Never expose raw API keys in API responses, logs, or browser bundles.
- Invalid or missing credentials must be rejected before the request reaches privileged Core operations.
- Storage, hashing, rotation, revocation, and rate limiting are infrastructure/policy concerns, not part of this contract.

The HTTP middleware and concrete key store will be added separately.


## Rate limiting boundary

Every authenticated public API request must pass through a rate-limit policy before privileged Core operations execute.

Rate limiting is provider-independent. The API layer depends only on the `ApiRateLimiter` contract:

```ts
interface ApiRateLimiter {
  check(request: {
    principal: ApiPrincipal;
    policy: {
      maxRequests: number;
      windowSeconds: number;
    };
    nowEpochSeconds?: number;
  }): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAtEpochSeconds: number;
  }>;
}
```

The default rate-limit identity is the authenticated `principal.keyId`. Raw API keys must never be used as externally visible rate-limit identifiers.

Rate-limit policy is separate from storage and algorithm implementation. Redis, Supabase, in-memory counters, token buckets, fixed windows, and other implementations belong outside the Core and can be selected later.

When a request is rejected by policy, the public API uses the stable error code:

    RATE_LIMIT_EXCEEDED

HTTP response headers such as `Retry-After` and rate-limit metadata are transport concerns and will be mapped by the HTTP implementation later.

Rate limiting must not be implemented inside QR payloads, browser bundles, or workflow/domain code.

## Customer integration goal

The intended integration is deliberately simple:

Customer system → authenticate → rate-limit check → POST /v1/qr/scan → render returned record/actions → POST /v1/qr/actions/execute

This lets customers keep ownership of their UI while QR Tools provides QR resolution and workflow capabilities.

## Source of truth

The TypeScript public API contract lives at `apps/api/src/contracts/v1.ts`.

Authentication lives at `apps/api/src/auth/index.ts`. Rate-limit policy lives at `apps/api/src/policy/rate-limit.ts`.

The HTTP boundary is implemented by `apps/api/src/http/index.ts` and the versioned route dispatcher lives at `apps/api/src/http/router.ts`. The concrete credential store, rate-limit storage/algorithm, and infrastructure adapters remain separate concerns.
