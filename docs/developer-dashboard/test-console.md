# API Test Console

The test console provides a convenient way to validate an integration without leaving the developer portal.

## Supported operations

### Scan

Calls:

```http
POST https://api.thangdc.com/v1/scan
```

Inputs:

- API key
- QR payload

The API key is selected from the developer's existing active keys and is not rendered as plaintext in the UI.

### Execute action

Calls:

```http
POST https://api.thangdc.com/v1/actions/execute
```

Inputs:

- API key
- action
- identity

The console should make the distinction between scan and execute explicit.

## Security boundary

The browser must not receive a privileged platform credential.

A dashboard implementation must use the approved developer authentication/session mechanism and the minimum backend capability required to perform the test operation.

## Contract source

Request and response examples must stay aligned with:

- [Scan API](../api/scan.md)
- [Actions API](../api/actions.md)
