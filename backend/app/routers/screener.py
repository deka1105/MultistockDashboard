"""
Screener router — filter S&P 50 stocks by fundamentals and technicals.

Strategy:
- Pull market overview data (quotes + profiles) from cache (already warm from Celery)
- Pull financials per ticker in parallel
- Compute RSI from 3M candles and cache result (5min TTL)
- Apply filter predicates server-side
- Return paginated, sorted results
"""
import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.cache import cache_get, cache_set
from app.routers.stocks import SP500_TOP50
from app.services import finnhub as fh

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/screener", tags=["screener"])
limiter = Limiter(key_func=get_remote_address)

RSI_CACHE_TTL = 300   # 5 min
RSI_PERIOD    = 14


# ─── RSI calculation (Python port of frontend logic) ─────────────────────────

def _calc_rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    avg_gain, avg_loss = 0.0, 0.0
    for i in range(1, period + 1):
        delta = closes[i] - closes[i - 1]
        if delta > 0: avg_gain += delta
        else:         avg_loss += abs(delta)
    avg_gain /= period
    avg_loss /= period
    for i in range(period + 1, len(closes)):
        delta = closes[i] - closes[i - 1]
        gain  = delta if delta > 0 else 0.0
        loss  = abs(delta) if delta < 0 else 0.0
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - 100 / (1 + rs), 2)


async def _get_rsi_for_ticker(ticker: str) -> float | None:
    """Returns cached RSI or computes from 3M candles."""
    key = f"screener:rsi:{ticker}"
    cached = await cache_get(key)
    if cached is not None:
        return cached
    try:
        candles_data = await fh.get_candles(ticker, "3M")
        closes = [c["close"] for c in candles_data.get("candles", [])]
        rsi = _calc_rsi(closes, RSI_PERIOD)
        await cache_set(key, rsi, ttl=RSI_CACHE_TTL)
        return rsi
    except Exception:
        return None


# ─── Filter predicate engine ──────────────────────────────────────────────────

FILTER_FIELDS = {
    "price":        "Price",
    "change_pct":   "Change %",
    "pe_ratio":     "P/E Ratio",
    "market_cap":   "Market Cap ($M)",
    "beta":         "Beta",
    "dividend_yield": "Dividend Yield %",
    "eps":          "EPS",
    "rsi":          "RSI",
    "sector":       "Sector",
    "exchange":     "Exchange",
}

OPERATORS = {
    "gt":  lambda v, t: v is not None and v >  t,
    "gte": lambda v, t: v is not None and v >= t,
    "lt":  lambda v, t: v is not None and v <  t,
    "lte": lambda v, t: v is not None and v <= t,
    "eq":  lambda v, t: v is not None and str(v).lower() == str(t).lower(),
    "neq": lambda v, t: v is None or str(v).lower() != str(t).lower(),
}


def _apply_filters(row: dict, filters: list[dict]) -> bool:
    for f in filters:
        field    = f.get("field")
        operator = f.get("operator", "gt")
        value    = f.get("value")
        if field not in FILTER_FIELDS or operator not in OPERATORS:
            continue
        row_val = row.get(field)
        if not OPERATORS[operator](row_val, value):
            return False
    return True


# ─── Preset screeners ─────────────────────────────────────────────────────────

PRESETS = {
    "oversold_tech": {
        "name": "Oversold Tech",
        "description": "Technology stocks with RSI below 35 — potential bounce candidates",
        "filters": [
            {"field": "sector",  "operator": "eq",  "value": "Technology"},
            {"field": "rsi",     "operator": "lt",  "value": 35},
        ],
    },
    "high_momentum": {
        "name": "High Momentum",
        "description": "Stocks with strong positive momentum this week",
        "filters": [
            {"field": "change_pct", "operator": "gt", "value": 2.0},
            {"field": "rsi",        "operator": "gt", "value": 55},
        ],
    },
    "dividend_growth": {
        "name": "Dividend Growth",
        "description": "Dividend-paying large caps with low beta",
        "filters": [
            {"field": "dividend_yield", "operator": "gt",  "value": 1.5},
            {"field": "beta",           "operator": "lt",  "value": 1.2},
            {"field": "market_cap",     "operator": "gt",  "value": 50_000},
        ],
    },
    "low_beta": {
        "name": "Low Beta",
        "description": "Defensive stocks that move less than the market",
        "filters": [
            {"field": "beta", "operator": "lt", "value": 0.8},
        ],
    },
    "value_picks": {
        "name": "Value Picks",
        "description": "Low P/E with large market cap",
        "filters": [
            {"field": "pe_ratio",   "operator": "lt",  "value": 20},
            {"field": "market_cap", "operator": "gt",  "value": 100_000},
        ],
    },
}


