# Rate limits and API key lifecycle

## Rate limits

The API may enforce rate limits per API key and/or integration.

Clients must handle:

```http
429 Too Many Requests
```

When a `Retry-After` header is provided, clients should wait for the indicated duration before retrying.

The public API contract does not promise a fixed numeric limit unless that limit is explicitly published for the applicable plan.

Do not build integrations that assume unlimited requests.

## Retry guidance

Retry only transient failures:

- `429` — wait according to `Retry-After` when available.
- `5xx` — use bounded exponential backoff.

Do not automatically retry ordinary `400`, `401`, `404`, or `422` responses.

## API key lifecycle

An API key has these lifecycle states:

```text
created → active → revoked
                  ↘ rotated/replaced
```

### Creation

Keys are issued through the developer/admin workflow. A key is a credential and must be stored as a secret.

### Rotation

Create a replacement key, deploy it, verify the integration, then revoke the old key.

### Revocation

Revoke a key immediately when:

- it is exposed publicly;
- an integration is decommissioned;
- ownership/access changes;
- unauthorized usage is suspected.

A revoked key must no longer authenticate API requests.

### Production safety

The API key previously exposed in development/conversation must not be promoted to production. Rotate/revoke it before production use.
