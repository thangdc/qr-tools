# Four-Product Business Portfolio Roadmap

**Owner:** ThangDC  
**Updated:** 2026-11-23  
**Markets:** Vietnam and international in parallel  
**Business model:** SaaS subscriptions + API plans + usage-based billing  
**Operating principle:** Revenue over features; low-maintenance; customer evidence before expansion.

## Portfolio strategy

| Product | Role | Initial customer | Primary offer | Year-1 MRR target |
|---|---|---|---|---:|
| QR Tools | First revenue engine | SMBs, operations teams, developers | Pro SaaS, workflow/API usage, Business workspaces | VND 5m/mo |
| Recognition Matching | Focused AI product capability | Retail shops and inventory operators | Paid pilot, catalog matching, usage-based recognition/API | VND 1.5m/mo |
| Task Management | Small self-service SaaS | Individuals and small teams | Pro/team subscription; optional cloud sync | VND 1m/mo |
| Equipment Maintenance (ordering-platform) | B2B vertical with higher contract value | Offices, buildings, factories, facility teams | Per-site/per-asset SaaS, setup/import, API/usage | VND 1.5m/mo |

Year-1 combined MRR planning target: **VND 9m/month**. This is a target, not a forecast or current revenue. Year-5 portfolio aspiration: **VND 56m/month MRR**, subject to quarterly customer, retention, margin and support-cost gates.

## Portfolio rules

1. Run Vietnam and international discovery in parallel. Localize pricing, payment, tax, language, privacy and support by market; do not assume one checkout or compliance setup fits both.
2. Keep the four repositories independent. Do not create a shared runtime or split services without an ADR and measured need.
3. Use subscription for predictable recurring value; use metered/API billing for variable consumption. Publish quotas, overage behavior, usage visibility and limits before charging.
4. Do not count gross MRR as house-fund cash. Track collected revenue, refunds, payment fees, taxes, infrastructure, support and net contribution separately.
5. Prefer self-service onboarding, documented APIs, usage dashboards and automated support. A product that needs daily manual operation is not a passive business.
6. AI agents may inspect, plan, implement, test, create PRs, merge and deploy only when required CI checks pass and the change is within approved non-sensitive scope.
7. Never make production secrets, billing provider credentials, production data, destructive migrations, domain/DNS, payment settlement, access-control policy, or irreversible customer-data changes without explicit owner approval.
8. A successful build or merged PR is not proof of customer value or production health. Record evidence for both.

## Product plans

### 1. QR Tools — first commercial priority

Repository: https://github.com/thangdc/qr-tools

Positioning: QR workflow infrastructure for SMB operations and developers, beyond QR-code generation.

Near-term sequence:
- Verify the current tenant/workflow authorization work, migration state, existing customer/system access modes and production behavior before changing the model.
- Complete organization/workspace membership, role-scoped shared workflow records and organization-scoped API keys/usage.
- Verify credits, usage metering, quotas, payment lifecycle, expiry/revocation and customer-facing usage visibility.
- Package Pro, Business and API plans; test willingness to pay with existing and new customers.
- Publish API/SDK examples and a repeatable onboarding path.

Do not rebuild authentication, billing or workflow infrastructure before auditing what is already implemented.

### 2. Recognition Matching — validate one paid use case

Repository: https://github.com/thangdc/recognition-matching

Positioning: camera-assisted product recognition and catalog matching for retail inventory, with human confirmation.

Near-term sequence:
- Finish repeatable live-camera evaluation on real devices and real objects.
- Preserve the current honest limitations: generic detector labels are not exact brands/SKUs; no fabricated prices or confidence claims.
- Validate one workflow with shops/inventory operators; collect usage and correction evidence.
- Keep the current MVP local-first. Add shared tenant catalogs, cloud sync, API and metered hosted inference only after a paid customer requires them and unit economics are known.
- Review model, dataset and framework licenses before commercial redistribution or training.

No model fine-tuning or cloud AI spend until the dataset, holdout evaluation and customer demand gates pass.

### 3. Task Management — small, low-support SaaS

Repository: https://github.com/thangdc/task-management

Positioning: a calm, timeline-first task and Gantt planner for individuals and small teams.

Near-term sequence:
- Stabilize current local-first task, calendar, estimate/actual and Gantt workflows.
- Verify preview deployment and browser regression tests.
- Interview users and test a narrow paid Pro proposition.
- Keep local use available; add optional accounts, cloud sync, team workspaces and subscription billing only after demand validation and a reviewed Supabase/RLS design.
- Avoid broad feature competition with Jira, Asana and Trello.

### 4. Equipment Maintenance — B2B vertical on existing platform

