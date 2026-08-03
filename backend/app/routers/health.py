import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.core.cache import get_redis
from app.schemas.stock import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    db_status = "ok"
    redis_status = "ok"

    # Check DB — log the real error server-side, but never leak internal
    # connection details (hosts, DSNs) through this unauthenticated endpoint.
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check: database probe failed")
        db_status = "error"

    # Check Redis
    try:
        client = await get_redis()
        await client.ping()
    except Exception:
        logger.exception("Health check: redis probe failed")
        redis_status = "error"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return HealthResponse(
        status=overall,
        db=db_status,
        redis=redis_status,
    )
