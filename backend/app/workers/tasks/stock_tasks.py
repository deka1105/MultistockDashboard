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


@celery_app.task(name="app.workers.tasks.stock_tasks.check_alerts_task")
def check_alerts_task():
    """
    Celery beat task: check all active price alerts every 30s.
    Evaluates price_above, price_below, and pct_move_day alert types.
    RSI/MA crossover alerts are evaluated client-side.
    """
    import asyncio
    from app.db.session import AsyncSessionLocal
    from app.models.models import Alert
    from app.services import finnhub as fh
    from datetime import datetime, timezone
    from sqlalchemy import select
    import logging

    logger = logging.getLogger(__name__)

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Alert).where(Alert.is_active == True)  # noqa: E712
            )
            active = result.scalars().all()
            if not active:
                return {"triggered": 0}

            tickers = list({a.ticker for a in active})
            quotes = await asyncio.gather(
                *[fh.get_quote(t) for t in tickers], return_exceptions=True
            )
            price_map = {
                t: (q if isinstance(q, dict) else {})
                for t, q in zip(tickers, quotes)
            }

            triggered_count = 0
            for alert in active:
                q = price_map.get(alert.ticker, {})
                price = q.get("price")
                pct = q.get("change_pct", 0) or 0
                if price is None:
                    continue

                fired = False
                if alert.alert_type == "price_above" and alert.threshold and price > alert.threshold:
                    fired = True
                elif alert.alert_type == "price_below" and alert.threshold and price < alert.threshold:
                    fired = True
                elif alert.alert_type == "pct_move_day" and alert.threshold and abs(pct) > alert.threshold:
                    fired = True

                if fired:
                    alert.is_active = False
                    alert.triggered_at = datetime.now(timezone.utc)
                    alert.triggered_price = price
                    triggered_count += 1
                    logger.info(f"Alert {alert.id} triggered: {alert.ticker} {alert.alert_type}")

            if triggered_count:
                await db.commit()
            return {"triggered": triggered_count}

    return asyncio.get_event_loop().run_until_complete(_run())


@celery_app.task(name="app.workers.tasks.stock_tasks.refresh_institutional_ownership")
def refresh_institutional_ownership():
    """
    Celery beat task: refresh institutional ownership data quarterly.
    Runs once a day; only inserts new rows when quarter changes.
    """
    import asyncio
    from datetime import date
    from app.db.session import AsyncSessionLocal
    from app.models.models import InstitutionalOwnership
    from app.services.mock_data import get_mock_institutional
    from sqlalchemy import select, and_
    import logging

    logger = logging.getLogger(__name__)

    # Top 30 tickers to keep fresh
    TRACKED = [
        "AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","JPM","V","UNH",
        "XOM","MA","AVGO","JNJ","PG","HD","MRK","COST","ABBV","CVX",
        "KO","PEP","WMT","BAC","CRM","NFLX","AMD","ORCL","CSCO","ACN",
    ]

    quarter_end = str(date.today().replace(day=1))   # approximate

    async def _run():
        async with AsyncSessionLocal() as db:
            refreshed = 0
            for ticker in TRACKED:
                # Skip if we already have a record for this quarter
                exists = await db.execute(
                    select(InstitutionalOwnership).where(
                        and_(
                            InstitutionalOwnership.ticker == ticker,
                            InstitutionalOwnership.report_date == quarter_end,
                        )
                    )
                )
                if exists.scalar_one_or_none():
                    continue

                data = get_mock_institutional(ticker)
                rec  = InstitutionalOwnership(
                    ticker          = ticker,
                    report_date     = quarter_end,
                    inst_pct_float  = data["inst_pct_float"],
                    num_holders     = data["num_holders"],
                    qoq_change_pct  = data["qoq_change_pct"],
                    top_holder_name = data["top_holders"][0]["name"] if data["top_holders"] else None,
                    top_holder_pct  = data["top_holders"][0]["pct"]  if data["top_holders"] else None,
                )
                db.add(rec)
                refreshed += 1

            if refreshed:
                await db.commit()
            logger.info(f"Institutional ownership refreshed for {refreshed} tickers")
            return {"refreshed": refreshed}

    return asyncio.get_event_loop().run_until_complete(_run())