Repository: https://github.com/thangdc/ordering-platform

Positioning: QR Asset & Maintenance Management for offices, buildings and factories, implemented as a vertical using the existing config-driven platform where appropriate.

Near-term sequence:
- Continue existing MAINT-01 through MAINT-10 issues; do not duplicate them.
- Verify repository/runtime/CI and the maintenance domain architecture first.
- Deliver organization isolation, sites/locations/assets, QR identity, maintenance requests/work orders, technician assignment, history, attachments and reporting.
- Run a controlled staging pilot with demo data and documented acceptance.
- Validate pricing per site/asset/user and setup/import fees with real buyers.
- Defer 2D/3D digital-twin visualization until asset/location/work-order data is reliable and a pilot demonstrates the need.

Preserve the existing food-ordering vertical; maintenance is an additional vertical, not a destructive replacement.

## First 12 months

### Q1 — Readiness and validation
- QR Tools: tenant/workspace access, shared records, metering and billing audit; close critical multi-user gaps.
- Recognition: camera baseline and customer discovery; no backend expansion yet.
- Task Management: stabilize local-first experience and hosted preview; validate willingness to pay.
- Maintenance: finish baseline/architecture and core asset/tenant model using existing MAINT issues.
- Portfolio: establish a shared KPI review and market-specific pricing hypotheses.

### Q2 — First paid pilots
- QR Tools: sell Business/API workflow plans to early customers in Vietnam and international developer communities.
- Recognition: run 2–3 controlled pilots; convert only where recurring value is proven.
- Task Management: launch a small paid beta if retention supports it.
- Maintenance: run at least one real-world staging pilot with a building/office/factory operator.

### Q3 — Repeatable onboarding
- QR Tools: improve activation, API documentation, usage visibility and customer support automation.
- Recognition: decide keep/pivot/stop based on paid usage and correction rates.
- Task Management: optimize activation and weekly retention; do not add team/cloud complexity without demand.
- Maintenance: convert pilot learnings into a repeatable setup, import and work-order workflow.

### Q4 — Commercial review
- Measure collected MRR, gross margin, churn, activation, support burden and infra cost per customer.
- Invest further only in products with evidence of recurring use and a path to positive contribution margin.
- Stop or pause speculative features and products that fail their validation gates.

## KPI definitions and gates

Track monthly per product:
- Qualified leads, discovery calls/demos, active trials and paid customers.
- Activation rate and time-to-first-value.
- MRR, collected revenue, refunds, churn and expansion.
- API/usage volume, cost per unit and overage behavior.
- Gross margin and net contribution after payment fees, taxes, infrastructure and support.
- Weekly/monthly active use and retention.
- Support minutes per customer and incidents.

Suggested year-1 planning targets (not commitments):
- QR Tools: 20 paying customers, including 3 business customers; VND 5m MRR.
- Recognition: 3 paid pilot customers; VND 1.5m MRR only if the workflow is repeatedly used.
- Task Management: 10 paying users; VND 1m MRR.
- Maintenance: 2 paid pilot/deployment customers; VND 1.5m MRR.

Decision gates:
- If a product misses its customer/retention gate for two consecutive quarters, stop feature expansion and run customer discovery or reposition.
- If usage-based costs exceed revenue contribution, add limits or revise pricing before growth.
- If support load is incompatible with one-day-per-week ownership, automate, simplify or narrow the offer.
- Do not claim product-market fit from signups, demos, commits or MRR alone.

## Delivery and release policy

- Work from the repository's actual default branch and read its AGENTS.md/README/roadmap/decision docs first.
- One issue = one bounded, testable outcome; link dependencies and acceptance criteria.
- Use feature branches and pull requests; run all repository-defined checks.
- Auto-merge/deploy only after required CI checks pass, deployment is non-sensitive and rollback is understood.
- Require explicit owner approval for production credentials/secrets, destructive data migrations, production data edits/deletions, billing settlement/payment configuration, DNS/domain changes, and security policy changes.
- After deployment, verify the real user journey and update project status with evidence.

## Repository links and current sequencing

- QR Tools: https://github.com/thangdc/qr-tools — P0 commercial/multi-tenant readiness.
- Recognition Matching: https://github.com/thangdc/recognition-matching — finish existing POC/evaluation issues before cloud/commercial expansion.
- Task Management: https://github.com/thangdc/task-management — default branch is `develop`; preserve local-first product direction.
- Equipment Maintenance: https://github.com/thangdc/ordering-platform — default branch is `master`; continue existing MAINT issue sequence.

This document is a portfolio plan. Each repository's AGENTS.md, architecture decisions, existing issues and verified code remain authoritative for implementation details.
