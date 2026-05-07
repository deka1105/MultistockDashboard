# 📈 StockDash

A production-grade multi-stock SaaS dashboard with real-time data, multi-stock comparison, watchlists, news feed, and a social sentiment prediction engine.

**Live stack:** React · FastAPI · PostgreSQL · Redis · Celery · Recharts · Docker

---

## Features (Phases 1–3)

- **Real-time quotes** — price, change %, OHLV stats, 52-week range
- **Interactive charts** — line + candlestick, MA50/MA200 overlays, volume bars, 6 time ranges
- **Multi-stock comparison** — normalized % return chart, absolute price toggle, interactive legend, correlation matrix, PNG export
- **Watchlists** — named lists, drag-to-reorder, sparklines, bulk compare, PostgreSQL persistence
- **Market overview** — S&P 500 top 50 sortable table with sector filter, volume, 7-day sparklines
- **News feed** — per-ticker news with sentiment badges
- **Mock data mode** — works fully without a Finnhub API key

---

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url>
cd stockdash
cp backend/.env.example backend/.env
# Edit backend/.env — add FINNHUB_API_KEY (optional, mock data works without it)

# 2. Start everything
docker compose up --build

# 3. Open
# Frontend:  http://localhost:5173
# API docs:  http://localhost:8000/docs
# Health:    http://localhost:8000/health
```

---

## Architecture

```
stockdash/
├── frontend/          # React 18 + Vite + TypeScript
│   └── src/
│       ├── components/   # charts, layout, stocks, compare, watchlist
│       ├── pages/        # DashboardPage, ComparePage, WatchlistPage, MarketPage
│       ├── hooks/        # TanStack Query data hooks
│       ├── store/        # Zustand global state
│       └── lib/          # Axios client, utils, query config
│
├── backend/           # FastAPI (async Python)
│   └── app/
│       ├── routers/      # stocks, watchlist, health
│       ├── services/     # finnhub API + mock data
│       ├── models/       # SQLAlchemy ORM models
│       ├── schemas/      # Pydantic response schemas
│       ├── db/           # Async session, engine
│       ├── core/         # Config, Redis cache
│       └── workers/      # Celery tasks + beat schedule
│
├── ml/                # NLP sentiment pipeline (Phase 4)
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Charts | Recharts |
| State | Zustand (persisted) |
| Data fetching | TanStack Query v5 |
| Backend | FastAPI (async), Python 3.11 |
| Database | PostgreSQL 15 + SQLAlchemy async |
| Cache | Redis 7 |
| Task queue | Celery + Redis broker |
| Containerization | Docker + Docker Compose |
| Stock data | Finnhub REST API |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `FINNHUB_API_KEY` | No | Finnhub API key — mock data used if empty |
| `SECRET_KEY` | Yes (prod) | JWT signing key — run `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | Yes (prod) | Change from default in production |
| `REDDIT_CLIENT_ID` | Phase 4 | Reddit API credentials |
| `TWITTER_BEARER_TOKEN` | Phase 4 | Twitter API v2 bearer token |

---

## Development

```bash
# Run only backend + DB + Redis (frontend local)
docker compose up api db redis

# Frontend outside Docker (faster HMR)
cd frontend
VITE_API_URL=http://localhost:8000 npm run dev

# Run DB migrations manually
docker compose exec api alembic upgrade head

# Watch Celery tasks
docker compose up worker beat
# Open Flower: docker compose exec worker celery -A app.workers.celery_app flower
```

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Backend scaffold, DB schema, Finnhub API, mock data |
| 2 | ✅ Done | Dashboard UI — quote, charts, news, stats |
| 3 | ✅ Done | Compare, Watchlist, Market overview |
| 4 | 🔄 In progress | Real-time WebSocket, Reddit/X sentiment, FinBERT |
| 5 | ⏳ Planned | Auth, Stripe subscriptions, production deploy |
