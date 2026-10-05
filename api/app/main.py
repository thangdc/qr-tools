from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import time
from collections import deque
from dataclasses import dataclass
from typing import Any

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


API_VERSION = "v1"
DEFAULT_RATE_LIMIT = 60


def _cors_origins() -> list[str]:
    value = os.getenv("CORS_ORIGINS", "https://qr.thangdc.com")
    return [item.strip() for item in value.split(",") if item.strip()]


app = FastAPI(
    title="QR Tools Public API",
    version=API_VERSION,
    description="Stable public API adapter for the QR Tools workflow engine.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@dataclass(frozen=True)
class ApiKey:
    id: str
    key_hash: str
    rate_limit_per_minute: int


class ScanRequest(BaseModel):
    payload: str = Field(min_length=1, max_length=4096)


class ScanAction(BaseModel):
    type: str = Field(min_length=1, max_length=100)
    data: dict[str, Any] = Field(default_factory=dict)


class ExecuteActionRequest(BaseModel):
    scan_payload: str = Field(min_length=1, max_length=4096)
    action: ScanAction


class RateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key_hash: str, limit: int) -> tuple[bool, int]:
        now = time.monotonic()
        async with self._lock:
            events = self._events.setdefault(key_hash, deque())
            cutoff = now - 60
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= limit:
                retry_after = max(1, int(events[0] + 60 - now))
                return False, retry_after

            events.append(now)
            return True, 0


rate_limiter = RateLimiter()

bearer_scheme = HTTPBearer(auto_error=False)


@app.on_event("startup")
async def startup() -> None:
    database_url = os.getenv("DATABASE_URL")
    app.state.pool = (
        await asyncpg.create_pool(database_url, min_size=1, max_size=5)
        if database_url
        else None
    )


@app.on_event("shutdown")
async def shutdown() -> None:
    pool = getattr(app.state, "pool", None)
    if pool:
        await pool.close()


def _require_pool() -> asyncpg.Pool:
    pool = getattr(app.state, "pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="Database is not configured.")
    return pool


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


async def require_api_key(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> ApiKey:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing API key.")

    raw_key = credentials.credentials.strip()
    if not raw_key:
        raise HTTPException(status_code=401, detail="Missing API key.")

    key_hash = _hash_api_key(raw_key)
    pool = _require_pool()

    row = await pool.fetchrow(
        """
        select id, key_hash, rate_limit_per_minute
        from public.api_keys
        where key_hash = $1
          and status = 'active'
          and (expires_at is null or expires_at > now())
        """,
        key_hash,
    )

    if row is None:
        raise HTTPException(status_code=401, detail="Invalid API key.")

    limit = int(row["rate_limit_per_minute"] or os.getenv("RATE_LIMIT_PER_MINUTE", DEFAULT_RATE_LIMIT))
    allowed, retry_after = await rate_limiter.check(key_hash, limit)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded.",
            headers={"Retry-After": str(retry_after)},
        )

    await pool.execute(
        "update public.api_keys set last_used_at = now() where id = $1",
        row["id"],
    )

    return ApiKey(
        id=str(row["id"]),
        key_hash=row["key_hash"],
        rate_limit_per_minute=limit,
    )


def _decode_base64url(value: str) -> bytes:
    normalized = value.replace("-", "+").replace("_", "/")
    normalized += "=" * ((4 - len(normalized) % 4) % 4)
    try:
        return base64.b64decode(normalized, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise HTTPException(status_code=400, detail="Invalid QR payload encoding.") from exc


def decode_qr_identity(payload: str) -> dict[str, Any]:
    prefix = "qrtools:"
    if not payload.startswith(prefix):
        raise HTTPException(status_code=400, detail="Invalid QR Tools payload prefix.")

    encoded = payload[len(prefix):]
    if not encoded:
        raise HTTPException(status_code=400, detail="Empty QR Tools payload.")

    try:
        identity = json.loads(_decode_base64url(encoded))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid QR payload JSON.") from exc

    if not isinstance(identity, dict):
        raise HTTPException(status_code=400, detail="Invalid QR identity.")

    version = identity.get("version")
    workflow_id = identity.get("workflowId")
    record_id = identity.get("recordId")

    if not isinstance(version, int) or version < 1:
        raise HTTPException(status_code=400, detail="Invalid QR identity version.")
    if version != 1:
        raise HTTPException(status_code=400, detail=f"Unsupported QR protocol version: {version}.")
    if not isinstance(workflow_id, str) or not workflow_id:
        raise HTTPException(status_code=400, detail="Invalid QR identity workflowId.")
    if not isinstance(record_id, str) or not record_id:
        raise HTTPException(status_code=400, detail="Invalid QR identity recordId.")

    signature = identity.get("signature")
    if signature is not None and not isinstance(signature, str):
        raise HTTPException(status_code=400, detail="Invalid QR identity signature.")

    return identity


async def scan_core(pool: asyncpg.Pool, payload: str) -> dict[str, Any]:
    identity = decode_qr_identity(payload)

    definition = await pool.fetchrow(
        """
        select id, version, name, input_fields, mappings
        from public.workflow_definitions
        where id = $1 and version = $2
        """,
        identity["workflowId"],
        identity["version"],
    )
    if definition is None:
        raise HTTPException(status_code=404, detail="Workflow definition not found.")

    record = await pool.fetchrow(
        """
        select workflow_id, workflow_version, record_id, data, created_at, updated_at
        from public.workflow_records
        where workflow_id = $1
          and workflow_version = $2
          and record_id = $3
        """,
        identity["workflowId"],
        identity["version"],
        identity["recordId"],
    )

    record_data = None
    if record:
        record_data = {
            "workflowId": record["workflow_id"],
            "workflowVersion": record["workflow_version"],
            "recordId": record["record_id"],
            "data": record["data"],
            "createdAt": record["created_at"].isoformat(),
            "updatedAt": record["updated_at"].isoformat(),
        }

    actions = (
        [{"type": "view", "data": {"recordId": identity["recordId"]}}]
        if record
        else []
    )

    return {
        "identity": identity,
        "workflow": {
            "id": definition["id"],
            "version": definition["version"],
            "name": definition["name"],
        },
        "record": record_data,
        "actions": actions,
    }


def _action_allowed(actions: list[dict[str, Any]], requested: ScanAction) -> bool:
    return any(
        candidate["type"] == requested.type
        and candidate.get("data", {}) == requested.data
        for candidate in actions
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": API_VERSION}


@app.post("/v1/scan")
async def scan(
    request: ScanRequest,
    _api_key: ApiKey = Depends(require_api_key),
) -> dict[str, Any]:
    pool = _require_pool()
    return await scan_core(pool, request.payload)


@app.post("/v1/actions/execute")
async def execute_action(
    request: ExecuteActionRequest,
    _api_key: ApiKey = Depends(require_api_key),
) -> dict[str, Any]:
    pool = _require_pool()
    result = await scan_core(pool, request.scan_payload)

    if result["record"] is None:
        raise HTTPException(
            status_code=409,
            detail="Cannot execute action without a resolved workflow record.",
        )

    if not _action_allowed(result["actions"], request.action):
        raise HTTPException(status_code=400, detail="Scan action is not available.")

    # Phase 3 deliberately exposes only the existing core "view" action.
    # Mutating workflow actions stay inside the workflow engine until their
    # contracts are promoted to the public API.
    if request.action.type != "view":
        raise HTTPException(status_code=400, detail="Unsupported public action.")

    return {
        "success": True,
        "action": request.action.model_dump(),
        "identity": result["identity"],
        "record": result["record"],
    }
