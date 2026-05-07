"""
Alerts router — create / list / delete price alerts.
The Celery beat task checks active alerts every 30s.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import User, Alert
from app.services import finnhub as fh

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])

GUEST_ID = 1

VALID_TYPES = {
    "price_above", "price_below", "pct_move_day",
    "rsi_above", "rsi_below", "ma_cross_above", "ma_cross_below",
}

TYPE_LABELS = {
    "price_above":    "Price crosses above",
    "price_below":    "Price drops below",
    "pct_move_day":   "Day move exceeds ±",
    "rsi_above":      "RSI rises above",
    "rsi_below":      "RSI falls below",
    "ma_cross_above": "Price crosses above MA50",
    "ma_cross_below": "Price crosses below MA50",
}


class AlertCreate(BaseModel):
    ticker:     str
    alert_type: str
    threshold:  float | None = None

    @field_validator("ticker")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.upper().strip()[:10]

    @field_validator("alert_type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError(f"alert_type must be one of {sorted(VALID_TYPES)}")
        return v


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


def _alert_dict(a: Alert, current_price: float | None = None) -> dict:
    d = {
        "id":              a.id,
        "ticker":          a.ticker,
        "alert_type":      a.alert_type,
        "label":           TYPE_LABELS.get(a.alert_type, a.alert_type),
        "threshold":       a.threshold,
        "is_active":       a.is_active,
        "triggered_at":    a.triggered_at.isoformat() if a.triggered_at else None,
        "triggered_price": a.triggered_price,
        "created_at":      a.created_at.isoformat() if a.created_at else None,
        "current_price":   current_price,
        "proximity_pct":   None,
    }
    # Compute how close the price is to the threshold (for sorting)
    if current_price and a.threshold and a.alert_type in ("price_above", "price_below"):
        d["proximity_pct"] = round(abs(current_price - a.threshold) / current_price * 100, 2)
    return d


# ─── List active alerts ───────────────────────────────────────────────────────

@router.get("/")
async def list_alerts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == GUEST_ID)
        .order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()
    if not alerts:
        return {"alerts": [], "triggered": []}

    # Fetch live prices for all unique tickers in parallel
    import asyncio
    tickers = list({a.ticker for a in alerts})
    quotes  = await asyncio.gather(*[fh.get_quote(t) for t in tickers], return_exceptions=True)
    price_map = {
        t: (q.get("price") if isinstance(q, dict) else None)
        for t, q in zip(tickers, quotes)
    }

    active    = [_alert_dict(a, price_map.get(a.ticker)) for a in alerts if a.is_active]
    triggered = [_alert_dict(a, price_map.get(a.ticker)) for a in alerts if not a.is_active and a.triggered_at]

    # Sort active alerts by proximity to threshold
    active.sort(key=lambda d: (d["proximity_pct"] is None, d["proximity_pct"] or 0))

    return {"alerts": active, "triggered": triggered[:20]}


# ─── Create alert ─────────────────────────────────────────────────────────────

@router.post("/")
async def create_alert(body: AlertCreate, db: AsyncSession = Depends(get_db)):
    await _ensure_guest_user(db)
    alert = Alert(
        user_id=GUEST_ID,
        ticker=body.ticker,
        alert_type=body.alert_type,
        threshold=body.threshold,
    )
    db.add(alert)
    await db.flush()
    await db.commit()
    await db.refresh(alert)
    return _alert_dict(alert)


# ─── Delete alert ─────────────────────────────────────────────────────────────

@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == GUEST_ID)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()
    return {"deleted": True}


# ─── Reactivate triggered alert ──────────────────────────────────────────────

@router.patch("/{alert_id}/reactivate")
async def reactivate_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == GUEST_ID)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active      = True
    alert.triggered_at    = None
    alert.triggered_price = None
    await db.commit()
    return _alert_dict(alert)


# ─── Check alerts (called by frontend polling / Celery) ──────────────────────

@router.post("/check")
async def check_alerts(db: AsyncSession = Depends(get_db)):
    """
    Evaluate all active alerts against current quotes.
    Returns list of newly triggered alerts.
    Called by Celery beat every 30s and by the frontend on focus.
    """
    import asyncio
    result = await db.execute(
        select(Alert).where(Alert.user_id == GUEST_ID, Alert.is_active == True)  # noqa: E712
    )
    active = result.scalars().all()
    if not active:
        return {"triggered": []}

    tickers = list({a.ticker for a in active})
    quotes  = await asyncio.gather(*[fh.get_quote(t) for t in tickers], return_exceptions=True)
    price_map = {
        t: (q if isinstance(q, dict) else {})
        for t, q in zip(tickers, quotes)
    }

    newly_triggered = []
    for alert in active:
        q     = price_map.get(alert.ticker, {})
        price = q.get("price")
        pct   = q.get("change_pct", 0) or 0

        if price is None:
            continue

        fired = False
        if alert.alert_type == "price_above"  and alert.threshold and price >  alert.threshold: fired = True
        if alert.alert_type == "price_below"  and alert.threshold and price <  alert.threshold: fired = True
        if alert.alert_type == "pct_move_day" and alert.threshold and abs(pct) > alert.threshold: fired = True
        # RSI and MA cross alerts are evaluated on the frontend (client has candle data)

        if fired:
            alert.is_active      = False
            alert.triggered_at    = datetime.now(timezone.utc)
            alert.triggered_price = price
            newly_triggered.append(_alert_dict(alert, price))

    if newly_triggered:
        await db.commit()

    return {"triggered": newly_triggered}
