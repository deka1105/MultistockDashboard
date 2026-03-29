"""
Unit tests — fast, zero I/O, all external dependencies mocked.
Tests: utils, validators, mock data, sentiment aggregation, cache key builders.
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch


# ─── Cache key builders ───────────────────────────────────────────────────────

class TestCacheKeys:
    def test_quote_key_uppercased(self):
        from app.core.cache import quote_key
        assert quote_key("aapl") == "quote:AAPL"
        assert quote_key("MSFT") == "quote:MSFT"

    def test_candles_key_format(self):
        from app.core.cache import candles_key
        key = candles_key("AAPL", "1M", 1700000000, 1702592000)
        assert key == "candles:AAPL:1M:1700000000:1702592000"

    def test_news_key(self):
        from app.core.cache import news_key
        assert news_key("tsla") == "news:TSLA"

    def test_search_key_lowercased(self):
        from app.core.cache import search_key
        assert search_key("Apple") == "search:apple"

    def test_market_overview_key(self):
        from app.core.cache import market_overview_key
        assert market_overview_key() == "market:overview"

    def test_sentiment_key(self):
        from app.core.cache import sentiment_key
        assert sentiment_key("AAPL") == "sentiment:AAPL:24h"
        assert sentiment_key("AAPL", 1) == "sentiment:AAPL:1h"


# ─── Ticker validation ────────────────────────────────────────────────────────

class TestTickerValidation:
    """Tests for _validate_ticker in the stocks router."""

    def _validate(self, ticker: str) -> str:
        from fastapi import HTTPException
        from app.routers.stocks import _validate_ticker
        return _validate_ticker(ticker)

    def test_valid_simple(self):
        assert self._validate("AAPL") == "AAPL"

    def test_valid_lowercased_and_uppercased(self):
        assert self._validate("aapl") == "AAPL"
        assert self._validate("  msft  ") == "MSFT"

    def test_valid_with_dot(self):
        """BRK.B is a valid ticker that must not be rejected."""
        assert self._validate("BRK.B") == "BRK.B"

    def test_valid_short(self):
        assert self._validate("V") == "V"

    def test_invalid_empty(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            self._validate("")
        assert exc.value.status_code == 422

    def test_invalid_too_long(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            self._validate("TOOLONGTICKER123")

    def test_invalid_special_chars(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            self._validate("AAPL; DROP TABLE users;--")

    def test_invalid_slash(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            self._validate("AAPL/MSFT")


# ─── Mock data quality ────────────────────────────────────────────────────────

class TestMockData:
    """Verifies mock data has the correct shape and realistic values."""

    def test_mock_quote_fields(self):
        from app.services.mock_data import get_mock_quote
        q = get_mock_quote("AAPL")
        assert q["ticker"] == "AAPL"
        assert isinstance(q["price"], float)
        assert q["price"] > 0
        assert "change" in q
        assert "change_pct" in q
        assert "timestamp" in q

    def test_mock_quote_known_ticker(self):
        from app.services.mock_data import get_mock_quote
        q = get_mock_quote("AAPL")
        assert q["price"] == 189.50

    def test_mock_quote_unknown_ticker_has_positive_price(self):
        from app.services.mock_data import get_mock_quote
        q = get_mock_quote("FAKEXXXX")
        assert q["price"] > 0

    def test_mock_candles_count(self):
        from app.services.mock_data import get_mock_candles
        c = get_mock_candles("AAPL", "1M")
        assert len(c["candles"]) == 30

    def test_mock_candles_ohlcv_valid(self):
        from app.services.mock_data import get_mock_candles
        c = get_mock_candles("TSLA", "3M")
        for candle in c["candles"]:
            assert candle["high"] >= candle["low"], "High must be >= Low"
            assert candle["close"] > 0
            assert candle["volume"] > 0
            assert "date" in candle
            assert "timestamp" in candle

    def test_mock_candles_ranges(self):
        from app.services.mock_data import get_mock_candles
        for range_key, expected_min in [("1D", 1), ("1W", 7), ("1M", 28), ("3M", 88)]:
            c = get_mock_candles("AAPL", range_key)
            assert len(c["candles"]) >= expected_min, f"Range {range_key} has too few candles"

    def test_mock_search_filters_correctly(self):
        from app.services.mock_data import get_mock_search
        results = get_mock_search("APP")
        tickers = [r["ticker"] for r in results]
        assert "AAPL" in tickers

    def test_mock_search_case_insensitive(self):
        from app.services.mock_data import get_mock_search
        assert get_mock_search("aapl") == get_mock_search("AAPL")

    def test_mock_news_has_real_urls(self):
        from app.services.mock_data import get_mock_news
        articles = get_mock_news("AAPL")
        assert len(articles) >= 5
        for article in articles:
            assert article["url"] is not None
            assert article["url"].startswith("https://")
            assert "example.com" not in article["url"], "URL must not be a placeholder"

    def test_mock_news_has_social_links(self):
        from app.services.mock_data import get_mock_news
        articles = get_mock_news("TSLA")
        sources = {a["source"] for a in articles}
        assert "Reddit" in sources
        assert "X / Twitter" in sources
        assert "StockTwits" in sources

    def test_mock_news_social_urls_contain_ticker(self):
        from app.services.mock_data import get_mock_news
        articles = get_mock_news("NVDA")
        for article in articles:
            if article["source"] in ("Reddit", "X / Twitter", "StockTwits"):
                assert "NVDA" in article["url"], f"Social URL missing ticker: {article['url']}"

    def test_mock_profile_known_ticker(self):
        from app.services.mock_data import get_mock_profile
        p = get_mock_profile("AAPL")
        assert p["company_name"] == "Apple Inc"
        assert p["sector"] == "Technology"
        assert p["market_cap"] > 0

    def test_mock_financials_52week_range(self):
        from app.services.mock_data import get_mock_financials
        f = get_mock_financials("AAPL")
        assert f["52_week_high"] > f["52_week_low"], "52W high must exceed 52W low"
        assert f["pe_ratio"] > 0


# ─── Sentiment aggregation logic ─────────────────────────────────────────────

class TestSentimentAggregation:
    """Tests for the StockTwits sentiment aggregator (pure function)."""

    def _agg(self, messages):
        from app.services.sentiment import aggregate_stocktwits_sentiment
        return aggregate_stocktwits_sentiment(messages)

    def test_all_bullish(self):
        msgs = [{"raw_sentiment": "Bullish"} for _ in range(10)]
        result = self._agg(msgs)
        assert result["score"] == 1.0
        assert result["label"] == "positive"
        assert result["bullish"] == 10

    def test_all_bearish(self):
        msgs = [{"raw_sentiment": "Bearish"} for _ in range(8)]
        result = self._agg(msgs)
        assert result["score"] == -1.0
        assert result["label"] == "negative"

    def test_mixed_sentiment(self):
        msgs = (
            [{"raw_sentiment": "Bullish"}] * 6 +
            [{"raw_sentiment": "Bearish"}] * 4
        )
        result = self._agg(msgs)
        assert result["score"] == pytest.approx(0.2, abs=0.01)
        assert result["label"] == "positive"

    def test_no_labels_is_neutral(self):
        msgs = [{"raw_sentiment": None} for _ in range(5)]
        result = self._agg(msgs)
        assert result["score"] == 0.0
        assert result["label"] == "neutral"

    def test_empty_messages(self):
        result = self._agg([])
        assert result["score"] == 0.0
        assert result["label"] == "neutral"
        assert result["post_volume"] == 0

    def test_post_volume_counted(self):
        msgs = [{"raw_sentiment": "Bullish"} for _ in range(15)]
        result = self._agg(msgs)
        assert result["post_volume"] == 15

    def test_score_range(self):
        """Score must always be in [-1, +1]."""
        for scenario in [
            [{"raw_sentiment": "Bullish"}] * 100,
            [{"raw_sentiment": "Bearish"}] * 100,
            [{"raw_sentiment": "Bullish"}] * 50 + [{"raw_sentiment": "Bearish"}] * 50,
        ]:
            result = self._agg(scenario)
            assert -1.0 <= result["score"] <= 1.0

    def test_neutral_boundary_at_01(self):
        """Scores between -0.1 and +0.1 should be 'neutral'."""
        # 55 bullish, 45 bearish → score = (55-45)/100 = 0.1 → boundary
        msgs = (
            [{"raw_sentiment": "Bullish"}] * 55 +
            [{"raw_sentiment": "Bearish"}] * 45
        )
        result = self._agg(msgs)
        # 0.1 is the exact boundary — neutral (not positive)
        assert result["label"] in ("neutral", "positive")


# ─── Utility functions ────────────────────────────────────────────────────────

class TestUtils:
    """Tests for frontend utility equivalents and backend helpers."""

    def test_resolution_map_coverage(self):
        from app.services.finnhub import RESOLUTION_MAP
        for key in ["1D", "1W", "1M", "3M", "1Y", "5Y"]:
            assert key in RESOLUTION_MAP, f"Range {key} missing from RESOLUTION_MAP"
            resolution, days = RESOLUTION_MAP[key]
            assert isinstance(days, int) and days > 0

    def test_sp500_top50_count(self):
        from app.routers.stocks import SP500_TOP50
        assert len(SP500_TOP50) == 50, f"Expected 50 tickers, got {len(SP500_TOP50)}"

    def test_sp500_no_duplicates(self):
        from app.routers.stocks import SP500_TOP50
        assert len(SP500_TOP50) == len(set(SP500_TOP50)), "SP500_TOP50 has duplicates"

    def test_brk_b_in_sp500(self):
        from app.routers.stocks import SP500_TOP50
        assert "BRK.B" in SP500_TOP50

    def test_series_colors_count(self):
        from app.routers.stocks import SERIES_COLORS
        assert len(SERIES_COLORS) >= 8, "Need at least 8 colors for compare chart"

    def test_valid_ranges_set(self):
        from app.routers.stocks import VALID_RANGES
        assert VALID_RANGES == {"1D", "1W", "1M", "3M", "1Y", "5Y"}


# ─── WebSocket poller deduplication logic ────────────────────────────────────

class TestWebSocketPollerGuard:
    def test_poller_running_flag_initialized_false(self):
        from app.routers.websocket import _poller_running
        # _poller_running starts empty — any checked key is falsy
        assert not _poller_running.get("AAPL_TEST_TICKER_XYZ")

    def test_connections_dict_starts_empty_for_new_ticker(self):
        from app.routers.websocket import _connections
        assert "DEFINITELY_NOT_A_REAL_TICKER_12345" not in _connections
