# Architecture

## Principle

**QR Tools Web is a consumer of the Core. The Core is the product capability.**

## Target Shape

apps/
- web — hosted QR Tools UI
- api — public API boundary

packages/
- workflow-engine — workflow execution and contracts
- qr-engine — QR encoding, signing and verification
- data-mapper — validation, mapping and transformations
- connectors — external data source/output adapters
- sdk — customer-facing JavaScript SDK
- types — shared public/domain contracts

supabase/
- database
- auth
- storage
- edge functions and infrastructure adapters

## Layering

UI → API/application layer → Core/domain services → infrastructure adapters

The Core must not depend on:
- React
- browser APIs
- QR Tools page routes
- Supabase-specific APIs
- a specific storage provider

Infrastructure may depend on Core contracts, not the reverse.

## Monorepo Decision

Keep the system in one repository while the architecture is being validated.

Split repositories/services only when there is a demonstrated operational or ownership need and an ADR approves it.

## API and SDK

The web application, SDK and external customers must consume stable application contracts rather than duplicate business logic.

## Dynamic QR

Prefer QR payloads that identify a workflow/record and contain integrity protection rather than embedding all business data directly.

This allows data changes, revocation, access control and analytics without reprinting a QR.

## Security Boundary

Browser/SDK code is untrusted. Secrets, signing keys and privileged connector credentials remain server-side.
