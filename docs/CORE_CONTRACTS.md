# Core Contracts

## Purpose

This document defines the first stable conceptual boundaries for the Core Skeleton.

## Contract Rules

- Contracts describe capabilities, not framework implementations.
- Domain/application types must not depend on React, Supabase, browser APIs or provider SDKs.
- External connectors adapt to Core contracts.
- SDK code is untrusted and must never contain privileged secrets.
- Public API contracts should be derived from these boundaries rather than from UI component state.

## Initial Package Boundaries

| Package | Responsibility |
|---|---|
| types | Shared workflow/record/validation contracts |
| workflow-engine | Workflow execution boundary |
| qr-engine | QR identity and protocol boundary |
| data-mapper | Generic validation and field mapping |
| connectors | External input/output adapters |
| sdk | Customer integration boundary |

## Deliberately Not Included

- Database repositories
- Supabase client implementations
- Google Sheets implementation
- REST API implementation
- UI components
- Authentication implementation
- Concrete QR signing algorithm

Those are implementation decisions for later PRs.

## Migration Rule

Existing src/ code remains the current application. Future workflow features should consume these boundaries incrementally rather than performing a large rewrite.
