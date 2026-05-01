import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# Top tickers to keep warm in cache
TRACKED_TICKERS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL",
    "TSLA", "JPM", "V", "UNH", "XOM", "MA", "AVGO",
    "JNJ", "PG", "HD", "COST", "NFLX", "AMD", "BAC",
]


@celery_app.task(name="app.workers.tasks.stock_tasks.warm_quote_cache", bind=True, max_retries=2)
def warm_quote_cache(self):
    """
    Pre-fetch quotes for tracked tickers and warm the Redis cache.
    Runs every 30 seconds via Celery beat.
    """
    import asyncio
    from app.services.finnhub import get_quote

    async def _warm():
        results = {"success": [], "failed": []}
        for ticker in TRACKED_TICKERS:
            try:
                await get_quote(ticker)
                results["success"].append(ticker)
            except Exception as e:
                logger.warning(f"Cache warm failed for {ticker}: {e}")
                results["failed"].append(ticker)
        return results

    try:
        result = asyncio.run(_warm())
        logger.info(f"Quote cache warmed: {len(result['success'])} ok, {len(result['failed'])} failed")
        return result
    except Exception as exc:
        logger.error(f"warm_quote_cache task error: {exc}")
        raise self.retry(exc=exc, countdown=10)


@celery_app.task(name="app.workers.tasks.stock_tasks.refresh_stock_metadata", bind=True)
def refresh_stock_metadata(self):
    """
    Refresh company metadata (sector, market cap) for all tracked tickers.
    Runs nightly at 2am UTC via Celery beat.
    """
    import asyncio
    from app.services.finnhub import get_company_profile
    from app.db.session import AsyncSessionLocal
    from app.models.models import StockMetadata
    from sqlalchemy import select
    from datetime import datetime, timezone

    async def _refresh():
        async with AsyncSessionLocal() as session:
            for ticker in TRACKED_TICKERS:
                try:
                    profile = await get_company_profile(ticker)

                    result = await session.execute(
                        select(StockMetadata).where(StockMetadata.ticker == ticker)
                    )
                    existing = result.scalar_one_or_none()

                    if existing:
                        existing.company_name = profile.get("company_name")
                        existing.sector = profile.get("sector")
                        existing.market_cap = profile.get("market_cap")
                        existing.logo_url = profile.get("logo_url")
                        existing.exchange = profile.get("exchange")
                        existing.updated_at = datetime.now(timezone.utc)
                    else:
                        session.add(StockMetadata(
                            ticker=ticker,
                            company_name=profile.get("company_name"),
                            sector=profile.get("sector"),
                            market_cap=profile.get("market_cap"),
                            logo_url=profile.get("logo_url"),
                            exchange=profile.get("exchange"),
                        ))

                    await session.commit()
                    logger.info(f"Metadata refreshed for {ticker}")

                except Exception as e:
                    logger.error(f"Metadata refresh failed for {ticker}: {e}")
                    await session.rollback()

    asyncio.run(_refresh())
