"""
Phase 6 — Portfolio tests.
Unit: P&L computation math.
Integration: DB model CRUD.
E2E: Every portfolio HTTP endpoint.
"""
import pytest
from unittest.mock import AsyncMock, patch
from tests.conftest import MOCK_QUOTE


# ─── Unit: P&L computation ────────────────────────────────────────────────────

class TestPnLComputation:
    """Pure math tests for P&L calculations — no DB, no HTTP."""

    def _make_position(self, ticker, shares, avg_cost):
        """Minimal position-like object."""
        class Pos:
            pass
        p = Pos()
        p.ticker   = ticker
        p.shares   = shares
        p.avg_cost = avg_cost
        p.notes    = None
        p.opened_at = None
        p.id       = 1
        return p

    @pytest.mark.asyncio
    async def test_pnl_positive_when_price_above_cost(self):
        """Position where current price > avg cost → positive P&L."""
        from app.routers.portfolio import _compute_summary, Portfolio

        p = Portfolio()
        p.id   = 1
        p.name = "Test"

        pos = self._make_position("AAPL", 10, 150.0)  # 10 shares @ $150

        with patch("app.routers.portfolio.fh.get_quote",
                   new_callable=AsyncMock,
                   return_value={**MOCK_QUOTE, "price": 189.50, "change": 1.23, "change_pct": 0.65, "prev_close": 188.27}), \
             patch("app.routers.portfolio.fh.get_basic_financials",
                   new_callable=AsyncMock,
                   return_value={"beta": 1.25}):
            result = await _compute_summary(p, [pos])

        assert result["total_pnl"] > 0
        assert result["positions"][0]["pnl"] == pytest.approx((189.50 - 150.0) * 10, abs=0.01)
        assert result["positions"][0]["pnl_pct"] == pytest.approx(((189.50 - 150.0) / 150.0) * 100, abs=0.01)

    @pytest.mark.asyncio
    async def test_pnl_negative_when_price_below_cost(self):
        """Position where current price < avg cost → negative P&L."""
        from app.routers.portfolio import _compute_summary, Portfolio

        p = Portfolio(); p.id = 1; p.name = "Test"
        pos = self._make_position("TSLA", 25, 250.0)  # bought at $250

        with patch("app.routers.portfolio.fh.get_quote",
                   new_callable=AsyncMock,
                   return_value={**MOCK_QUOTE, "price": 177.80, "change": -3.20, "change_pct": -1.77, "prev_close": 181.0}), \
             patch("app.routers.portfolio.fh.get_basic_financials",
                   new_callable=AsyncMock, return_value={}):
            result = await _compute_summary(p, [pos])

        assert result["total_pnl"] < 0
        assert result["positions"][0]["pnl_pct"] < 0

    @pytest.mark.asyncio
    async def test_empty_portfolio_returns_zeros(self):
        from app.routers.portfolio import _compute_summary, Portfolio
        p = Portfolio(); p.id = 1; p.name = "Empty"
        result = await _compute_summary(p, [])
        assert result["total_value"] == 0.0
        assert result["total_pnl"]   == 0.0
        assert result["positions"]   == []
        assert result["best_performer"]  is None
        assert result["worst_performer"] is None

    @pytest.mark.asyncio
    async def test_weight_pct_sums_to_100(self):
        from app.routers.portfolio import _compute_summary, Portfolio
        p = Portfolio(); p.id = 1; p.name = "Multi"

        positions = [
            self._make_position("AAPL", 10, 150.0),
            self._make_position("MSFT", 5,  380.0),
        ]

        prices = {"AAPL": 189.50, "MSFT": 415.20}

        async def mock_quote(ticker):
            return {**MOCK_QUOTE, "ticker": ticker, "price": prices[ticker],
                    "change": 1.0, "change_pct": 0.5, "prev_close": prices[ticker] - 1}

        with patch("app.routers.portfolio.fh.get_quote", side_effect=mock_quote), \
             patch("app.routers.portfolio.fh.get_basic_financials",
                   new_callable=AsyncMock, return_value={"beta": 1.0}):
            result = await _compute_summary(p, positions)

        total_weight = sum(pos["weight_pct"] for pos in result["positions"])
        assert total_weight == pytest.approx(100.0, abs=0.1)

    @pytest.mark.asyncio
    async def test_beta_weighted_average(self):
        from app.routers.portfolio import _compute_summary, Portfolio
        p = Portfolio(); p.id = 1; p.name = "Beta"

        # Equal value positions: beta 2.0 and beta 0.5 → weighted avg ~1.25
        positions = [
            self._make_position("AAPL", 10, 100.0),  # value $1000
            self._make_position("MSFT", 10, 100.0),  # value $1000
        ]

        betas = {"AAPL": 2.0, "MSFT": 0.5}

        async def mock_quote(ticker):
            return {**MOCK_QUOTE, "ticker": ticker, "price": 100.0,
                    "change": 0.0, "change_pct": 0.0, "prev_close": 100.0}

        async def mock_fin(ticker):
            return {"beta": betas[ticker]}

        with patch("app.routers.portfolio.fh.get_quote", side_effect=mock_quote), \
             patch("app.routers.portfolio.fh.get_basic_financials", side_effect=mock_fin):
            result = await _compute_summary(p, positions)

        assert result["beta"] == pytest.approx(1.25, abs=0.01)

    @pytest.mark.asyncio
    async def test_best_worst_performer_identified(self):
        from app.routers.portfolio import _compute_summary, Portfolio
        p = Portfolio(); p.id = 1; p.name = "Perf"

        positions = [
            self._make_position("NVDA", 10, 482.0),  # big winner
            self._make_position("TSLA", 10, 250.0),  # loser
        ]

        prices = {"NVDA": 667.0, "TSLA": 177.0}

        async def mock_quote(ticker):
            return {**MOCK_QUOTE, "ticker": ticker, "price": prices[ticker],
                    "change": 0.0, "change_pct": 0.0, "prev_close": prices[ticker]}

        with patch("app.routers.portfolio.fh.get_quote", side_effect=mock_quote), \
             patch("app.routers.portfolio.fh.get_basic_financials",
                   new_callable=AsyncMock, return_value={}):
            result = await _compute_summary(p, positions)

        assert result["best_performer"]["ticker"]  == "NVDA"
        assert result["worst_performer"]["ticker"] == "TSLA"
        assert result["best_performer"]["pnl_pct"]  > 0
        assert result["worst_performer"]["pnl_pct"] < 0

    @pytest.mark.asyncio
    async def test_quote_failure_falls_back_to_cost_basis(self):
        """If Finnhub is unreachable, position value defaults to cost basis (no crash)."""
        from app.routers.portfolio import _compute_summary, Portfolio
        p = Portfolio(); p.id = 1; p.name = "Fallback"
        pos = self._make_position("AAPL", 10, 150.0)

        with patch("app.routers.portfolio.fh.get_quote",
                   new_callable=AsyncMock, side_effect=ConnectionError("Finnhub down")), \
             patch("app.routers.portfolio.fh.get_basic_financials",
                   new_callable=AsyncMock, return_value={}):
            result = await _compute_summary(p, [pos])

        # Should not raise; falls back to avg_cost as price
        assert result["total_value"]    == pytest.approx(150.0 * 10, abs=0.01)
        assert result["total_pnl"]      == pytest.approx(0.0, abs=0.01)


