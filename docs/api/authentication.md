# Authentication

## API key

Every authenticated API request must include an API key using the HTTP Bearer authentication scheme.

```http
Authorization: Bearer YOUR_API_KEY
```

The API key identifies the calling application. Treat it as a secret.

### Requirements

- Use HTTPS.
- Send the key in the `Authorization` header.
- Do not send API keys in query strings.
- Do not expose production keys in browser JavaScript or public repositories.
- Use a separate key for each integration/application where practical.
- Rotate or revoke a key immediately if it may have been exposed.

## Authentication failures

Unauthenticated or invalid requests return HTTP `401 Unauthorized`.

Typical cases include:

| Case | Result |
| --- | --- |
| Missing `Authorization` header | `401` |
| Malformed Bearer header | `401` |
| Empty Bearer token | `401` |
| Unknown/revoked API key | `401` |
| Invalid API key | `401` |

Clients must not interpret a `401` as a QR payload or workflow error. Fix authentication and retry.

## Example

```bash
curl https://api.thangdc.com/v1/scan \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"payload":"YOUR_QR_PAYLOAD"}'
```
