# Connectors

## Goal

Connectors adapt external systems to the workflow engine without coupling the Core to a vendor.

## Planned Inputs

- Manual input
- Excel
- CSV
- Google Sheets
- REST API
- Webhook
- Database/system integration where appropriate

## Planned Outputs

- QR image/data
- PDF/print data
- Google Sheets
- REST API
- Webhook
- Customer-owned application

## Connector Boundary

A connector translates external protocol/data into canonical workflow records or consumes workflow outputs.

The Core should not contain Google Sheets SDK calls, HTTP client details, or provider-specific authentication logic.

## Credentials

Connector credentials are server-side secrets and must never be embedded in generated browser SDK code or QR payloads.

## Initial Strategy

Implement connectors only after the core workflow and reference workflow are validated. Prefer a small adapter interface and incremental connector coverage.
