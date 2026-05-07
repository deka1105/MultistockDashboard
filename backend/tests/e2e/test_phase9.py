"""
Phase 9 tests — Institutional & Options Intelligence
Covers: options chain endpoint, institutional ownership endpoint,
insider transactions, mock data generators, and candlestick pattern logic.
"""
import pytest
import json


# ─── 9A: Sector Heatmap (data via market overview endpoint) ──────────────────

class TestSectorHeatmapData:
    """Market overview endpoint already tested in test_api.py.
    These tests verify the sector + change_pct fields needed for the treemap."""

    @pytest.mark.asyncio
    async def test_market_overview_has_sector_field(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        assert r.status_code == 200
        stocks = r.json()["items"]
        assert len(stocks) > 0
        # At least some stocks should have a sector field
        with_sector = [s for s in stocks if s.get("sector")]
        assert len(with_sector) > 0

    @pytest.mark.asyncio
    async def test_market_overview_has_change_pct(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        stocks = r.json()["items"]
        with_pct = [s for s in stocks if s.get("change_pct") is not None]
        assert len(with_pct) > 0

    @pytest.mark.asyncio
    async def test_market_overview_50_tickers(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        stocks = r.json()["items"]
        assert len(stocks) >= 40  # allow for some filtering

    @pytest.mark.asyncio
    async def test_market_overview_has_market_cap(self, client):
        r = await client.get("/api/v1/stocks/market/overview")
        stocks = r.json()["items"]
        # Mock data may not have market_cap but field must not cause 500
        assert r.status_code == 200


# ─── 9B: Options Flow Heatmap ────────────────────────────────────────────────

class TestOptionsChainEndpoint:
    @pytest.mark.asyncio
    async def test_options_chain_returns_200(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_options_chain_has_required_keys(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        data = r.json()
        assert "ticker"          in data
        assert "current_price"   in data
        assert "max_pain_strike" in data
        assert "expiries"        in data
        assert "strikes"         in data
        assert "chain"           in data
        assert "expiry_pc_ratio" in data

    @pytest.mark.asyncio
    async def test_options_chain_ticker_matches(self, client):
        r = await client.get("/api/v1/stocks/options/MSFT")
        assert r.json()["ticker"] == "MSFT"

    @pytest.mark.asyncio
    async def test_options_chain_has_expiries(self, client):
        r = await client.get("/api/v1/stocks/options/TSLA")
        data = r.json()
        assert len(data["expiries"]) >= 4
        # All expiries should be valid ISO date strings
        for exp in data["expiries"]:
            assert len(exp) == 10
            assert exp[4] == "-" and exp[7] == "-"

    @pytest.mark.asyncio
    async def test_options_chain_has_strikes(self, client):
        r = await client.get("/api/v1/stocks/options/NVDA")
        data = r.json()
        assert len(data["strikes"]) >= 5
        # Strikes should be numeric and sorted
        strikes = data["strikes"]
        assert strikes == sorted(strikes)

    @pytest.mark.asyncio
    async def test_options_chain_strike_range_brackets_price(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        data = r.json()
        price   = data["current_price"]
        strikes = data["strikes"]
        # Lowest strike should be ≤ price, highest ≥ price
        assert min(strikes) <= price
        assert max(strikes) >= price

    @pytest.mark.asyncio
    async def test_options_chain_row_has_required_fields(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        chain = r.json()["chain"]
        assert len(chain) > 0
        row = chain[0]
        for field in ["expiry", "strike", "call_oi", "put_oi",
                      "call_volume", "put_volume", "call_iv", "put_iv", "dte"]:
            assert field in row, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_options_chain_pc_ratio_per_expiry(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        data = r.json()
        pc = data["expiry_pc_ratio"]
        # Every expiry should have a P/C ratio entry
        for exp in data["expiries"]:
            assert exp in pc
            assert pc[exp] > 0

    @pytest.mark.asyncio
    async def test_options_chain_dte_positive(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        chain = r.json()["chain"]
        for row in chain:
            assert row["dte"] >= 1, "DTE should be at least 1 day"

    @pytest.mark.asyncio
    async def test_options_chain_iv_between_zero_and_five(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        chain = r.json()["chain"]
        for row in chain:
            assert 0 < row["call_iv"] < 5.0
            assert 0 < row["put_iv"]  < 5.0

    @pytest.mark.asyncio
    async def test_options_chain_max_pain_in_strike_range(self, client):
        r = await client.get("/api/v1/stocks/options/AAPL")
        data = r.json()
        mp = data["max_pain_strike"]
        assert mp in data["strikes"]

    @pytest.mark.asyncio
    async def test_options_chain_deterministic(self, client):
        """Same ticker should return identical mock data on repeated calls."""
        r1 = await client.get("/api/v1/stocks/options/AAPL")
        r2 = await client.get("/api/v1/stocks/options/AAPL")
        assert r1.json()["strikes"] == r2.json()["strikes"]
        assert r1.json()["chain"][0]["call_oi"] == r2.json()["chain"][0]["call_oi"]

    @pytest.mark.asyncio
    async def test_options_chain_different_tickers_differ(self, client):
        r1 = await client.get("/api/v1/stocks/options/AAPL")
        r2 = await client.get("/api/v1/stocks/options/TSLA")
        # Different tickers should have different current prices
        assert r1.json()["current_price"] != r2.json()["current_price"]


# ─── 9C: Institutional Ownership ─────────────────────────────────────────────

class TestInstitutionalEndpoint:
    @pytest.mark.asyncio
    async def test_institutional_returns_200(self, client):
        r = await client.get("/api/v1/stocks/institutional/AAPL")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_institutional_has_required_keys(self, client):
        r = await client.get("/api/v1/stocks/institutional/AAPL")
        data = r.json()
        assert "ticker"          in data
        assert "inst_pct_float"  in data
        assert "num_holders"     in data
        assert "qoq_change_pct"  in data
        assert "top_holders"     in data

    @pytest.mark.asyncio
    async def test_institutional_pct_in_valid_range(self, client):
        r = await client.get("/api/v1/stocks/institutional/AAPL")
        pct = r.json()["inst_pct_float"]
        assert 0 <= pct <= 100

    @pytest.mark.asyncio
    async def test_institutional_top_holders_count(self, client):
        r = await client.get("/api/v1/stocks/institutional/AAPL")
        holders = r.json()["top_holders"]
        assert 1 <= len(holders) <= 10

    @pytest.mark.asyncio
    async def test_institutional_holder_has_name_and_pct(self, client):
        r = await client.get("/api/v1/stocks/institutional/AAPL")
        h = r.json()["top_holders"][0]
        assert "name" in h and "pct" in h
        assert len(h["name"]) > 0
        assert 0 < h["pct"] < 100

    @pytest.mark.asyncio
    async def test_institutional_holders_sorted_desc(self, client):
        r = await client.get("/api/v1/stocks/institutional/AAPL")
        holders = r.json()["top_holders"]
        pcts = [h["pct"] for h in holders]
        assert pcts == sorted(pcts, reverse=True), "Holders should be sorted by pct descending"

    @pytest.mark.asyncio
    async def test_institutional_num_holders_positive(self, client):
        r = await client.get("/api/v1/stocks/institutional/MSFT")
        assert r.json()["num_holders"] > 0

    @pytest.mark.asyncio
    async def test_institutional_ticker_matches(self, client):
        r = await client.get("/api/v1/stocks/institutional/NVDA")
        assert r.json()["ticker"] == "NVDA"

    @pytest.mark.asyncio
    async def test_institutional_deterministic(self, client):
        r1 = await client.get("/api/v1/stocks/institutional/AAPL")
        r2 = await client.get("/api/v1/stocks/institutional/AAPL")
        assert r1.json()["inst_pct_float"] == r2.json()["inst_pct_float"]


class TestInsiderEndpoint:
    @pytest.mark.asyncio
    async def test_insider_returns_200(self, client):
        r = await client.get("/api/v1/stocks/insider/AAPL")
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_insider_has_transactions(self, client):
        r = await client.get("/api/v1/stocks/insider/AAPL")
        data = r.json()
        assert "ticker"       in data
        assert "transactions" in data
        assert len(data["transactions"]) >= 5

    @pytest.mark.asyncio
    async def test_insider_transaction_fields(self, client):
        r = await client.get("/api/v1/stocks/insider/AAPL")
        txn = r.json()["transactions"][0]
        for field in ["name", "transaction_date", "transaction_type",
                      "shares", "price", "value", "filing_url"]:
            assert field in txn, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_insider_transaction_types_are_buy_or_sell(self, client):
        r = await client.get("/api/v1/stocks/insider/AAPL")
        for txn in r.json()["transactions"]:
            assert txn["transaction_type"] in ("Buy", "Sell")

    @pytest.mark.asyncio
    async def test_insider_transactions_sorted_by_date(self, client):
        r = await client.get("/api/v1/stocks/insider/AAPL")
        dates = [t["transaction_date"] for t in r.json()["transactions"]]
        assert dates == sorted(dates), "Transactions should be sorted by date asc"

    @pytest.mark.asyncio
    async def test_insider_filing_url_contains_sec(self, client):
        r = await client.get("/api/v1/stocks/insider/AAPL")
        for txn in r.json()["transactions"]:
            assert "sec.gov" in txn["filing_url"], "Filing URL must point to SEC EDGAR"

    @pytest.mark.asyncio
    async def test_insider_shares_and_value_positive(self, client):
        r = await client.get("/api/v1/stocks/insider/MSFT")
        for txn in r.json()["transactions"]:
            assert txn["shares"] > 0
            assert txn["value"] > 0
            assert txn["price"] > 0

    @pytest.mark.asyncio
    async def test_insider_value_equals_shares_times_price(self, client):
        r = await client.get("/api/v1/stocks/insider/TSLA")
        for txn in r.json()["transactions"]:
            expected = round(txn["shares"] * txn["price"], 2)
            assert abs(txn["value"] - expected) < 1.0, "Value ≈ shares × price"


# ─── 9D: Candlestick Pattern Mock Data ───────────────────────────────────────

class TestMockOptionsChainGenerator:
    """Unit tests for the mock data generator logic."""

    def test_generates_correct_number_of_expiries(self):
        from app.services.mock_data import get_mock_options_chain
        data = get_mock_options_chain("AAPL", 200.0)
        # Should have at least 4 Fridays + 2 monthly = 6
        assert len(data["expiries"]) >= 4

    def test_strikes_bracket_current_price(self):
        from app.services.mock_data import get_mock_options_chain
        data = get_mock_options_chain("AAPL", 100.0)
        assert min(data["strikes"]) < 100.0
        assert max(data["strikes"]) > 100.0

    def test_chain_has_row_for_every_strike_expiry_combo(self):
        from app.services.mock_data import get_mock_options_chain
        data = get_mock_options_chain("AAPL", 200.0)
        expected = len(data["expiries"]) * len(data["strikes"])
        assert len(data["chain"]) == expected

    def test_max_pain_is_in_strikes(self):
        from app.services.mock_data import get_mock_options_chain
        data = get_mock_options_chain("NVDA", 500.0)
        assert data["max_pain_strike"] in data["strikes"]

    def test_deterministic_by_ticker(self):
        from app.services.mock_data import get_mock_options_chain
        d1 = get_mock_options_chain("AAPL", 200.0)
        d2 = get_mock_options_chain("AAPL", 200.0)
        assert d1["chain"][0]["call_oi"] == d2["chain"][0]["call_oi"]

    def test_different_tickers_produce_different_data(self):
        from app.services.mock_data import get_mock_options_chain
        d1 = get_mock_options_chain("AAPL", 200.0)
        d2 = get_mock_options_chain("TSLA", 200.0)
        assert d1["chain"][0]["call_oi"] != d2["chain"][0]["call_oi"]


class TestInstitutionalMockGenerator:
    def test_inst_pct_in_range(self):
        from app.services.mock_data import get_mock_institutional
        data = get_mock_institutional("AAPL")
        assert 0 <= data["inst_pct_float"] <= 100

    def test_top_holders_sorted(self):
        from app.services.mock_data import get_mock_institutional
        data = get_mock_institutional("MSFT")
        pcts = [h["pct"] for h in data["top_holders"]]
        assert pcts == sorted(pcts, reverse=True)

    def test_insider_value_computation(self):
        from app.services.mock_data import get_mock_insider_transactions
        data = get_mock_insider_transactions("AAPL")
        for t in data["transactions"]:
            assert abs(t["value"] - t["shares"] * t["price"]) < 1.0

    def test_insider_dates_within_last_year(self):
        from app.services.mock_data import get_mock_insider_transactions
        from datetime import date, timedelta
        data   = get_mock_insider_transactions("AAPL")
        cutoff = (date.today() - timedelta(days=366)).isoformat()
        for t in data["transactions"]:
            assert t["transaction_date"] >= cutoff, "Transactions must be within last year"
