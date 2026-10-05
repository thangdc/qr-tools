# Public API Architecture & Project Context

**Recovery point for QR Tools Public API work.** If the API work is paused for a while, read this document first before changing code or starting a new implementation.

## 1. Project boundary

`thangdc/qr-tools` is the main QR Tools product repository. The Public API is part of this product; it is not a separate product or a replacement repository.

- Public API: `https://api.thangdc.com`
- Developer Dashboard: `https://client.thangdc.com`
- Internal administration boundary: `https://admin.thangdc.com` (planned)

## 2. Why the Public API exists

The API lets external applications integrate QR Tools workflows without embedding the QR Tools UI.

Flow:

    External system
        -> POST /v1/scan
        -> resolve workflow + record + action
        -> POST /v1/actions/execute
        -> action result

The API is the integration boundary around QR workflow resolution and action execution.

## 3. Current public API contract

Production base URL: `https://api.thangdc.com`

| Method | Endpoint | Responsibility |
| --- | --- | --- |
| POST | `/v1/scan` | Resolve a QR payload into workflow/record/action information |
| POST | `/v1/actions/execute` | Execute an action returned by the scan contract |

Current stable action type: `view`.

Contract documents:
- [API overview](../api/README.md)
- [Authentication](../api/authentication.md)
- [Scan](../api/scan.md)
- [Actions](../api/actions.md)
- [Integration](../api/integration.md)
- [Versioning](../api/versioning.md)
- [Rate limits](../api/rate-limits.md)

Do not invent undocumented endpoints or response fields.

## 4. Authentication

Public API authentication uses an API key with `Authorization: Bearer YOUR_API_KEY`.

API key lifecycle:

    Developer signs in
        -> create key
        -> plaintext shown once
        -> store only secure hash
        -> use Bearer key with API
        -> revoke / rotate when needed

Security rules:
- Never store plaintext production API keys in source control.
- Never put API keys in URLs.
- Never expose privileged credentials in browser bundles.
- Do not put API keys into analytics payloads.
- Revoke/rotate a leaked key.

## 5. Developer Dashboard boundary

`client.thangdc.com` is the developer self-service portal. It manages developer sign-in, API keys, usage summary, rate-limit/status information, API testing, and documentation links.

It is not the Public API and must not contain privileged platform credentials.

`admin.thangdc.com` is the separate internal administration boundary. It is not for normal API consumers.

## 6. API usage tracking

The database foundation is `public.api_request_logs`.

Stored fields:
- `api_key_id`
- `endpoint`
- `method`
- `status_code`
- `success`
- `duration_ms`
- `created_at`

Deliberately not stored:
- API key plaintext
- Authorization headers
- QR payloads
- request bodies
- response bodies
- IP addresses

Migration: `supabase/migrations/20261005160000_add_api_request_logs.sql`.

This migration was delivered in PR #145.

Required runtime behavior:

    authenticate
        -> identify api_key_id
        -> execute request
        -> determine HTTP status
        -> write telemetry
        -> return original API response

Telemetry failure must never become the reason a normal API request fails.

## 7. What has already been completed

| PR | Purpose |
| --- | --- |
| #140 | Developer authentication foundation |
| #141 | API key management foundation |
| #142 | Developer Dashboard API key UI |
| #143 | Signup/email confirmation fix |
| #144 | Signup response normalization |
| #145 | API usage tracking database foundation |

Do not redo these features unless there is a specific bug or migration requirement.

## 8. Immediate next step

**Connect the real Public API request pipeline to `public.api_request_logs`.**

Implementation requirements:
1. Authenticate the API key.
2. Resolve the authenticated `api_key_id`.
3. Execute `/v1/scan` or `/v1/actions/execute`.
4. Capture HTTP status and duration.
5. Insert one telemetry record.
6. Return the original API response.
7. Ensure telemetry failure does not break the API.

This should be one isolated PR.

Do not create another API architecture, duplicate usage tables, another public API version, or move the API to another repository without concrete evidence. Do not redesign the dashboard, implement billing, or add SDKs before the API contract is stable.

## 9. Versioning

`/v1` is the current public contract.

Backward-compatible changes may extend `/v1`. Breaking changes require a new version such as `/v2`.

Do not casually change existing request/response fields because external consumers may already depend on them.

## 10. Source-of-truth map

When returning after forgetting the context, read in this order:

1. **This document** — architecture, status, and next step.
2. [Public API README](../api/README.md) — public API entry point.
3. [Scan contract](../api/scan.md) — scan request/response.
4. [Actions contract](../api/actions.md) — action execution.
5. [Authentication](../api/authentication.md) — API key rules.
6. [Developer Dashboard](../developer-dashboard/README.md) — dashboard boundary.
7. `supabase/migrations/20261005160000_add_api_request_logs.sql` — usage telemetry schema.
8. Git history / PRs #140–#145 — implementation history.

If unsure what to do next, check **Immediate next step** before writing code.

## 11. Non-negotiable security boundary

The Public API is an external integration surface.

Never put these into public source, browser bundles, or documentation:
- Supabase service-role keys
- production API key plaintext
- private signing/admin credentials
- customer secrets
- sensitive customer request payloads

Public documentation describes contracts and examples. Secrets and privileged implementation details stay server-side.