# API versioning

## URL versioning

Public endpoints use an explicit major version:

```text
/v1/scan
/v1/actions/execute
```

The version is part of the public contract.

## Backward compatibility

Within `v1`, compatible changes may include:

- adding optional response fields;
- adding optional request fields;
- adding new workflow-specific data that does not invalidate existing fields;
- adding new documented action types without changing the meaning of existing types.

Clients must ignore unknown JSON response fields.

## Breaking changes

The following require a new major API version:

- removing or renaming a documented field;
- changing the meaning or type of a documented field;
- changing authentication semantics;
- changing the behavior of an existing action type in a breaking way;
- changing a documented success/error status contract incompatibly.

A breaking release would use a new path such as `/v2/...`.

## No version mixing

A client should use one API version consistently for an integration. Do not infer the version from response data.
