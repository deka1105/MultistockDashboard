"""
Phase 10 tests — Portfolio Command Centre
Covers the three new portfolio-specific endpoints:
  - /portfolio/{id}/upcoming-earnings
  - /portfolio/{id}/active-alerts
  - /portfolio/{id}/screener-preview
"""
import pytest


async def _setup_portfolio_with_positions(client) -> int:
    """Helper: create a portfolio with a few positions and return its ID."""
    cp = await client.post("/api/v1/portfolio/", json={"name": "Phase10Test"})
    pid = cp.json()["id"]
    for ticker, shares, cost in [("AAPL", 10, 150.0), ("MSFT", 5, 300.0), ("NVDA", 2, 400.0)]:
        await client.post(f"/api/v1/portfolio/{pid}/positions", json={
            "ticker": ticker, "shares": shares, "avg_cost": cost
        })
    return pid


# ─── Upcoming Earnings ────────────────────────────────────────────────────────

class TestPortfolioUpcomingEarnings:

    @pytest.mark.asyncio
    async def test_returns_200(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_response_has_required_keys(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        data = r.json()
        assert "events"  in data
        assert "tickers" in data
        assert "count"   in data

    @pytest.mark.asyncio
    async def test_tickers_match_portfolio_holdings(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        held   = set(r.json()["tickers"])
        # All returned tickers should be from the portfolio
        expected = {"AAPL", "MSFT", "NVDA"}
        assert held == expected

    @pytest.mark.asyncio
    async def test_events_only_for_held_tickers(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        held_tickers = set(r.json()["tickers"])
        for ev in r.json()["events"]:
            assert ev["ticker"] in held_tickers, \
                f"Event ticker {ev['ticker']} not in portfolio"

    @pytest.mark.asyncio
    async def test_events_have_report_date(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        for ev in r.json()["events"]:
            assert "report_date" in ev
            assert len(ev["report_date"]) == 10   # YYYY-MM-DD

    @pytest.mark.asyncio
    async def test_count_matches_events_length(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        data = r.json()
        assert data["count"] == len(data["events"])

    @pytest.mark.asyncio
    async def test_empty_portfolio_returns_empty_events(self, client):
        cp = await client.post("/api/v1/portfolio/", json={"name": "EmptyPortfolio"})
        pid = cp.json()["id"]
        r = await client.get(f"/api/v1/portfolio/{pid}/upcoming-earnings")
        assert r.status_code == 200
        assert r.json()["events"] == []
        assert r.json()["tickers"] == []


# ─── Active Alerts ────────────────────────────────────────────────────────────

class TestPortfolioActiveAlerts:

    @pytest.mark.asyncio
    async def test_returns_200(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/active-alerts")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_response_has_active_and_triggered(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/active-alerts")
        data = r.json()
        assert "active"    in data
        assert "triggered" in data
        assert isinstance(data["active"],    list)
        assert isinstance(data["triggered"], list)

    @pytest.mark.asyncio
    async def test_active_alerts_only_for_portfolio_tickers(self, client):
        pid = await _setup_portfolio_with_positions(client)
        # Create an alert for a held ticker
        await client.post("/api/v1/alerts/", json={
            "ticker": "AAPL", "alert_type": "price_above", "threshold": 999999.0
        })
        # Create an alert for a non-held ticker
        await client.post("/api/v1/alerts/", json={
            "ticker": "TSLA", "alert_type": "price_above", "threshold": 999999.0
        })
        r = await client.get(f"/api/v1/portfolio/{pid}/active-alerts")
        held = {"AAPL", "MSFT", "NVDA"}
        for alert in r.json()["active"]:
            assert alert["ticker"] in held, \
                f"Alert ticker {alert['ticker']} not in portfolio holdings"

    @pytest.mark.asyncio
    async def test_alert_fields_present(self, client):
        pid = await _setup_portfolio_with_positions(client)
        await client.post("/api/v1/alerts/", json={
            "ticker": "NVDA", "alert_type": "price_below", "threshold": 1.0
        })
        r = await client.get(f"/api/v1/portfolio/{pid}/active-alerts")
        if r.json()["active"]:
            a = r.json()["active"][0]
            for field in ["id", "ticker", "alert_type", "threshold", "is_active", "created_at"]:
                assert field in a

    @pytest.mark.asyncio
    async def test_empty_portfolio_no_alerts(self, client):
        cp = await client.post("/api/v1/portfolio/", json={"name": "NoAlerts"})
        pid = cp.json()["id"]
        r = await client.get(f"/api/v1/portfolio/{pid}/active-alerts")
        assert r.json()["active"]    == []
        assert r.json()["triggered"] == []

    @pytest.mark.asyncio
    async def test_triggered_alerts_at_most_5(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/active-alerts")
        assert len(r.json()["triggered"]) <= 5


# ─── Screener Preview ─────────────────────────────────────────────────────────

class TestPortfolioScreenerPreview:

    @pytest.mark.asyncio
    async def test_returns_200(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_response_has_required_keys(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        data = r.json()
        assert "results"       in data
        assert "preset"        in data
        assert "held_tickers"  in data
        assert "overlap_count" in data
        assert "total_matches" in data

    @pytest.mark.asyncio
    async def test_preset_is_high_momentum(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        assert r.json()["preset"] == "high_momentum"

    @pytest.mark.asyncio
    async def test_results_at_most_5(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        assert len(r.json()["results"]) <= 5

    @pytest.mark.asyncio
    async def test_held_tickers_match_portfolio(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        held = set(r.json()["held_tickers"])
        assert held == {"AAPL", "MSFT", "NVDA"}

    @pytest.mark.asyncio
    async def test_overlap_count_is_non_negative(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        assert r.json()["overlap_count"] >= 0

    @pytest.mark.asyncio
    async def test_overlap_count_le_results_count(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        data = r.json()
        assert data["overlap_count"] <= len(data["results"])

    @pytest.mark.asyncio
    async def test_result_rows_have_required_fields(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        for row in r.json()["results"]:
            assert "ticker"       in row
            assert "price"        in row
            assert "change_pct"   in row
            assert "in_portfolio" in row

    @pytest.mark.asyncio
    async def test_in_portfolio_flag_correct(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        held = {"AAPL", "MSFT", "NVDA"}
        for row in r.json()["results"]:
            if row["ticker"] in held:
                assert row["in_portfolio"] is True

    @pytest.mark.asyncio
    async def test_total_matches_gte_results(self, client):
        pid = await _setup_portfolio_with_positions(client)
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        data = r.json()
        assert data["total_matches"] >= len(data["results"])

    @pytest.mark.asyncio
    async def test_empty_portfolio_still_returns_results(self, client):
        """Screener runs on SP50 regardless of portfolio contents."""
        cp = await client.post("/api/v1/portfolio/", json={"name": "EmptyPortfolio2"})
        pid = cp.json()["id"]
        r = await client.get(f"/api/v1/portfolio/{pid}/screener-preview")
        assert r.status_code == 200
        assert r.json()["overlap_count"] == 0
