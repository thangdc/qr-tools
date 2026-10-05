# Security

## Core Rules

- Treat browser code, SDK code and QR contents as untrusted.
- Never ship secrets or private signing keys to browsers.
- Validate server-side even if the client validates.
- Authorize every privileged workflow/record operation.
- Isolate customer/tenant data.
- Protect connector credentials.
- Support QR revocation where dynamic QR is used.
- Sign or otherwise integrity-protect QR identities where required.

## Open Source Boundary

The public repository may contain client code and non-secret product logic. It must never contain:
- service-role keys
- private signing keys
- production credentials
- connector tokens
- passwords
- privileged API keys

Architecture documentation may describe security behavior but must not include real secrets.

## Threat Model Areas

- QR tampering
- unauthorized record resolution
- API key leakage
- connector credential leakage
- cross-tenant access
- replay/abuse of workflow actions
- malicious input through imports/APIs
