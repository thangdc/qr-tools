# QR Tools Roadmap

This document is the implementation order and scope guard for the QR Tools platform.
Do not start a later phase just because the architecture supports it. Finish and validate the current phase first.

## Phase 0 — Source of Truth
**Status: Done**

- Product documentation
- Architecture boundaries
- Core contracts and data model
- ADRs / decisions
- AI development context

## Phase 1 — Core
**Status: Done / baseline established**

- Workflow contracts
- Validation
- Mapping
- QR identity abstraction
- Reference workflow: Equipment Maintenance
- Workflow persistence

## Phase 2 — Dynamic QR
**Status: Done / baseline established**

- Signed/versioned QR protocol
- Resolve QR to workflow/record
- Revocation
- Scan flow
- Action discovery
- Action execution validated against scan result before delegation

## Phase 3 — Public API
**Status: Next**

Goal: expose the existing QR workflow capabilities through a stable public API.

### Hosting / domains
- Python + FastAPI
- Render Free as the initial hosting platform
- `api.thangdc.com` as the public API domain
- HTTPS through the hosting platform

### API
- Versioned API contract
- `qr:scan`
- `qr:action:execute`
- API key authentication using stored hashes
- CORS for browser SDK usage
- Rate limiting
- Request/payload validation
- Adapter from HTTP/API layer to QR Tools Core
- Real payload tests using `workflow_records`
- Consumer example calling the real API endpoint
- CI must be green before merge

### Scope guard
This phase does **not** include:
- Admin dashboard
- Client/developer dashboard
- New workflow types
- Payment changes
- New connectors
- Rewriting QR Tools Core in Python

## Phase 4 — SDK + Client Experience
**Status: Planned**

Goal: make the public API easy for external developers/customers to consume.

- JavaScript/TypeScript SDK
- Browser-safe integration
- SDK documentation and examples
- `client.thangdc.com`
- Customer authentication
- Project management
- API key creation/revocation
- Usage/quota visibility
- Developer API documentation / test console

The client dashboard is a consumer-management layer; it must not move business logic out of QR Tools Core.

## Phase 5 — Admin / Platform Operations
**Status: Planned**

Goal: provide owner/operator controls without coupling them to the public API.

- `admin.thangdc.com`
- Customer/project management
- API key management
- Usage and request monitoring
- API/error logs
- Rate-limit configuration
- Operational/audit controls
- License/customer administration where needed

Admin UI and client UI remain separate from `api.thangdc.com`.

## Phase 6 — Connectors
**Status: Planned / demand-driven**

Only build connectors after the core API/workflow has been proven with real users.

Potential connectors:
- Excel/CSV
- Google Sheets
- REST API
- Webhooks
- Additional integrations based on customer demand

## Domain Map

| Domain | Responsibility |
|---|---|
| `qr.thangdc.com` | QR Tools product / end-user workflows |
| `api.thangdc.com` | Public API |
| `client.thangdc.com` | Customer/developer portal |
| `admin.thangdc.com` | Owner/admin portal |

## Implementation Order

1. **Finish Phase 3 — Public API**
2. Validate API with real workflow data
3. **Then Phase 4 — SDK + Client**
4. **Then Phase 5 — Admin**
5. Only then expand connectors based on demand

## Non-goal

Do not build the platform around hypothetical future features.
The current priority is a small, stable public API over the proven QR workflow core.
