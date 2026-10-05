# Core Packages

This directory contains framework-independent boundaries for the QR Workflow Platform.

- types — shared domain/application contracts
- workflow-engine — workflow execution boundary
- qr-engine — QR identity/encode/decode/verify boundary
- data-mapper — validation and field mapping boundary
- connectors — external input/output adapters
- sdk — future customer-facing browser/TypeScript SDK boundary

This PR intentionally adds contracts and boundaries only. Existing src/ application code is not migrated yet.
