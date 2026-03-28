import asyncio
import logging
from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

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

SP500_TOP30 = [
    "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","BRK.B",
    "LLY","TSLA","JPM","V","UNH","XOM","MA","AVGO","JNJ",
    "PG","HD","MRK","COST","ABBV","CVX","KO","PEP","WMT",
    "BAC","CRM","NFLX","AMD",
]

SERIES_COLORS = [
    "#6366f1","#f59e0b","#10b981","#ef4444",
    "#3b82f6","#8b5cf6","#ec4899","#14b8a6",
]

VALID_RANGES = {"1D","1W","1M","3M","1Y","5Y"}


def _validate_ticker(ticker: str) -> str:
    cleaned = ticker.upper().strip()
    if not cleaned or len(cleaned) > 10 or not cleaned.replace(".", "").isalnum():
        raise HTTPException(status_code=422, detail=f"Invalid ticker: {ticker}")
    return cleaned


# ─── Quote ───────────────────────────────────────────────────────────────────

@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def get_quote(ticker: str):
    ticker = _validate_ticker(ticker)
    try:
        return await fh.get_quote(ticker)
    except Exception as e:
        logger.error(f"Quote fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch quote")


# ─── Candles ─────────────────────────────────────────────────────────────────

@router.get("/candles/{ticker}", response_model=CandlesResponse)
async def get_candles(
    ticker: str,
    range: Annotated[str, Query()] = "1M",
):
    ticker = _validate_ticker(ticker)
    if range not in VALID_RANGES:
        raise HTTPException(status_code=422, detail=f"Invalid range. Must be one of: {VALID_RANGES}")
    try:
        return await fh.get_candles(ticker, range)
    except Exception as e:
        logger.error(f"Candles fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch candles")


# ─── Symbol Search ───────────────────────────────────────────────────────────

@router.get("/search", response_model=SearchResponse)
async def search_symbols(q: Annotated[str, Query(min_length=1, max_length=50)]):
    try:
        results = await fh.search_symbols(q)
        return SearchResponse(query=q, results=results)
    except Exception as e:
        logger.error(f"Search failed for '{q}': {e}")
        raise HTTPException(status_code=502, detail="Search unavailable")


# ─── News ─────────────────────────────────────────────────────────────────────

@router.get("/news/{ticker}", response_model=NewsResponse)
async def get_news(ticker: str, days: Annotated[int, Query(ge=1, le=30)] = 7):
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
    ticker = _validate_ticker(ticker)
    try:
        return await fh.get_company_profile(ticker)
    except Exception as e:
        logger.error(f"Profile fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch profile")


# ─── Financials ───────────────────────────────────────────────────────────────

@router.get("/financials/{ticker}", response_model=BasicFinancialsResponse)
async def get_financials(ticker: str):
    ticker = _validate_ticker(ticker)
    try:
        data = await fh.get_basic_financials(ticker)
        return BasicFinancialsResponse(**data)
    except Exception as e:
        logger.error(f"Financials fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch financials")


# ─── Compare ─────────────────────────────────────────────────────────────────

@router.get("/compare", response_model=CompareResponse)
async def compare_stocks(
    tickers: Annotated[str, Query()],
    range: Annotated[str, Query()] = "3M",
):
    if range not in VALID_RANGES:
        raise HTTPException(status_code=422, detail=f"Invalid range")

    ticker_list = [_validate_ticker(t.strip()) for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(status_code=422, detail="At least one ticker required")
    if len(ticker_list) > 8:
        raise HTTPException(status_code=422, detail="Maximum 8 tickers")

    # Fetch all candles in parallel
    candle_results = await asyncio.gather(
        *[fh.get_candles(t, range) for t in ticker_list],
        return_exceptions=True,
    )

    series_list: list[CompareSeriesItem] = []
    for i, (ticker, result) in enumerate(zip(ticker_list, candle_results)):
        if isinstance(result, Exception):
            logger.warning(f"Compare: failed for {ticker}: {result}")
            continue
        candles = result.get("candles", [])
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

    return CompareResponse(tickers=[s.ticker for s in series_list], range=range, series=series_list)


# ─── Market Overview — parallelized ──────────────────────────────────────────

@router.get("/market/overview", response_model=MarketOverviewResponse)
async def get_market_overview():
    key = market_overview_key()
    cached = await cache_get(key)
    if cached:
        return cached

    # Fetch all quotes AND profiles in parallel — not sequentially
    quote_tasks   = [fh.get_quote(t) for t in SP500_TOP30]
    profile_tasks = [fh.get_company_profile(t) for t in SP500_TOP30]

    quotes, profiles = await asyncio.gather(
        asyncio.gather(*quote_tasks,   return_exceptions=True),
        asyncio.gather(*profile_tasks, return_exceptions=True),
    )

    items = []
    for ticker, quote, profile in zip(SP500_TOP30, quotes, profiles):
        q = quote   if not isinstance(quote,   Exception) else {}
        p = profile if not isinstance(profile, Exception) else {}
        items.append(MarketOverviewItem(
            ticker=ticker,
            company_name=p.get("company_name"),
            sector=p.get("sector"),
            price=q.get("price"),
            change=q.get("change"),
            change_pct=q.get("change_pct"),
            volume=None,
            market_cap=p.get("market_cap"),
        ))

    result = MarketOverviewResponse(
        items=items,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    await cache_set(key, result.model_dump(), ttl=settings.cache_ttl_market_overview)
    return result
