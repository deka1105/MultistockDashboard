"""
Earnings router — earnings calendar and per-ticker EPS history.

Uses Finnhub /calendar/earnings when API key is set.
Falls back to deterministic mock data in offline/test mode.
"""
import asyncio
import logging
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.cache import cache_get, cache_set
from app.services.finnhub import USE_MOCK, settings
import httpx

logger = logging.getLogger(__name__)
router  = APIRouter(prefix="/earnings", tags=["earnings"])
limiter = Limiter(key_func=get_remote_address)

CACHE_TTL = 3600  # 1 hour

# Deterministic mock earnings schedule — same tickers as SP500_TOP50
MOCK_EARNINGS = [
    ("AAPL",  2,  "post", 1.58, 1.62, "beat"),
    ("MSFT",  5,  "post", 2.91, 2.94, "beat"),
    ("NVDA",  8,  "pre",  5.12, 5.98, "beat"),
    ("AMZN",  2,  "post", 0.82, 0.98, "beat"),
    ("META",  15, "post", 4.34, 4.71, "beat"),
    ("GOOGL", 23, "post", 1.92, 1.89, "miss"),
    ("TSLA",  17, "post", 0.43, 0.45, "beat"),
    ("JPM",   10, "pre",  4.10, 4.44, "beat"),
    ("JNJ",   14, "pre",  2.61, 2.57, "miss"),
    ("V",     19, "post", 2.43, 2.51, "beat"),
    ("WMT",   12, "pre",  0.52, 0.56, "beat"),
    ("KO",    21, "pre",  0.71, 0.72, "beat"),
    ("PG",    26, "pre",  1.53, 1.55, "beat"),
    ("AMD",   4,  "post", 0.36, 0.62, "beat"),
    ("NFLX",  16, "post", 4.49, 5.28, "beat"),
    ("CRM",   22, "post", 1.85, 2.09, "beat"),
    ("ADBE",  27, "post", 4.01, 4.48, "beat"),
]

QUARTER_HISTORY = {
    "AAPL":  [(1.43,1.46),(1.26,1.29),(1.40,1.52),(1.52,1.53),(1.29,1.40),(1.33,1.36),(1.58,1.62)],
    "MSFT":  [(2.48,2.69),(2.60,2.73),(2.79,2.93),(2.89,2.94),(2.72,2.85),(2.87,2.93),(2.91,2.94)],
    "NVDA":  [(1.74,4.42),(4.05,5.16),(4.59,6.22),(4.76,5.98),(3.84,4.44),(4.31,5.12),(5.12,5.98)],
    "TSLA":  [(0.73,0.85),(0.67,0.71),(0.52,0.66),(0.55,0.73),(0.47,0.45),(0.41,0.43),(0.43,0.45)],
    "META":  [(3.72,4.39),(3.64,4.71),(4.24,4.50),(4.19,4.71),(4.14,4.71),(4.34,4.71),(4.34,4.71)],
}

def _mock_quarter_history(ticker: str) -> list[dict]:
    rng     = random.Random(hash(ticker) % 9999)
    history = QUARTER_HISTORY.get(ticker.upper())
    quarters = []
    base_date = datetime.now(timezone.utc) - timedelta(days=700)

    if not history:
        # Generate plausible history
        base_eps = rng.uniform(0.5, 5.0)
        history = []
        for i in range(7):
            est = round(base_eps * (1 + i * 0.05), 2)
            act = round(est * rng.uniform(0.9, 1.2), 2)
            history.append((est, act))

    for i, (estimate, actual) in enumerate(history):
        qdate = base_date + timedelta(days=i * 91)
        surprise = round((actual - estimate) / abs(estimate) * 100, 2) if estimate else 0
        quarters.append({
            "quarter":          f"Q{(i % 4) + 1} {qdate.year}",
            "report_date":      qdate.strftime("%Y-%m-%d"),
            "eps_estimate":     estimate,
            "eps_actual":       actual,
            "surprise_pct":     surprise,
            "beat_miss":        "beat" if actual >= estimate else "miss",
            "time_of_day":      rng.choice(["pre", "post"]),
        })
    return quarters[-8:]  # last 8 quarters


