from datetime import datetime
from sqlalchemy import (
    String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import enum

from app.db.session import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserPlan(str, enum.Enum):
    free = "free"
    pro = "pro"
    team = "team"


class SentimentLabel(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class SocialSource(str, enum.Enum):
    reddit = "reddit"
    twitter = "twitter"
    stocktwits = "stocktwits"


# ─── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    plan: Mapped[str] = mapped_column(
        SAEnum(UserPlan), default=UserPlan.free, nullable=False
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    watchlists: Mapped[list["Watchlist"]] = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    portfolios: Mapped[list["Portfolio"]] = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


# ─── Watchlists ───────────────────────────────────────────────────────────────

class Watchlist(Base):
    __tablename__ = "watchlists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="watchlists")
    items: Mapped[list["WatchlistItem"]] = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    watchlist: Mapped["Watchlist"] = relationship("Watchlist", back_populates="items")


# ─── Stock Metadata ───────────────────────────────────────────────────────────

class StockMetadata(Base):
    __tablename__ = "stock_metadata"

    ticker: Mapped[str] = mapped_column(String(10), primary_key=True, index=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    market_cap: Mapped[float | None] = mapped_column(Float, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    exchange: Mapped[str | None] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ─── Social Posts ─────────────────────────────────────────────────────────────

class SocialPost(Base):
    __tablename__ = "social_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)  # reddit/tweet ID
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    source: Mapped[str] = mapped_column(SAEnum(SocialSource), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0)   # upvotes / likes
    url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    raw_sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)  # stocktwits pre-label
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─── Sentiment Scores ─────────────────────────────────────────────────────────

class SentimentScore(Base):
    __tablename__ = "sentiment_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    source: Mapped[str | None] = mapped_column(SAEnum(SocialSource), nullable=True)  # None = aggregated
    label: Mapped[str] = mapped_column(SAEnum(SentimentLabel), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)   # -1.0 to 1.0
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    post_volume: Mapped[int] = mapped_column(Integer, default=0)
    window_hours: Mapped[int] = mapped_column(Integer, default=24)  # 1, 4, 24
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─── Portfolio ────────────────────────────────────────────────────────────────

class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="My Portfolio")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="portfolios")
    positions: Mapped[list["Position"]] = relationship("Position", back_populates="portfolio", cascade="all, delete-orphan")
    snapshots: Mapped[list["PnLSnapshot"]] = relationship("PnLSnapshot", back_populates="portfolio", cascade="all, delete-orphan")


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    shares: Mapped[float] = mapped_column(Float, nullable=False)
    avg_cost: Mapped[float] = mapped_column(Float, nullable=False)   # cost basis per share
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="positions")


class PnLSnapshot(Base):
    __tablename__ = "pnl_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_value: Mapped[float] = mapped_column(Float, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    daily_return_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="snapshots")


# ─── Alerts ───────────────────────────────────────────────────────────────────

class AlertType(str, enum.Enum):
    price_above    = "price_above"
    price_below    = "price_below"
    pct_move_day   = "pct_move_day"
    rsi_above      = "rsi_above"
    rsi_below      = "rsi_below"
    ma_cross_above = "ma_cross_above"   # price crosses above MA50
    ma_cross_below = "ma_cross_below"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="alerts")
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    alert_type: Mapped[str] = mapped_column(String(30), nullable=False)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    triggered_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─── Earnings events ──────────────────────────────────────────────────────────

class EarningsEvent(Base):
    __tablename__ = "earnings_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    report_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    time_of_day: Mapped[str | None] = mapped_column(String(10), nullable=True)   # "pre" | "post" | "during"
    eps_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    eps_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    surprise_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    beat_miss: Mapped[str | None] = mapped_column(String(10), nullable=True)    # "beat" | "miss" | "inline"
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InstitutionalOwnership(Base):
    """Quarterly institutional ownership snapshot — refreshed by Celery."""
    __tablename__ = "institutional_ownership"

    id:              Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker:          Mapped[str]            = mapped_column(String(16), nullable=False, index=True)
    report_date:     Mapped[str]            = mapped_column(String(10), nullable=False)
    inst_pct_float:  Mapped[float | None]   = mapped_column(Float, nullable=True)
    num_holders:     Mapped[int | None]     = mapped_column(Integer, nullable=True)
    qoq_change_pct:  Mapped[float | None]   = mapped_column(Float, nullable=True)
    top_holder_name: Mapped[str | None]     = mapped_column(String(256), nullable=True)
    top_holder_pct:  Mapped[float | None]   = mapped_column(Float, nullable=True)
    raw_json:        Mapped[str | None]     = mapped_column(Text, nullable=True)
    created_at:      Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())
