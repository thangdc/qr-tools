# ThangDC Ecosystem Roadmap

**Version:** 1.0  
**Last updated:** 2026-10-11  
**Purpose:** A durable source of truth for AI assistants and contributors continuing this work after a context reset.

## 1. Vision

Build an ecosystem of small, useful automation tools. Each tool solves one concrete task, works independently, and can be combined with other tools through APIs, SDKs, widgets, webhooks, and workflows.

Examples:
- Image/PDF -> OCR -> normalized JSON -> CSV/Excel.
- Spreadsheet -> bulk QR generation -> print labels -> scan -> report.
- Vietnamese audio -> transcript -> summary -> tasks.
- Image -> object detection/counting -> report.
- Vehicle image -> license-plate recognition -> entry/exit event.

Optimize for practical usefulness, low maintenance, incremental delivery, and monetization. Do not build a large platform or many AI services before validating demand.

## 2. Product principles

1. Small tools should solve one clearly defined problem.
2. Each tool should be useful on its own.
3. Prefer reusable capabilities over duplicated implementations.
4. Use the simplest execution model that meets the requirement; not every tool needs AI or a server.
5. Keep stable input/output schemas, predictable errors, limits, and usage measurement.
6. Reuse existing infrastructure when it meets requirements; do not rewrite completed capabilities.
7. Prioritize small, testable PRs and evidence-based completion.
8. Treat ideas and proposals as NOT STARTED until code and behavior are verified.

## 3. Architecture

### A. Shared platform
- API authentication and key lifecycle.
- Origin/domain restrictions and service permissions.
- Rate limits, quotas, usage tracking, logs, monitoring, versioning.
- Billing and payment integration when justified.

### B. Reusable tools
- QR generation, scanning, and QR workflows.
- Data Transformer: CSV/JSON and structured-data validation.
- Image & Document Extractor (OCR).
- Object Detection & Counting.
- License Plate Recognition.
- Vietnamese Speech-to-Text.
- Face Verification & Attendance.
- Additional tools only when supported by real demand.

### C. Integration and automation
- REST API.
- TypeScript SDK.
- Embeddable JavaScript widget.
- Webhooks and external API connectors.
- A minimal sequential workflow runner.

### D. End-user products
- QR Tools and existing QR workflows.
- Standalone free/paid utility pages.
- Embeddable customer widgets.
- Domain-specific products assembled from reusable tools.

## 4. Existing project context (must be re-verified)

The following was recorded in prior work and is not proof of current production status:
- Repository: `thangdc/qr-tools`, default branch `main`.
- API service: FastAPI, deployed on Render at `api.thangdc.com`.
- `POST /v1/scan` was reported working.
- `POST /v1/actions/execute` exists in the API design.
- Supabase/Postgres is used for persistence and API-key/usage infrastructure.
- API keys have been implemented with hashed storage, revocation/expiry, origin restrictions, and rate/quota enforcement in the work recorded to date.
- A TypeScript SDK and client widget have been developed.
- Equipment-maintenance widget work includes list input/import, QR generation/printing, ZIP export, camera/image scanning, progress/results, CSV export, and continuing the maintenance workflow.
- Recent merged PR #210 added workflow tenant authorization. Review its migration and production key/workflow ownership mapping before assuming all deployed keys and workflows are ready.

Historical widget issues to re-check, not assume still open:
- CORS preflight OPTIONS once returned 400 while POST returned 200.
- Widget bundle once raised `Uncaught ReferenceError: process is not defined` at `client.js:31`.
- A Blogger API-key setup was recorded with allowed origins `thangdc.com` and `www.thangdc.com`, 10 requests/minute, 500/day, 10,000/month. A Blogger demo/published end-to-end flow was not yet verified in the last recorded status.

## 5. Phased roadmap

### Phase 0 — Verify and stabilize existing platform
- Inspect current branch, commits, PRs, deployments, logs, and repository documentation.
- Verify API-key lifecycle, domain/origin enforcement, quotas, and rate limits.
- Test scan and action-execution endpoints.
- Test widget on an independent website; check CORS, bundle errors, workflow behavior, and console output.
- Verify Blogger flow end-to-end; do not expose secret keys in browser code.
- Record confirmed bugs and evidence. Do not re-fix issues already resolved.

**Exit criteria:** A verified inventory of working features, open bugs, unknowns, and deployment status.

