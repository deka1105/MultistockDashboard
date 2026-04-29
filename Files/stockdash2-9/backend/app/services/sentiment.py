"""
Sentiment service — StockTwits (free, no auth) + Reddit (PRAW).
FinBERT inference runs asynchronously via Celery workers.
"""
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── StockTwits (free, no API key required) ───────────────────────────────────

STOCKTWITS_BASE = "https://api.stocktwits.com/api/2"

_http: httpx.AsyncClient | None = None

def _get_client() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "StockDash/1.0"})
    return _http


@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=4), reraise=True)
async def get_stocktwits_stream(ticker: str, limit: int = 30) -> list[dict[str, Any]]:
    """
    Fetch recent StockTwits messages for a ticker.
    Pre-labeled bullish/bearish by users — no NLP needed.
    """
    client = _get_client()
    try:
        resp = await client.get(
            f"{STOCKTWITS_BASE}/streams/symbol/{ticker.upper()}.json",
            params={"limit": min(limit, 30)},
        )
        if resp.status_code == 200:
            data = resp.json()
            messages = data.get("messages", [])
            return [
                {
                    "external_id": str(m.get("id")),
                    "ticker": ticker.upper(),
                    "source": "stocktwits",
                    "text": m.get("body", ""),
                    "author": m.get("user", {}).get("username"),
                    "score": m.get("likes", {}).get("total", 0),
                    "url": f"https://stocktwits.com/symbol/{ticker.upper()}",
                    "raw_sentiment": (m.get("entities", {}) or {}).get("sentiment", {}).get("basic"),
                    "created_at": m.get("created_at"),
                }
                for m in messages
            ]
        elif resp.status_code == 429:
            logger.warning(f"StockTwits rate limit hit for {ticker}")
            return []
        else:
            logger.warning(f"StockTwits returned {resp.status_code} for {ticker}")
            return []
    except Exception as e:
        logger.error(f"StockTwits fetch failed for {ticker}: {e}")
        return []


# ─── Reddit (PRAW) ────────────────────────────────────────────────────────────

SUBREDDITS = ["wallstreetbets", "stocks", "investing", "options"]


def get_reddit_client():
    """Returns a PRAW Reddit instance. Returns None if credentials not configured."""
    try:
        import praw
        if not settings.reddit_client_id or settings.reddit_client_id == "your_reddit_client_id":
            return None
        return praw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
            check_for_async=False,
        )
    except Exception as e:
        logger.warning(f"Reddit client init failed: {e}")
        return None


def fetch_reddit_posts(ticker: str, limit: int = 25) -> list[dict[str, Any]]:
    """
    Synchronous Reddit fetch (PRAW is sync).
    Run in a thread pool from async context via asyncio.run_in_executor.
    """
    reddit = get_reddit_client()
    if not reddit:
        return []

    posts = []
    query = f"${ticker} OR {ticker} stock"

    for subreddit_name in SUBREDDITS:
        try:
            subreddit = reddit.subreddit(subreddit_name)
            for submission in subreddit.search(query, sort="new", time_filter="day", limit=limit // len(SUBREDDITS)):
                posts.append({
                    "external_id": f"reddit_{submission.id}",
                    "ticker": ticker.upper(),
                    "source": "reddit",
                    "text": f"{submission.title} {submission.selftext[:500]}".strip(),
                    "author": str(submission.author),
                    "score": submission.score,
                    "url": f"https://reddit.com{submission.permalink}",
                    "raw_sentiment": None,
                    "created_at": datetime.fromtimestamp(submission.created_utc, tz=timezone.utc).isoformat(),
                })
        except Exception as e:
            logger.warning(f"Reddit fetch failed for r/{subreddit_name}: {e}")

    return posts


# ─── Sentiment aggregation ────────────────────────────────────────────────────

def aggregate_stocktwits_sentiment(messages: list[dict]) -> dict[str, Any]:
    """
    Aggregate StockTwits pre-labeled sentiment.
    No NLP needed — users tag their own posts.
    """
    bullish = sum(1 for m in messages if (m.get("raw_sentiment") or "").lower() == "bullish")
    bearish = sum(1 for m in messages if (m.get("raw_sentiment") or "").lower() == "bearish")
    total   = len(messages)
    labeled = bullish + bearish

    if labeled == 0:
        score = 0.0
        label = "neutral"
    else:
        score = (bullish - bearish) / labeled  # -1.0 to +1.0
        if score > 0.1:   label = "positive"
        elif score < -0.1: label = "negative"
        else:              label = "neutral"

    return {
        "score":       round(score, 3),
        "label":       label,
        "bullish":     bullish,
        "bearish":     bearish,
        "post_volume": total,
        "source":      "stocktwits",
    }
