import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services import finnhub as fh
from app.schemas.stock import (
    QuoteResponse, CandlesResponse, SearchResponse,
    NewsResponse, CompanyProfileResponse, BasicFinancialsResponse,
    CompareResponse, CompareSeriesItem, NormalizedSeriesPoint,
    MarketOverviewResponse, MarketOverviewItem,
)
from app.core.cache import cache_get, cache_set, market_overview_key
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stocks", tags=["stocks"])

# Top 30 S&P 500 tickers for market overview default
SP500_TOP30 = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "GOOG", "BRK.B",
    "LLY", "TSLA", "JPM", "V", "UNH", "XOM", "MA", "AVGO", "JNJ",
    "PG", "HD", "MRK", "COST", "ABBV", "CVX", "KO", "PEP", "WMT",
    "BAC", "CRM", "NFLX", "AMD",
]

# Chart series colors
SERIES_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
]

VALID_RANGES = {"1D", "1W", "1M", "3M", "1Y", "5Y"}


def _validate_ticker(ticker: str) -> str:
    """Sanitize and validate ticker input."""
    cleaned = ticker.upper().strip()
    if not cleaned or len(cleaned) > 10 or not cleaned.replace(".", "").isalnum():
        raise HTTPException(status_code=422, detail=f"Invalid ticker: {ticker}")
    return cleaned


# ─── Quote ───────────────────────────────────────────────────────────────────

@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def get_quote(ticker: str):
    """Real-time stock quote."""
    ticker = _validate_ticker(ticker)
    try:
        return await fh.get_quote(ticker)
    except Exception as e:
        logger.error(f"Quote fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch quote from data provider")


# ─── Candles ─────────────────────────────────────────────────────────────────

@router.get("/candles/{ticker}", response_model=CandlesResponse)
async def get_candles(
    ticker: str,
    range: Annotated[str, Query(description="Time range: 1D|1W|1M|3M|1Y|5Y")] = "1M",
):
    """OHLCV candlestick data for a given time range."""
    ticker = _validate_ticker(ticker)
    if range not in VALID_RANGES:
        raise HTTPException(status_code=422, detail=f"Invalid range. Must be one of: {VALID_RANGES}")
    try:
        return await fh.get_candles(ticker, range)
    except Exception as e:
        logger.error(f"Candles fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch candle data")


# ─── Symbol Search ───────────────────────────────────────────────────────────

@router.get("/search", response_model=SearchResponse)
async def search_symbols(
    q: Annotated[str, Query(min_length=1, max_length=50, description="Search query")],
):
    """Autocomplete ticker symbol search."""
    try:
        results = await fh.search_symbols(q)
        return SearchResponse(query=q, results=results)
    except Exception as e:
        logger.error(f"Symbol search failed for '{q}': {e}")
        raise HTTPException(status_code=502, detail="Symbol search unavailable")


# ─── Company News ─────────────────────────────────────────────────────────────

@router.get("/news/{ticker}", response_model=NewsResponse)
async def get_news(
    ticker: str,
    days: Annotated[int, Query(ge=1, le=30, description="Days of history")] = 7,
):
    """Recent news articles for a ticker."""
    ticker = _validate_ticker(ticker)
    try:
        articles = await fh.get_company_news(ticker, days_back=days)
        return NewsResponse(ticker=ticker, articles=articles)
    except Exception as e:
        logger.error(f"News fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch news")


# ─── Company Profile ──────────────────────────────────────────────────────────

@router.get("/profile/{ticker}", response_model=CompanyProfileResponse)
async def get_profile(ticker: str):
    """Company profile: name, sector, market cap, logo, etc."""
    ticker = _validate_ticker(ticker)
    try:
        return await fh.get_company_profile(ticker)
    except Exception as e:
        logger.error(f"Profile fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch company profile")


# ─── Basic Financials ─────────────────────────────────────────────────────────

@router.get("/financials/{ticker}", response_model=BasicFinancialsResponse)
async def get_financials(ticker: str):
    """Key financial metrics: 52-week range, P/E, beta, etc."""
    ticker = _validate_ticker(ticker)
    try:
        data = await fh.get_basic_financials(ticker)
        return BasicFinancialsResponse(**data)
    except Exception as e:
        logger.error(f"Financials fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch financials")


# ─── Multi-Stock Compare ─────────────────────────────────────────────────────

@router.get("/compare", response_model=CompareResponse)
async def compare_stocks(
    tickers: Annotated[str, Query(description="Comma-separated tickers, e.g. AAPL,MSFT,GOOGL")],
    range: Annotated[str, Query(description="Time range: 1D|1W|1M|3M|1Y|5Y")] = "3M",
):
    """
    Normalized % return series for multi-stock comparison.
    All series are indexed to 0% at the start of the range.
    """
    if range not in VALID_RANGES:
        raise HTTPException(status_code=422, detail=f"Invalid range. Must be one of: {VALID_RANGES}")

    ticker_list = [_validate_ticker(t.strip()) for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(status_code=422, detail="At least one ticker required")
    if len(ticker_list) > 8:
        raise HTTPException(status_code=422, detail="Maximum 8 tickers for comparison")

    series_list: list[CompareSeriesItem] = []

    for i, ticker in enumerate(ticker_list):
        try:
            candle_data = await fh.get_candles(ticker, range)
            candles = candle_data.get("candles", [])

            if not candles:
                continue

            start_price = candles[0]["close"]
            end_price = candles[-1]["close"]

            if start_price == 0:
                continue

            points = [
                NormalizedSeriesPoint(
                    date=c["date"],
                    timestamp=c["timestamp"],
                    pct_return=round(((c["close"] - start_price) / start_price) * 100, 4),
                    close=c["close"],
                )
                for c in candles
            ]

            series_list.append(CompareSeriesItem(
                ticker=ticker,
                color=SERIES_COLORS[i % len(SERIES_COLORS)],
                start_price=start_price,
                end_price=end_price,
                pct_change=round(((end_price - start_price) / start_price) * 100, 2),
                points=points,
            ))

        except Exception as e:
            logger.warning(f"Compare: failed to fetch data for {ticker}: {e}")
            continue

    return CompareResponse(
        tickers=[s.ticker for s in series_list],
        range=range,
        series=series_list,
    )


# ─── Market Overview ──────────────────────────────────────────────────────────

@router.get("/market/overview", response_model=MarketOverviewResponse)
async def get_market_overview():
    """
    Batch quote for S&P 500 top 30 tickers.
    Cached for 60 seconds.
    """
    from datetime import datetime, timezone

    key = market_overview_key()
    cached = await cache_get(key)
    if cached:
        return cached

    items = []
    for ticker in SP500_TOP30:
        try:
            quote = await fh.get_quote(ticker)
            profile = await fh.get_company_profile(ticker)
            items.append(MarketOverviewItem(
                ticker=ticker,
                company_name=profile.get("company_name"),
                sector=profile.get("sector"),
                price=quote.get("price"),
                change=quote.get("change"),
                change_pct=quote.get("change_pct"),
                volume=None,  # Not in quote endpoint; add from candles if needed
                market_cap=profile.get("market_cap"),
            ))
        except Exception as e:
            logger.warning(f"Market overview: failed for {ticker}: {e}")

    result = MarketOverviewResponse(
        items=items,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )

    await cache_set(key, result.model_dump(), ttl=settings.cache_ttl_market_overview)
    return result
