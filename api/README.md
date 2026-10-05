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
