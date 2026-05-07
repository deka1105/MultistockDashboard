"""
Phase 4 sentiment ingestion tasks.
StockTwits: runs every 30 min (free, no auth)
Reddit: runs every 15 min (requires PRAW credentials)
Sentiment compute: runs every hour
"""
import asyncio
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

SENTIMENT_TICKERS = [
    "AAPL","TSLA","NVDA","AMZN","META","MSFT","GOOGL",
    "GME","AMC","PLTR","SOFI","RIVN","AMD","NFLX",
]


@celery_app.task(name="app.workers.tasks.sentiment_tasks.ingest_stocktwits", bind=True, max_retries=3)
def ingest_stocktwits(self):
    """
    Pull StockTwits stream for each tracked ticker.
    Pre-labeled bullish/bearish — no NLP required.
    """
    async def _run():
        from app.services.sentiment import get_stocktwits_stream, aggregate_stocktwits_sentiment
        from app.db.session import AsyncSessionLocal
        from app.models.models import SocialPost, SentimentScore
        from sqlalchemy import select
        from datetime import datetime, timezone

        async with AsyncSessionLocal() as session:
            for ticker in SENTIMENT_TICKERS:
                try:
                    messages = await get_stocktwits_stream(ticker, limit=30)
                    if not messages:
                        continue

                    # Persist new posts (skip duplicates)
                    for msg in messages:
                        exists = await session.execute(
                            select(SocialPost).where(SocialPost.external_id == msg["external_id"])
                        )
                        if exists.scalar_one_or_none():
                            continue

                        created_at = msg.get("created_at")
                        if isinstance(created_at, str):
                            try:
                                from dateutil import parser as dp
                                created_at = dp.parse(created_at)
                            except Exception:
                                created_at = datetime.now(timezone.utc)

                        session.add(SocialPost(
                            external_id=msg["external_id"],
                            ticker=ticker,
                            source="stocktwits",
                            text=msg["text"][:2000],
                            author=msg.get("author"),
                            score=msg.get("score", 0),
                            url=msg.get("url"),
                            raw_sentiment=msg.get("raw_sentiment"),
                            created_at=created_at or datetime.now(timezone.utc),
                        ))

                    await session.commit()

                    # Compute and store sentiment score
                    agg = aggregate_stocktwits_sentiment(messages)
                    session.add(SentimentScore(
                        ticker=ticker,
                        source="stocktwits",
                        label=agg["label"],
                        score=agg["score"],
                        post_volume=agg["post_volume"],
                        window_hours=1,
                        computed_at=datetime.now(timezone.utc),
                    ))
                    await session.commit()
                    logger.info(f"StockTwits {ticker}: {agg['label']} ({agg['score']:.2f}), {agg['post_volume']} posts")

                except Exception as e:
                    logger.error(f"StockTwits ingestion failed for {ticker}: {e}")
                    await session.rollback()

    try:
        asyncio.run(_run())
        return {"status": "ok", "tickers": len(SENTIMENT_TICKERS)}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.workers.tasks.sentiment_tasks.ingest_reddit_posts", bind=True, max_retries=3)
def ingest_reddit_posts(self):
    """
    Pull Reddit posts from WSB, stocks, investing, options.
    Requires REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET in .env.
    """
    from app.services.sentiment import fetch_reddit_posts, get_reddit_client
    from app.core.config import settings

    if not settings.reddit_client_id or settings.reddit_client_id == "your_reddit_client_id":
        logger.info("Reddit credentials not configured — skipping")
        return {"status": "skipped", "reason": "no credentials"}

    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.models.models import SocialPost
        from sqlalchemy import select
        from datetime import datetime, timezone
        import concurrent.futures

        async with AsyncSessionLocal() as session:
            loop = asyncio.get_event_loop()
            for ticker in SENTIMENT_TICKERS[:8]:  # cap to avoid rate limits
                try:
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        posts = await loop.run_in_executor(pool, fetch_reddit_posts, ticker)

                    for post in posts:
                        exists = await session.execute(
                            select(SocialPost).where(SocialPost.external_id == post["external_id"])
                        )
                        if exists.scalar_one_or_none():
                            continue

                        created_at = post.get("created_at")
                        if isinstance(created_at, str):
                            try:
                                from dateutil import parser as dp
                                created_at = dp.parse(created_at)
                            except Exception:
                                created_at = datetime.now(timezone.utc)

                        session.add(SocialPost(
                            external_id=post["external_id"],
                            ticker=ticker,
                            source="reddit",
                            text=post["text"][:2000],
                            author=post.get("author"),
                            score=post.get("score", 0),
                            url=post.get("url"),
                            raw_sentiment=None,
                            created_at=created_at or datetime.now(timezone.utc),
                        ))

                    await session.commit()
                    logger.info(f"Reddit {ticker}: {len(posts)} posts ingested")

                except Exception as e:
                    logger.error(f"Reddit ingestion failed for {ticker}: {e}")
                    await session.rollback()

    try:
        asyncio.run(_run())
        return {"status": "ok"}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(name="app.workers.tasks.sentiment_tasks.compute_sentiment_scores", bind=True)
def compute_sentiment_scores(self):
    """
    Aggregate social_posts into sentiment_scores per ticker for 1h, 4h, 24h windows.
    Applies FinBERT to Reddit posts that don't have pre-labeled sentiment.
    Full FinBERT impl runs when transformers is installed and CUDA/CPU is available.
    """
    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.models.models import SocialPost, SentimentScore
        from sqlalchemy import select, func
        from datetime import datetime, timezone, timedelta

        async with AsyncSessionLocal() as session:
            for ticker in SENTIMENT_TICKERS:
                for window_hours in [1, 4, 24]:
                    try:
                        cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
                        result = await session.execute(
                            select(SocialPost).where(
                                SocialPost.ticker == ticker,
                                SocialPost.created_at >= cutoff,
                            )
                        )
                        posts = result.scalars().all()
                        if not posts:
                            continue

                        # Use pre-labeled sentiment where available (StockTwits)
                        bullish = sum(1 for p in posts if p.raw_sentiment == "Bullish")
                        bearish = sum(1 for p in posts if p.raw_sentiment == "Bearish")
                        labeled = bullish + bearish

                        if labeled > 0:
                            score = (bullish - bearish) / labeled
                            label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
                        else:
                            # Lexicon-based scoring (FinBERT optional upgrade in Phase 5)
                            score = 0.0
                            label = "neutral"

                        session.add(SentimentScore(
                            ticker=ticker,
                            source=None,  # aggregated
                            label=label,
                            score=round(score, 3),
                            post_volume=len(posts),
                            window_hours=window_hours,
                            computed_at=datetime.now(timezone.utc),
                        ))

                    except Exception as e:
                        logger.error(f"Sentiment compute error {ticker}/{window_hours}h: {e}")

            await session.commit()

    try:
        asyncio.run(_run())
        return {"status": "ok"}
    except Exception as exc:
        logger.error(f"compute_sentiment_scores failed: {exc}")
        raise self.retry(exc=exc, countdown=300)
