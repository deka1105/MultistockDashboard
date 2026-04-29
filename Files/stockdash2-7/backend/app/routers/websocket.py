"""
WebSocket router — real-time price tick fan-out.

Flow:
  Client connects → WS /api/v1/ws/ticks/{ticker}
  Backend polls Finnhub quote every 5s
  Each tick is pushed to all connected clients for that ticker via Redis pub/sub
  Falls back gracefully to direct polling if Redis is unavailable
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

# In-memory connection registry: ticker → set of websockets
_connections: dict[str, set[WebSocket]] = {}


async def _push_tick(ticker: str, data: dict):
    """Push a tick to all connected clients for a ticker."""
    dead = set()
    for ws in _connections.get(ticker, set()):
        try:
            await ws.send_json(data)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _connections[ticker].discard(ws)


async def _poll_ticker(ticker: str):
    """
    Poll Finnhub quote every 5s and push to subscribers.
    Runs as a background task per unique ticker being watched.
    """
    logger.info(f"WS poller started for {ticker}")
    last_price = None

    while ticker in _connections and _connections[ticker]:
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
                    "up" if last_price and price and price > last_price
                    else "down" if last_price and price and price < last_price
                    else "flat"
                ),
            }
            last_price = price

            # Push to connected clients
            await _push_tick(ticker, tick)

            # Also publish to Redis pub/sub for horizontal scaling
            try:
                redis = await get_redis()
                await redis.publish(f"ticks:{ticker}", json.dumps(tick))
            except Exception:
                pass  # Redis pub/sub is best-effort

        except Exception as e:
            logger.warning(f"WS poller error for {ticker}: {e}")

        await asyncio.sleep(5)

    logger.info(f"WS poller stopped for {ticker} (no subscribers)")


@router.websocket("/ws/ticks/{ticker}")
async def websocket_ticks(websocket: WebSocket, ticker: str):
    """
    WebSocket endpoint for real-time price ticks.
    Each connected client receives a tick every ~5 seconds.

    Message format:
        { type: "tick", ticker, price, change, change_pct, timestamp, direction }
    """
    ticker = ticker.upper().strip()[:10]
    await websocket.accept()
    logger.info(f"WS client connected for {ticker}")

    # Register this connection
    if ticker not in _connections:
        _connections[ticker] = set()
    _connections[ticker].add(websocket)

    # Start background poller if this is the first subscriber
    if len(_connections[ticker]) == 1:
        asyncio.create_task(_poll_ticker(ticker))

    # Send immediate first tick on connect
    try:
        quote = await fh.get_quote(ticker)
        await websocket.send_json({
            "type": "snapshot",
            "ticker": ticker,
            "price": quote.get("price"),
            "change": quote.get("change"),
            "change_pct": quote.get("change_pct"),
            "timestamp": int(datetime.now(timezone.utc).timestamp()),
        })
    except Exception as e:
        logger.warning(f"WS initial snapshot failed for {ticker}: {e}")

    try:
        # Keep connection alive — wait for client disconnect or ping
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if msg == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_json({"type": "keepalive"})
    except WebSocketDisconnect:
        logger.info(f"WS client disconnected from {ticker}")
    except Exception as e:
        logger.warning(f"WS error for {ticker}: {e}")
    finally:
        _connections.get(ticker, set()).discard(websocket)
