# Usage data foundation

The developer dashboard usage view is backed by public.api_request_logs.

## Stored fields

- api_key_id — authenticated API key.
- endpoint — normalized public route such as /v1/scan.
- method — HTTP method.
- status_code — response status.
- success — whether the API request succeeded.
- duration_ms — optional server-side duration.
- created_at — request timestamp.

## Privacy boundary

The telemetry table does not store:

- API key plaintext
- Authorization headers
- QR payloads
- request bodies
- response bodies
- IP addresses

RLS is enabled and no browser-facing policy is granted. Dashboard usage queries must go through a trusted server-side path.

## Dashboard aggregations

The Usage page can derive:

- request totals for today, 7 days, and 30 days
- success/error counts
- status-code breakdown
- endpoint usage
- per-key usage
- latest request timestamp

The API implementation is responsible for inserting one telemetry row after each authenticated public API request. This migration intentionally does not add a new public API endpoint.
