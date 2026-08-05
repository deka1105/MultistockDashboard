from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ─── Quote ───────────────────────────────────────────────────────────────────

class QuoteResponse(BaseModel):
    ticker: str
    price: float | None
    change: float | None
    change_pct: float | None
    high: float | None
    low: float | None
    open: float | None
    prev_close: float | None
    timestamp: int | None


# ─── Candles ─────────────────────────────────────────────────────────────────

class CandlePoint(BaseModel):
    date: str
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class CandlesResponse(BaseModel):
    ticker: str
    range: str
    resolution: str
    candles: list[CandlePoint]


# ─── Compare (multi-stock) ───────────────────────────────────────────────────

class NormalizedSeriesPoint(BaseModel):
    date: str
    timestamp: int
    pct_return: float   # % return from start date, e.g. 12.4 = +12.4%
    close: float


class CompareSeriesItem(BaseModel):
    ticker: str
    color: str          # Assigned chart color hex
    start_price: float
    end_price: float
    pct_change: float
    points: list[NormalizedSeriesPoint]


class CompareResponse(BaseModel):
    tickers: list[str]
    range: str
    series: list[CompareSeriesItem]


# ─── Symbol Search ───────────────────────────────────────────────────────────

class SymbolResult(BaseModel):
    ticker: str | None
    description: str | None
    type: str | None
    exchange: str | None


class SearchResponse(BaseModel):
    query: str
    results: list[SymbolResult]


# ─── News ─────────────────────────────────────────────────────────────────────

class NewsArticle(BaseModel):
    id: int | None = None
    headline: str | None
    summary: str | None
    source: str | None
    url: str | None
    image: str | None
    sentiment: str = "neutral"
    published_at: str | None


class NewsResponse(BaseModel):
    ticker: str
    articles: list[NewsArticle]


# ─── Company Profile ─────────────────────────────────────────────────────────

class CompanyProfileResponse(BaseModel):
    ticker: str
    company_name: str | None
    sector: str | None
    market_cap: float | None
    logo_url: str | None
    exchange: str | None
    ipo_date: str | None
    website: str | None
    country: str | None
    currency: str | None


# ─── Financials ──────────────────────────────────────────────────────────────

class BasicFinancialsResponse(BaseModel):
    ticker: str
    week_52_high: float | None = Field(None, alias="52_week_high")
    week_52_low: float | None = Field(None, alias="52_week_low")
    beta: float | None
    pe_ratio: float | None
    eps: float | None
    revenue_per_share: float | None
    dividend_yield: float | None

    model_config = {"populate_by_name": True}


# ─── Sentiment ───────────────────────────────────────────────────────────────

class SentimentResponse(BaseModel):
    ticker: str
    score: float             # -1.0 (bearish) to 1.0 (bullish)
    label: str               # positive / neutral / negative
    post_volume: int
    window_hours: int
    computed_at: str | None


class SentimentHistoryPoint(BaseModel):
    score: float
    label: str
    post_volume: int
    computed_at: str


class SentimentHistoryResponse(BaseModel):
    ticker: str
    history: list[SentimentHistoryPoint]


# ─── Market Overview ──────────────────────────────────────────────────────────

class MarketOverviewItem(BaseModel):
    ticker: str
    company_name: str | None
    sector: str | None
    price: float | None
    change: float | None
    change_pct: float | None
    volume: float | None
    market_cap: float | None


class MarketOverviewResponse(BaseModel):
    items: list[MarketOverviewItem]
    updated_at: str


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    db: str
    redis: str
    version: str = "1.0.0"
