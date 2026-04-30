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
