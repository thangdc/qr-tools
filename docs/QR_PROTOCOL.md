# QR Protocol

## Purpose

QR codes should be treated as identifiers for workflows/records where appropriate, rather than as containers for sensitive business data.

## Conceptual Payload

Version + workflow identifier + record identifier + integrity/signature data + optional nonce/timestamp.

Example conceptual form:

QT:<version>:<workflow>:<record>:<signature>

The exact wire format is not finalized by this document.

## Requirements

- Versioned
- Compact enough for practical QR usage
- Tamper-evident
- Verifiable server-side
- Supports revocation
- Supports workflow/record resolution
- Does not expose secrets
- Does not require reprinting when backend record data changes

## Security

Signing keys and privileged verification material must remain server-side where feasible. Do not place private keys in SDK/browser bundles.

## Future Compatibility

Protocol changes must be versioned and documented. Existing QR codes should remain resolvable for their supported lifetime.


## Revocation

QR identity revocation is an application/infrastructure concern, not a QR payload concern.

The Core exposes a revocation boundary through `QrIdentityRevocationStore` and a verifier decorator. A revoked identity is rejected before workflow record resolution.

The revocation store may be backed by Supabase or another persistence provider, while the Core remains provider-independent.

Revocation keys are derived from QR identity version, workflow ID and record ID. Revoking an identity therefore does not require changing or reprinting the QR code.
