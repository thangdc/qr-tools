# ThangDC Ecosystem — Architecture Decisions

**Last updated:** 2026-10-11

This file records decisions that should survive context resets. Change a decision only with an explicit rationale and a corresponding update here.

## D-001 — Small tools first
**Decision:** Build small, independently useful automation tools that can be composed into larger workflows.  
**Rationale:** Faster validation, smaller maintenance surface, and reusable capabilities.  
**Implication:** Do not start with a large all-in-one AI platform or a complex visual workflow editor.

## D-002 — Reuse the existing QR Tools platform
**Decision:** Treat `thangdc/qr-tools` and its existing API, SDK/widget, Supabase and usage infrastructure as the starting point.  
**Rationale:** Avoid duplicated infrastructure and preserve previous investment.  
**Implication:** Verify what exists before implementing new authentication, quotas, logging, or integration layers.

## D-003 — Separate tools, integrations, and workflows
**Decision:** Keep tool logic independent from the integration layer and from workflow orchestration.  
**Rationale:** The same capability should work as a standalone UI, API, SDK integration, or workflow step.  
**Implication:** Use stable input/output schemas and avoid coupling one tool to another tool's UI internals.

## D-004 — Choose execution per task
**Decision:** Use browser-side processing where practical; use server/API processing for model inference, secrets, shared data, or long-running jobs when required.  
**Rationale:** Balance cost, privacy, reliability, and user experience.  
**Implication:** Not every tool needs AI or a backend.

## D-005 — Minimal workflow runner first
**Decision:** Start with sequential steps, data mapping, logs, bounded retries, and reruns. Defer drag-and-drop workflow design.  
**Rationale:** Validate real multi-tool use before investing in complex orchestration UX.

## D-006 — Usage and security are shared concerns
**Decision:** Track usage per service and enforce quotas, domain/origin restrictions where applicable, key revocation, and server-side secret storage.  
**Rationale:** Tools must be safe to expose and economically sustainable.  
**Implication:** Public browser keys are not secrets; origin restrictions do not replace authentication or quotas.

## D-007 — Verify before claiming completion
**Decision:** A proposal, merged PR, or successful build alone does not prove an end-to-end production feature works.  
**Rationale:** Prevent repeated work and lost context.  
**Implication:** Record evidence and use `NEEDS_VERIFICATION` when production behavior is unknown.

## D-008 — AI features are demand-driven
**Decision:** Prioritize Data Transformer and OCR after platform stabilization; build Speech-to-Text, object counting, plate recognition, and face verification one at a time.  
**Rationale:** Reusable value and manageable scope.  
**Implication:** Do not implement all AI services simultaneously. Face-related capabilities require a separate privacy/security review.

## Reconsideration process
For any change, record: current decision, proposed alternative, reason, impact on existing tools, migration/rollback plan, and acceptance criteria.
