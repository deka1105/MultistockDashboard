"""
yfinance_service.py — Free real-time market data via yfinance.

Used when FINNHUB_API_KEY is not set. yfinance wraps Yahoo Finance:
  - Quotes are 15-min delayed on the free tier (real-time during market hours
    for some data points via fast_info)
  - Historical candles are end-of-day only (sufficient for charting)
  - No API key required
  - Any ticker symbol works (not limited to SP500)

Falls back to mock_data if yfinance itself fails (e.g. unknown ticker).
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Dedicated, SMALL thread pool for yfinance calls. yfinance is blocking and its
# heavy calls (t.info) use a lot of transient memory while scraping. On a 512MB
# free instance, a bulk endpoint fetching ~200 tickers at once (market overview /
# screener) spawns hundreds of concurrent scrapes → OOM → the whole process is
# killed → every endpoint 502s. Capping running threads here HARD-bounds peak
# memory (a plain asyncio.Semaphore wouldn't — timed-out calls keep their thread).
_YF_POOL = ThreadPoolExecutor(max_workers=6, thread_name_prefix="yf")

# Candle range → yfinance period/interval mapping
_RANGE_MAP = {
    "1D": ("1d",  "5m"),
    "1W": ("5d",  "30m"),
    "1M": ("1mo", "1d"),
    "3M": ("3mo", "1d"),
    "1Y": ("1y",  "1d"),
    "5Y": ("5y",  "1wk"),
}

# A hung/throttled yfinance call must NEVER tie up a worker. Yahoo aggressively
# rate-limits requests from datacenter IPs (e.g. Render), and a throttled call
# blocks indefinitely — which stalls the uvicorn worker and, in bulk endpoints
# (market overview / screener / compare), takes the whole service down with 502s.
# So every network fetch is bounded by a timeout and degrades to mock data.
YF_TIMEOUT = 8.0


async def _yf_or_mock(fetch, fallback, what: str):
    """Run a blocking yfinance fetch in a worker thread, bounded by YF_TIMEOUT.
    On timeout OR any error, fall back to mock data so a slow/throttled Yahoo can
    never hang the request or saturate the worker pool."""
    try:
        return await asyncio.wait_for(asyncio.to_thread(fetch), timeout=YF_TIMEOUT)
    except Exception as e:
        logger.warning(f"yfinance {what} unavailable ({type(e).__name__}: {e}); using mock")
        return fallback()


async def yf_get_quote(ticker: str) -> dict[str, Any]:
    """
    Fetch live quote via yfinance.
    Returns the same shape as finnhub.get_quote().

    yfinance is a synchronous, network-bound library. Run it in a worker
    thread via asyncio.to_thread so it never blocks the event loop (and with
    it every other concurrent request).
    """
    def _fetch() -> dict[str, Any]:
        import yfinance as yf
        t = yf.Ticker(ticker.upper())

        # fast_info avoids heavy scraping
        fi = t.fast_info
        price      = fi.last_price
        prev_close = fi.previous_close or price
        change     = round(price - prev_close, 4) if price and prev_close else 0.0
        change_pct = round((change / prev_close) * 100, 4) if prev_close else 0.0

        return {
            "ticker":     ticker.upper(),
            "price":      round(float(price), 2) if price else None,
            "change":     round(float(change), 4),
            "change_pct": round(float(change_pct), 4),
            "open":       round(float(fi.open), 2) if fi.open else None,
            "high":       round(float(fi.day_high), 2) if fi.day_high else None,
            "low":        round(float(fi.day_low), 2) if fi.day_low else None,
            "prev_close": round(float(prev_close), 2) if prev_close else None,
            "volume":     int(fi.three_month_average_volume or 0),
            "timestamp":  int(datetime.now(timezone.utc).timestamp()),
        }

    from app.services.mock_data import get_mock_quote
    return await _yf_or_mock(_fetch, lambda: get_mock_quote(ticker), f"quote {ticker}")


async def yf_get_candles(ticker: str, range_key: str = "1M") -> dict[str, Any]:
    """
    Fetch OHLCV candles via yfinance.
    Returns the same shape as finnhub.get_candles().
    """
    def _fetch() -> dict[str, Any]:
        import yfinance as yf
        period, interval = _RANGE_MAP.get(range_key, ("1mo", "1d"))
        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period, interval=interval, auto_adjust=True, timeout=YF_TIMEOUT)

        if hist.empty:
            raise ValueError("Empty history")

        candles = []
        for ts, row in hist.iterrows():
            # ts is a pandas Timestamp. Match the CandlePoint schema exactly
            # (date + timestamp) — the old "time"-only shape, plus a missing
            # top-level "resolution", failed CandlesResponse validation → 500.
            epoch = int(ts.timestamp())
            candles.append({
                "date":      ts.isoformat(),
                "timestamp": epoch,
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),    4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row.get("Volume", 0)),
            })

        return {"ticker": ticker.upper(), "range": range_key, "resolution": interval, "candles": candles}

    from app.services.mock_data import get_mock_candles
    return await _yf_or_mock(_fetch, lambda: get_mock_candles(ticker, range_key), f"candles {ticker}")


async def yf_search_symbols(query: str) -> list[dict]:
    """
    Search symbols using our comprehensive 200+ ticker database.
    Also attempts yfinance ticker lookup for direct symbol matches.
    """
    from app.services.mock_data import get_mock_search
    results = get_mock_search(query)

    # If query looks like an exact ticker and isn't in our DB, try yfinance directly
    if query.strip().upper() == query.strip() and len(query.strip()) <= 6 and not results:
        def _lookup() -> list[dict]:
            import yfinance as yf
            symbol = query.strip().upper()
            t = yf.Ticker(symbol)
            info = t.fast_info
            if info.last_price:
                meta = t.info
                return [{
                    "ticker":      symbol,
                    "symbol":      symbol,
                    "description": meta.get("longName", query.upper()),
                    "name":        meta.get("longName", query.upper()),
                    "type":        "Common Stock",
                    "exchange":    meta.get("exchange", ""),
                    "sector":      meta.get("sector", ""),
                }]
            return []

        try:
            results = await asyncio.to_thread(_lookup)
        except Exception:
            pass
    return results


async def yf_get_company_profile(ticker: str) -> dict[str, Any]:
    """Fetch company profile via yfinance."""
    def _fetch() -> dict[str, Any]:
        import yfinance as yf
        t    = yf.Ticker(ticker.upper())
        info = t.info  # this call can be slow

        # yfinance reports marketCap in absolute currency units; Finnhub and the
        # mock source report it in millions, which is the contract the frontend
        # formatMarketCap() assumes. Normalise to millions here.
        mc = info.get("marketCap")

        return {
            "ticker":       ticker.upper(),
            "company_name": info.get("longName") or info.get("shortName") or f"{ticker} Corp",
            "sector":       info.get("sector", "Technology"),
            "market_cap":   round(mc / 1_000_000, 2) if mc else None,
            "logo_url":     info.get("logo_url"),
            "exchange":     info.get("exchange", "NASDAQ"),
            "ipo_date":     None,
            "website":      info.get("website"),
            "country":      info.get("country", "US"),
            "currency":     info.get("currency", "USD"),
        }

    from app.services.mock_data import get_mock_profile
    return await _yf_or_mock(_fetch, lambda: get_mock_profile(ticker), f"profile {ticker}")


async def yf_get_basic_financials(ticker: str) -> dict[str, Any]:
    """Fetch key financial metrics via yfinance."""
    def _fetch() -> dict[str, Any]:
        import yfinance as yf
        t    = yf.Ticker(ticker.upper())
        info = t.info

        # Normalise marketCap to millions to match Finnhub/mock (see yf_get_company_profile).
        mc = info.get("marketCap")

        return {
            "ticker":            ticker.upper(),
            "52_week_high":      info.get("fiftyTwoWeekHigh"),
            "52_week_low":       info.get("fiftyTwoWeekLow"),
            "beta":              info.get("beta"),
            "pe_ratio":          info.get("trailingPE"),
            "eps":               info.get("trailingEps"),
            "revenue_per_share": info.get("revenuePerShare"),
            "dividend_yield":    round((info.get("dividendYield") or 0) * 100, 2),
            "market_cap":        round(mc / 1_000_000, 2) if mc else None,
        }

    from app.services.mock_data import get_mock_financials
    return await _yf_or_mock(_fetch, lambda: get_mock_financials(ticker), f"financials {ticker}")


async def yf_get_news(ticker: str) -> list[dict]:
    """
    yfinance news returns limited metadata.
    Use mock news (real URLs) for a better UX.
    """
    from app.services.mock_data import get_mock_news
    return get_mock_news(ticker)
