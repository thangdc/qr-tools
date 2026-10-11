# ThangDC Ecosystem — Project Status

**Last updated:** 2026-10-11  
**Status vocabulary:** `DONE_VERIFIED`, `IN_PROGRESS`, `OPEN`, `NEEDS_VERIFICATION`, `NOT_STARTED`, `BLOCKED`.

> This file is a handoff checkpoint, not a substitute for checking the repository, CI, and production. Historical statements must be re-verified before acting on them.

## Current focus

**Phase 0 — Verify and stabilize existing platform.**

Do not start multiple new AI tools before confirming the shared platform and widget behavior. The equipment-maintenance product is planned as the first business module, but its current widget must not be treated as a durable multi-user maintenance-management product until persistence, access control, and the end-to-end flow are verified.

## Recorded implementation context

| Area | Recorded state | Current confidence |
|---|---|---|
| Repository | `thangdc/qr-tools`, default branch `main` | Verified through GitHub metadata on 2026-10-11 |
| FastAPI API | `api.thangdc.com`; `POST /v1/scan` reported working | NEEDS_VERIFICATION in production |
| Action execution | `POST /v1/actions/execute` in API | NEEDS_VERIFICATION in production |
| API keys and quotas | Hashes, status/expiry, origin restrictions, rate limits, daily/monthly quotas recorded | NEEDS_VERIFICATION against current production DB/config |
| Tenant authorization | PR #210 merged into main; workflow ownership and explicit customer/system access modes added | Code change recorded; production migration/key/workflow mapping NEEDS_VERIFICATION |
| Client widget | Equipment-maintenance workflow reuse implemented in prior PRs | NEEDS_VERIFICATION end-to-end |
| Widget CORS | OPTIONS once returned 400 while POST returned 200 | Historical issue; retest before opening a bug |
| Widget bundle | `process is not defined` at `client.js:31` after PR #168 was reported | Historical issue; retest before opening a bug |
| Blogger key | Allowed origins `thangdc.com`, `www.thangdc.com`; 10/min, 500/day, 10,000/month recorded | NEEDS_VERIFICATION in database and live request |
| Blogger demo | End-to-end public demo was not verified in last recorded status | NEEDS_VERIFICATION |
| Maintenance domain model | Current workflow contract has asset ID/name/location and optional maintenance date/note | Code contract exists; not evidence of a full asset/job/history data model |
| Maintenance persistence | Generic persistence interfaces exist in workflow-engine | NEEDS_VERIFICATION: adapter, production database persistence, and cross-session/device behavior |
| Maintenance management UI | Proposed manager and technician surfaces described in `MAINTENANCE_ROADMAP.md` | NOT_STARTED as a verified product capability |

## Phase 0 checklist — Shared platform

- [ ] Inspect main HEAD and recent relevant PRs/commits.
- [ ] Verify current API deployment and health.
- [ ] Test scan with a valid authorized key and expected workflow.
- [ ] Test action execution and unauthorized workflow access.
- [ ] Inspect production migration status for tenant ownership.
- [ ] Inventory existing API keys and verify explicit access mode; never infer system access from missing user ID.
- [ ] Confirm workflow ownership mappings before enabling tenant enforcement for existing customer flows.
- [ ] Verify rate limit, daily quota, monthly quota, origin restriction, expiry, and revocation.
- [ ] Test widget on an independent origin and inspect CORS preflight, bundle console errors, scanning, printing, export, and workflow continuation.
- [ ] Verify Blogger integration end-to-end without exposing a secret key.
- [ ] Record test evidence, remaining bugs, and next task.

## Maintenance module — Current plan

Follow `MAINTENANCE_ROADMAP.md`. Phases are planned, not completed.

| Phase | Focus | Status |
|---|---|---|
| M0 | Verify current workflow, persistence, tenant security, and validate one real customer use case | NEEDS_VERIFICATION |
| M1 | Finalize domain model, API contracts, role/permission matrix, and migration plan | NOT_STARTED |
| M2 | Persistent organization-scoped asset registry, import, QR labels, search/export | NOT_STARTED |
| M3 | Technician QR scan, maintenance submission, durable history, duplicate-submit protection | NOT_STARTED |
| M4 | Maintenance history, assignments/scheduling, overdue view, reports | NOT_STARTED |
| M5 | Small real-world pilot, security/device tests, demand and willingness-to-pay validation | NOT_STARTED |
| M6 | Reuse platform primitives for other modules; separate domain-specific rules | NOT_STARTED |

**Next maintenance task:** Complete M0 evidence gathering. Do not create a new schema or implement manager UI until existing Supabase tables/RLS/migrations and the persistence adapter are inspected.

## Ecosystem backlog after platform verification

1. Phase 1 — Standardize tool contracts, error schema, versioning, file limits, usage metering, and integration/security tests.
2. Phase 2 — Data Transformer MVP.
3. Phase 3 — Image & Document Extractor (OCR) MVP.
4. Phase 4 — Webhook/API Connector.
5. Phase 5 — Minimal sequential Workflow Runner.
6. Phase 6 — Speech-to-Text, object counting, license plate recognition, face verification; one service at a time.
7. Phase 7 — Pricing, usage-based quotas, monetization, and adoption tracking.

## Current blockers

No blocker has been newly confirmed by this documentation change. Historical widget and deployment issues remain `NEEDS_VERIFICATION` until retested. Maintenance data persistence and multi-user access are key unknowns, not assumed features.

## Update log

- 2026-10-11: Added a dedicated maintenance-module roadmap and linked it to the shared ecosystem roadmap/status. No application code, production configuration, or database migration was changed.
