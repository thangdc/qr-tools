# Scan Runtime

The scan runtime turns a QR payload into a verified workflow identity, resolves
the workflow definition and record, and returns data-driven actions.

```
payload → decode → verify → workflow lookup → record resolve → actions
```

Persistence, authorization, cryptography, and UI remain outside this core
boundary. Hosted UI, SDK, and API consumers can render or execute the returned
actions independently.
