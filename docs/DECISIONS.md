# Architecture Decisions

## ADR-001 — Monorepo First

**Status:** Accepted

Keep QR Tools Core, web application, API and SDK packages in one repository initially.

**Reason:** Validate product and architecture before introducing distributed repository/service complexity.

---

## ADR-002 — Core Independent From UI

**Status:** Accepted

The workflow/QR core must not depend on QR Tools Web UI or a frontend framework.

**Reason:** Web, API and SDK must share the same capabilities.

---

## ADR-003 — API and SDK Are First-Class Consumers

**Status:** Accepted

Public API and SDK use the same core workflow/application contracts as the hosted UI.

**Reason:** Customers must be able to build their own UI and integrate QR infrastructure into existing systems.

---

## ADR-004 — Dynamic QR Identity

**Status:** Accepted

Where appropriate, QR codes represent a workflow/record identity rather than embedding complete business data.

**Reason:** Enables resolution, revocation, data changes, access control and analytics without reprinting.

---

## ADR-005 — Supabase Is Infrastructure, Not the Domain Boundary

**Status:** Accepted

Supabase may provide database, auth, storage and edge infrastructure, but core business/workflow concepts should remain independent of Supabase-specific APIs.

**Reason:** Preserve portability and testability.

---

## ADR-006 — Equipment Maintenance Is the Reference Workflow

**Status:** Accepted

Use equipment maintenance as the first end-to-end workflow for validating the architecture.

**Reason:** It exercises data import, mapping, QR generation, scanning, record resolution, custom UI and actions without requiring the whole platform at once.

---

## ADR-007 — Do Not Become a Generic Automation Platform

**Status:** Accepted

QR Tools focuses on QR-centric data/workflow problems rather than arbitrary automation.

**Reason:** Keep the product understandable and differentiated.
