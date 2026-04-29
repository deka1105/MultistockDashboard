"""
E2E tests — full FastAPI HTTP stack with TestClient.
Tests every endpoint: correct status codes, response shapes,
validation errors, rate limiting, edge cases.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch


# ─── Health ───────────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        r = await client.get("/health")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_health_response_shape(self, client):
        r = await client.get("/health")
        data = r.json()
        assert "status" in data
        assert "db" in data
        assert "redis" in data
        assert "version" in data

    @pytest.mark.asyncio
    async def test_root_endpoint(self, client):
        r = await client.get("/")
        assert r.status_code == 200
        assert "StockDash" in r.json()["message"]

    @pytest.mark.asyncio
    async def test_docs_available(self, client):
        r = await client.get("/docs")
        assert r.status_code == 200


# ─── Stocks — Quote ───────────────────────────────────────────────────────────

class TestQuoteEndpoint:
    @pytest.mark.asyncio
    async def test_quote_valid_ticker(self, client):
        r = await client.get("/api/v1/stocks/quote/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert data["price"] > 0

    @pytest.mark.asyncio
    async def test_quote_lowercase_ticker_uppercased(self, client):
        r = await client.get("/api/v1/stocks/quote/aapl")
        assert r.status_code == 200
        assert r.json()["ticker"] == "AAPL"

    @pytest.mark.asyncio
    async def test_quote_brk_b_dot_ticker(self, client):
        """BRK.B must not be rejected by the validator."""
        r = await client.get("/api/v1/stocks/quote/BRK.B")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_quote_invalid_ticker_rejected(self, client):
        r = await client.get("/api/v1/stocks/quote/TOOLONGTICKER12345")
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_quote_response_fields(self, client):
        r = await client.get("/api/v1/stocks/quote/MSFT")
        data = r.json()
        for field in ["ticker", "price", "change", "change_pct", "high", "low", "open", "prev_close"]:
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_quote_unknown_ticker_still_returns_200(self, client):
        """Mock mode returns data for any ticker."""
        r = await client.get("/api/v1/stocks/quote/ZZZZ")
        assert r.status_code == 200


# ─── Stocks — Candles ─────────────────────────────────────────────────────────

class TestCandlesEndpoint:
    @pytest.mark.asyncio
    async def test_candles_default_range(self, client):
        r = await client.get("/api/v1/stocks/candles/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert isinstance(data["candles"], list)
        assert len(data["candles"]) > 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("range_key", ["1D", "1W", "1M", "3M", "1Y", "5Y"])
    async def test_candles_all_ranges(self, client, range_key):
        r = await client.get(f"/api/v1/stocks/candles/AAPL?range={range_key}")
        assert r.status_code == 200
        assert r.json()["range"] == range_key

    @pytest.mark.asyncio
    async def test_candles_invalid_range_rejected(self, client):
        r = await client.get("/api/v1/stocks/candles/AAPL?range=6M")
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_candles_ohlcv_fields(self, client):
        r = await client.get("/api/v1/stocks/candles/AAPL?range=1M")
        candles = r.json()["candles"]
        for c in candles:
            assert "date" in c
            assert "open" in c and "high" in c and "low" in c and "close" in c
            assert "volume" in c
            assert c["high"] >= c["low"], "High must be >= Low"
            assert c["close"] > 0


# ─── Stocks — Search ─────────────────────────────────────────────────────────

class TestSearchEndpoint:
    @pytest.mark.asyncio
    async def test_search_returns_results(self, client):
        r = await client.get("/api/v1/stocks/search?q=AAPL")
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert len(data["results"]) > 0

    @pytest.mark.asyncio
    async def test_search_result_shape(self, client):
        r = await client.get("/api/v1/stocks/search?q=APP")
        results = r.json()["results"]
        for result in results:
            assert "ticker" in result
            assert "description" in result

    @pytest.mark.asyncio
    async def test_search_empty_query_rejected(self, client):
        r = await client.get("/api/v1/stocks/search?q=")
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_search_too_long_query_rejected(self, client):
        r = await client.get(f"/api/v1/stocks/search?q={'a' * 51}")
        assert r.status_code == 422


# ─── Stocks — News ────────────────────────────────────────────────────────────

class TestNewsEndpoint:
    @pytest.mark.asyncio
    async def test_news_returns_articles(self, client):
        r = await client.get("/api/v1/stocks/news/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert isinstance(data["articles"], list)
        assert len(data["articles"]) > 0

    @pytest.mark.asyncio
    async def test_news_article_has_real_url(self, client):
        r = await client.get("/api/v1/stocks/news/TSLA")
        articles = r.json()["articles"]
        for article in articles:
            assert article["url"] is not None
            assert article["url"].startswith("https://")
            assert "example.com" not in article["url"]

    @pytest.mark.asyncio
    async def test_news_has_social_sources(self, client):
        r = await client.get("/api/v1/stocks/news/AAPL")
        sources = {a["source"] for a in r.json()["articles"]}
        assert sources & {"Reddit", "X / Twitter", "StockTwits"}

    @pytest.mark.asyncio
    async def test_news_sentiment_values_valid(self, client):
        r = await client.get("/api/v1/stocks/news/MSFT")
        for article in r.json()["articles"]:
            assert article["sentiment"] in ("positive", "negative", "neutral")

    @pytest.mark.asyncio
    async def test_news_days_param(self, client):
        r = await client.get("/api/v1/stocks/news/AAPL?days=3")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_news_days_out_of_range_rejected(self, client):
        r = await client.get("/api/v1/stocks/news/AAPL?days=31")
        assert r.status_code == 422


# ─── Stocks — Profile & Financials ───────────────────────────────────────────

class TestProfileFinancials:
    @pytest.mark.asyncio
    async def test_profile_returns_data(self, client):
        r = await client.get("/api/v1/stocks/profile/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert data["company_name"] == "Apple Inc"
        assert data["sector"] == "Technology"

    @pytest.mark.asyncio
    async def test_financials_52_week_range(self, client):
        r = await client.get("/api/v1/stocks/financials/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["52_week_high"] > data["52_week_low"]

    @pytest.mark.asyncio
    async def test_financials_fields_present(self, client):
        r = await client.get("/api/v1/stocks/financials/MSFT")
        data = r.json()
        for field in ["ticker", "52_week_high", "52_week_low", "beta", "pe_ratio", "eps"]:
            assert field in data


# ─── Stocks — Compare ────────────────────────────────────────────────────────

class TestCompareEndpoint:
    @pytest.mark.asyncio
    async def test_compare_two_tickers(self, client):
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL,MSFT&range=1M")
        assert r.status_code == 200
        data = r.json()
        assert len(data["series"]) == 2
        tickers = {s["ticker"] for s in data["series"]}
        assert tickers == {"AAPL", "MSFT"}

    @pytest.mark.asyncio
    async def test_compare_normalized_starts_at_zero(self, client):
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL,TSLA&range=1M")
        for series in r.json()["series"]:
            first_point = series["points"][0]
            assert first_point["pct_return"] == pytest.approx(0.0, abs=0.001)

    @pytest.mark.asyncio
    async def test_compare_color_assigned(self, client):
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL,MSFT,NVDA&range=1M")
        colors = {s["color"] for s in r.json()["series"]}
        assert len(colors) == 3  # Each ticker gets a distinct color

    @pytest.mark.asyncio
    async def test_compare_max_8_tickers_enforced(self, client):
        tickers = ",".join(["AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","JPM","AMD"])
        r = await client.get(f"/api/v1/stocks/compare?tickers={tickers}&range=1M")
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_compare_invalid_range_rejected(self, client):
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL,MSFT&range=99Y")
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_compare_with_invalid_ticker_returns_partial(self, client):
        """Invalid/unknown ticker should be skipped, not crash the endpoint."""
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL,FAKEXYZ999&range=1M")
        assert r.status_code == 200
        # Should have AAPL but FAKEXYZ still returns mock data
        assert len(r.json()["series"]) >= 1

    @pytest.mark.asyncio
    async def test_compare_pct_change_calculated(self, client):
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL&range=1M")
        series = r.json()["series"][0]
        calculated = ((series["end_price"] - series["start_price"]) / series["start_price"]) * 100
        assert series["pct_change"] == pytest.approx(calculated, abs=0.01)


# ─── Stocks — Market Overview ─────────────────────────────────────────────────

class TestMarketOverviewEndpoint:
    @pytest.mark.asyncio
    async def test_market_overview_returns_50_items(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) == 50

    @pytest.mark.asyncio
    async def test_market_overview_all_items_have_prices(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        for item in r.json()["items"]:
            assert item["price"] is not None, f"{item['ticker']} has null price"
            assert item["price"] > 0

    @pytest.mark.asyncio
    async def test_market_overview_has_volume(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        items_with_volume = [i for i in r.json()["items"] if i.get("volume") is not None]
        # At least some items should have volume
        assert len(items_with_volume) > 0

    @pytest.mark.asyncio
    async def test_market_overview_has_updated_at(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        assert "updated_at" in r.json()

    @pytest.mark.asyncio
    async def test_market_overview_brk_b_included(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        tickers = {i["ticker"] for i in r.json()["items"]}
        assert "BRK.B" in tickers


# ─── Watchlist CRUD ───────────────────────────────────────────────────────────

class TestWatchlistEndpoints:
    @pytest.mark.asyncio
    async def test_list_watchlists_empty_on_fresh_db(self, client):
        r = await client.get("/api/v1/watchlist/")
        assert r.status_code == 200
        assert r.json() == []

    @pytest.mark.asyncio
    async def test_create_watchlist(self, client):
        r = await client.post("/api/v1/watchlist/", json={"name": "My Stocks"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "My Stocks"
        assert "id" in data
        assert data["tickers"] == []

    @pytest.mark.asyncio
    async def test_rename_watchlist(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "Old Name"})
        wl_id = create.json()["id"]
        r = await client.patch(f"/api/v1/watchlist/{wl_id}", json={"name": "New Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "New Name"

    @pytest.mark.asyncio
    async def test_delete_watchlist(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "To Delete"})
        wl_id = create.json()["id"]
        r = await client.delete(f"/api/v1/watchlist/{wl_id}")
        assert r.status_code == 200
        # Verify it's gone
        r2 = await client.get("/api/v1/watchlist/")
        ids = [wl["id"] for wl in r2.json()]
        assert wl_id not in ids

    @pytest.mark.asyncio
    async def test_add_ticker_to_watchlist(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "Tech"})
        wl_id = create.json()["id"]
        r = await client.post(f"/api/v1/watchlist/{wl_id}/items", json={"ticker": "aapl"})
        assert r.status_code == 200
        # Fetch and verify
        lists = await client.get("/api/v1/watchlist/")
        wl = next(w for w in lists.json() if w["id"] == wl_id)
        assert "AAPL" in wl["tickers"]

    @pytest.mark.asyncio
    async def test_ticker_uppercased_on_add(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "Case Test"})
        wl_id = create.json()["id"]
        await client.post(f"/api/v1/watchlist/{wl_id}/items", json={"ticker": "tsla"})
        lists = await client.get("/api/v1/watchlist/")
        wl = next(w for w in lists.json() if w["id"] == wl_id)
        assert "TSLA" in wl["tickers"]
        assert "tsla" not in wl["tickers"]

    @pytest.mark.asyncio
    async def test_duplicate_ticker_rejected(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "Dup Test"})
        wl_id = create.json()["id"]
        await client.post(f"/api/v1/watchlist/{wl_id}/items", json={"ticker": "AAPL"})
        r = await client.post(f"/api/v1/watchlist/{wl_id}/items", json={"ticker": "AAPL"})
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_remove_ticker(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "Remove Test"})
        wl_id = create.json()["id"]
        await client.post(f"/api/v1/watchlist/{wl_id}/items", json={"ticker": "MSFT"})
        r = await client.delete(f"/api/v1/watchlist/{wl_id}/items/MSFT")
        assert r.status_code == 200
        lists = await client.get("/api/v1/watchlist/")
        wl = next(w for w in lists.json() if w["id"] == wl_id)
        assert "MSFT" not in wl["tickers"]

    @pytest.mark.asyncio
    async def test_reorder_tickers(self, client):
        create = await client.post("/api/v1/watchlist/", json={"name": "Reorder Test"})
        wl_id = create.json()["id"]
        for t in ["AAPL", "MSFT", "NVDA"]:
            await client.post(f"/api/v1/watchlist/{wl_id}/items", json={"ticker": t})

        r = await client.put(f"/api/v1/watchlist/{wl_id}/reorder",
                              json={"ticker_order": ["NVDA", "AAPL", "MSFT"]})
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_nonexistent_watchlist_returns_404(self, client):
        r = await client.patch("/api/v1/watchlist/99999", json={"name": "ghost"})
        assert r.status_code == 404


# ─── Sentiment endpoint ───────────────────────────────────────────────────────

class TestSentimentEndpoints:
    @pytest.mark.asyncio
    async def test_sentiment_returns_data(self, client):
        """Should fall back to live StockTwits when no DB record."""
        with patch("app.routers.sentiment.get_stocktwits_stream", new_callable=AsyncMock,
                   return_value=[
                       {"raw_sentiment": "Bullish"} for _ in range(20)
                   ]):
            r = await client.get("/api/v1/sentiment/AAPL")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert data["score"] == 1.0
        assert data["label"] == "positive"
        assert data["post_volume"] == 20

    @pytest.mark.asyncio
    async def test_sentiment_history_does_not_route_to_ticker_endpoint(self, client):
        """
        Critical: GET /sentiment/AAPL/history must NOT treat 'AAPL/history' as ticker.
        Route order in sentiment.py: /history must be declared before /{ticker}.
        """
        r = await client.get("/api/v1/sentiment/AAPL/history")
        # Should return a history response (list), not a sentiment score for "AAPL/HISTORY"
        assert r.status_code == 200
        data = r.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        # ticker in response should be "AAPL", not "AAPL/HISTORY"
        assert data["ticker"] == "AAPL"

    @pytest.mark.asyncio
    async def test_sentiment_uses_db_record_when_present(self, client, db_session):
        from app.models.models import SentimentScore
        db_session.add(SentimentScore(
            ticker="GOOG",
            label="negative",
            score=-0.45,
            post_volume=88,
            window_hours=24,
            computed_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        ))
        await db_session.flush()

        r = await client.get("/api/v1/sentiment/GOOG")
        assert r.status_code == 200
        data = r.json()
        assert data["label"] == "negative"
        assert data["score"] == pytest.approx(-0.45, abs=0.001)
        assert data["source"] == "db"

    @pytest.mark.asyncio
    async def test_sentiment_history_empty_returns_list(self, client):
        r = await client.get("/api/v1/sentiment/UNKNOWNTICKER999/history")
        assert r.status_code == 200
        assert r.json()["history"] == []


# ─── Input validation (cross-cutting) ────────────────────────────────────────

class TestInputValidation:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("path", [
        "/api/v1/stocks/quote/AAPL; DROP TABLE users;--",
        "/api/v1/stocks/quote/AAPL%00MSFT",
        "/api/v1/stocks/candles/A!@#$%",
    ])
    async def test_injection_attempts_rejected(self, client, path):
        r = await client.get(path)
        assert r.status_code in (404, 422), f"Expected rejection for {path}, got {r.status_code}"

    @pytest.mark.asyncio
    async def test_missing_required_param_rejected(self, client):
        r = await client.get("/api/v1/stocks/search")  # missing q=
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_watchlist_empty_name_handled(self, client):
        r = await client.post("/api/v1/watchlist/", json={"name": "   "})
        # Either creates with trimmed name or rejects — both are acceptable
        assert r.status_code in (200, 422)
