"""
Phase 11 tests — App Shell Polish & Navigation
Phase 11 is predominantly a frontend phase (sidebar sections, NEW badges,
keyboard shortcuts, LIVE indicator, accessibility). These backend tests
validate all navigation targets and the existing infrastructure.
"""
import pytest


class TestNavigationEndpoints:
    """Every sidebar nav item hits a backend endpoint — validate all return 200."""

    @pytest.mark.asyncio
    async def test_dashboard_quote(self, client):
        r = await client.get("/api/v1/stocks/quote/AAPL")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_market_overview(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_compare(self, client):
        r = await client.get("/api/v1/stocks/compare?tickers=AAPL,MSFT&range=1M")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_watchlist(self, client):
        r = await client.get("/api/v1/watchlist/")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_portfolio(self, client):
        r = await client.get("/api/v1/portfolio/")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_screener(self, client):
        r = await client.get("/api/v1/screener/")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_alerts(self, client):
        r = await client.get("/api/v1/alerts/")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_earnings_calendar(self, client):
        r = await client.get("/api/v1/earnings/calendar")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_health(self, client):
        r = await client.get("/health")
        assert r.status_code == 200


class TestExportCSV:
    """Context-aware Export CSV pulls from these endpoints."""

    @pytest.mark.asyncio
    async def test_portfolio_summary_for_export(self, client):
        cp = await client.post("/api/v1/portfolio/", json={"name": "ExportTest"})
        pid = cp.json()["id"]
        await client.post(f"/api/v1/portfolio/{pid}/positions",
                          json={"ticker": "AAPL", "shares": 5, "avg_cost": 150.0})
        r = await client.get(f"/api/v1/portfolio/{pid}/summary")
        assert r.status_code == 200
        assert "positions" in r.json()

    @pytest.mark.asyncio
    async def test_screener_results_for_export(self, client):
        r = await client.get("/api/v1/screener/?sort_by=change_pct&sort_dir=desc")
        assert r.status_code == 200
        assert "results" in r.json()

    @pytest.mark.asyncio
    async def test_candles_for_export(self, client):
        r = await client.get("/api/v1/stocks/candles/AAPL?range=1M")
        assert r.status_code == 200
        assert "candles" in r.json()


class TestRunScreener:
    """Run Screener CTA and screener load sequence."""

    @pytest.mark.asyncio
    async def test_screener_default_load(self, client):
        r = await client.get("/api/v1/screener/")
        assert r.status_code == 200
        assert r.json()["page"] == 1

    @pytest.mark.asyncio
    async def test_screener_presets(self, client):
        r = await client.get("/api/v1/screener/presets")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["presets"]]
        assert "high_momentum" in ids
        assert "oversold_tech" in ids

    @pytest.mark.asyncio
    async def test_screener_fields(self, client):
        r = await client.get("/api/v1/screener/fields")
        assert r.status_code == 200
        keys = [f["key"] for f in r.json()["fields"]]
        assert "pe_ratio" in keys
        assert "rsi" in keys


class TestLiveIndicator:
    """LIVE badge status driven by health endpoint."""

    @pytest.mark.asyncio
    async def test_health_has_db_and_redis(self, client):
        r = await client.get("/health")
        data = r.json()
        assert "db" in data
        assert "redis" in data

    @pytest.mark.asyncio
    async def test_openapi_loads(self, client):
        r = await client.get("/openapi.json")
        assert r.status_code == 200
        assert "openapi" in r.json()


class TestKeyboardShortcutTargets:
    """G→ shortcuts navigate to routes backed by these endpoints."""

    @pytest.mark.asyncio
    async def test_gd_dashboard(self, client):
        assert (await client.get("/api/v1/stocks/quote/AAPL")).status_code == 200

    @pytest.mark.asyncio
    async def test_gp_portfolio(self, client):
        assert (await client.get("/api/v1/portfolio/")).status_code == 200

    @pytest.mark.asyncio
    async def test_gm_market(self, client):
        assert (await client.get("/api/v1/stocks/market/overview")).status_code == 200

    @pytest.mark.asyncio
    async def test_gw_watchlist(self, client):
        assert (await client.get("/api/v1/watchlist/")).status_code == 200

    @pytest.mark.asyncio
    async def test_gs_screener(self, client):
        assert (await client.get("/api/v1/screener/")).status_code == 200

    @pytest.mark.asyncio
    async def test_ga_alerts(self, client):
        assert (await client.get("/api/v1/alerts/")).status_code == 200

    @pytest.mark.asyncio
    async def test_ge_earnings(self, client):
        assert (await client.get("/api/v1/earnings/calendar")).status_code == 200
