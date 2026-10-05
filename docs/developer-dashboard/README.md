# Developer Dashboard

## Purpose

The Developer Dashboard is the developer-facing portal for QR Tools public API consumers.

- URL: `https://client.thangdc.com`
- Public API: `https://api.thangdc.com`
- Internal administration: `https://admin.thangdc.com`

The dashboard manages developer access to the public API. It does not replace the public API and does not execute privileged platform administration.

## Scope

### v1 dashboard

- Developer sign-in
- API key list
- Create API key
- Show a newly created key once
- Revoke API key
- Rotate API key
- Basic API usage summary
- Rate-limit/status information
- Link to public API documentation
- API test console for scan and action execution

### Explicitly out of scope

- Internal admin operations
- License administration
- Workflow authoring
- Workflow data editing
- Billing implementation
- SDK implementation
- New public API endpoints

## Domain boundaries

| Domain | Responsibility |
|---|---|
| `api.thangdc.com` | Public API contract and request execution |
| `client.thangdc.com` | Developer self-service portal |
| `admin.thangdc.com` | Internal platform administration |

The dashboard consumes the public API and management capabilities through authenticated backend operations. It must not expose privileged management credentials to the browser.

## Security

API keys are secrets.

- A newly created key is shown in plaintext only once.
- Persistent storage keeps only a secure hash; plaintext is not recoverable.
- Existing keys are always displayed masked.
- Revocation is immediate.
- Rotation creates a replacement key and invalidates the previous key according to the key lifecycle contract.
- Dashboard frontend code must never contain a privileged platform credential.
- API keys must not be placed in URLs or browser analytics payloads.

## Navigation

Recommended primary navigation:

1. Overview
2. API Keys
3. Usage
4. API Test
5. Documentation

Account/sign-out controls remain separate from API navigation.

## Related contracts

- [Public API](../api/README.md)
- [Authentication](../api/authentication.md)
- [Rate limits](../api/rate-limits.md)
