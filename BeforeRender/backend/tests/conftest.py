"""
conftest.py — shared fixtures for all test layers.

Architecture:
  - Unit tests:        no I/O, mock everything
  - Integration tests: SQLite in-memory DB, fakeredis
  - E2E tests:         FastAPI TestClient, SQLite, fakeredis
"""
import asyncio
import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch

# ─── Must be set before ANY app import ───────────────────────────────────────
os.environ["DATABASE_URL"]          = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"]             = "redis://localhost:6379/0"
os.environ["CELERY_BROKER_URL"]     = "redis://localhost:6379/1"
os.environ["CELERY_RESULT_BACKEND"] = "redis://localhost:6379/2"
os.environ["FINNHUB_API_KEY"]       = ""          # force mock mode
os.environ["SECRET_KEY"]            = "test-secret-not-for-production"

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine, AsyncSession, async_sessionmaker
)
from sqlalchemy.pool import StaticPool


# ─── SQLite in-memory engine (session-scoped — created once) ─────────────────

TEST_ENGINE = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

TEST_SESSION_FACTORY = async_sessionmaker(
    TEST_ENGINE,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all DB tables once per test session."""
    # Import models AFTER env vars are set
    from app.models.models import Base  # noqa: F401
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Per-test DB session — rolled back after each test for full isolation.
    """
    async with TEST_SESSION_FACTORY() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


# ─── Fake Redis ───────────────────────────────────────────────────────────────

@pytest.fixture
def fake_redis():
    import fakeredis.aioredis as fakeredis
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture(autouse=True)
def patch_redis(fake_redis):
    """Patch get_redis() in all tests automatically."""
    async def _get_fake():
        return fake_redis
    with patch("app.core.cache.get_redis", side_effect=_get_fake):
        yield fake_redis


# ─── Mock Finnhub data ────────────────────────────────────────────────────────

MOCK_QUOTE = {
    "ticker": "AAPL", "price": 189.50, "change": 1.23, "change_pct": 0.65,
    "high": 191.00, "low": 187.50, "open": 188.00, "prev_close": 188.27,
    "timestamp": 1700000000,
}

MOCK_CANDLES = {
    "ticker": "AAPL", "range": "1M", "resolution": "D",
    "candles": [
        {
            "date": f"2024-01-{i+1:02d}T00:00:00+00:00",
            "timestamp": 1700000000 + i * 86400,
            "open": 185.0 + i, "high": 192.0 + i,
            "low":  183.0 + i, "close": 189.0 + i,
            "volume": 50_000_000,
        }
        for i in range(30)
    ],
}

MOCK_PROFILE = {
    "ticker": "AAPL", "company_name": "Apple Inc", "sector": "Technology",
    "market_cap": 2_900_000.0, "logo_url": None, "exchange": "NASDAQ",
    "ipo_date": "1980-12-12", "website": "https://www.apple.com",
    "country": "US", "currency": "USD",
}

MOCK_FINANCIALS_RAW = {
    "ticker": "AAPL", "52_week_high": 230.0, "52_week_low": 155.0,
    "beta": 1.25, "pe_ratio": 28.5, "eps": 6.57,
    "revenue_per_share": 24.33, "dividend_yield": 0.52,
}

MOCK_NEWS = [
    {
        "id": 1, "headline": "Apple beats Q4 earnings",
        "summary": "Better than expected", "source": "Reuters",
        "url": "https://www.reuters.com/search/news?blob=AAPL",
        "image": None, "sentiment": "positive",
        "published_at": "2024-01-15T10:00:00+00:00",
    },
    {
        "id": 2, "headline": "$AAPL Reddit discussion",
        "summary": "Community", "source": "Reddit",
        "url": "https://www.reddit.com/search/?q=%24AAPL&sort=new",
        "image": None, "sentiment": "positive",
        "published_at": "2024-01-15T09:00:00+00:00",
    },
]

MOCK_SEARCH_RESULTS = [
    {"ticker": "AAPL", "description": "Apple Inc", "type": "Common Stock", "exchange": "NASDAQ"},
]


@pytest.fixture
def mock_finnhub():
    with (
        patch("app.services.finnhub.get_quote",
              new_callable=AsyncMock, return_value=MOCK_QUOTE),
        patch("app.services.finnhub.get_candles",
              new_callable=AsyncMock, return_value=MOCK_CANDLES),
        patch("app.services.finnhub.get_company_profile",
              new_callable=AsyncMock, return_value=MOCK_PROFILE),
        patch("app.services.finnhub.get_basic_financials",
              new_callable=AsyncMock, return_value=MOCK_FINANCIALS_RAW),
        patch("app.services.finnhub.get_company_news",
              new_callable=AsyncMock, return_value=MOCK_NEWS),
        patch("app.services.finnhub.search_symbols",
              new_callable=AsyncMock, return_value=MOCK_SEARCH_RESULTS),
    ):
        yield


# ─── FastAPI test client ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """
    Full FastAPI ASGI test client.
    - Overrides get_db() to use the test SQLite session
    - Fake Redis auto-patched via patch_redis fixture
    - Mock mode on (FINNHUB_API_KEY empty)
    """
    from app.main import app
    from app.db.session import get_db

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── Seed fixtures ────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def seed_watchlist(db_session):
    """Pre-seeds a guest user + watchlist with 3 tickers."""
    from app.models.models import User, Watchlist, WatchlistItem
    from app.routers.watchlist import GUEST_ID

    user = User(
        id=GUEST_ID,
        email="guest@stockdash.test",
        hashed_password="$2b$12$fakehashfortesting",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    wl = Watchlist(user_id=GUEST_ID, name="Test Watchlist")
    db_session.add(wl)
    await db_session.flush()

    for i, ticker in enumerate(["AAPL", "MSFT", "NVDA"]):
        db_session.add(WatchlistItem(
            watchlist_id=wl.id, ticker=ticker, sort_order=i
        ))
    await db_session.flush()

    return {"watchlist_id": wl.id, "tickers": ["AAPL", "MSFT", "NVDA"]}


# ─── Patch AsyncSessionLocal in sentiment router ─────────────────────────────
# The sentiment router uses AsyncSessionLocal directly (not via DI),
# so we must patch it to use the test engine.

@pytest.fixture(autouse=True)
def patch_sentiment_session():
    """Ensure sentiment router uses the test SQLite engine."""
    test_factory = async_sessionmaker(
        TEST_ENGINE,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
    # Patch the session factory used directly in the sentiment router
    with patch("app.routers.sentiment.AsyncSessionLocal", test_factory):
        yield
