# SDK

## Purpose

The SDK provides low-code integration for customers who want QR functionality inside an existing website/application.

## Intended Capabilities

- Initialize a workflow
- Generate QR
- Resolve QR
- Invoke supported workflow operations
- Optionally embed hosted components where explicitly supported

## Security

The SDK is untrusted client code:
- No private keys
- No privileged connector credentials
- No admin secrets
- No assumptions that client-side validation is authoritative

Server-side authorization remains authoritative.

## Principle

SDK behavior must call public application/API contracts. Do not duplicate domain logic in the browser.

## Future Packaging

A JavaScript/TypeScript package may be published when API contracts and workflow contracts are stable.
