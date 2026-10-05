# Integration examples

These examples use placeholders only. Never commit a real production API key.

## cURL

### Scan

```bash
curl https://api.thangdc.com/v1/scan \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"payload":"YOUR_QR_PAYLOAD"}'
```

### Execute

```bash
curl https://api.thangdc.com/v1/actions/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## JavaScript

```javascript
const response = await fetch("https://api.thangdc.com/v1/scan", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    payload: qrPayload
  })
});

if (!response.ok) {
  throw new Error(`QR API failed: ${response.status}`);
}

const result = await response.json();
console.log(result);
```

## Python

```python
import requests

response = requests.post(
    "https://api.thangdc.com/v1/scan",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={"payload": qr_payload},
    timeout=10,
)

response.raise_for_status()
result = response.json()
print(result)
```

## Integration guidance

- Keep API keys on a trusted server when possible.
- Do not embed privileged API keys in a public frontend.
- Treat HTTP status codes as the primary error classification.
- Do not depend on undocumented response fields.
- Do not execute an action unless the application has intentionally accepted the scan result.
