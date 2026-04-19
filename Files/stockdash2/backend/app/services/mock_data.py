"""
Mock data fallback for development/offline mode.
Used automatically when FINNHUB_API_KEY is empty or APP_ENV=test.

Usage in services:
    from app.services.mock_data import get_mock_quote, get_mock_candles
"""
import random
import math
from datetime import datetime, timezone, timedelta


def get_mock_quote(ticker: str) -> dict:
    """Generate a realistic-looking mock quote."""
    base_prices = {
        "AAPL": 189.50, "MSFT": 415.20, "NVDA": 875.30, "AMZN": 188.90,
        "GOOGL": 175.40, "META": 512.60, "TSLA": 177.80, "JPM": 198.30,
    }
    price = base_prices.get(ticker.upper(), round(random.uniform(50, 500), 2))
    change = round(random.uniform(-8, 8), 2)
    return {
        "ticker": ticker.upper(),
        "price": price,
        "change": change,
        "change_pct": round((change / price) * 100, 2),
        "high": round(price + random.uniform(0, 5), 2),
        "low": round(price - random.uniform(0, 5), 2),
        "open": round(price - change + random.uniform(-1, 1), 2),
        "prev_close": round(price - change, 2),
        "timestamp": int(datetime.now(timezone.utc).timestamp()),
    }


def get_mock_candles(ticker: str, range_key: str = "1M") -> dict:
    """Generate a realistic mock OHLCV series using a random walk."""
    range_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "5Y": 1825}
    days = range_days.get(range_key, 30)

    base_prices = {
        "AAPL": 189.50, "MSFT": 415.20, "NVDA": 875.30, "TSLA": 177.80,
    }
    start_price = base_prices.get(ticker.upper(), 150.0)

    candles = []
    price = start_price * 0.85  # start below current for upward trend feel
    now = datetime.now(timezone.utc)
    interval_hours = 24 if days > 7 else 1

    steps = min(days * (24 // interval_hours), 500)  # cap points

    for i in range(steps):
        ts = now - timedelta(hours=(steps - i) * interval_hours)
        drift = 0.0003  # slight upward bias
        volatility = 0.015
        change_pct = drift + volatility * random.gauss(0, 1)
        price = max(price * (1 + change_pct), 1.0)

        open_ = round(price * (1 + random.uniform(-0.005, 0.005)), 2)
        high = round(price * (1 + random.uniform(0, 0.01)), 2)
        low = round(price * (1 - random.uniform(0, 0.01)), 2)
        close = round(price, 2)
        volume = random.randint(500_000, 80_000_000)

        candles.append({
            "date": ts.isoformat(),
            "timestamp": int(ts.timestamp()),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        })

    return {
        "ticker": ticker.upper(),
        "range": range_key,
        "resolution": "D" if days > 7 else "60",
        "candles": candles,
    }


def get_mock_search(query: str) -> list[dict]:
    all_symbols = [
        {"ticker": "AAPL", "description": "Apple Inc", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "AMZN", "description": "Amazon.com Inc", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "GOOGL", "description": "Alphabet Inc Class A", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "META", "description": "Meta Platforms Inc", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "MSFT", "description": "Microsoft Corporation", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "NVDA", "description": "NVIDIA Corporation", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "TSLA", "description": "Tesla Inc", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "JPM", "description": "JPMorgan Chase & Co", "type": "Common Stock", "exchange": "NYSE"},
        {"ticker": "AMD", "description": "Advanced Micro Devices", "type": "Common Stock", "exchange": "NASDAQ"},
        {"ticker": "NFLX", "description": "Netflix Inc", "type": "Common Stock", "exchange": "NASDAQ"},
    ]
    q = query.upper()
    return [
        s for s in all_symbols
        if q in s["ticker"] or q in s["description"].upper()
    ][:5]


def get_mock_news(ticker: str) -> list[dict]:
    sources = ["Reuters", "Bloomberg", "CNBC", "MarketWatch", "WSJ"]
    sentiments = ["positive", "neutral", "negative"]
    headlines = [
        f"{ticker} beats earnings expectations for Q4",
        f"Analysts raise price target on {ticker}",
        f"{ticker} announces new product line amid market uncertainty",
        f"Institutional investors increase stake in {ticker}",
        f"{ticker} faces regulatory scrutiny in key markets",
    ]
    now = datetime.now(timezone.utc)
    return [
        {
            "id": i + 1,
            "headline": headlines[i % len(headlines)],
            "summary": f"Detailed coverage of {ticker} recent developments and market impact.",
            "source": sources[i % len(sources)],
            "url": f"https://example.com/news/{ticker.lower()}-{i}",
            "image": None,
            "sentiment": sentiments[i % len(sentiments)],
            "published_at": (now - timedelta(hours=i * 4)).isoformat(),
        }
        for i in range(5)
    ]