### Phase 1 — Standardize tool contracts
- Define common request/response conventions, schema validation, errors, versioning, timeouts, file-size limits, and long-running job behavior.
- Standardize usage metering per service.
- Define internal versus customer-facing APIs and service-level permissions.
- Add integration and security tests.
- Reuse existing authentication, quotas, and logging where adequate.

**Exit criteria:** A new tool can use the shared platform without reimplementing authentication, quotas, or logging.

### Phase 2 — Data Transformer
MVP:
- CSV/JSON conversion.
- Field mapping and date/format normalization.
- Filtering, validation, and duplicate detection.
- Export transformed results.
- Simple independent UI and API.

Prefer in-browser processing where appropriate to reduce infrastructure cost.

**Exit criteria:** Standalone tool with tests for valid and invalid inputs, reusable by another workflow.

### Phase 3 — Image & Document Extractor (OCR)
MVP:
- Accept defined image/document inputs.
- Extract text and return structured output.
- Include confidence and text regions where supported by the engine.
- Widget for upload, preview, review/edit, and CSV/JSON export.
- Measure usage and processing cost.
- Test on representative real-world Vietnamese documents.

**Exit criteria:** Measured quality on a test set and one verified downstream integration.

### Phase 4 — Integration & Webhook Connector
- Configurable API calls and authenticated webhook intake.
- Data mapping between steps.
- Timeouts, bounded retries, idempotency where appropriate, and execution logs.
- Store secrets server-side; never put secret credentials in public widget code.

**Exit criteria:** Two tools can exchange data without manual copy/paste.

### Phase 5 — Minimal Workflow Runner
- Sequential steps.
- Schema/JSON configuration.
- Map outputs from one step to the next.
- Stop-on-error, controlled retries, logs, reruns, and workflow-level usage/cost limits.
- No complex drag-and-drop editor until validated demand exists.

**Exit criteria:** One real multi-tool workflow can run, be inspected, and be retried safely.

### Phase 6 — Additional AI tools
Develop one at a time based on validated demand:
1. Vietnamese Speech-to-Text: transcript, timestamps, TXT/SRT export.
2. Object Detection & Counting: classes, counts, boxes, image/report output.
3. License Plate Recognition: plate detection and recognition tested on Vietnamese plates and real camera conditions.
4. Face Verification & Attendance: identity verification and check-in/out integration.

Every tool needs a bounded MVP, API contract, representative test set, quality/cost measurements, security review, and integration example. Face-related features require special review of consent, biometric-data handling, retention/deletion, access control, and anti-spoofing.

### Phase 7 — Monetization and ecosystem growth
- Measure real cost and demand per tool/workflow.
- Set service-specific quotas and pricing based on measured costs.
- Add free/paid tiers and payment-driven quota updates when justified.
- Publish examples, documentation, and demos.
- Track adoption, conversion, support burden, and maintenance cost.
- Invest in tools with demonstrated use; avoid speculative breadth.

## 6. Development rules
1. Inspect current code and deployment before editing.
2. Read `ROADMAP.md`, `PROJECT_STATUS.md`, and `DECISIONS.md` at the start of a new session.
3. A merged PR does not prove a production deployment or end-to-end flow works.
4. Never repeat verified completed work without a reason.
5. Do not silently change agreed architecture, domains, API contracts, or security policy.
6. Keep each PR scoped, testable, reviewable, and rollback-friendly.
7. Never expose secret keys or service-role credentials in public client code.
8. Record out-of-scope findings rather than expanding a task uncontrollably.
9. Use `NEEDS_VERIFICATION` when evidence is missing; do not guess.
10. Update status and decision documents after meaningful changes.

## 7. AI handoff protocol
At the start of each new session:
1. Read `ROADMAP.md`, `PROJECT_STATUS.md`, and `DECISIONS.md`.
2. Inspect current branch, latest commit, open/merged PRs, and deployment status relevant to the task.
3. Reconcile docs with repository and production evidence.
4. Summarize verified completion, open issues, blockers, and unknowns.
5. Select the next task from `PROJECT_STATUS.md`; do not restart from Phase 0 if its exit criteria have already been proven.
6. Implement and test only the agreed scope.
7. Update status, decisions, and changelog after completion.

If documents conflict with code or production evidence, investigate and update the documents. Do not silently discard recorded decisions.

## 8. Initial next step
Start with Phase 0: verify the current API, API-key/tenant authorization, widget production behavior, and Blogger integration. Then update `PROJECT_STATUS.md` with evidence and continue to Phase 1 only for gaps that remain.

**Long-term success:** many small independently useful tools, connected by stable integrations and composable into automations, with manageable operating cost and a credible path to revenue.
