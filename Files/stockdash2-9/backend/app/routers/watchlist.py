from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Watchlist, WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

# ─── Schemas ─────────────────────────────────────────────────────────────────

class WatchlistCreate(BaseModel):
    name: str

class WatchlistRename(BaseModel):
    name: str

class WatchlistItemAdd(BaseModel):
    ticker: str

class WatchlistItemReorder(BaseModel):
    ticker_order: list[str]  # ordered list of tickers

# ─── Guest watchlist (no auth) — stored by session key ───────────────────────
# Full auth-gated persistence comes in Phase 5.
# These endpoints use a guest_id header for now so the frontend can call them.

GUEST_ID = 1  # placeholder user_id until auth is wired in Phase 5


async def _ensure_default_watchlist(db: AsyncSession, user_id: int = GUEST_ID) -> Watchlist:
    """Get or create the default watchlist for a user."""
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user_id).order_by(Watchlist.id)
    )
    wl = result.scalars().first()
    if not wl:
        wl = Watchlist(user_id=user_id, name="My Watchlist")
        db.add(wl)
        await db.commit()
        await db.refresh(wl)
    return wl


# ─── List all watchlists ─────────────────────────────────────────────────────

@router.get("/")
async def list_watchlists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == GUEST_ID).order_by(Watchlist.id)
    )
    watchlists = result.scalars().all()
    out = []
    for wl in watchlists:
        items_result = await db.execute(
            select(WatchlistItem)
            .where(WatchlistItem.watchlist_id == wl.id)
            .order_by(WatchlistItem.sort_order, WatchlistItem.added_at)
        )
        items = items_result.scalars().all()
        out.append({
            "id": wl.id,
            "name": wl.name,
            "tickers": [i.ticker for i in items],
        })
    return out


# ─── Create watchlist ────────────────────────────────────────────────────────

@router.post("/")
async def create_watchlist(body: WatchlistCreate, db: AsyncSession = Depends(get_db)):
    wl = Watchlist(user_id=GUEST_ID, name=body.name.strip()[:100])
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return {"id": wl.id, "name": wl.name, "tickers": []}


# ─── Rename watchlist ────────────────────────────────────────────────────────

@router.patch("/{watchlist_id}")
async def rename_watchlist(watchlist_id: int, body: WatchlistRename, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == GUEST_ID))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    wl.name = body.name.strip()[:100]
    await db.commit()
    return {"id": wl.id, "name": wl.name}


# ─── Delete watchlist ────────────────────────────────────────────────────────

@router.delete("/{watchlist_id}")
async def delete_watchlist(watchlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == GUEST_ID))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    await db.execute(delete(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id))
    await db.delete(wl)
    await db.commit()
    return {"deleted": True}


# ─── Add ticker ──────────────────────────────────────────────────────────────

@router.post("/{watchlist_id}/items")
async def add_ticker(watchlist_id: int, body: WatchlistItemAdd, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == GUEST_ID))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Watchlist not found")

    ticker = body.ticker.upper().strip()[:10]
    # Check for duplicate
    exists = await db.execute(
        select(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id, WatchlistItem.ticker == ticker)
    )
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ticker already in watchlist")

    # Get current max sort_order
    count_result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    current_items = count_result.scalars().all()
    sort_order = len(current_items)

    item = WatchlistItem(watchlist_id=watchlist_id, ticker=ticker, sort_order=sort_order)
    db.add(item)
    await db.commit()
    return {"ticker": ticker, "watchlist_id": watchlist_id}


# ─── Remove ticker ───────────────────────────────────────────────────────────

@router.delete("/{watchlist_id}/items/{ticker}")
async def remove_ticker(watchlist_id: int, ticker: str, db: AsyncSession = Depends(get_db)):
    ticker = ticker.upper().strip()
    await db.execute(
        delete(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.ticker == ticker,
        )
    )
    await db.commit()
    return {"deleted": True, "ticker": ticker}


# ─── Reorder tickers ─────────────────────────────────────────────────────────

@router.put("/{watchlist_id}/reorder")
async def reorder_tickers(watchlist_id: int, body: WatchlistItemReorder, db: AsyncSession = Depends(get_db)):
    for i, ticker in enumerate(body.ticker_order):
        t = ticker.upper().strip()
        result = await db.execute(
            select(WatchlistItem).where(
                WatchlistItem.watchlist_id == watchlist_id,
                WatchlistItem.ticker == t,
            )
        )
        item = result.scalar_one_or_none()
        if item:
            item.sort_order = i
    await db.commit()
    return {"reordered": True}
