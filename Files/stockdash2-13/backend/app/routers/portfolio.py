"""
Portfolio router — holdings management and live P&L computation.

Guest mode: GUEST_ID=1 (same pattern as watchlist).
P&L is computed server-side by merging stored positions with live quotes.
"""
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, field_validator

from app.db.session import get_db
from app.models.models import User, Portfolio, Position, PnLSnapshot
from app.services import finnhub as fh

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])

GUEST_ID = 1  # mirrors watchlist guest mode


# ─── Schemas ─────────────────────────────────────────────────────────────────

class PortfolioCreate(BaseModel):
    name: str = "My Portfolio"

class PortfolioRename(BaseModel):
    name: str

class PositionCreate(BaseModel):
    ticker: str
    shares: float
    avg_cost: float
    notes: str | None = None

    @field_validator("ticker")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.upper().strip()[:10]

    @field_validator("shares")
    @classmethod
    def positive_shares(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Shares must be positive")
        return v

    @field_validator("avg_cost")
    @classmethod
    def positive_cost(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Cost must be positive")
        return v

class PositionUpdate(BaseModel):
    shares: float | None = None
    avg_cost: float | None = None
    notes: str | None = None


# ─── Guest helpers ────────────────────────────────────────────────────────────

async def _ensure_guest_user(db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.id == GUEST_ID))
    if result.scalar_one_or_none() is None:
        db.add(User(
            id=GUEST_ID,
            email="guest@stockdash.local",
            hashed_password="$2b$12$guest_placeholder",
            is_active=True,
            is_verified=True,
        ))
        await db.flush()


async def _ensure_default_portfolio(db: AsyncSession) -> Portfolio:
    await _ensure_guest_user(db)
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == GUEST_ID).order_by(Portfolio.id)
    )
    portfolio = result.scalars().first()
    if not portfolio:
        portfolio = Portfolio(user_id=GUEST_ID, name="My Portfolio")
        db.add(portfolio)
        await db.flush()
    return portfolio


async def _get_portfolio_or_404(portfolio_id: int, db: AsyncSession) -> Portfolio:
    result = await db.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.user_id == GUEST_ID)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


# ─── P&L computation ─────────────────────────────────────────────────────────

async def _compute_summary(portfolio: Portfolio, positions: list[Position]) -> dict:
    """
    Fetch live quotes for all positions and compute P&L metrics.
    Always returns a complete summary — uses mock data if Finnhub is unreachable.
    """
    if not positions:
        return {
            "portfolio_id": portfolio.id,
            "portfolio_name": portfolio.name,
            "total_value": 0.0,
            "total_cost": 0.0,
            "total_pnl": 0.0,
            "total_pnl_pct": 0.0,
            "today_pnl": 0.0,
            "today_pnl_pct": 0.0,
            "positions": [],
            "best_performer": None,
            "worst_performer": None,
            "beta": None,
        }

    # Fetch all quotes in parallel
    tickers = [p.ticker for p in positions]
    quotes = await asyncio.gather(
        *[fh.get_quote(t) for t in tickers],
        return_exceptions=True,
    )

    enriched = []
    total_value = 0.0
    total_cost  = 0.0
    today_pnl   = 0.0
    weighted_beta = 0.0

    # Also fetch beta (financials) in parallel for beta calculation
    financials = await asyncio.gather(
        *[fh.get_basic_financials(t) for t in tickers],
        return_exceptions=True,
    )

    for i, (pos, quote) in enumerate(zip(positions, quotes)):
        if isinstance(quote, Exception) or quote is None:
            quote = {"price": pos.avg_cost, "change": 0.0, "change_pct": 0.0,
                     "prev_close": pos.avg_cost}

        price      = quote.get("price")     or pos.avg_cost
        change     = quote.get("change")    or 0.0
        change_pct = quote.get("change_pct") or 0.0
        prev_close = quote.get("prev_close") or price

        value    = price * pos.shares
        cost     = pos.avg_cost * pos.shares
        pnl      = value - cost
        pnl_pct  = ((price - pos.avg_cost) / pos.avg_cost) * 100 if pos.avg_cost else 0.0
        day_pnl  = change * pos.shares

        total_value += value
        total_cost  += cost
        today_pnl   += day_pnl

        # Beta for weighted portfolio beta
        fin = financials[i] if not isinstance(financials[i], Exception) else {}
        beta = (fin or {}).get("beta") if isinstance(fin, dict) else None

        enriched.append({
            "id":           pos.id,
            "ticker":       pos.ticker,
            "shares":       pos.shares,
            "avg_cost":     pos.avg_cost,
            "current_price": price,
            "value":        round(value, 2),
            "cost_basis":   round(cost, 2),
            "pnl":          round(pnl, 2),
            "pnl_pct":      round(pnl_pct, 2),
            "today_change": round(change, 2),
            "today_pct":    round(change_pct, 2),
            "today_pnl":    round(day_pnl, 2),
            "weight_pct":   0.0,   # filled after total_value known
            "beta":         beta,
            "notes":        pos.notes,
            "opened_at":    pos.opened_at.isoformat() if pos.opened_at else None,
        })
        if beta:
            weighted_beta += beta * value

    # Fill weights
    for e in enriched:
        e["weight_pct"] = round((e["value"] / total_value * 100) if total_value else 0, 2)

    # Portfolio beta (value-weighted)
    portfolio_beta = round(weighted_beta / total_value, 3) if total_value else None

    total_pnl     = total_value - total_cost
    total_pnl_pct = (total_pnl / total_cost * 100) if total_cost else 0.0
    today_pnl_pct = (today_pnl / (total_value - today_pnl) * 100) if (total_value - today_pnl) else 0.0

    # Best / worst
    sorted_by_pct = sorted(enriched, key=lambda x: x["pnl_pct"], reverse=True)
    best  = {"ticker": sorted_by_pct[0]["ticker"],  "pnl_pct": sorted_by_pct[0]["pnl_pct"]}  if enriched else None
    worst = {"ticker": sorted_by_pct[-1]["ticker"], "pnl_pct": sorted_by_pct[-1]["pnl_pct"]} if enriched else None

    return {
        "portfolio_id":   portfolio.id,
        "portfolio_name": portfolio.name,
        "total_value":    round(total_value, 2),
        "total_cost":     round(total_cost, 2),
        "total_pnl":      round(total_pnl, 2),
        "total_pnl_pct":  round(total_pnl_pct, 2),
        "today_pnl":      round(today_pnl, 2),
        "today_pnl_pct":  round(today_pnl_pct, 2),
        "beta":           portfolio_beta,
        "best_performer":  best,
        "worst_performer": worst,
        "positions":      enriched,
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/")
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == GUEST_ID).order_by(Portfolio.id)
    )
    portfolios = result.scalars().all()
    return [{"id": p.id, "name": p.name, "created_at": p.created_at} for p in portfolios]


