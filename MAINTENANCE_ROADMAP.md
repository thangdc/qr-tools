# Equipment Maintenance Module Roadmap

**Last updated:** 2026-10-11  
**Status:** PLANNED — implementation and production behavior must be verified before marking work complete.  
**Parent project:** `thangdc/qr-tools`  
**Purpose:** Define a practical maintenance-management product built on the reusable business-workflow platform, without turning the shared platform into a maintenance-only system.

## 1. Product goal

Help an organization register equipment, identify it by QR code, assign and record maintenance work, and review equipment history from a central management interface and a technician-friendly mobile flow.

Maintenance is the first business module used to validate the platform's multi-organization model, roles, persistent records, QR identity, and workflow actions. The platform must remain reusable for later modules such as check-in/check-out, delivery tracking, inventory, and payment integrations.

## 2. Product surfaces

### Management interface
For Owner/Admin and Maintenance Manager:
- Manage organization members and roles.
- Import, create, edit, search, and archive equipment.
- Detect duplicate equipment during import and show row-level validation errors.
- View equipment details, QR label/print options, maintenance history, and current status.
- Create and assign maintenance jobs when scheduling is introduced.
- View operational summaries and export permitted data.

### Technician interface
Mobile-first; entered from scanning an equipment QR:
- Show only information the signed-in technician is authorized to see.
- Start or open an assigned maintenance job.
- Complete a checklist, enter findings and notes, and attach photos only when upload/security/retention are ready.
- Save progress safely and submit a result.
- Show confirmation and the relevant history/status without exposing management-only controls.

### Shared platform capabilities
Reuse the existing QR Tools API, workflow contracts, SDK/widget, API-key and usage infrastructure where appropriate. User authentication and organization membership authorize people; an API key identifies an application/client and is not a substitute for a person’s identity. Verify existing tenant authorization and production mappings before adding another security layer.

## 3. Scope boundaries

### Maintenance module owns
- Equipment-specific fields and lifecycle.
- Maintenance job/schedule rules.
- Checklists and technician submissions.
- Maintenance status and maintenance history.
- Maintenance-specific reports.

### Shared platform owns
- Authentication integration, organizations/membership primitives, authorization boundaries.
- Workflow execution contracts, QR identity/scan, generic persistence interfaces, audit/event conventions.
- API/SDK/widget integration, usage limits, observability, import/export primitives where reusable.

Do not build a universal form designer, complex drag-and-drop workflow editor, or a separate backend just for maintenance in the MVP. Keep payment processing out of the maintenance core; future payment or check-in modules must use their own domain models and rules.

## 4. Domain model direction

Treat the following as a proposed logical model, not a claim that these tables already exist:

- **Organization:** tenant boundary for business data.
- **OrganizationMember:** user membership and role within an organization.
- **Asset:** equipment registry entry with a stable organization-scoped asset key, name, location, category, status, and QR identity.
- **MaintenanceJob:** planned or requested work for an asset; may later include assignee, due date, priority, and workflow status.
- **MaintenanceRecord:** append-oriented record of work performed, observations, checklist answers, technician, and timestamps.
- **ImportBatch:** source, import time, counts, and row-level outcomes for traceability.
- **AuditEvent:** actor, organization, action, target, timestamp, and outcome for important security/business changes.

Rules:
1. All organization-owned data must be scoped and authorized server-side; never trust a client-supplied organization ID as proof of access.
2. Asset identity must be stable and unique within its agreed scope. Import should upsert assets by an explicit stable key and report conflicts.
3. Updating an asset must never overwrite or delete prior maintenance records.
4. Preserve actor and timestamps for submitted maintenance results; corrections should be traceable rather than silently erasing history.
5. Do not add or run database migrations until the current Supabase schema, RLS policies, existing tenant migration, and deployed data are inspected.
6. QR payloads should use a stable opaque identity or resolvable URL, not sensitive asset or organization data.

## 5. Roles and permissions

Initial role proposal:
- **Owner/Admin:** manage organization settings, members, roles, all module data, and exports.
- **Maintenance Manager:** manage assets and jobs, assign work, review records, and run reports.
- **Technician:** read permitted asset details and submit/update their allowed in-progress maintenance work.
- **Viewer/Auditor:** read-only access to explicitly permitted assets, history, and reports.

Authorization must be tested at the API/data boundary, not implemented only by hiding UI controls. Define whether technicians may see all organization assets or only assigned work before production launch.

## 6. Phased delivery plan

### M0 — Validate existing platform and user workflow
- Reconcile `ROADMAP.md`, `PROJECT_STATUS.md`, current code, Supabase schema/RLS, migrations, API deployment, and tenant ownership mappings.
- Re-test the current `equipment-maintenance` workflow end-to-end: import, validation, record persistence, QR generation, scan/resolve, action submission, print/export, and browser console/network behavior.
- Confirm whether current persistence is in-memory or durable and whether records can be read across sessions/devices.
- Write down one real target customer/use case, approximate equipment count, technician count, and the current paper/spreadsheet process.

**Exit criteria:** A test-evidence checklist clearly separates working behavior, code-only behavior, production gaps, and unknowns. No historical bug is reopened without retesting.

