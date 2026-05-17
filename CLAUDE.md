# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # TypeScript + Vite production build
npm run lint         # ESLint
npm run test         # Vitest (158 tests)
npm run test:watch   # Watch mode
npm run test:coverage
```

### Backend — local dev via Docker Compose (project root)
```bash
docker compose up --build   # Starts all 6 services (api, worker, beat, db, redis, frontend)
```

### Backend — inside container or local Python env
```bash
pytest tests/                        # All 242 tests
pytest tests/unit/                   # ~95 unit tests
pytest tests/integration/            # ~85 integration tests
pytest tests/e2e/                    # ~62 end-to-end tests
pytest --cov=app                     # Coverage report

alembic upgrade head                 # Apply migrations manually
alembic revision --autogenerate -m "message"  # Generate migration
```

API docs available at `http://localhost:8000/docs` when running.

## Architecture

Monorepo: React/Vite/TypeScript frontend + FastAPI async Python backend + PostgreSQL + Redis + Celery.

### Request Flow
1. **REST**: Frontend → Axios (`frontend/src/lib/api.ts`) → FastAPI routers (`backend/app/routers/`) → Services → DB or Redis cache
2. **WebSocket real-time quotes**: Frontend `useWebSocket` hook → `GET /ws/ticks/{ticker}` → Redis Pub/Sub fan-out → one Finnhub WS poller per ticker
3. **Background tasks**: Celery Beat scheduler → Workers → DB/cache updates

### Key Architectural Decisions
- **Guest mode**: `GUEST_ID=1` user auto-created on first write; entire app works without auth. Phase 5 (JWT + Stripe) is intentionally deferred.
- **Mock mode**: When `FINNHUB_API_KEY` is empty, all data calls return deterministic mock data.
- **Client-side indicators**: RSI, MACD, Stochastic are computed in the browser from candle data (`frontend/src/lib/indicators.ts`) — no extra API calls.
- **Migrations on API only**: `backend/entrypoint.sh` only runs `alembic upgrade head` when the command is `uvicorn`; Celery worker/beat skip it.
- **Redis database separation**: Quote cache → DB 0, Celery broker → DB 1, Celery results → DB 2.

### Frontend State
- **Zustand** (`frontend/src/store/useAppStore.ts`): Global persisted state — chart type/range, indicator toggles (MA50, MA200, BB, VWAP, EMA9/21), active oscillator panels, theme, sidebar, recent tickers.
- **TanStack Query**: Server state (quotes, candles, news, sentiment, portfolio).
- Backend is source of truth for watchlists and portfolio; Zustand mirrors watchlist locally for instant UI feedback.

### Backend Structure
- `backend/app/routers/` — one file per domain: `stocks.py`, `portfolio.py`, `watchlist.py`, `screener.py`, `alerts.py`, `sentiment.py`, `earnings.py`
- `backend/app/services/` — business logic, Finnhub client, sentiment pipeline (FinBERT via `transformers`)
- `backend/app/workers/celery_app.py` — Beat schedule: quote cache warm (30s), alert checks (30s), Reddit ingest (15 min), StockTwits (30 min), sentiment compute (hourly), metadata refresh (nightly 2am UTC)
- `backend/app/models/models.py` — all SQLAlchemy models: User, Watchlist, WatchlistItem, Portfolio, Position, PnLSnapshot, Alert, EarningsEvent, SentimentScore, SocialPost, StockMetadata
- All DB access is async (SQLAlchemy 2.0 async + asyncpg)

### Caching TTLs (Redis DB 0)
| Data | TTL |
|------|-----|
| Quote | 30s |
| Candles | 5 min |
| Market overview | 60s |
| Indicators | 15 min |

### Deployment
`render.yaml` at the project root is a one-click Render blueprint provisioning 6 services (API, Celery worker, Celery beat, PostgreSQL, Redis, static frontend). Environment variables are injected by Render — no `.env` file is read in production. Frontend production env vars live in `frontend/.env.production`.

### External Data Sources
- **Finnhub**: Primary — quotes, candles, news, options, earnings (60 req/min free tier)
- **yfinance**: Free fallback (15-min delayed)
- **StockTwits**: Pre-labeled sentiment (no auth required)
- **Reddit (PRAW)**: Optional; requires OAuth credentials in env
