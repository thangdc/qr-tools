# Scan Runtime

The scan runtime is the application-facing boundary for turning a decoded QR
identity into a workflow record and initial scan actions.

```
payload → decode → verify → workflow lookup → record resolve → actions
```

This package boundary intentionally does not implement persistence, authentication,
Supabase access, QR cryptography, or UI.

## Resolution

`WorkflowResolver` resolves a record using the workflow identity and record ID.
The resolver is expected to enforce authorization and persistence rules in the
application/infrastructure layer.

## Actions

Actions are deliberately represented as data. Hosted UI, SDK, and API consumers
can decide how to render or execute them without coupling the workflow core to a
specific frontend.
