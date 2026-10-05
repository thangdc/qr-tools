# QR Tools Public API

The QR Tools Public API exposes QR scan and workflow-action execution over HTTPS.

> **Returning to this project after a break?** Read the [Public API Architecture & Project Context](../architecture/public-api.md) first. It records the project boundary, completed PRs, current status, and the next implementation step.

## Base URL

Production:

`https://api.thangdc.com`

All public endpoints are versioned under `/v1`.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/v1/scan` | Scan a QR payload and resolve it to a workflow/record/action |
| POST | `/v1/actions/execute` | Execute an action returned by the scan contract |

## Authentication

Send an API key as a Bearer token:

```http
Authorization: Bearer YOUR_API_KEY
```

Never put a real API key in source control, documentation, browser bundles, or client-side public code.

See [Authentication](./authentication.md).

## Contract documents

- [Authentication](./authentication.md)
- [Scan](./scan.md)
- [Actions](./actions.md)
- [Integration examples](./integration.md)
- [Versioning](./versioning.md)
- [Rate limits and API key lifecycle](./rate-limits.md)
- [Architecture & project context](../architecture/public-api.md)

## Stability rule

The `/v1` contract is intended for backward-compatible evolution. Breaking changes require a new API version.

This documentation describes the public contract only. It does not define internal workflow-engine implementation details.
