"""
Sentiment API endpoints.
/history declared BEFORE /{ticker} to prevent route collision.
"""
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select, desc
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import AsyncSessionLocal
from app.models.models import SentimentScore
from app.services.sentiment import (
    get_sentiment_for_ticker,
    get_sentiment_history_mock,
)

router = APIRouter(prefix="/sentiment", tags=["sentiment"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/{ticker}/history")
@limiter.limit("20/minute")
async def get_sentiment_history(
    request: Request, ticker: str, window: int = 24, limit: int = 48,
):
    """Time-series of sentiment scores for chart overlay."""
    ticker = ticker.upper().strip()[:10]

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SentimentScore)
            .where(SentimentScore.ticker == ticker, SentimentScore.window_hours == window)
            .order_by(desc(SentimentScore.computed_at))
            .limit(min(limit, 200))
        )
        scores = result.scalars().all()

    if scores:
        return {
            "ticker": ticker,
            "history": [
                {
                    "score":        s.score,
                    "label":        s.label,
                    "post_volume":  s.post_volume,
                    "computed_at":  s.computed_at.isoformat() if s.computed_at else None,
                }
                for s in reversed(scores)
            ],
        }

    # No DB records — return mock history so chart always has data
    return {
        "ticker": ticker,
        "history": get_sentiment_history_mock(ticker, points=24),
    }


@router.get("/{ticker}")
@limiter.limit("30/minute")
async def get_sentiment(request: Request, ticker: str, window: int = 24):
    """
    Latest sentiment score for a ticker.
    Priority: PostgreSQL DB → live StockTwits → mock fallback.
    Always returns a result — never 502.
    """
    ticker = ticker.upper().strip()[:10]

    # 1. Check DB first (populated by Celery ingestion tasks)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SentimentScore)
            .where(SentimentScore.ticker == ticker, SentimentScore.window_hours == window)
            .order_by(desc(SentimentScore.computed_at))
            .limit(1)
        )
        score = result.scalar_one_or_none()

        if score:
            return {
                "ticker":       ticker,
                "score":        score.score,
                "label":        score.label,
                "post_volume":  score.post_volume,
                "window_hours": score.window_hours,
                "computed_at":  score.computed_at.isoformat() if score.computed_at else None,
                "source":       "db",
            }

    # 2. Live StockTwits fetch with mock fallback (never raises)
    agg = await get_sentiment_for_ticker(ticker)
    return {
        "ticker":       ticker,
        "score":        agg["score"],
        "label":        agg["label"],
        "post_volume":  agg["post_volume"],
        "window_hours": 1,
        "computed_at":  None,
        "source":       agg.get("source", "mock"),
    }
