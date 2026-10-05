# Developer Authentication

The Developer Dashboard at client.thangdc.com uses Supabase Auth for developer identity and session management.

## Scope

Phase 4.2 establishes the authentication foundation only:

- Email/password sign-up and sign-in
- Supabase Auth session tokens
- Refresh-token based session renewal
- Sign-out
- Client-side configuration through Vite environment variables
- No new public API endpoint
- No API-key management yet

API keys remain a separate concern and are introduced in Phase 4.3.

## Client configuration

The browser application receives only the Supabase project URL and publishable key:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key is safe for browser use. A Supabase secret key, service-role key, database password, or any other privileged credential must never be placed in these variables.

## Authentication flow

```
Developer
   │
   ▼
client.thangdc.com
   │
   ├── sign up / sign in
   │
   ▼
Supabase Auth
   │
   ├── access token
   └── refresh token
   │
   ▼
Developer Dashboard session
```

The dashboard must use the access token only for authenticated requests. Refresh tokens must never be placed in URLs, logs, analytics events, or API payloads unrelated to Supabase Auth.

## Session lifecycle

1. Sign in creates a Supabase Auth session.
2. The access token is short-lived.
3. The refresh token is exchanged for a new token pair when the access token needs renewal.
4. Sign-out terminates the current Supabase Auth session.
5. A missing, expired, or invalid session returns the developer to the sign-in screen.

The dashboard must not treat the developer's email or client-side state as proof of authorization.

## Authorization boundary

Authentication answers **who is signed in**.

Authorization for developer resources will be added in later phases:

- Phase 4.3: API-key ownership and lifecycle
- Phase 4.4: usage visibility
- Phase 4.5: API test console

Any resource belonging to a developer must be scoped by the authenticated Supabase user ID. Never authorize access from editable client-side metadata.

## Security rules

- HTTPS only.
- Never expose Supabase secret/service-role credentials to the browser.
- Never put access or refresh tokens in query strings.
- Never log authentication tokens.
- Never use user_metadata for authorization decisions.
- Use authenticated identity (auth.uid() / server-validated JWT) when database authorization is introduced.
- Keep public API credentials separate from Supabase credentials.
- Do not add a public API endpoint merely to proxy authentication.

## Environment

The production deployment for client.thangdc.com must provide:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Local development may use a .env.local file. Environment files containing credentials must not be committed.

## Next phase

Phase 4.3 will connect the authenticated developer identity to API-key ownership and lifecycle without exposing plaintext keys after creation.
