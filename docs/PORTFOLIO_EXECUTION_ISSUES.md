# Portfolio Execution Issues

Created: 2026-11-23

These issues turn the portfolio strategy into bounded, repository-owned execution work.

| Product | First business/validation issue | Existing implementation work to preserve |
|---|---|---|
| QR Tools | https://github.com/thangdc/qr-tools/issues/217 | Tenant authorization work recorded in PR #210; open roadmap PR #214 |
| Recognition Matching | https://github.com/thangdc/recognition-matching/issues/64 | Existing POC/evaluation issues #1–#7 |
| Task Management | https://github.com/thangdc/task-management/issues/31 | Existing Gantt planning issue #14 and hosted Playwright work |
| Equipment Maintenance | https://github.com/thangdc/ordering-platform/issues/14 | Existing MAINT-01 through MAINT-10 issues #3–#12 |

## Portfolio coordination

- QR Tools portfolio roadmap PR: https://github.com/thangdc/qr-tools/pull/216
- QR Tools multi-user/business readiness: https://github.com/thangdc/qr-tools/issues/217
- Recognition customer validation: https://github.com/thangdc/recognition-matching/issues/64
- Task Management paid Pro validation: https://github.com/thangdc/task-management/issues/31
- Maintenance paid pilot packaging: https://github.com/thangdc/ordering-platform/issues/14

## Milestone plan (proposed)

Create the following GitHub milestones in each repository, with repository-specific due dates and issues assigned after the owner confirms the dates:

1. **2026-Q4 — Audit & Product Readiness**: reconcile current code, CI, deployment and security; finish existing P0 verification work.
2. **2027-Q1 — First Paid Pilots**: customer interviews, pilot offers, first paid customers and usage/billing validation.
3. **2027-Q2 — Repeatable Onboarding**: activation, documentation, self-service setup, usage visibility and support automation.
4. **2027-Q3 — Retention & Unit Economics**: retention, churn, gross margin, cost per usage unit and product continue/pivot/stop decisions.

Do not create duplicate implementation milestones for existing MAINT or POC issue sequences. Assign existing issues to these portfolio milestones when possible.

## Note on GitHub milestone creation

The connected GitHub action currently supports issue and pull-request writes but does not expose a milestone-create operation. The milestone names above are planned but are **not yet created as GitHub milestones**. Create them through the GitHub web UI once an authenticated browser session is connected.