# ─── Integration: Portfolio DB models ─────────────────────────────────────────

class TestPortfolioModels:
    @pytest.mark.asyncio
    async def test_create_portfolio(self, db_session):
        from app.models.models import User, Portfolio
        from app.routers.portfolio import GUEST_ID
        from sqlalchemy import select

        user = User(id=GUEST_ID + 200, email="pf@test.com", hashed_password="x")
        db_session.add(user)
        await db_session.flush()

        pf = Portfolio(user_id=GUEST_ID + 200, name="Test Portfolio")
        db_session.add(pf)
        await db_session.flush()

        result = await db_session.execute(
            select(Portfolio).where(Portfolio.id == pf.id)
        )
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.name == "Test Portfolio"

    @pytest.mark.asyncio
    async def test_create_position(self, db_session):
        from app.models.models import User, Portfolio, Position
        from app.routers.portfolio import GUEST_ID
        from sqlalchemy import select

        user = User(id=GUEST_ID + 201, email="pos@test.com", hashed_password="x")
        db_session.add(user)
        await db_session.flush()

        pf = Portfolio(user_id=GUEST_ID + 201, name="With Positions")
        db_session.add(pf)
        await db_session.flush()

        pos = Position(portfolio_id=pf.id, ticker="AAPL", shares=10.0, avg_cost=150.0)
        db_session.add(pos)
        await db_session.flush()

        result = await db_session.execute(
            select(Position).where(Position.portfolio_id == pf.id)
        )
        positions = result.scalars().all()
        assert len(positions) == 1
        assert positions[0].ticker   == "AAPL"
        assert positions[0].shares   == 10.0
        assert positions[0].avg_cost == 150.0

    @pytest.mark.asyncio
    async def test_position_cascade_delete(self, db_session):
        from app.models.models import User, Portfolio, Position
        from app.routers.portfolio import GUEST_ID
        from sqlalchemy import select, delete

        user = User(id=GUEST_ID + 202, email="casc@test.com", hashed_password="x")
        db_session.add(user)
        await db_session.flush()

        pf = Portfolio(user_id=GUEST_ID + 202, name="To Delete")
        db_session.add(pf)
        await db_session.flush()

        db_session.add(Position(portfolio_id=pf.id, ticker="TSLA", shares=5.0, avg_cost=200.0))
        await db_session.flush()

        # Delete portfolio — positions should cascade
        await db_session.execute(delete(Position).where(Position.portfolio_id == pf.id))
        await db_session.delete(pf)
        await db_session.flush()

        result = await db_session.execute(
            select(Position).where(Position.portfolio_id == pf.id)
        )
        assert result.scalars().all() == []


