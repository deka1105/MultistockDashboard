"""
Watchlist CRUD router.

Guest mode (Phase 5 pre-auth): all operations use GUEST_ID=1.
The guest user row is auto-created on first request if it doesn't exist.
This prevents FK constraint errors on fresh DBs.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import User, Watchlist, WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

GUEST_ID = 1  # placeholder until Phase 5 auth


# ─── Schemas ─────────────────────────────────────────────────────────────────

class WatchlistCreate(BaseModel):
    name: str

class WatchlistRename(BaseModel):
    name: str

class WatchlistItemAdd(BaseModel):
    ticker: str

class WatchlistItemReorder(BaseModel):
    ticker_order: list[str]


# ─── Ensure guest user exists ─────────────────────────────────────────────────

async def _ensure_guest_user(db: AsyncSession) -> None:
    """
    Auto-create the guest user row if it doesn't exist.
    Prevents FK constraint errors on fresh databases.
    Called at the start of every write operation.
    """
    result = await db.execute(select(User).where(User.id == GUEST_ID))
    if result.scalar_one_or_none() is None:
        db.add(User(
            id=GUEST_ID,
            email="guest@stockdash.local",
            hashed_password="$2b$12$guest_no_password_placeholder",
            is_active=True,
            is_verified=True,
        ))
        await db.flush()


async def _ensure_default_watchlist(db: AsyncSession) -> Watchlist:
    """Get or create the default watchlist for the guest user."""
    await _ensure_guest_user(db)
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == GUEST_ID).order_by(Watchlist.id)
    )
    wl = result.scalars().first()
    if not wl:
        wl = Watchlist(user_id=GUEST_ID, name="My Watchlist")
        db.add(wl)
        await db.flush()
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


# ─── Create watchlist ─────────────────────────────────────────────────────────

@router.post("/")
async def create_watchlist(body: WatchlistCreate, db: AsyncSession = Depends(get_db)):
    await _ensure_guest_user(db)
    wl = Watchlist(user_id=GUEST_ID, name=body.name.strip()[:100])
    db.add(wl)
    await db.flush()
    await db.commit()
    await db.refresh(wl)
    return {"id": wl.id, "name": wl.name, "tickers": []}


# ─── Rename watchlist ─────────────────────────────────────────────────────────

@router.patch("/{watchlist_id}")
async def rename_watchlist(watchlist_id: int, body: WatchlistRename, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == GUEST_ID)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    wl.name = body.name.strip()[:100]
    await db.commit()
    return {"id": wl.id, "name": wl.name}


# ─── Delete watchlist ─────────────────────────────────────────────────────────

@router.delete("/{watchlist_id}")
async def delete_watchlist(watchlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == GUEST_ID)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    await db.execute(delete(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id))
    await db.delete(wl)
    await db.commit()
    return {"deleted": True}


# ─── Add ticker ───────────────────────────────────────────────────────────────

@router.post("/{watchlist_id}/items")
async def add_ticker(watchlist_id: int, body: WatchlistItemAdd, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == GUEST_ID)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Watchlist not found")

    ticker = body.ticker.upper().strip()[:10]
    exists = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.ticker == ticker,
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ticker already in watchlist")

    count_result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    sort_order = len(count_result.scalars().all())

    db.add(WatchlistItem(watchlist_id=watchlist_id, ticker=ticker, sort_order=sort_order))
    await db.commit()
    return {"ticker": ticker, "watchlist_id": watchlist_id}


# ─── Remove ticker ────────────────────────────────────────────────────────────

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


# ─── Reorder tickers ──────────────────────────────────────────────────────────

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


# ─── Quick-add endpoint (used by Dashboard star + Market table star) ──────────

@router.post("/quick-add")
async def quick_add_ticker(body: WatchlistItemAdd, db: AsyncSession = Depends(get_db)):
    """
    Adds a ticker to the default watchlist, creating the list+user if needed.
    Used by the star button on Dashboard and Market pages.
    Returns the updated watchlist.
    """
    ticker = body.ticker.upper().strip()[:10]
    wl = await _ensure_default_watchlist(db)

    # Idempotent — skip if already present
    exists = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.watchlist_id == wl.id,
            WatchlistItem.ticker == ticker,
        )
    )
    if not exists.scalar_one_or_none():
        count_result = await db.execute(
            select(WatchlistItem).where(WatchlistItem.watchlist_id == wl.id)
        )
        sort_order = len(count_result.scalars().all())
        db.add(WatchlistItem(watchlist_id=wl.id, ticker=ticker, sort_order=sort_order))
        await db.commit()

    return {"ticker": ticker, "watchlist_id": wl.id, "added": True}


@router.delete("/quick-remove/{ticker}")
async def quick_remove_ticker(ticker: str, db: AsyncSession = Depends(get_db)):
    """
    Removes a ticker from the default watchlist.
    Used by the star button on Dashboard and Market pages.
    """
    ticker = ticker.upper().strip()
    wl = await _ensure_default_watchlist(db)
    await db.execute(
        delete(WatchlistItem).where(
            WatchlistItem.watchlist_id == wl.id,
            WatchlistItem.ticker == ticker,
        )
    )
    await db.commit()
    return {"ticker": ticker, "removed": True}


@router.get("/quick-check/{ticker}")
async def quick_check_ticker(ticker: str, db: AsyncSession = Depends(get_db)):
    """Check if a ticker is in the default watchlist."""
    ticker = ticker.upper().strip()
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == GUEST_ID).order_by(Watchlist.id)
    )
    wl = result.scalars().first()
    if not wl:
        return {"ticker": ticker, "in_watchlist": False}
    exists = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.watchlist_id == wl.id,
            WatchlistItem.ticker == ticker,
        )
    )
    return {"ticker": ticker, "in_watchlist": bool(exists.scalar_one_or_none())}
