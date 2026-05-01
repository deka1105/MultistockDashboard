"""Phase 8 tests — screener, alerts, and earnings endpoints."""
import pytest
from unittest.mock import AsyncMock, patch
from tests.conftest import MOCK_QUOTE, MOCK_FINANCIALS_RAW, MOCK_PROFILE


# ─── Screener ─────────────────────────────────────────────────────────────────

class TestScreenerEndpoints:
    @pytest.mark.asyncio
    async def test_presets_returns_list(self, client):
        r = await client.get("/api/v1/screener/presets")
        assert r.status_code == 200
        data = r.json()
        assert "presets" in data
        assert len(data["presets"]) >= 4
        for p in data["presets"]:
            assert "id" in p and "name" in p and "filters" in p

    @pytest.mark.asyncio
    async def test_fields_returns_list(self, client):
        r = await client.get("/api/v1/screener/fields")
        assert r.status_code == 200
        data = r.json()
        assert "fields" in data and "operators" in data
        keys = [f["key"] for f in data["fields"]]
        for expected in ["price", "pe_ratio", "rsi", "beta", "sector"]:
            assert expected in keys

    @pytest.mark.asyncio
    async def test_screener_no_filters_returns_50_results(self, client):
        r = await client.get("/api/v1/screener/")
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert "total" in data
        assert data["total"] == 50  # all SP500_TOP50 with no filter

    @pytest.mark.asyncio
    async def test_screener_with_pe_filter(self, client):
        """Filter PE < 30 — should return subset."""
        import json
        filters = json.dumps([{"field": "pe_ratio", "operator": "lt", "value": 30}])
        r = await client.get("/api/v1/screener/", params={"filters": filters})
        assert r.status_code == 200
        data = r.json()
        for row in data["results"]:
            if row["pe_ratio"] is not None:
                assert row["pe_ratio"] < 30

    @pytest.mark.asyncio
    async def test_screener_sector_filter(self, client):
        """Categorical filter on sector."""
        import json
        filters = json.dumps([{"field": "sector", "operator": "eq", "value": "Technology"}])
        r = await client.get("/api/v1/screener/", params={"filters": filters})
        assert r.status_code == 200
        for row in r.json()["results"]:
            if row["sector"] is not None:
                assert row["sector"] == "Technology"

    @pytest.mark.asyncio
    async def test_screener_result_has_signal(self, client):
        r = await client.get("/api/v1/screener/")
        assert r.status_code == 200
        for row in r.json()["results"]:
            if row.get("rsi") is not None:
                assert row["signal"] in ("strong_buy", "buy", "hold", "watch", "sell")

    @pytest.mark.asyncio
    async def test_screener_pagination(self, client):
        r1 = await client.get("/api/v1/screener/", params={"page": 1, "per_page": 10})
        r2 = await client.get("/api/v1/screener/", params={"page": 2, "per_page": 10})
        assert r1.status_code == 200
        assert r2.status_code == 200
        tickers_p1 = {row["ticker"] for row in r1.json()["results"]}
        tickers_p2 = {row["ticker"] for row in r2.json()["results"]}
        # No overlap between pages
        assert tickers_p1.isdisjoint(tickers_p2)

    @pytest.mark.asyncio
    async def test_screener_sort_by_price_desc(self, client):
        r = await client.get("/api/v1/screener/", params={"sort_by": "price", "sort_dir": "desc"})
        assert r.status_code == 200
        prices = [row["price"] for row in r.json()["results"] if row["price"] is not None]
        assert prices == sorted(prices, reverse=True)

    @pytest.mark.asyncio
    async def test_screener_invalid_json_filter_graceful(self, client):
        r = await client.get("/api/v1/screener/", params={"filters": "not-json"})
        assert r.status_code == 200  # gracefully falls back to no filter
        assert r.json()["total"] == 50


# ─── RSI computation ─────────────────────────────────────────────────────────

class TestRSIComputation:
    """Unit tests for the Python RSI function in screener.py."""

    def _rsi(self, closes, period=14):
        from app.routers.screener import _calc_rsi
        return _calc_rsi(closes, period)

    def test_rsi_insufficient_data_returns_none(self):
        assert self._rsi([100, 101, 102], period=14) is None

    def test_rsi_between_0_and_100(self):
        import math, random
        rng = random.Random(42)
        closes = [100 + rng.gauss(0, 5) for _ in range(40)]
        result = self._rsi(closes, 14)
        assert result is not None
        assert 0.0 <= result <= 100.0

    def test_rsi_uptrend_above_50(self):
        closes = [100 + i for i in range(30)]
        result = self._rsi(closes, 14)
        assert result is not None and result > 70

    def test_rsi_downtrend_below_50(self):
        closes = [200 - i * 2 for i in range(30)]
        result = self._rsi(closes, 14)
        assert result is not None and result < 30


# ─── Alerts ──────────────────────────────────────────────────────────────────

