# POST /v1/actions/execute

Executes an action resolved from a QR scan.

## Request

```http
POST /v1/actions/execute
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Request body:

```json
{
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
  }
}
```

The action and identity should normally be taken from the result of `POST /v1/scan`. Clients must not manufacture action types or action data that are not supported by the workflow contract.

## Supported action types

### `view`

The `view` action resolves a record for display.

Example:

```json
{
  "type": "view",
  "data": {
    "recordId": "EQ-API-001"
  }
}
```

Additional action types are not part of the stable public contract until explicitly added to this document.

## Response

A successful execution returns a JSON object describing the execution result. The returned `action` and `identity` values identify what was executed.

Example:

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
  }
}
```

Workflow-specific response data may be included when required by the action.

## Error handling

- `400 Bad Request`: malformed action/identity or missing required fields.
- `401 Unauthorized`: API authentication failed.
- `404 Not Found`: workflow, record, or action cannot be resolved.
- `409 Conflict`: action is not valid for the current record state.
- `422 Unprocessable Entity`: action data is syntactically valid but cannot be processed.
- `429 Too Many Requests`: rate limit exceeded.
- `5xx`: server-side failure.

Clients should not retry non-transient `4xx` responses automatically.

## Execution boundary

Scanning and executing are separate operations:

```text
QR payload
   ↓
POST /v1/scan
   ↓
resolved identity + action
   ↓
POST /v1/actions/execute
   ↓
execution result
```

A successful scan does not itself execute an action.
