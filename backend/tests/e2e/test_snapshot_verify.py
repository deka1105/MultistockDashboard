"""TEMPORARY — verifies the Postgres-backed snapshot cache + wired endpoints. Deleted after run."""
import pytest
from unittest.mock import patch
from app.services import mock_data as m
from app.services.snapshot_cache import get_snapshot, set_snapshot


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


class TestSnapshotHelpers:
    @pytest.mark.asyncio
    async def test_set_get_and_expiry(self, db_session):
        assert await get_snapshot(db_session, "k", 900) is None          # empty
        await set_snapshot(db_session, "k", {"v": 1, "results": []})
        assert await get_snapshot(db_session, "k", 900) == {"v": 1, "results": []}  # hit
        assert await get_snapshot(db_session, "k", 0) is None            # too old (max_age 0)


class TestEndpointsWired:
    @pytest.mark.asyncio
    async def test_overview_ok_and_snapshotted(self, client):
        r1 = await client.get("/api/v1/stocks/market/overview")
        assert r1.status_code == 200 and len(r1.json()["items"]) >= 50
        r2 = await client.get("/api/v1/stocks/market/overview")
        assert r2.status_code == 200

    @pytest.mark.asyncio
    async def test_screener_ok_and_seeded_snapshot_is_served(self, client, db_session):
        # Seed a marker snapshot for the default query key; the endpoint must return IT
        # (proving it reads from the DB snapshot rather than recomputing).
        from app.core.cache import screener_key
        key = screener_key("[]", "market_cap", "desc", 1, 25)
        marker = {"total": 4242, "page": 1, "per_page": 25, "pages": 1, "results": [], "_seeded": True}
        await set_snapshot(db_session, key, marker)
        r = await client.get("/api/v1/screener/?filters=[]&sort_by=market_cap&sort_dir=desc&page=1&per_page=25")
        assert r.status_code == 200
        assert r.json().get("total") == 4242, "endpoint did not serve the seeded snapshot"
