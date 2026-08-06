import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        # BOUNDED, BLOCKING pool. Bulk endpoints (screener/overview) issue ~200
        # concurrent cache ops per request; an unbounded pool opened a connection
        # for each → blew past the free-tier Redis client cap ("max number of
        # clients reached") → every cache op failed → nothing cached. Cap the pool
        # and make callers WAIT for a free connection instead of opening new ones.
        pool = aioredis.BlockingConnectionPool.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=10,
            timeout=5,  # seconds to wait for a free connection before erroring
        )
        _redis_client = aioredis.Redis(connection_pool=pool)
    return _redis_client


async def cache_get(key: str) -> Any | None:
    """Retrieve a cached value. Returns None on miss or error."""
    try:
        client = await get_redis()
        value = await client.get(key)
        if value:
            return json.loads(value)
    except Exception as e:
        logger.warning(f"Redis GET failed for key={key}: {e}")
    return None


async def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    """Store a value in Redis with a TTL in seconds."""
    try:
        client = await get_redis()
        await client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning(f"Redis SET failed for key={key}: {e}")


async def cache_delete(key: str) -> None:
    try:
        client = await get_redis()
        await client.delete(key)
    except Exception as e:
        logger.warning(f"Redis DELETE failed for key={key}: {e}")


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern.

    Uses SCAN (cursor-based, non-blocking) rather than KEYS, which is O(N) over
    the entire keyspace and blocks the Redis server for the whole scan.
    """
    try:
        client = await get_redis()
        batch: list[str] = []
        async for key in client.scan_iter(match=pattern, count=500):
            batch.append(key)
            if len(batch) >= 500:
                await client.delete(*batch)
                batch.clear()
        if batch:
            await client.delete(*batch)
    except Exception as e:
        logger.warning(f"Redis pattern DELETE failed for pattern={pattern}: {e}")


# ─── Cache key builders ───────────────────────────────────────────────────────

def quote_key(ticker: str) -> str:
    return f"quote:{ticker.upper()}"

def candles_key(ticker: str, resolution: str, from_ts: int, to_ts: int) -> str:
    return f"candles:{ticker.upper()}:{resolution}:{from_ts}:{to_ts}"

def news_key(ticker: str) -> str:
    return f"news:{ticker.upper()}"

def profile_key(ticker: str) -> str:
    return f"profile:{ticker.upper()}"

def financials_key(ticker: str) -> str:
    return f"financials:{ticker.upper()}"

def search_key(query: str) -> str:
    return f"search:{query.lower()}"

def market_overview_key() -> str:
    return "market:overview"

def sentiment_key(ticker: str, window: int = 24) -> str:
    return f"sentiment:{ticker.upper()}:{window}h"
