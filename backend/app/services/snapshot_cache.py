"""Postgres-backed response cache for expensive bulk endpoints.

The free-tier Redis is tiny (evicts keys) and the 512MB instance recycles the
worker process (dropping in-memory caches), so neither reliably holds a computed
screener/overview response between visits. Postgres does — it's persistent and
not memory-pressured — so we store the computed JSON there and read it back on
each request. Refreshed by the keep-warm cron (and lazily on a stale read)."""
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import PrecomputedSnapshot


async def get_snapshot(db: AsyncSession, key: str, max_age_s: int) -> dict | None:
    """Return the stored payload if it exists and is younger than max_age_s."""
    row = await db.get(PrecomputedSnapshot, key)
    if row is None or row.payload is None:
        return None
    ua = row.updated_at
    if ua.tzinfo is None:           # SQLite returns naive datetimes; assume UTC
        ua = ua.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - ua).total_seconds() > max_age_s:
        return None
    return row.payload


async def set_snapshot(db: AsyncSession, key: str, payload: dict) -> None:
    """Upsert a computed payload. Best-effort — never fail the request on a
    cache write (e.g. a concurrent insert race)."""
    try:
        row = await db.get(PrecomputedSnapshot, key)
        now = datetime.now(timezone.utc)
        if row is None:
            db.add(PrecomputedSnapshot(key=key, payload=payload, updated_at=now))
        else:
            row.payload = payload
            row.updated_at = now
        await db.commit()
    except Exception:
        await db.rollback()