@router.post("/")
async def create_portfolio(body: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    await _ensure_guest_user(db)
    p = Portfolio(user_id=GUEST_ID, name=body.name.strip()[:100])
    db.add(p)
    await db.flush()
    await db.commit()
    await db.refresh(p)
    return {"id": p.id, "name": p.name}


@router.patch("/{portfolio_id}")
async def rename_portfolio(portfolio_id: int, body: PortfolioRename, db: AsyncSession = Depends(get_db)):
    p = await _get_portfolio_or_404(portfolio_id, db)
    p.name = body.name.strip()[:100]
    await db.commit()
    return {"id": p.id, "name": p.name}


@router.delete("/{portfolio_id}")
async def delete_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    p = await _get_portfolio_or_404(portfolio_id, db)
    await db.execute(delete(Position).where(Position.portfolio_id == portfolio_id))
    await db.execute(delete(PnLSnapshot).where(PnLSnapshot.portfolio_id == portfolio_id))
    await db.delete(p)
    await db.commit()
    return {"deleted": True}


@router.get("/{portfolio_id}/summary")
async def get_portfolio_summary(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    """Live P&L summary — merges DB positions with current Finnhub quotes."""
    p = await _get_portfolio_or_404(portfolio_id, db)
    result = await db.execute(
        select(Position).where(Position.portfolio_id == portfolio_id).order_by(Position.opened_at)
    )
    positions = result.scalars().all()
    return await _compute_summary(p, positions)


@router.post("/{portfolio_id}/positions")
async def add_position(portfolio_id: int, body: PositionCreate, db: AsyncSession = Depends(get_db)):
    await _get_portfolio_or_404(portfolio_id, db)
    pos = Position(
        portfolio_id=portfolio_id,
        ticker=body.ticker,
        shares=body.shares,
        avg_cost=body.avg_cost,
        notes=body.notes,
    )
    db.add(pos)
    await db.flush()
    await db.commit()
    await db.refresh(pos)
    return {
        "id": pos.id, "ticker": pos.ticker,
        "shares": pos.shares, "avg_cost": pos.avg_cost,
        "notes": pos.notes,
    }


@router.patch("/{portfolio_id}/positions/{position_id}")
async def update_position(
    portfolio_id: int,
    position_id: int,
    body: PositionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Position).where(
            Position.id == position_id,
            Position.portfolio_id == portfolio_id,
        )
    )
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    if body.shares  is not None: pos.shares   = body.shares
    if body.avg_cost is not None: pos.avg_cost = body.avg_cost
    if body.notes   is not None: pos.notes    = body.notes
    await db.commit()
    return {"id": pos.id, "ticker": pos.ticker, "shares": pos.shares, "avg_cost": pos.avg_cost}


@router.delete("/{portfolio_id}/positions/{position_id}")
async def delete_position(portfolio_id: int, position_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(Position).where(
            Position.id == position_id,
            Position.portfolio_id == portfolio_id,
        )
    )
    await db.commit()
    return {"deleted": True}


@router.get("/{portfolio_id}/history")
async def get_pnl_history(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    """Returns daily P&L snapshots for the benchmark chart."""
    await _get_portfolio_or_404(portfolio_id, db)
    result = await db.execute(
        select(PnLSnapshot)
        .where(PnLSnapshot.portfolio_id == portfolio_id)
        .order_by(PnLSnapshot.snapshot_date)
    )
    snaps = result.scalars().all()
    return {
        "portfolio_id": portfolio_id,
        "snapshots": [
            {
                "date":             s.snapshot_date.isoformat(),
                "total_value":      s.total_value,
                "total_cost":       s.total_cost,
                "daily_return_pct": s.daily_return_pct,
            }
            for s in snaps
        ],
    }
