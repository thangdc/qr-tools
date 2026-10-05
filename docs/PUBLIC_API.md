# QR Tools Public API

Phase 3 exposes the existing workflow runtime through a small FastAPI adapter hosted on Render.

## Endpoints

### Health

`GET /health`

No authentication.

### Scan

`POST /v1/scan`

Headers:

```
Authorization: Bearer <api-key>
Content-Type: application/json
```

Body:

```json
{
  "payload": "qrtools:<base64url-json>"
}
```

The response resolves the QR identity against `workflow_definitions` and `workflow_records`, then returns the existing public scan contract: identity, workflow metadata, record, and allowed actions.

### Execute action

`POST /v1/actions/execute`

Body:

```json
{
  "scan_payload": "qrtools:<base64url-json>",
  "action": {
    "type": "view",
    "data": {
      "recordId": "..."
    }
  }
}
```

The action is first validated against the scan result. Phase 3 only exposes the existing `view` action; new mutating actions are not invented here.

## Authentication

Consumer keys are sent as Bearer tokens. Only SHA-256 hashes are stored in `public.api_keys`. Raw keys are never persisted.

API keys are intentionally managed outside this public API in the future `client.thangdc.com` / `admin.thangdc.com` phases.

## Rate limiting

The initial Render Free deployment uses a per-API-key fixed one-minute window in process memory. The limit is stored per key and defaults to 60 requests/minute.

This is intentionally a single-instance Phase 3 implementation. Distributed rate limiting is deferred until there is a real scaling requirement.

## Hosting

- Render Free
- `api.thangdc.com`
- HTTPS provided by the hosting platform

The API never exposes Supabase credentials to consumers.