# ─── Main screener endpoint ───────────────────────────────────────────────────

@router.get("/presets")
async def get_presets():
    return {"presets": [{"id": k, **v} for k, v in PRESETS.items()]}


@router.get("/fields")
async def get_fields():
    return {
        "fields": [{"key": k, "label": v} for k, v in FILTER_FIELDS.items()],
        "operators": list(OPERATORS.keys()),
    }


@router.get("/")
@limiter.limit("100/minute")
async def run_screener(
    request: Request,
    filters: str = "[]",        # JSON array of {field, operator, value}
    sort_by: str = "market_cap",
    sort_dir: str = "desc",
    page: int = 1,
    per_page: int = 25,
):
    """
    Filter SP500_TOP50 by fundamental and technical criteria.
    filters: JSON-encoded list, e.g. [{"field":"pe_ratio","operator":"lt","value":30}]
    """
    try:
        filter_list: list[dict] = json.loads(filters)
    except (json.JSONDecodeError, TypeError):
        filter_list = []

    # Fetch all data in parallel
    quote_tasks   = [fh.get_quote(t)            for t in SP500_TOP50]
    profile_tasks = [fh.get_company_profile(t)  for t in SP500_TOP50]
    fin_tasks     = [fh.get_basic_financials(t) for t in SP500_TOP50]
    rsi_tasks     = [_get_rsi_for_ticker(t)     for t in SP500_TOP50]

    quotes, profiles, fins, rsis = await asyncio.gather(
        asyncio.gather(*quote_tasks,   return_exceptions=True),
        asyncio.gather(*profile_tasks, return_exceptions=True),
        asyncio.gather(*fin_tasks,     return_exceptions=True),
        asyncio.gather(*rsi_tasks,     return_exceptions=True),
    )

    # Build enriched rows
    rows = []
    for ticker, q, p, f, rsi in zip(SP500_TOP50, quotes, profiles, fins, rsis):
        qd = q if isinstance(q, dict) else {}
        pd = p if isinstance(p, dict) else {}
        fd = f if isinstance(f, dict) else {}

        row: dict[str, Any] = {
            "ticker":         ticker,
            "company_name":   pd.get("company_name"),
            "sector":         pd.get("sector"),
            "exchange":       pd.get("exchange"),
            "price":          qd.get("price"),
            "change":         qd.get("change"),
            "change_pct":     qd.get("change_pct"),
            "market_cap":     pd.get("market_cap"),
            "pe_ratio":       fd.get("pe_ratio"),
            "eps":            fd.get("eps"),
            "beta":           fd.get("beta"),
            "dividend_yield": fd.get("dividend_yield"),
            "week_52_high":   fd.get("52_week_high"),
            "week_52_low":    fd.get("52_week_low"),
            "rsi":            rsi if not isinstance(rsi, Exception) else None,
        }

        # Derive analyst signal from RSI + momentum
        r = row["rsi"]
        pct = row["change_pct"] or 0
        if r is not None:
            if r < 30:
                row["signal"] = "strong_buy"
            elif r < 45 and pct > 0:
                row["signal"] = "buy"
            elif r > 70:
                row["signal"] = "sell"
            elif r > 55 and pct < 0:
                row["signal"] = "watch"
            else:
                row["signal"] = "hold"
        else:
            row["signal"] = None

        rows.append(row)

    # Apply filters
    if filter_list:
        rows = [r for r in rows if _apply_filters(r, filter_list)]

    # Sort
    reverse = sort_dir.lower() == "desc"
    rows.sort(
        key=lambda r: (r.get(sort_by) is None, r.get(sort_by) or 0),
        reverse=reverse,
    )

    # Paginate
    total  = len(rows)
    start  = (page - 1) * per_page
    paged  = rows[start : start + per_page]

    return {
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    max(1, (total + per_page - 1) // per_page),
        "results":  paged,
    }
