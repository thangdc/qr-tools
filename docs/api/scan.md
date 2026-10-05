# POST /v1/scan

Resolves a QR payload through the public QR Tools scan contract.

## Request

```http
POST /v1/scan
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Request body:

```json
{
  "payload": "YOUR_QR_PAYLOAD"
}
```

### QR payload

The `payload` is the value obtained from the QR scanner. The API treats it as an opaque string at the transport boundary.

Do not assume that every QR payload is a URL. The payload may encode a QR Tools workflow identity and record/action information.

## Successful response

The response follows the scan contract and returns the resolved identity, record, and optional action.

Example shape:

```json
{
  "success": true,
  "action": {
    "type": "view",
    "data": {
      "recordId": "EQ-API-001"
    }
  },
  "identity": {
    "version": 1,
    "workflowId": "equipment-maintenance",
    "recordId": "EQ-API-001"
  },
  "record": {
    "workflowId": "equipment-maintenance",
    "workflowVersion": 1,
    "recordId": "EQ-API-001"
  }
}
```

The exact `record` fields are workflow-specific. Consumers should use the documented stable fields rather than depending on undocumented internal fields.

## Error handling

Consumers should distinguish transport/authentication failures from scan-domain failures.

- `400 Bad Request`: request body is invalid or required input is missing.
- `401 Unauthorized`: API authentication failed.
- `404 Not Found`: the QR payload does not resolve to a public resource/action.
- `409 Conflict`: the resolved resource cannot be used because of its current state.
- `429 Too Many Requests`: the API key has exceeded the applicable rate limit.
- `5xx`: server-side failure; retry only according to the integration's retry policy.

Error response bodies should be treated as diagnostic information, not as a stable success contract unless explicitly documented.

## Idempotency

`POST /v1/scan` is a read/resolve operation. Repeating the same request must not execute the returned action.
