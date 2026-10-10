# QR Tools Public API

FastAPI adapter for the QR Tools workflow core.

## Local

```bash
cd api
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Required environment variables:

- `DATABASE_URL`: Supabase Postgres connection string.
- `CORS_ORIGINS`: comma-separated browser origins. Defaults to `https://qr.thangdc.com`.

Optional:

- `RATE_LIMIT_PER_MINUTE`: default 60.

## Render

Build command:

```
pip install -r api/requirements.txt
```

Start command:

```
uvicorn api.app.main:app --host 0.0.0.0 --port $PORT
```

The API does not expose Supabase credentials to consumers. Consumer authentication uses an API key whose SHA-256 hash is stored in `public.api_keys`.


## API key protection

- Each API key can have an exact browser-origin allowlist in `api_keys.allowed_origins`, e.g. `{https://thangdc.com,https://www.thangdc.com}`.
- Set `daily_request_limit` and `monthly_request_limit` for hard quotas. Counters roll over automatically at 00:00 UTC; request history remains in `api_request_logs`.
- Per-minute enforcement and daily/monthly quotas are checked and incremented atomically in Postgres, shared across API instances. Existing keys with no origin allowlist and null daily/monthly limits retain compatibility behavior.
- Origin allowlists and CORS are browser controls, not authentication: non-browser callers can forge an `Origin` header. Keep per-key quotas and revocation enabled for public embeds.
- Browser-embedded keys are public by design. Create a dedicated key per site, restrict its origins, set quotas, and revoke it if abused.
- Customer keys are owner-scoped: the workflow definition must have `owner_user_id` equal to the key owner's Supabase user ID. Existing unowned workflows are denied until ownership is assigned.
- `api_keys.access_mode` defaults to `customer`. Set `system` only for an explicitly reviewed infrastructure key. Before deploying this authorization change, inventory the existing keys and mark only verified infrastructure keys as `system`; do not infer this from `user_id IS NULL`.
