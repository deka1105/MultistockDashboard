import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.core.cache import (
    cache_get, cache_set,
    quote_key, candles_key, news_key, search_key,
)

logger = logging.getLogger(__name__)

FINNHUB_BASE = settings.finnhub_base_url
API_KEY = settings.finnhub_api_key

# Use mock data when no API key is configured (offline/test dev mode)
USE_MOCK = not API_KEY or API_KEY == "your_finnhub_api_key_here"

USE_YFINANCE = USE_MOCK  # When no Finnhub key, use yfinance for real data

if USE_MOCK:
    logger.warning(
        "FINNHUB_API_KEY not set — using yfinance (free real-time data) "
        "with mock fallback for unsupported features"
    )


# ─── HTTP client (shared, connection-pooled) ──────────────────────────────────

_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=FINNHUB_BASE,
            params={"token": API_KEY},
            timeout=10.0,
            headers={"User-Agent": "StockDash/1.0"},
        )
    return _client


# ─── Retry decorator for transient errors ────────────────────────────────────

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(httpx.TransportError),
    reraise=True,
)
async def _get(path: str, params: dict | None = None) -> dict:
    client = get_http_client()
    response = await client.get(path, params=params)

    if response.status_code == 429:
        logger.warning(f"Finnhub rate limit hit: {path}")
        raise httpx.TransportError("Rate limit exceeded")

    response.raise_for_status()
    return response.json()


# ─── Quote ───────────────────────────────────────────────────────────────────

async def get_quote(ticker: str) -> dict[str, Any]:
    """Real-time quote for a ticker."""
    if USE_MOCK:
        from app.services.mock_data import get_mock_quote
        return get_mock_quote(ticker)

    key = quote_key(ticker)
    cached = await cache_get(key)
    if cached:
        return cached

    data = await _get("/quote", params={"symbol": ticker.upper()})
    result = {
        "ticker": ticker.upper(),
        "price": data.get("c"),
        "change": data.get("d"),
        "change_pct": data.get("dp"),
        "high": data.get("h"),
        "low": data.get("l"),
        "open": data.get("o"),
        "prev_close": data.get("pc"),
        "timestamp": data.get("t"),
    }
    await cache_set(key, result, ttl=settings.cache_ttl_quote)
    return result


# ─── Candles (OHLCV) ─────────────────────────────────────────────────────────

RESOLUTION_MAP = {
    "1D": ("5", 1),
    "1W": ("15", 7),
    "1M": ("60", 30),
    "3M": ("D", 90),
    "1Y": ("D", 365),
    "5Y": ("W", 1825),
}


async def get_candles(ticker: str, range_key: str = "1M") -> dict[str, Any]:
    """OHLCV candle data for a given time range key."""
    if USE_MOCK:
        from app.services.mock_data import get_mock_candles
        return get_mock_candles(ticker, range_key)

    resolution, days = RESOLUTION_MAP.get(range_key, ("D", 30))
    now = int(datetime.now(timezone.utc).timestamp())
    from_ts = now - (days * 86400)

    key = candles_key(ticker, resolution, from_ts, now)
    cached = await cache_get(key)
    if cached:
        return cached

    data = await _get("/stock/candle", params={
        "symbol": ticker.upper(),
        "resolution": resolution,
        "from": from_ts,
        "to": now,
    })

    if data.get("s") == "no_data":
        return {"ticker": ticker.upper(), "range": range_key, "resolution": resolution, "candles": []}

    timestamps = data.get("t", [])
    candles = [
        {
            "date": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
            "timestamp": ts,
            "open": data["o"][i],
            "high": data["h"][i],
            "low": data["l"][i],
            "close": data["c"][i],
            "volume": data["v"][i],
        }
        for i, ts in enumerate(timestamps)
    ]

    result = {
        "ticker": ticker.upper(),
        "range": range_key,
        "resolution": resolution,
        "candles": candles,
    }
    await cache_set(key, result, ttl=settings.cache_ttl_candles)
    return result


# ─── Symbol Search ───────────────────────────────────────────────────────────

