# Usage Dashboard

## Purpose

Usage is informational. It must not redefine the public API contract.

## v1 metrics

Show the smallest useful set:

- Requests
- Successful requests
- 4xx errors
- 5xx errors
- Current rate-limit status

Where available, allow a simple time range such as:

- Last 24 hours
- Last 7 days
- Last 30 days

## Initial implementation

The first dashboard version should prefer aggregate metrics already available from the API platform.

Do not introduce a new analytics/event pipeline solely for the dashboard unless the existing platform cannot provide the required data.

## Privacy

Do not display raw request payloads, API keys, authorization headers, or other secrets in usage views.
