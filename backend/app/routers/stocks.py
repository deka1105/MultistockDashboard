import asyncio
import logging
from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services import finnhub as fh
from app.services.finnhub import USE_MOCK
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
limiter = Limiter(key_func=get_remote_address)

# ─── S&P 500 top 50 ───────────────────────────────────────────────────────────

# Derive the market overview ticker list from the comprehensive TICKER_DB
# Excludes ETFs for the market overview (keep it to individual stocks)
from app.services.mock_data import TICKER_DB as _TICKER_DB, _TICKER_INDEX as _TICKER_IDX

# Full stock universe (non-ETF) for market overview
from app.services.mock_data import TICKER_DB as _TICKER_DB

# Full stock universe (non-ETF) for market overview — 198 stocks
SP500_TOP50 = [t["ticker"] for t in _TICKER_DB if t["type"] == "Common Stock"]

# Compact alias for correlation heatmaps
SP50 = [
    "AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","JPM","V","UNH",
    "XOM","MA","AVGO","JNJ","PG","HD","MRK","COST","ABBV","CVX",
    "KO","PEP","WMT","BAC","CRM","NFLX","AMD","ORCL","CSCO","ACN",
    "MCD","NKE","ADBE","TMO","ABT","TXN","NEE","PM","RTX","QCOM",
    "HON","LIN","IBM","GS","CAT","AMGN","SBUX","INTU","LOW","DE",
]
# Preserve backward compat alias used in correlation heatmaps
SP50 = SP500_TOP50[:50]

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
@limiter.limit("120/minute")
async def get_quote(request: Request, ticker: str):
    ticker = _validate_ticker(ticker)
    try:
        return await fh.get_quote(ticker)
    except Exception as e:
        logger.error(f"Quote fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch quote")


# ─── Candles ─────────────────────────────────────────────────────────────────

@router.get("/candles/{ticker}", response_model=CandlesResponse)
@limiter.limit("60/minute")
async def get_candles(request: Request, ticker: str, range: Annotated[str, Query()] = "1M"):
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
@limiter.limit("30/minute")
async def search_symbols(request: Request, q: Annotated[str, Query(min_length=1, max_length=50)]):
    try:
        results = await fh.search_symbols(q)
        return SearchResponse(query=q, results=results)
    except Exception as e:
        logger.error(f"Search failed for '{q}': {e}")
        raise HTTPException(status_code=502, detail="Search unavailable")


# ─── News ─────────────────────────────────────────────────────────────────────

@router.get("/news/{ticker}", response_model=NewsResponse)
@limiter.limit("30/minute")
async def get_news(request: Request, ticker: str, days: Annotated[int, Query(ge=1, le=30)] = 7):
    ticker = _validate_ticker(ticker)
    try:
        articles = await fh.get_company_news(ticker, days_back=days)
        return NewsResponse(ticker=ticker, articles=articles)
    except Exception as e:
        logger.error(f"News fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch news")


# ─── Company Profile ──────────────────────────────────────────────────────────

@router.get("/profile/{ticker}", response_model=CompanyProfileResponse)
@limiter.limit("30/minute")
async def get_profile(request: Request, ticker: str):
    ticker = _validate_ticker(ticker)
    try:
        return await fh.get_company_profile(ticker)
    except Exception as e:
        logger.error(f"Profile fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch profile")


# ─── Financials ───────────────────────────────────────────────────────────────

@router.get("/financials/{ticker}", response_model=BasicFinancialsResponse)
@limiter.limit("30/minute")
async def get_financials(request: Request, ticker: str):
    ticker = _validate_ticker(ticker)
    try:
        data = await fh.get_basic_financials(ticker)
        return BasicFinancialsResponse(**data)
    except Exception as e:
        logger.error(f"Financials fetch failed for {ticker}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch financials")


# ─── Compare ─────────────────────────────────────────────────────────────────

