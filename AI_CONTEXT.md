# QR Tools — AI Context

## Product Identity

QR Tools is evolving from a QR code generator into a **QR Workflow Infrastructure Platform**.

Core model:

Data Source → Validate → Map → Transform → Encode → QR → Scan → Resolve → Action / Output

The product must support three consumption modes:
1. QR Tools Web UI
2. SDK / embedded integration
3. REST API

All three modes must use the same core workflow engine.

## Current Product

The existing product supports QR generation, QR types, history, bulk/import flows, export and print, with paid capabilities around Pro/workflow use cases.

Do not remove or regress existing user-facing behavior while introducing the new architecture.

## Strategic Direction

The first reference workflow is **Equipment Maintenance**.

Future platform capabilities include:
- Dynamic QR
- QR identity/record resolution
- Data validation and field mapping
- Google Sheets, Excel/CSV and REST API connectors
- Webhooks
- Custom fields and workflow-specific UI
- Customer-owned UI through API
- JavaScript SDK / embeddable integration
- Developer and Business plans

## Architecture Rules

- QR Tools Web is a consumer of the Core, not the Core.
- Core workflow logic must not depend on React, browser UI, qr.thangdc.com, or a specific frontend framework.
- API and SDK must use the same core contracts as the web application.
- Keep the repository as a monorepo initially.
- Do not split repositories or services without an ADR.
- Supabase is infrastructure; business/domain logic should have a framework-independent boundary.
- Never put secrets in browser SDK code.
- Prefer reusable workflow primitives over workflow-specific implementations.
- Do not turn QR Tools into a generic Zapier clone.

## Development Sequence

1. Documentation and source of truth
2. Core workflow contracts
3. Equipment Maintenance reference workflow
4. Dynamic QR / resolve
5. Public API
6. SDK
7. External connectors

## AI Rules

Before architectural changes:
1. Read this file.
2. Read relevant docs under docs/.
3. Read DECISIONS.md and relevant ADRs.
4. Preserve existing behavior.
5. Document architectural decisions.
6. Do not introduce a new service/repository or public contract without documenting why.
7. Update documentation when architecture changes.
