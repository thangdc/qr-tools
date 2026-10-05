# Data Model

## Canonical Record

A workflow defines a canonical schema independent of the original source format.

Example:

{
  "assetId": "AC-001",
  "name": "Panasonic AC",
  "location": "P101"
}

## Source Mapping

External fields map into canonical fields.

Example:
Excel `Asset Code` → `assetId`
Google Sheet `Room` → `location`

## Separation

Keep these concepts separate:
- Source record
- Canonical workflow record
- QR identity
- Workflow execution
- Action result

This prevents connectors and UI formats from leaking into the domain model.

## Validation

Validation should be explicit and reusable:
- required
- type
- format
- length
- uniqueness
- allowed values
- workflow-specific business rules

## Versioning

Workflow schemas and mappings may evolve. A versioned workflow must be able to explain how its existing QR records are interpreted.