async def search_symbols(query: str) -> list[dict]:
    """Autocomplete ticker symbol search."""
    if not query:
        return []

    if USE_MOCK:
        from app.services.mock_data import get_mock_search
        return get_mock_search(query)

    key = search_key(query)
    cached = await cache_get(key)
    if cached:
        return cached

    data = await _get("/search", params={"q": query})
    results = [
        {
            "ticker": item.get("symbol"),
            "description": item.get("description"),
            "type": item.get("type"),
            "exchange": item.get("primaryExchange"),
        }
        for item in data.get("result", [])[:10]
        if item.get("type") in ("Common Stock", "ETP", "ADR")
    ]
    await cache_set(key, results, ttl=300)
    return results


# ─── Company News ─────────────────────────────────────────────────────────────

async def get_company_news(ticker: str, days_back: int = 7) -> list[dict]:
    """Recent news articles for a ticker."""
    if USE_MOCK:
        from app.services.mock_data import get_mock_news
        return get_mock_news(ticker)

    key = news_key(ticker)
    cached = await cache_get(key)
    if cached:
        return cached

    now = datetime.now(timezone.utc)
    from_date = now.replace(hour=0, minute=0, second=0)
    from_str = (from_date.replace(day=max(1, from_date.day - days_back))).strftime("%Y-%m-%d")
    to_str = now.strftime("%Y-%m-%d")

    data = await _get("/company-news", params={
        "symbol": ticker.upper(),
        "from": from_str,
        "to": to_str,
    })

    articles = [
        {
            "id": item.get("id"),
            "headline": item.get("headline"),
            "summary": item.get("summary"),
            "source": item.get("source"),
            "url": item.get("url"),
            "image": item.get("image"),
            "sentiment": _map_sentiment(item.get("sentiment")),
            "published_at": datetime.fromtimestamp(
                item.get("datetime", 0), tz=timezone.utc
            ).isoformat(),
        }
        for item in (data if isinstance(data, list) else [])
    ][:30]

    await cache_set(key, articles, ttl=settings.cache_ttl_news)
    return articles


def _map_sentiment(raw: str | None) -> str:
    return {"positive": "positive", "negative": "negative"}.get((raw or "").lower(), "neutral")


# ─── Company Profile ──────────────────────────────────────────────────────────

async def get_company_profile(ticker: str) -> dict[str, Any]:
    """Company metadata: name, sector, market cap, logo, etc."""
    if USE_MOCK:
        from app.services.mock_data import get_mock_profile
        return get_mock_profile(ticker)

    data = await _get("/stock/profile2", params={"symbol": ticker.upper()})
    return {
        "ticker": ticker.upper(),
        "company_name": data.get("name"),
        "sector": data.get("finnhubIndustry"),
        "market_cap": data.get("marketCapitalization"),
        "logo_url": data.get("logo"),
        "exchange": data.get("exchange"),
        "ipo_date": data.get("ipo"),
        "website": data.get("weburl"),
        "country": data.get("country"),
        "currency": data.get("currency"),
    }


# ─── Basic Financials (52-week range) ────────────────────────────────────────

async def get_basic_financials(ticker: str) -> dict[str, Any]:
    """Key financial metrics: 52-week range, P/E, beta, etc."""
    if USE_MOCK:
        from app.services.mock_data import get_mock_financials
        return get_mock_financials(ticker)

    data = await _get("/stock/metric", params={
        "symbol": ticker.upper(),
        "metric": "all",
    })
    metric = data.get("metric", {})
    return {
        "ticker": ticker.upper(),
        "52_week_high": metric.get("52WeekHigh"),
        "52_week_low": metric.get("52WeekLow"),
        "beta": metric.get("beta"),
        "pe_ratio": metric.get("peNormalizedAnnual"),
        "eps": metric.get("epsNormalizedAnnual"),
        "revenue_per_share": metric.get("revenuePerShareAnnual"),
        "dividend_yield": metric.get("dividendYieldIndicatedAnnual"),
    }
