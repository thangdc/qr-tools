# Public API

## Purpose

The API allows customers to use QR Tools infrastructure while building their own UI and business application.

## Intended Capabilities

- Create/generate QR identities
- Validate/map workflow data
- Resolve a QR
- Execute workflow actions
- Retrieve workflow/record data where authorized
- Configure or invoke supported connectors
- Receive webhook events where supported

## Example

POST /api/v1/qr/generate

{
  "workflow": "asset",
  "data": {
    "assetId": "AC-001",
    "location": "P101"
  }
}

The exact endpoints and schemas are not finalized by this document.

## Principles

- Version the API.
- Stable contracts over UI internals.
- Authentication and authorization are mandatory for privileged operations.
- Rate limiting and usage controls must be supported.
- Never expose internal secrets.
- API behavior should use the same workflow engine as the hosted UI.

## Customer-owned UI

A customer may build React, Angular, mobile or server-rendered UI. QR Tools does not require the customer to use QR Tools UI.