@router.get("/compare", response_model=CompareResponse)
@limiter.limit("20/minute")
async def compare_stocks(
    request: Request,
    tickers: Annotated[str, Query()],
    range: Annotated[str, Query()] = "3M",
):
    if range not in VALID_RANGES:
        raise HTTPException(status_code=422, detail="Invalid range")

    ticker_list = [_validate_ticker(t.strip()) for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(status_code=422, detail="At least one ticker required")
    if len(ticker_list) > 8:
        raise HTTPException(status_code=422, detail="Maximum 8 tickers")

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
        end_price   = candles[-1]["close"]
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

    return CompareResponse(
        tickers=[s.ticker for s in series_list],
        range=range,
        series=series_list,
    )


# ─── Market Overview ─────────────────────────────────────────────────────────

@router.get("/market/overview", response_model=MarketOverviewResponse)
@limiter.limit("100/minute")
async def get_market_overview(request: Request):
    key = market_overview_key()
    cached = await cache_get(key)
    if cached:
        return cached

    quote_tasks   = [fh.get_quote(t)           for t in SP500_TOP50]
    profile_tasks = [fh.get_company_profile(t)  for t in SP500_TOP50]
    candle_tasks  = [fh.get_candles(t, "1D")    for t in SP500_TOP50]

    quotes, profiles, day_candles = await asyncio.gather(
        asyncio.gather(*quote_tasks,   return_exceptions=True),
        asyncio.gather(*profile_tasks, return_exceptions=True),
        asyncio.gather(*candle_tasks,  return_exceptions=True),
    )

    items = []
    for ticker, quote, profile, candles_resp in zip(SP500_TOP50, quotes, profiles, day_candles):
        q = quote   if not isinstance(quote,   Exception) else {}
        p = profile if not isinstance(profile, Exception) else {}
        c = candles_resp if not isinstance(candles_resp, Exception) else {}

        # Volume from most recent candle
        candle_list = c.get("candles", []) if isinstance(c, dict) else []
        volume = candle_list[-1]["volume"] if candle_list else None

        items.append(MarketOverviewItem(
            ticker=ticker,
            company_name=p.get("company_name"),
            sector=p.get("sector"),
            price=q.get("price"),
            change=q.get("change"),
            change_pct=q.get("change_pct"),
            volume=volume,
            market_cap=p.get("market_cap"),
        ))

    result = MarketOverviewResponse(
        items=items,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    await cache_set(key, result.model_dump(), ttl=settings.cache_ttl_market_overview)
    return result


@router.get("/options/{ticker}")
async def get_options_chain(
    ticker: str,
    request: Request,
):
    """
    Options chain for a ticker. Returns strikes × expiries grid
    with call/put OI, volume, IV and put/call ratio per expiry.
    Falls back to deterministic mock data when Finnhub key is absent.
    """
    ticker = ticker.upper()
    cache_key = f"options:{ticker}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    if USE_MOCK:
        try:
            quote = await fh.get_quote(ticker)
            price = quote.get("price")
        except Exception:
            price = None
        from app.services.mock_data import get_mock_options_chain
        data = get_mock_options_chain(ticker, price)
        await cache_set(cache_key, data, ttl=300)
        return data

    try:
        from datetime import date, timedelta
        exp_date = (date.today() + timedelta(days=30)).isoformat()
        raw = await fh.client.get("/stock/option-chain", params={"symbol": ticker, "expiration": exp_date})
        raw.raise_for_status()
        payload = raw.json()
        await cache_set(cache_key, payload, ttl=300)
        return payload
    except Exception:
        from app.services.mock_data import get_mock_options_chain
        data = get_mock_options_chain(ticker)
        await cache_set(cache_key, data, ttl=300)
        return data


@router.get("/institutional/{ticker}")
async def get_institutional_ownership(ticker: str):
    """
    Institutional ownership summary + top holders + insider transactions.
    Serves deterministic mock data when FINNHUB_API_KEY is absent.
    """
    ticker = ticker.upper()
    cache_key = f"institutional:{ticker}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    from app.services.mock_data import get_mock_institutional
    data = get_mock_institutional(ticker)
    await cache_set(cache_key, data, ttl=3600 * 4)
    return data


@router.get("/insider/{ticker}")
async def get_insider_transactions(ticker: str):
    """
    Insider buy/sell transactions for the last 12 months.
    Falls back to deterministic mock.
    """
    ticker = ticker.upper()
    cache_key = f"insider:{ticker}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    if not USE_MOCK:
        try:
            raw = await fh.client.get("/stock/insider-transactions", params={"symbol": ticker})
            raw.raise_for_status()
            payload = raw.json()
            await cache_set(cache_key, payload, ttl=3600 * 4)
            return payload
        except Exception:
            pass

    from app.services.mock_data import get_mock_insider_transactions
    data = get_mock_insider_transactions(ticker)
    await cache_set(cache_key, data, ttl=3600 * 4)
    return data
