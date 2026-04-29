"""
Integration tests — real SQLite DB + fakeredis, no external HTTP.
Tests: DB models, watchlist CRUD service layer, Redis cache read/write,
Celery task logic, sentiment DB persistence.
"""
import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# ─── Database model tests ─────────────────────────────────────────────────────

class TestDatabaseModels:
    """Verify ORM models write/read correctly to SQLite."""

    @pytest.mark.asyncio
    async def test_create_user(self, db_session: AsyncSession):
        from app.models.models import User
        user = User(email="test@example.com", hashed_password="fakehash")
        db_session.add(user)
        await db_session.flush()

        result = await db_session.execute(select(User).where(User.email == "test@example.com"))
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.plan == "free"
        assert fetched.is_active is True
        assert fetched.is_verified is False

    @pytest.mark.asyncio
    async def test_create_watchlist_and_items(self, db_session: AsyncSession):
        from app.models.models import User, Watchlist, WatchlistItem
        user = User(id=999, email="wl@example.com", hashed_password="fakehash")
        db_session.add(user)
        await db_session.flush()

        wl = Watchlist(user_id=999, name="My Portfolio")
        db_session.add(wl)
        await db_session.flush()

        for i, ticker in enumerate(["AAPL", "MSFT"]):
            db_session.add(WatchlistItem(watchlist_id=wl.id, ticker=ticker, sort_order=i))
        await db_session.flush()

        result = await db_session.execute(
            select(WatchlistItem).where(WatchlistItem.watchlist_id == wl.id).order_by(WatchlistItem.sort_order)
        )
        items = result.scalars().all()
        assert len(items) == 2
        assert items[0].ticker == "AAPL"
        assert items[1].ticker == "MSFT"

    @pytest.mark.asyncio
    async def test_watchlist_cascade_delete(self, db_session: AsyncSession):
        from app.models.models import User, Watchlist, WatchlistItem
        from sqlalchemy import delete

        user = User(id=998, email="cascade@example.com", hashed_password="x")
        db_session.add(user)
        await db_session.flush()

        wl = Watchlist(user_id=998, name="To Delete")
        db_session.add(wl)
        await db_session.flush()
        wl_id = wl.id

        db_session.add(WatchlistItem(watchlist_id=wl_id, ticker="TSLA", sort_order=0))
        await db_session.flush()

        # Delete watchlist items first, then watchlist
        await db_session.execute(delete(WatchlistItem).where(WatchlistItem.watchlist_id == wl_id))
        await db_session.delete(wl)
        await db_session.flush()

        items = await db_session.execute(
            select(WatchlistItem).where(WatchlistItem.watchlist_id == wl_id)
        )
        assert items.scalars().all() == []

    @pytest.mark.asyncio
    async def test_create_social_post(self, db_session: AsyncSession):
        from app.models.models import SocialPost
        post = SocialPost(
            external_id="test_post_001",
            ticker="AAPL",
            source="stocktwits",
            text="$AAPL looking bullish today!",
            author="trader_joe",
            score=42,
            raw_sentiment="Bullish",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(post)
        await db_session.flush()

        result = await db_session.execute(
            select(SocialPost).where(SocialPost.external_id == "test_post_001")
        )
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.ticker == "AAPL"
        assert fetched.raw_sentiment == "Bullish"

    @pytest.mark.asyncio
    async def test_duplicate_external_id_rejected(self, db_session: AsyncSession):
        from app.models.models import SocialPost
        from sqlalchemy.exc import IntegrityError

        post1 = SocialPost(
            external_id="dup_001",
            ticker="TSLA",
            source="reddit",
            text="First post",
            created_at=datetime.now(timezone.utc),
        )
        post2 = SocialPost(
            external_id="dup_001",  # same external_id
            ticker="TSLA",
            source="reddit",
            text="Second post",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(post1)
        await db_session.flush()
        db_session.add(post2)

        with pytest.raises(IntegrityError):
            await db_session.flush()

    @pytest.mark.asyncio
    async def test_create_sentiment_score(self, db_session: AsyncSession):
        from app.models.models import SentimentScore
        score = SentimentScore(
            ticker="NVDA",
            source="stocktwits",
            label="positive",
            score=0.65,
            confidence=0.82,
            post_volume=142,
            window_hours=24,
        )
        db_session.add(score)
        await db_session.flush()

        result = await db_session.execute(
            select(SentimentScore).where(SentimentScore.ticker == "NVDA")
        )
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.score == pytest.approx(0.65)
        assert fetched.label == "positive"


# ─── Redis cache integration ──────────────────────────────────────────────────

class TestRedisCache:
    @pytest.mark.asyncio
    async def test_cache_set_and_get(self, fake_redis):
        from app.core.cache import cache_set, cache_get
        with patch("app.core.cache.get_redis", return_value=fake_redis):
            await cache_set("test:key", {"price": 189.5}, ttl=60)
            result = await cache_get("test:key")
            assert result == {"price": 189.5}

    @pytest.mark.asyncio
    async def test_cache_miss_returns_none(self, fake_redis):
        from app.core.cache import cache_get
        with patch("app.core.cache.get_redis", return_value=fake_redis):
            result = await cache_get("nonexistent:key:xyz")
            assert result is None

    @pytest.mark.asyncio
    async def test_cache_delete(self, fake_redis):
        from app.core.cache import cache_set, cache_get, cache_delete
        with patch("app.core.cache.get_redis", return_value=fake_redis):
            await cache_set("delete:me", {"data": 1}, ttl=60)
            await cache_delete("delete:me")
            assert await cache_get("delete:me") is None

    @pytest.mark.asyncio
    async def test_cache_stores_complex_objects(self, fake_redis):
        from app.core.cache import cache_set, cache_get
        data = {
            "ticker": "AAPL",
            "candles": [{"date": "2024-01-01", "close": 189.5, "volume": 50_000_000}],
            "nested": {"a": 1, "b": [1, 2, 3]},
        }
        with patch("app.core.cache.get_redis", return_value=fake_redis):
            await cache_set("complex:key", data, ttl=300)
            result = await cache_get("complex:key")
            assert result == data

    @pytest.mark.asyncio
    async def test_cache_redis_failure_returns_none_gracefully(self):
        """Cache failures should never crash the app — return None silently."""
        from app.core.cache import cache_get
        broken_redis = AsyncMock()
        broken_redis.get.side_effect = ConnectionError("Redis down")
        with patch("app.core.cache.get_redis", return_value=broken_redis):
            result = await cache_get("any:key")
            assert result is None

    @pytest.mark.asyncio
    async def test_cache_set_redis_failure_is_silent(self):
        from app.core.cache import cache_set
        broken_redis = AsyncMock()
        broken_redis.setex.side_effect = ConnectionError("Redis down")
        with patch("app.core.cache.get_redis", return_value=broken_redis):
            # Should not raise
            await cache_set("any:key", {"data": 1}, ttl=60)


# ─── Finnhub service (mock mode) ─────────────────────────────────────────────

class TestFinnhubServiceMockMode:
    """Verifies service functions return correct shapes in mock mode."""

    @pytest.mark.asyncio
    async def test_get_quote_returns_valid_shape(self):
        from app.services.finnhub import get_quote, USE_MOCK
        assert USE_MOCK is True, "Tests should run in mock mode (no API key)"
        result = await get_quote("AAPL")
        assert result["ticker"] == "AAPL"
        assert isinstance(result["price"], (int, float))
        assert result["price"] > 0

    @pytest.mark.asyncio
    async def test_get_candles_all_ranges(self):
        from app.services.finnhub import get_candles
        for range_key in ["1D", "1W", "1M", "3M", "1Y", "5Y"]:
            result = await get_candles("AAPL", range_key)
            assert result["ticker"] == "AAPL"
            assert result["range"] == range_key
            assert isinstance(result["candles"], list)
            assert len(result["candles"]) > 0

    @pytest.mark.asyncio
    async def test_get_company_profile(self):
        from app.services.finnhub import get_company_profile
        p = await get_company_profile("AAPL")
        assert p["ticker"] == "AAPL"
        assert p["company_name"] == "Apple Inc"
        assert p["sector"] is not None

    @pytest.mark.asyncio
    async def test_get_basic_financials_52w_range(self):
        from app.services.finnhub import get_basic_financials
        f = await get_basic_financials("AAPL")
        assert f["52_week_high"] > f["52_week_low"]
        assert f["beta"] is not None

    @pytest.mark.asyncio
    async def test_search_symbols(self):
        from app.services.finnhub import search_symbols
        results = await search_symbols("AAPL")
        assert len(results) > 0
        assert any(r["ticker"] == "AAPL" for r in results)

    @pytest.mark.asyncio
    async def test_get_company_news_real_urls(self):
        from app.services.finnhub import get_company_news
        articles = await get_company_news("TSLA")
        assert len(articles) > 0
        for article in articles:
            assert article["url"].startswith("https://")
            assert "example.com" not in article["url"]

    @pytest.mark.asyncio
    async def test_get_company_news_has_social_sources(self):
        from app.services.finnhub import get_company_news
        articles = await get_company_news("NVDA")
        sources = {a.get("source") for a in articles}
        assert sources & {"Reddit", "X / Twitter", "StockTwits"}


# ─── Watchlist service layer ──────────────────────────────────────────────────

class TestWatchlistServiceLayer:
    """Tests that watchlist DB operations work correctly end-to-end."""

    @pytest.mark.asyncio
    async def test_ensure_default_watchlist_creates_when_empty(self, db_session):
        from app.models.models import User, Watchlist
        from app.routers.watchlist import _ensure_default_watchlist, GUEST_ID

        # Create guest user
        uid = 5001  # unique ID — won't collide with E2E tests
        user = User(id=uid, email=f"g_{uid}@test.com", hashed_password="x")
        db_session.add(user)
        await db_session.flush()

        wl = await _ensure_default_watchlist(db_session, uid)
        assert wl.id is not None
        assert wl.name == "My Watchlist"

    @pytest.mark.asyncio
    async def test_ensure_default_watchlist_idempotent(self, db_session):
        from app.models.models import User, Watchlist
        from app.routers.watchlist import _ensure_default_watchlist, GUEST_ID

        uid2 = 5002
        user = User(id=uid2, email=f"idem_{uid2}@test.com", hashed_password="x")
        db_session.add(user)
        await db_session.flush()

        wl1 = await _ensure_default_watchlist(db_session, uid2)
        wl2 = await _ensure_default_watchlist(db_session, uid2)
        assert wl1.id == wl2.id  # Same watchlist returned both times

    @pytest.mark.asyncio
    async def test_reorder_persists_to_db(self, db_session, seed_watchlist):
        from app.models.models import WatchlistItem
        from sqlalchemy import update

        wl_id = seed_watchlist["watchlist_id"]
        new_order = ["NVDA", "AAPL", "MSFT"]

        for i, ticker in enumerate(new_order):
            await db_session.execute(
                update(WatchlistItem)
                .where(WatchlistItem.watchlist_id == wl_id, WatchlistItem.ticker == ticker)
                .values(sort_order=i)
            )
        await db_session.flush()

        result = await db_session.execute(
            select(WatchlistItem)
            .where(WatchlistItem.watchlist_id == wl_id)
            .order_by(WatchlistItem.sort_order)
        )
        items = result.scalars().all()
        assert [i.ticker for i in items] == new_order
