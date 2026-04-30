"""
WebSocket router — real-time price tick fan-out.

Flow:
  Client connects → WS /api/v1/ws/ticks/{ticker}
  Backend polls Finnhub quote every 5s
  Pushes ticks to all connected clients for that ticker via Redis pub/sub
  Gracefully falls back to direct polling if Redis is unavailable
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import finnhub as fh
from app.core.cache import get_redis

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

# in-memory registry: ticker → set of active websockets
_connections: dict[str, set[WebSocket]] = {}
# tracks whether a poller is already running for a ticker
_poller_running: dict[str, bool] = {}


async def _push_tick(ticker: str, data: dict):
    """Push a tick to all connected clients for a ticker."""
    dead: set[WebSocket] = set()
    for ws in list(_connections.get(ticker, set())):
        try:
            await ws.send_json(data)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _connections[ticker].discard(ws)


async def _poll_ticker(ticker: str):
    """
    Poll Finnhub quote every 5s and push to subscribers.
    Exactly one poller runs per ticker at any time — enforced by _poller_running flag.
    """
    # Guard: bail out if a poller is already alive for this ticker
    if _poller_running.get(ticker):
        logger.debug(f"WS poller already running for {ticker} — skipping duplicate")
        return

    _poller_running[ticker] = True
    logger.info(f"WS poller started for {ticker}")
    last_price: float | None = None

    try:
        while _connections.get(ticker):
            try:
                quote = await fh.get_quote(ticker)
                price = quote.get("price")

                tick = {
                    "type": "tick",
                    "ticker": ticker,
                    "price": price,
                    "change": quote.get("change"),
                    "change_pct": quote.get("change_pct"),
                    "timestamp": int(datetime.now(timezone.utc).timestamp()),
                    "direction": (
                        "up"   if last_price and price and price > last_price else
                        "down" if last_price and price and price < last_price else
                        "flat"
                    ),
                }
                last_price = price

                await _push_tick(ticker, tick)

                # Also publish to Redis for horizontal scaling
                try:
                    redis = await get_redis()
                    await redis.publish(f"ticks:{ticker}", json.dumps(tick))
                except Exception:
                    pass

            except Exception as e:
                logger.warning(f"WS poller error for {ticker}: {e}")

            await asyncio.sleep(5)
    finally:
        _poller_running[ticker] = False
        logger.info(f"WS poller stopped for {ticker}")


@router.websocket("/ws/ticks/{ticker}")
async def websocket_ticks(websocket: WebSocket, ticker: str):
    """
    WebSocket endpoint for real-time price ticks.
    Each connected client receives a tick every ~5 seconds.

    Message format:
        { type: "tick" | "snapshot" | "keepalive", ticker, price,
          change, change_pct, timestamp, direction }
    """
    ticker = ticker.upper().strip()[:10]
    await websocket.accept()
    logger.info(f"WS client connected: {ticker}")

    # Register connection
    if ticker not in _connections:
        _connections[ticker] = set()
    _connections[ticker].add(websocket)

    # Start poller only if not already running for this ticker
    if not _poller_running.get(ticker):
        asyncio.create_task(_poll_ticker(ticker))

    # Send immediate snapshot on connect
    try:
        quote = await fh.get_quote(ticker)
        await websocket.send_json({
            "type": "snapshot",
            "ticker": ticker,
            "price": quote.get("price"),
            "change": quote.get("change"),
            "change_pct": quote.get("change_pct"),
            "timestamp": int(datetime.now(timezone.utc).timestamp()),
            "direction": "flat",
        })
    except Exception as e:
        logger.warning(f"WS snapshot failed for {ticker}: {e}")

    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if msg == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "keepalive"})
    except WebSocketDisconnect:
        logger.info(f"WS client disconnected: {ticker}")
    except Exception as e:
        logger.warning(f"WS error for {ticker}: {e}")
    finally:
        _connections.get(ticker, set()).discard(websocket)
