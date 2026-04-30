"""
Sentiment service — StockTwits (free, no auth) + Reddit (PRAW).
Falls back to deterministic mock sentiment when external APIs are unreachable.
"""
import logging
import random
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

STOCKTWITS_BASE = "https://api.stocktwits.com/api/2"

_http: httpx.AsyncClient | None = None

def _get_client() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "StockDash/1.0"})
    return _http


# ─── Mock sentiment (used when StockTwits is unreachable) ─────────────────────

# Seeded by ticker so same ticker always gets same mock sentiment
_TICKER_SENTIMENTS = {
    "AAPL":  (0.62,  "positive", 284),
    "MSFT":  (0.55,  "positive", 196),
    "NVDA":  (0.71,  "positive", 421),
    "TSLA":  (-0.18, "neutral",  512),
    "AMZN":  (0.44,  "positive", 178),
    "META":  (0.38,  "positive", 203),
    "GOOGL": (0.51,  "positive", 167),
    "AMD":   (0.60,  "positive", 234),
    "NFLX":  (0.22,  "neutral",  145),
    "JPM":   (0.15,  "neutral",   98),
    "GME":   (-0.42, "negative", 892),
    "AMC":   (-0.55, "negative", 634),
    "PLTR":  (0.48,  "positive", 312),
}

def _get_mock_sentiment(ticker: str) -> dict[str, Any]:
    """Returns deterministic mock sentiment for a ticker."""
    t = ticker.upper()
    if t in _TICKER_SENTIMENTS:
        score, label, volume = _TICKER_SENTIMENTS[t]
    else:
        # Seed random by ticker hash for consistency
        rng = random.Random(hash(t) % 10000)
        score = round(rng.uniform(-0.6, 0.8), 2)
        label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
        volume = rng.randint(20, 300)

    return {
        "score":       score,
        "label":       label,
        "bullish":     max(0, int((score + 1) / 2 * volume)),
        "bearish":     max(0, int((1 - (score + 1) / 2) * volume)),
        "post_volume": volume,
        "source":      "mock",
    }

def _mock_sentiment_history(ticker: str, points: int = 24) -> list[dict]:
    """Returns mock sentiment time series for chart overlay."""
    t = ticker.upper()
    base_score, _, _ = _TICKER_SENTIMENTS.get(t, (0.2, "positive", 100))
    rng = random.Random(hash(t) % 10000)
    now = datetime.now(timezone.utc)
    history = []
    score = base_score
    for i in range(points):
        score = max(-1.0, min(1.0, score + rng.uniform(-0.08, 0.08)))
        label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
        ts = now.replace(hour=i % 24, minute=0, second=0, microsecond=0)
        history.append({
            "score":        round(score, 3),
            "label":        label,
            "post_volume":  rng.randint(10, 50),
            "computed_at":  ts.isoformat(),
        })
    return history


# ─── StockTwits live fetch ────────────────────────────────────────────────────

async def get_stocktwits_stream(ticker: str, limit: int = 30) -> list[dict[str, Any]]:
    """
    Fetch recent StockTwits messages for a ticker.
    Returns empty list (not raises) on any failure — caller uses mock fallback.
    """
    client = _get_client()
    try:
        resp = await client.get(
            f"{STOCKTWITS_BASE}/streams/symbol/{ticker.upper()}.json",
            params={"limit": min(limit, 30)},
        )
        if resp.status_code == 200:
            messages = resp.json().get("messages", [])
            return [
                {
                    "external_id": str(m.get("id")),
                    "ticker":      ticker.upper(),
                    "source":      "stocktwits",
                    "text":        m.get("body", ""),
                    "author":      m.get("user", {}).get("username"),
                    "score":       m.get("likes", {}).get("total", 0),
                    "url":         f"https://stocktwits.com/symbol/{ticker.upper()}",
                    "raw_sentiment": (m.get("entities") or {}).get("sentiment", {}).get("basic"),
                    "created_at":  m.get("created_at"),
                }
                for m in messages
            ]
        logger.warning(f"StockTwits returned {resp.status_code} for {ticker}")
        return []
    except Exception as e:
        logger.debug(f"StockTwits unreachable for {ticker}: {e}")
        return []


# ─── Sentiment aggregation ────────────────────────────────────────────────────

def aggregate_stocktwits_sentiment(messages: list[dict]) -> dict[str, Any]:
    """Aggregate pre-labeled StockTwits sentiment."""
    bullish = sum(1 for m in messages if (m.get("raw_sentiment") or "").lower() == "bullish")
    bearish = sum(1 for m in messages if (m.get("raw_sentiment") or "").lower() == "bearish")
    total   = len(messages)
    labeled = bullish + bearish

    if labeled == 0:
        score = 0.0
        label = "neutral"
    else:
        score = (bullish - bearish) / labeled
        label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"

    return {
        "score":       round(score, 3),
        "label":       label,
        "bullish":     bullish,
        "bearish":     bearish,
        "post_volume": total,
        "source":      "stocktwits",
    }


# ─── Main sentiment fetch (live → mock fallback) ──────────────────────────────

async def get_sentiment_for_ticker(ticker: str) -> dict[str, Any]:
    """
    Returns sentiment for a ticker.
    Priority: live StockTwits → mock fallback.
    Never raises — always returns a usable result.
    """
    messages = await get_stocktwits_stream(ticker, limit=30)
    if messages:
        agg = aggregate_stocktwits_sentiment(messages)
        # If StockTwits returned posts but none were labeled, use mock score
        if agg["post_volume"] > 0 and agg["bullish"] == 0 and agg["bearish"] == 0:
            return _get_mock_sentiment(ticker)
        return agg
    # StockTwits unreachable or empty — use mock
    return _get_mock_sentiment(ticker)


def get_sentiment_history_mock(ticker: str, points: int = 24) -> list[dict]:
    return _mock_sentiment_history(ticker, points)


# ─── Reddit ───────────────────────────────────────────────────────────────────

def get_reddit_client():
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
    reddit = get_reddit_client()
    if not reddit:
        return []
    posts = []
    for subreddit_name in ["wallstreetbets", "stocks", "investing", "options"]:
        try:
            subreddit = reddit.subreddit(subreddit_name)
            for submission in subreddit.search(
                f"${ticker} OR {ticker} stock", sort="new", time_filter="day",
                limit=limit // 4
            ):
                posts.append({
                    "external_id": f"reddit_{submission.id}",
                    "ticker":   ticker.upper(),
                    "source":   "reddit",
                    "text":     f"{submission.title} {submission.selftext[:500]}".strip(),
                    "author":   str(submission.author),
                    "score":    submission.score,
                    "url":      f"https://reddit.com{submission.permalink}",
                    "raw_sentiment": None,
                    "created_at": datetime.fromtimestamp(
                        submission.created_utc, tz=timezone.utc
                    ).isoformat(),
                })
        except Exception as e:
            logger.warning(f"Reddit fetch failed for r/{subreddit_name}: {e}")
    return posts
