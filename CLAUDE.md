# QR Tools — AI Working Rules

Before changing architecture or shared contracts:
1. Read AI_CONTEXT.md.
2. Read the relevant files under docs/.
3. Read docs/DECISIONS.md.
4. Preserve existing product behavior.
5. Do not couple Core to UI or a frontend framework.
6. Do not expose secrets in client/SDK code.
7. Do not create a new service/repository without an ADR.
8. Prefer reusable workflow primitives over vertical-specific code.
9. Update documentation when an architectural decision or public contract changes.
10. Keep the current monorepo strategy unless a documented decision changes it.

For implementation tasks, identify the affected boundary first:
- UI
- API/application
- Core/domain
- infrastructure/connector

Do not move business logic into a layer merely because it is convenient for the current UI.