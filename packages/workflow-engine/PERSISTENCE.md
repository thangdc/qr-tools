# Persistence Boundary

Workflow persistence is an infrastructure boundary.

Core consumes repository contracts for workflow definitions and records. Concrete
implementations may use Supabase, SQL, an API, or another storage provider.

The workflow engine must not import a database SDK or provider-specific model.

```
Core → WorkflowPersistence contract → infrastructure adapter → storage
```

Repositories also remain responsible for enforcing application-level
authorization and consistency rules appropriate to their implementation.
