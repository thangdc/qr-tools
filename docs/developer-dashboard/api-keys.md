# API Key Management

## Lifecycle

`created → active → revoked`

Rotation is a replacement operation:

`active key → new active key + previous key revoked`

## Create

The developer chooses a descriptive name.

Example:

```text
Production website
```

The dashboard returns the complete API key exactly once.

After leaving the creation flow, the complete value cannot be retrieved again.

## List

The list shows metadata only:

- Name
- Masked key
- Status
- Created date
- Last used date, when available

Example:

```text
Production website    sk_••••••••9K2A    Active
```

The dashboard never displays the full key again.

## Revoke

Revocation requires explicit confirmation.

After revocation:

- status becomes `Revoked`
- the key cannot authenticate API requests
- it remains visible as historical metadata

## Rotate

Rotation creates a new key and revokes the old key.

The new key follows the same one-time display rule.

The dashboard should warn developers that existing integrations using the old key will stop working after rotation.

## No plaintext recovery

There is intentionally no "show key again" operation.

If a developer loses a key, they create/rotate a replacement.
