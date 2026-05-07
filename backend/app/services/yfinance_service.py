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
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Candle range → yfinance period/interval mapping
_RANGE_MAP = {
    "1D": ("1d",  "5m"),
    "1W": ("5d",  "30m"),
    "1M": ("1mo", "1d"),
    "3M": ("3mo", "1d"),
    "1Y": ("1y",  "1d"),
    "5Y": ("5y",  "1wk"),
}


def _run_sync(coro):
    """Run async call in a thread-safe way from sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result(timeout=10)
        return loop.run_until_complete(coro)
    except Exception:
        return None


async def yf_get_quote(ticker: str) -> dict[str, Any]:
    """
    Fetch live quote via yfinance.
    Returns the same shape as finnhub.get_quote().
    """
    try:
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
    except Exception as e:
        logger.warning(f"yfinance quote failed for {ticker}: {e}")
        from app.services.mock_data import get_mock_quote
        return get_mock_quote(ticker)


async def yf_get_candles(ticker: str, range_key: str = "1M") -> dict[str, Any]:
    """
    Fetch OHLCV candles via yfinance.
    Returns the same shape as finnhub.get_candles().
    """
    try:
        import yfinance as yf
        period, interval = _RANGE_MAP.get(range_key, ("1mo", "1d"))
        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period, interval=interval, auto_adjust=True)

        if hist.empty:
            raise ValueError("Empty history")

        candles = []
        for ts, row in hist.iterrows():
            # ts is a pandas Timestamp
            epoch = int(ts.timestamp())
            candles.append({
                "time":   epoch,
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),    4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row.get("Volume", 0)),
            })

        return {"ticker": ticker.upper(), "range": range_key, "candles": candles}
    except Exception as e:
        logger.warning(f"yfinance candles failed for {ticker}: {e}")
        from app.services.mock_data import get_mock_candles
        return get_mock_candles(ticker, range_key)


async def yf_search_symbols(query: str) -> list[dict]:
    """
    Search symbols using the TICKER_DB (yfinance has no search API).
    Falls back to our comprehensive 218-ticker search database.
    """
    from app.services.mock_data import get_mock_search
    return get_mock_search(query)


async def yf_get_company_profile(ticker: str) -> dict[str, Any]:
    """Fetch company profile via yfinance."""
    try:
        import yfinance as yf
        t    = yf.Ticker(ticker.upper())
        info = t.info  # this call can be slow

        return {
            "ticker":       ticker.upper(),
            "company_name": info.get("longName") or info.get("shortName") or f"{ticker} Corp",
            "sector":       info.get("sector", "Technology"),
            "market_cap":   info.get("marketCap"),
            "logo_url":     info.get("logo_url"),
            "exchange":     info.get("exchange", "NASDAQ"),
            "ipo_date":     None,
            "website":      info.get("website"),
            "country":      info.get("country", "US"),
            "currency":     info.get("currency", "USD"),
        }
    except Exception as e:
        logger.warning(f"yfinance profile failed for {ticker}: {e}")
        from app.services.mock_data import get_mock_profile
        return get_mock_profile(ticker)


async def yf_get_basic_financials(ticker: str) -> dict[str, Any]:
    """Fetch key financial metrics via yfinance."""
    try:
        import yfinance as yf
        t    = yf.Ticker(ticker.upper())
        info = t.info

        return {
            "ticker":            ticker.upper(),
            "52_week_high":      info.get("fiftyTwoWeekHigh"),
            "52_week_low":       info.get("fiftyTwoWeekLow"),
            "beta":              info.get("beta"),
            "pe_ratio":          info.get("trailingPE"),
            "eps":               info.get("trailingEps"),
            "revenue_per_share": info.get("revenuePerShare"),
            "dividend_yield":    round((info.get("dividendYield") or 0) * 100, 2),
            "market_cap":        info.get("marketCap"),
        }
    except Exception as e:
        logger.warning(f"yfinance financials failed for {ticker}: {e}")
        from app.services.mock_data import get_mock_financials
        return get_mock_financials(ticker)


async def yf_get_news(ticker: str) -> list[dict]:
    """
    yfinance news returns limited metadata.
    Use mock news (real URLs) for a better UX.
    """
    from app.services.mock_data import get_mock_news
    return get_mock_news(ticker)