class TestAlertEndpoints:
    @pytest.mark.asyncio
    async def test_list_alerts_empty(self, client):
        r = await client.get("/api/v1/alerts/")
        assert r.status_code == 200
        assert r.json()["alerts"] == []

    @pytest.mark.asyncio
    async def test_create_price_above_alert(self, client):
        r = await client.post("/api/v1/alerts/", json={
            "ticker": "aapl", "alert_type": "price_above", "threshold": 250.0
        })
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"]     == "AAPL"
        assert data["alert_type"] == "price_above"
        assert data["threshold"]  == 250.0
        assert data["is_active"]  is True

    @pytest.mark.asyncio
    async def test_create_price_below_alert(self, client):
        r = await client.post("/api/v1/alerts/", json={
            "ticker": "TSLA", "alert_type": "price_below", "threshold": 100.0
        })
        assert r.status_code == 200
        assert r.json()["is_active"] is True

    @pytest.mark.asyncio
    async def test_create_alert_invalid_type_rejected(self, client):
        r = await client.post("/api/v1/alerts/", json={
            "ticker": "AAPL", "alert_type": "invalid_type", "threshold": 200.0
        })
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_alert(self, client):
        create = await client.post("/api/v1/alerts/", json={
            "ticker": "MSFT", "alert_type": "price_above", "threshold": 500.0
        })
        aid = create.json()["id"]
        r   = await client.delete(f"/api/v1/alerts/{aid}")
        assert r.status_code == 200
        assert r.json()["deleted"] is True

    @pytest.mark.asyncio
    async def test_delete_nonexistent_alert_404(self, client):
        r = await client.delete("/api/v1/alerts/99999")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_check_alerts_triggers_when_condition_met(self, client):
        """price_above $1 should immediately trigger since mock price is ~$189."""
        await client.post("/api/v1/alerts/", json={
            "ticker": "AAPL", "alert_type": "price_above", "threshold": 1.0
        })
        r = await client.post("/api/v1/alerts/check")
        assert r.status_code == 200
        triggered = r.json()["triggered"]
        assert any(t["ticker"] == "AAPL" for t in triggered)

    @pytest.mark.asyncio
    async def test_check_alerts_does_not_trigger_when_far_from_threshold(self, client):
        """price_above $9999 should NOT trigger."""
        await client.post("/api/v1/alerts/", json={
            "ticker": "NVDA", "alert_type": "price_above", "threshold": 9999.0
        })
        r = await client.post("/api/v1/alerts/check")
        assert r.status_code == 200
        triggered = r.json()["triggered"]
        assert not any(t["ticker"] == "NVDA" for t in triggered)

    @pytest.mark.asyncio
    async def test_reactivate_triggered_alert(self, client):
        # Create and immediately trigger
        cr = await client.post("/api/v1/alerts/", json={
            "ticker": "AAPL", "alert_type": "price_above", "threshold": 1.0
        })
        aid = cr.json()["id"]
        await client.post("/api/v1/alerts/check")
        # Reactivate
        r = await client.patch(f"/api/v1/alerts/{aid}/reactivate")
        assert r.status_code == 200
        assert r.json()["is_active"] is True
        assert r.json()["triggered_at"] is None

    @pytest.mark.asyncio
    async def test_ticker_uppercased_on_create(self, client):
        r = await client.post("/api/v1/alerts/", json={
            "ticker": "goog", "alert_type": "price_below", "threshold": 100.0
        })
        assert r.json()["ticker"] == "GOOG"


# ─── Earnings ─────────────────────────────────────────────────────────────────

class TestEarningsEndpoints:
    @pytest.mark.asyncio
    async def test_calendar_returns_events(self, client):
        r = await client.get("/api/v1/earnings/calendar")
        assert r.status_code == 200
        data = r.json()
        assert "events" in data
        assert "count"  in data
        assert data["count"] > 0
        for e in data["events"]:
            assert "ticker"      in e
            assert "report_date" in e

    @pytest.mark.asyncio
    async def test_calendar_events_have_required_fields(self, client):
        r = await client.get("/api/v1/earnings/calendar")
        for event in r.json()["events"]:
            assert isinstance(event["ticker"], str)
            # date format YYYY-MM-DD
            assert len(event["report_date"]) >= 10

    @pytest.mark.asyncio
    async def test_history_returns_quarters(self, client):
        r = await client.get("/api/v1/earnings/AAPL/history")
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"] == "AAPL"
        assert "quarters" in data
        assert len(data["quarters"]) > 0

    @pytest.mark.asyncio
    async def test_history_quarter_has_eps_fields(self, client):
        r = await client.get("/api/v1/earnings/NVDA/history")
        for q in r.json()["quarters"]:
            assert "eps_estimate" in q
            assert "eps_actual"   in q
            assert "beat_miss"    in q

    @pytest.mark.asyncio
    async def test_history_beat_miss_values_valid(self, client):
        r = await client.get("/api/v1/earnings/MSFT/history")
        for q in r.json()["quarters"]:
            if q["beat_miss"] is not None:
                assert q["beat_miss"] in ("beat", "miss", "inline")

    @pytest.mark.asyncio
    async def test_history_unknown_ticker_still_returns(self, client):
        """Mock fallback generates deterministic history for any ticker."""
        r = await client.get("/api/v1/earnings/ZZZZ/history")
        assert r.status_code == 200
        assert len(r.json()["quarters"]) > 0