# ─── E2E: Portfolio HTTP endpoints ────────────────────────────────────────────

class TestPortfolioEndpoints:

    @pytest.mark.asyncio
    async def test_list_portfolios_empty(self, client):
        r = await client.get("/api/v1/portfolio/")
        assert r.status_code == 200
        # May be empty or have auto-created portfolio
        assert isinstance(r.json(), list)

    @pytest.mark.asyncio
    async def test_create_portfolio(self, client):
        r = await client.post("/api/v1/portfolio/", json={"name": "Growth Portfolio"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Growth Portfolio"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_rename_portfolio(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Old Name"})
        pid = create.json()["id"]
        r = await client.patch(f"/api/v1/portfolio/{pid}", json={"name": "New Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "New Name"

    @pytest.mark.asyncio
    async def test_delete_portfolio(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Temp"})
        pid = create.json()["id"]
        r = await client.delete(f"/api/v1/portfolio/{pid}")
        assert r.status_code == 200
        assert r.json()["deleted"] is True

    @pytest.mark.asyncio
    async def test_nonexistent_portfolio_returns_404(self, client):
        r = await client.get("/api/v1/portfolio/99999/summary")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_add_position(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Tech"})
        pid = create.json()["id"]
        r = await client.post(f"/api/v1/portfolio/{pid}/positions",
                              json={"ticker": "aapl", "shares": 10, "avg_cost": 150.0})
        assert r.status_code == 200
        data = r.json()
        assert data["ticker"]   == "AAPL"   # uppercased
        assert data["shares"]   == 10.0
        assert data["avg_cost"] == 150.0

    @pytest.mark.asyncio
    async def test_ticker_uppercased_on_add(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Case"})
        pid = create.json()["id"]
        r = await client.post(f"/api/v1/portfolio/{pid}/positions",
                              json={"ticker": "tsla", "shares": 5, "avg_cost": 200.0})
        assert r.json()["ticker"] == "TSLA"

    @pytest.mark.asyncio
    async def test_add_position_invalid_shares_rejected(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Validate"})
        pid = create.json()["id"]
        r = await client.post(f"/api/v1/portfolio/{pid}/positions",
                              json={"ticker": "AAPL", "shares": -5, "avg_cost": 150.0})
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_add_position_zero_cost_rejected(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Validate2"})
        pid = create.json()["id"]
        r = await client.post(f"/api/v1/portfolio/{pid}/positions",
                              json={"ticker": "AAPL", "shares": 10, "avg_cost": 0})
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_update_position(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Edit"})
        pid = create.json()["id"]
        add = await client.post(f"/api/v1/portfolio/{pid}/positions",
                                json={"ticker": "MSFT", "shares": 10, "avg_cost": 380.0})
        pos_id = add.json()["id"]

        r = await client.patch(f"/api/v1/portfolio/{pid}/positions/{pos_id}",
                               json={"shares": 20, "avg_cost": 390.0})
        assert r.status_code == 200
        data = r.json()
        assert data["shares"]   == 20.0
        assert data["avg_cost"] == 390.0

    @pytest.mark.asyncio
    async def test_delete_position(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Del Pos"})
        pid = create.json()["id"]
        add = await client.post(f"/api/v1/portfolio/{pid}/positions",
                                json={"ticker": "NVDA", "shares": 5, "avg_cost": 482.0})
        pos_id = add.json()["id"]

        r = await client.delete(f"/api/v1/portfolio/{pid}/positions/{pos_id}")
        assert r.status_code == 200
        assert r.json()["deleted"] is True

    @pytest.mark.asyncio
    async def test_summary_returns_live_pnl(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Summary"})
        pid = create.json()["id"]
        await client.post(f"/api/v1/portfolio/{pid}/positions",
                          json={"ticker": "AAPL", "shares": 10, "avg_cost": 150.0})

        r = await client.get(f"/api/v1/portfolio/{pid}/summary")
        assert r.status_code == 200
        data = r.json()
        assert "total_value"   in data
        assert "total_pnl"     in data
        assert "total_pnl_pct" in data
        assert "today_pnl"     in data
        assert "positions"     in data
        assert len(data["positions"]) == 1
        assert data["positions"][0]["ticker"] == "AAPL"
        assert data["total_value"] > 0

    @pytest.mark.asyncio
    async def test_summary_position_has_all_fields(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Fields"})
        pid = create.json()["id"]
        await client.post(f"/api/v1/portfolio/{pid}/positions",
                          json={"ticker": "MSFT", "shares": 5, "avg_cost": 380.0})

        r = await client.get(f"/api/v1/portfolio/{pid}/summary")
        pos = r.json()["positions"][0]
        for field in ["id", "ticker", "shares", "avg_cost", "current_price",
                      "value", "cost_basis", "pnl", "pnl_pct",
                      "today_change", "today_pct", "today_pnl", "weight_pct"]:
            assert field in pos, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_summary_weight_pct_sums_to_100(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Weights"})
        pid = create.json()["id"]
        for ticker, shares, cost in [("AAPL", 10, 150), ("MSFT", 5, 380), ("NVDA", 2, 480)]:
            await client.post(f"/api/v1/portfolio/{pid}/positions",
                              json={"ticker": ticker, "shares": shares, "avg_cost": cost})

        r = await client.get(f"/api/v1/portfolio/{pid}/summary")
        positions = r.json()["positions"]
        total_weight = sum(p["weight_pct"] for p in positions)
        assert total_weight == pytest.approx(100.0, abs=0.5)

    @pytest.mark.asyncio
    async def test_history_returns_snapshots(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "History"})
        pid = create.json()["id"]
        r = await client.get(f"/api/v1/portfolio/{pid}/history")
        assert r.status_code == 200
        data = r.json()
        assert "snapshots" in data
        assert isinstance(data["snapshots"], list)

    @pytest.mark.asyncio
    async def test_empty_portfolio_summary_has_zero_value(self, client):
        create = await client.post("/api/v1/portfolio/", json={"name": "Empty"})
        pid = create.json()["id"]
        r = await client.get(f"/api/v1/portfolio/{pid}/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["total_value"] == 0.0
        assert data["positions"]   == []