def _mock_upcoming_earnings() -> list[dict]:
    today = datetime.now(timezone.utc)
    events = []
    for ticker, day_offset, time_of_day, estimate, actual, beat_miss in MOCK_EARNINGS:
        rd = today + timedelta(days=day_offset)
        is_past = rd < today
        events.append({
            "ticker":       ticker,
            "report_date":  rd.strftime("%Y-%m-%d"),
            "time_of_day":  time_of_day,
            "eps_estimate": estimate,
            "eps_actual":   actual if is_past else None,
            "beat_miss":    beat_miss if is_past else None,
            "surprise_pct": round((actual - estimate) / abs(estimate) * 100, 2) if is_past else None,
        })
    return sorted(events, key=lambda e: e["report_date"])


# ─── Calendar endpoint ────────────────────────────────────────────────────────

@router.get("/calendar")
@limiter.limit("20/minute")
async def get_earnings_calendar(request: Request, days: int = 30):
    """
    Returns upcoming earnings events for the next `days` days.
    Uses Finnhub /calendar/earnings when API key is set; mock otherwise.
    """
    days = min(max(days, 1), 90)
    key  = f"earnings:calendar:{days}"
    cached = await cache_get(key)
    if cached:
        return cached

    events = await _fetch_calendar(days)
    result = {"events": events, "count": len(events)}
    await cache_set(key, result, ttl=CACHE_TTL)
    return result


async def _fetch_calendar(days: int) -> list[dict]:
    if USE_MOCK:
        return _mock_upcoming_earnings()

    try:
        from_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        to_date   = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")
        url       = f"{settings.finnhub_base_url}/calendar/earnings"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params={
                "from": from_date, "to": to_date,
                "token": settings.finnhub_api_key,
            })
        if resp.status_code == 200:
            raw = resp.json().get("earningsCalendar", [])
            return [
                {
                    "ticker":       e.get("symbol"),
                    "report_date":  e.get("date"),
                    "time_of_day":  e.get("hour", "").lower()[:4] or None,
                    "eps_estimate": e.get("epsEstimate"),
                    "eps_actual":   e.get("epsActual"),
                    "beat_miss":    None,
                    "surprise_pct": None,
                }
                for e in raw if e.get("symbol")
            ]
    except Exception as exc:
        logger.warning(f"Finnhub calendar fetch failed: {exc}")

    return _mock_upcoming_earnings()


# ─── Per-ticker earnings history ─────────────────────────────────────────────

@router.get("/{ticker}/history")
@limiter.limit("30/minute")
async def get_earnings_history(request: Request, ticker: str):
    """
    Returns last 8 quarters of EPS estimate vs actual for the dashboard card.
    """
    ticker = ticker.upper().strip()[:10]
    key    = f"earnings:history:{ticker}"
    cached = await cache_get(key)
    if cached:
        return cached

    quarters = await _fetch_history(ticker)
    result = {"ticker": ticker, "quarters": quarters}
    await cache_set(key, result, ttl=CACHE_TTL)
    return result


async def _fetch_history(ticker: str) -> list[dict]:
    if USE_MOCK:
        return _mock_quarter_history(ticker)

    try:
        end_date   = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=730)  # 2 years
        url        = f"{settings.finnhub_base_url}/stock/earnings"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params={
                "symbol": ticker,
                "token":  settings.finnhub_api_key,
            })
        if resp.status_code == 200:
            raw = resp.json()
            quarters = []
            for e in raw[-8:]:  # last 8 quarters
                est = e.get("estimate")
                act = e.get("actual")
                surprise = round((act - est) / abs(est) * 100, 2) if est and act else None
                quarters.append({
                    "quarter":      e.get("period", ""),
                    "report_date":  e.get("period", ""),
                    "eps_estimate": est,
                    "eps_actual":   act,
                    "surprise_pct": surprise,
                    "beat_miss":    ("beat" if act >= est else "miss") if est and act else None,
                    "time_of_day":  None,
                })
            return quarters
    except Exception as exc:
        logger.warning(f"Finnhub earnings history failed for {ticker}: {exc}")

    return _mock_quarter_history(ticker)
