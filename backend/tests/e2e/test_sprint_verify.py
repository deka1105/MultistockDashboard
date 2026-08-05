"""TEMPORARY Sprint verification — offline (mock-data) checks for the
multi-period market overview and enriched screener-preview. Deleted after the run."""
import pytest
from unittest.mock import patch
from app.services import mock_data as m
from tests.e2e.test_phase10 import _setup_portfolio_with_positions


@pytest.fixture(autouse=True)
def force_mock():
    async def quote(t):   return m.get_mock_quote(t)
    async def profile(t): return m.get_mock_profile(t)
    async def fins(t):    return m.get_mock_financials(t)
    async def candles(t, range_key="1M"): return m.get_mock_candles(t, range_key)
    with patch("app.services.finnhub.get_quote", side_effect=quote), \
         patch("app.services.finnhub.get_company_profile", side_effect=profile), \
         patch("app.services.finnhub.get_basic_financials", side_effect=fins), \
         patch("app.services.finnhub.get_candles", side_effect=candles):
        yield


class TestMultiPeriodOverview:
    @pytest.mark.asyncio
    async def test_overview_has_period_fields(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 50
        for it in items:
            assert "change_pct_1w" in it and "change_pct_1m" in it and "change_pct_ytd" in it
        # mock 1Y candles should yield at least some non-null period returns
        assert any(it["change_pct_ytd"] is not None for it in items)


class TestEnrichedScreenerPreview:
    @pytest.mark.asyncio
    async def test_preview_enriched_and_presets(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["presets"], list) and len(data["presets"]) == 5
        assert data["preset"] == "high_momentum"
        assert "preset_name" in data
        for row in data["results"]:
            for k in ("ticker", "price", "change_pct", "in_portfolio", "company_name", "rsi", "signal"):
                assert k in row, f"missing {k}"

    @pytest.mark.asyncio
    async def test_preview_preset_switch(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview?preset=value_picks")
        assert r.status_code == 200
        assert r.json()["preset"] == "value_picks"

    @pytest.mark.asyncio
    async def test_preview_bad_preset_falls_back(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview?preset=nonsense")
        assert r.status_code == 200
        assert r.json()["preset"] == "high_momentum"
