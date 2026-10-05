# Core Packages

This directory contains framework-independent boundaries for the QR Workflow Platform.

- types — shared domain/application contracts
- workflow-engine — workflow execution boundary
- qr-engine — QR identity/encode/decode/verify boundary
- data-mapper — validation and field mapping boundary
- connectors — external input/output adapters
- sdk — customer-facing browser/TypeScript SDK for the public API

The SDK is an API client, not a second workflow engine. Business rules remain in the public API and Core packages.
