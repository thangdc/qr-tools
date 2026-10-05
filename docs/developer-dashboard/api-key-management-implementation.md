# API Key Management Implementation

Phase 4.3 connects the Developer Dashboard identity to the existing public API key store.

## Storage
- `public.api_keys` remains the single source of truth for public API credentials.
- `user_id` links a key to `auth.users(id)`.
- Existing Phase 3 keys remain valid; keys created before developer ownership may have a null `user_id`.
- `key_hash` stores only the SHA-256 hex digest.
- Plaintext is returned only from create/rotate and is never persisted.
- RLS allows an authenticated developer to read only their own keys.
- Mutations go through the authenticated `developer-api-keys` Edge Function.

## Operations
- GET `/functions/v1/developer-api-keys` — list owned keys with masked values.
- POST `{"action":"create","name":"..." }` — create and return plaintext once.
- POST `{"action":"revoke","id":"..." }` — revoke an owned active key.
- POST `{"action":"rotate","id":"..." }` — create a replacement and revoke the previous key.

This is a Developer Dashboard backend operation, not a new `api.thangdc.com/v1` public API endpoint.

## Security
- Never expose Supabase secret/service-role credentials in the browser.
- The Edge Function requires a valid Supabase user JWT.
- Full API keys are not returned by list operations.
- Do not log credentials or request bodies containing them.