### M1 — Finalize the minimum domain and access contract
- Inspect existing organization, user, API-key, workflow ownership, and RLS structures before proposing schema changes.
- Agree the minimum fields and lifecycle for Asset, MaintenanceJob, MaintenanceRecord, ImportBatch, and roles.
- Decide asset stable key, QR resolution contract, retention rules, and whether a job is required or a technician may submit an ad-hoc maintenance record.
- Define API contracts and permission matrix for list/read/create/update/assign/submit/export.
- Document migration and rollback plan; add tests for cross-organization access denial.

**Exit criteria:** Reviewed schema/API/permission proposal, migration plan, and acceptance tests. No duplicate tenant/auth framework is introduced.

### M2 — Persistent asset registry and management MVP
- Implement organization-scoped asset list/detail/create/edit/archive.
- Implement import preview, field mapping, required-field validation, duplicate/conflict handling, and row-level results.
- Persist assets in the shared backend and verify read-after-write across browser sessions/devices.
- Generate/print QR labels that resolve to the correct authorized asset.
- Add basic search/filter and CSV export with authorization checks.

**Exit criteria:** A manager can import a test dataset, resolve duplicates, manage assets, print labels, and retrieve the same records from another authorized session. Unauthorized tenants cannot read or modify them.

### M3 — Technician maintenance flow
- Open asset details from QR scan using the existing scan/resolve path.
- Add maintenance job/record start and submit operations with server-side validation.
- Support initial fields: performed date/time, technician, condition/result, note, and a small configurable checklist only if the current workflow contract supports it cleanly.
- Provide clear in-progress/success/error states and prevent duplicate submissions from creating duplicate records.
- Add photo attachments only after storage access, file limits, retention, and authorization are designed.

**Exit criteria:** A technician on a separate device can scan an asset, submit a maintenance result, receive confirmation, and the manager can see the new history. Retry/double-submit and permission tests pass.

### M4 — History, scheduling, and operational reports
- Show chronological, append-oriented maintenance history per asset.
- Add job assignment, due dates, overdue status, and reminders only after the basic record flow is reliable.
- Provide summary views: assets due/overdue, completed/open jobs, and maintenance history by period/location.
- Export report data with organization/role scoping and an audit trail for sensitive exports.

**Exit criteria:** A manager can identify overdue work, inspect asset history, and reconcile report totals against source records.

### M5 — Pilot and product validation
- Pilot with one organization and a small, agreed asset set before broad rollout.
- Test with real phones, poor network conditions, duplicate imports, revoked membership, cross-tenant IDs, expired/revoked API keys, and QR labels that are copied or photographed.
- Measure task completion, failed scans, time to submit a record, import correction rate, and support burden.
- Record customer feedback, operational cost, and willingness to pay before adding advanced features.

**Exit criteria:** A documented pilot report, resolved critical security/data-integrity issues, and an explicit go/no-go decision for paid launch.

### M6 — Follow-on modules and integrations
Only after the maintenance MVP validates the shared primitives:
- Reuse organization, membership, audit, QR identity, and API patterns for check-in/check-out or delivery tracking.
- Add payment integration as a separate module with transaction identity, idempotent provider callbacks, reconciliation, refund permissions, and immutable financial history.
- Add OCR/import automation for equipment lists and documents when it reduces a demonstrated manual workload.

**Exit criteria:** A second module reuses shared platform capabilities without coupling its domain data or business rules to maintenance.

## 7. MVP acceptance checklist

- [ ] A user belongs to an organization and receives the intended role.
- [ ] All asset/job/record queries and mutations enforce tenant and role authorization server-side.
- [ ] Import is previewable, validated, idempotent by the agreed asset key, and reports conflicts.
- [ ] QR codes resolve to the intended asset without embedding sensitive data.
- [ ] Asset edits do not mutate past maintenance history.
- [ ] Technician submission is durable and protected against duplicate/replayed requests.
- [ ] A second authorized session/device can see the saved result.
- [ ] Manager and technician interfaces expose only their permitted actions.
- [ ] CSV/export, attachments (if enabled), and reports enforce access controls.
- [ ] Production deployment, migration, rollback, monitoring, and a real-device smoke test are recorded.

## 8. Explicitly out of scope for the first MVP

- Payment collection, invoices, refunds, and accounting.
- Full CMMS/ERP replacement, spare-parts inventory, procurement, and complex preventive-maintenance optimization.
- Arbitrary end-user-defined workflows or a drag-and-drop workflow designer.
- AI diagnosis or predictive maintenance.
- Mandatory photo uploads before secure file handling is implemented.
- Multiple separate backends or a separate auth system for this module.

## 9. Handoff rules

1. Read the parent `ROADMAP.md`, `PROJECT_STATUS.md`, and `DECISIONS.md` first.
2. Verify current code, database, migrations, and deployment; this roadmap is not evidence of implementation.
3. Choose the earliest phase whose prerequisites are verified and whose exit criteria are unmet.
4. Keep each implementation PR small and update project status with test evidence.
5. Never mark a phase done based only on a merged PR or passing unit tests when production/device behavior is required.
