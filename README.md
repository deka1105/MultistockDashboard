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
# 📈 Multi-Stock Dynamic Dashboard — SaaS Development Roadmap

**Stack:** React (Vite) · FastAPI · Recharts · PostgreSQL · Redis · Finnhub · Reddit API · X (Twitter) API · Docker · Railway / Render  
**Goal:** Production-grade SaaS stock dashboard with real-time data, multi-stock comparison, watchlists, news feed, and a social sentiment prediction engine.  
**Total Estimated Timeline:** 12–16 weeks (solo developer, part-time)

---

## Roadmap Overview

| Phase | Name | Focus | Est. Duration |
|---|---|---|---|
| 1 | Foundation & Data Pipeline | Project architecture, API proxying, DB schema, data ingestion | 2–3 weeks |
| 2 | Core Dashboard UI | Single-ticker view, charts, price cards, search | 2–3 weeks |
| 3 | Multi-Stock & Watchlist Features | Comparison charts, portfolio view, watchlist persistence | 2–3 weeks |
| 4 | Real-Time, News & Sentiment Engine | WebSocket ticks, news feed, Reddit/X ingestion, NLP model | 3–4 weeks |
| 5 | SaaS Layer, Auth & Deployment | Auth, subscriptions, rate limiting, CI/CD, production hosting | 2–3 weeks |

---

## Phase 1 — Foundation & Data Pipeline
**Duration:** 2–3 weeks  
**Goal:** A clean, scalable backend skeleton with all data sources wired up, before any UI is built.

### Project Structure
- [ ] Monorepo layout: `/frontend` (React/Vite) + `/backend` (FastAPI) + `/ml` (NLP pipeline)
- [ ] Docker Compose for local dev: `app`, `db` (PostgreSQL), `redis`, `worker` (Celery)
- [ ] Environment config: `.env` files per service, `python-dotenv`, Vite `import.meta.env`
- [ ] Git repo with `main` / `dev` / `feature/*` branching strategy

### FastAPI Backend Scaffold
- [ ] Project layout: `routers/`, `services/`, `models/`, `schemas/`, `db/`, `workers/`
- [ ] PostgreSQL integration via `SQLAlchemy` (async) + `Alembic` for migrations
- [ ] Redis integration via `aioredis` for caching and pub/sub
- [ ] Celery + Redis as message broker for async data ingestion jobs
- [ ] Global error handling middleware, request logging, CORS setup
- [ ] Health check endpoint `GET /health`

### Stock Data Integration (Finnhub)
- [ ] Create Finnhub account, obtain REST + WebSocket API keys
- [ ] `GET /api/v1/quote/{ticker}` — real-time quote proxy
- [ ] `GET /api/v1/candles/{ticker}` — OHLC historical data with resolution param
- [ ] `GET /api/v1/search?q={query}` — ticker symbol autocomplete
- [ ] `GET /api/v1/news/{ticker}` — company news from Finnhub
- [ ] Cache all REST responses in Redis (TTL: 30s for quotes, 5min for candles)
- [ ] Rate-limit handler: queue requests when approaching 60 req/min free tier limit

### Database Schema (Initial)
```sql
users            (id, email, hashed_password, plan, created_at)
watchlists       (id, user_id, name, created_at)
watchlist_items  (id, watchlist_id, ticker, added_at)
stock_metadata   (ticker, company_name, sector, market_cap, updated_at)
social_posts     (id, ticker, source, text, score, created_at)
sentiment_scores (id, ticker, source, score, volume, computed_at)
```

### Deliverable
> Docker Compose stack running locally. All Finnhub endpoints returning clean, cached JSON. DB schema migrated. Testable via Swagger UI at `/docs`.

---

## Phase 2 — Core Dashboard UI
**Duration:** 2–3 weeks  
**Goal:** A polished single-ticker dashboard that looks like a real SaaS product.

### Frontend Scaffold
- [ ] Vite + React + TypeScript project setup
- [ ] Routing: `react-router-dom` v6 — `/`, `/dashboard/:ticker`, `/compare`, `/watchlist`, `/market`
- [ ] Global state: `Zustand` for watchlist state + user preferences
- [ ] Data fetching: `TanStack Query` — caching, background refetch, loading states
- [ ] UI base: `shadcn/ui` + Tailwind CSS (dark mode default, finance aesthetic)
- [ ] Axios instance with base URL + JWT auth interceptor

### Layout & Navigation
- [ ] App shell: collapsible left sidebar + top header bar
- [ ] Global ticker search with autocomplete (debounced, hits `/api/v1/search`)
- [ ] Dark / light theme toggle persisted to `localStorage`
- [ ] Responsive layout (desktop-first, mobile-functional)
- [ ] Empty / error / loading skeleton states for all data-dependent components

### Price Summary Section
- [ ] Current price card with delta badge (green/red, absolute + %)
- [ ] OHLV stats row: Open, High, Low, Volume (formatted with `Intl.NumberFormat`)
- [ ] 52-week range progress bar
- [ ] Market status indicator (Open / Closed / Pre-market / After-hours)

### Chart Section (Recharts)
- [ ] Line chart — closing price with time range selector (1D / 1W / 1M / 3M / 1Y)
- [ ] Candlestick chart using `recharts` ComposedChart (custom bar + whisker rendering)
- [ ] Volume bar chart synchronized on x-axis
- [ ] Crosshair tooltip showing OHLCV on hover
- [ ] Chart type toggle: Line ↔ Candlestick
- [ ] Reference lines: 50-day MA, 200-day MA (toggleable)

### Deliverable
> `/dashboard/AAPL` renders a full single-stock view with live quote, historical chart, and all stat cards.

---

## Phase 3 — Multi-Stock & Watchlist Features
**Duration:** 2–3 weeks  
**Goal:** The core SaaS differentiator — compare any set of stocks and manage a persistent watchlist.

### Multi-Stock Comparison (`/compare`)
- [ ] URL-driven state: `/compare?tickers=AAPL,MSFT,GOOGL`
- [ ] Ticker chip input — add up to 8 tickers, remove with ×
- [ ] Normalized % return overlay chart (all series start at 0% from selected date)
- [ ] Absolute price chart mode toggle (Y-axis per ticker or dual-axis)
- [ ] Color-coded series with interactive legend (click to hide/show)
- [ ] Correlation matrix heatmap (Recharts `ScatterChart` or D3 tile grid)
- [ ] Summary stats table: ticker, start price, end price, % change, volatility (std dev)
- [ ] Export comparison chart as PNG (`html2canvas`)

### Watchlist (`/watchlist`)
- [ ] Watchlist CRUD: create named lists, rename, delete
- [ ] Add/remove tickers from any ticker page or market overview
- [ ] Compact ticker card: price, % change, 7-day sparkline (Recharts miniature `LineChart`)
- [ ] Bulk action: add all watchlist tickers to comparison view
- [ ] Watchlist stored in PostgreSQL (authenticated) with `localStorage` fallback (guest)
- [ ] Drag-to-reorder via `@dnd-kit/core`

### Market Overview (`/market`)
- [ ] Sortable, filterable table of S&P 500 top 50 stocks
- [ ] Columns: Ticker, Company, Sector, Price, Change %, Volume, Market Cap, 7-day Sparkline
- [ ] Filter by sector dropdown, search by name or ticker
- [ ] Client-side sort on all numeric columns
- [ ] Auto-refresh every 60s using TanStack Query `refetchInterval`
- [ ] "Add to watchlist" action per row

### Backend (Phase 3 additions)
- [ ] `GET /api/v1/compare?tickers=AAPL,MSFT` — batched quote + candle fetch, normalized return series
- [ ] `GET /api/v1/watchlist` / `POST` / `DELETE` — CRUD endpoints (auth-gated)
- [ ] `GET /api/v1/market/overview` — batch quote for S&P top 50, cached in Redis 60s
- [ ] Celery beat task: refresh stock metadata (sector, market cap) nightly

### Deliverable
> `/compare?tickers=AAPL,TSLA,NVDA` renders a normalized return chart + correlation matrix. Authenticated users have persistent watchlists across devices.

---

## Phase 4 — Real-Time, News & Sentiment Prediction Engine
**Duration:** 3–4 weeks  
**Goal:** Live streaming data, news aggregation, and an NLP sentiment signal derived from Reddit and X (Twitter).

### Real-Time Price Ticks (WebSocket)
- [ ] FastAPI WebSocket endpoint: `WS /ws/ticks/{ticker}`
- [ ] Backend subscribes to Finnhub WebSocket and fans out to connected clients via Redis pub/sub
- [ ] Frontend `useWebSocket` hook (`reconnecting-websocket`) — subscribes on mount, unsubscribes on unmount
- [ ] Price card flash animation on tick (CSS transition: green flash up, red flash down)
- [ ] Live-appending line chart — new price point added to Recharts data on each tick
- [ ] Graceful degradation: fallback to 30s REST polling if WebSocket fails

### News Feed
- [ ] Finnhub `/company-news` per ticker → news panel alongside chart
- [ ] News card: headline, source, timestamp, sentiment tag (Positive / Neutral / Negative)
- [ ] General market news tab (`/news?category=general`)
- [ ] NewsAPI.org as secondary source for broader coverage
- [ ] Infinite scroll pagination for news panel
- [ ] "Open original" external link per article

### Social Data Ingestion
- [ ] **Reddit (PRAW):** Pull from `r/wallstreetbets`, `r/stocks`, `r/investing`, `r/options`
  - [ ] Celery beat task: poll top/new posts + comments every 15 min per tracked ticker
  - [ ] Store in `social_posts`: `(id, ticker, source, text, score, created_at)`
- [ ] **X / Twitter (API v2):** Fetch recent tweets by cashtag (`$AAPL`, `$TSLA`)
  - [ ] Celery task: fetch last 100 tweets per ticker every 30 min
  - [ ] Exponential backoff + jitter for rate limit handling
- [ ] **StockTwits (free fallback):** `GET https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json`
  - [ ] Includes user-tagged `bullish`/`bearish` sentiment — no NLP needed for this source
- [ ] **Preprocessing pipeline:**
  - [ ] Strip URLs, mentions, emojis → normalize text
  - [ ] Deduplicate by post ID
  - [ ] Filter noise: min upvote threshold (Reddit), min engagement (X)

### NLP Sentiment Model (FinBERT)
- [ ] Model: `ProsusAI/finbert` from HuggingFace — fine-tuned BERT for financial text
- [ ] Celery worker runs inference on each ingested post → `positive` / `neutral` / `negative` + confidence score
- [ ] Aggregate per ticker per window (1h, 4h, 1d): weighted average (weight = post score)
- [ ] Store results in `sentiment_scores` table
- [ ] `GET /api/v1/sentiment/{ticker}` → `{ score, label, volume, window }`
- [ ] `GET /api/v1/sentiment/{ticker}/history` → time-series for charting

### Sentiment Dashboard Components
- [ ] **Sentiment Gauge:** Recharts `RadialBarChart` — score from −1 (bearish) to +1 (bullish)
- [ ] **Sentiment Trend Chart:** `AreaChart` — sentiment score over time overlaid on price chart
- [ ] **Source Breakdown:** Reddit vs X vs StockTwits volume + average score bar chart
- [ ] **Top Posts Panel:** Most upvoted posts driving the signal, with direct links
- [ ] **Sentiment Signal Badge:** Bullish / Bearish / Neutral displayed prominently per ticker

### Price Direction Signal (Stretch Goal)
- [ ] Feature engineering: sentiment score + RSI + MACD + volume delta
- [ ] Train `scikit-learn` `GradientBoostingClassifier` → predict next-day direction (Up / Down)
- [ ] Walk-forward validation; report accuracy, precision, recall
- [ ] Surface as a "Signal" card: `▲ Bullish signal (67% confidence)`
- [ ] Retrain weekly via Celery beat on fresh data
- [ ] **Mandatory UI disclaimer:** *"This signal is experimental and not financial advice. Past performance does not guarantee future results."*

### Deliverable
> Live-ticking prices, a per-ticker news panel, a sentiment gauge sourced from Reddit + X + StockTwits, and an optional directional signal badge.

---

## Phase 5 — SaaS Layer, Auth & Production Deployment
**Duration:** 2–3 weeks  
**Goal:** Turn the dashboard into a shippable SaaS product with auth, tiered access, CI/CD, and a live URL.

### Authentication
- [ ] `FastAPI Users` — JWT auth (email/password) + Google OAuth
- [ ] Access token (15min) + refresh token (7d) in `httpOnly` cookies
- [ ] Protected routes in React (`<PrivateRoute>` component)
- [ ] Auth pages: `/login`, `/register`, `/forgot-password`
- [ ] Email verification via `FastAPI-Mail` + SendGrid / Mailgun

### SaaS Tier Model

| Feature | Free | Pro ($9/mo) | Team ($29/mo) |
|---|---|---|---|
| Tickers tracked | 5 | Unlimited | Unlimited |
| Watchlists | 1 | 10 | Unlimited |
| Sentiment data | Last 24h | Last 90d | Full history |
| Real-time WebSocket | ❌ | ✅ | ✅ |
| Prediction signal | ❌ | ✅ | ✅ |
| Export (PNG/CSV) | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ |

- [ ] `Stripe` integration — `stripe-python` + webhooks for subscription lifecycle
- [ ] Plan stored on `users` table; enforced in FastAPI dependency injection
- [ ] `/billing` page: current plan, upgrade CTA, Stripe customer portal link
- [ ] Webhook handlers: `customer.subscription.updated`, `invoice.payment_failed`

### Rate Limiting & Security
- [ ] `slowapi` — per-user and per-IP limits on all endpoints
- [ ] Security response headers via FastAPI middleware
- [ ] Ticker param whitelist (prevent injection via symbol inputs)
- [ ] API key rotation for Finnhub / Reddit / X (stored in secrets manager)

### Performance
- [ ] Audit React renders; memoize heavy chart components (`React.memo`, `useMemo`)
- [ ] `React.lazy` + `Suspense` for route-level code splitting
- [ ] GZip compression (`GZipMiddleware` in FastAPI)
- [ ] PostgreSQL connection pooling via `asyncpg`
- [ ] Redis cache warming: pre-fetch quotes for top 50 tickers every 30s via Celery

### Deployment Architecture
- [ ] **Frontend:** `vite build` → deploy to Vercel or Netlify (CDN)
- [ ] **Backend API:** Dockerized FastAPI → Railway or Render (auto-deploy from GitHub)
- [ ] **Database:** Railway Postgres or Supabase (managed)
- [ ] **Redis:** Railway Redis or Upstash (serverless, free tier)
- [ ] **ML / Celery Worker:** Separate Railway service (FinBERT inference, no GPU required)
- [ ] **CI/CD:** GitHub Actions — lint → test → build → deploy on merge to `main`
- [ ] Custom domain + HTTPS via Cloudflare
- [ ] Environment variables managed in platform dashboards (never in source)

### Monitoring
- [ ] `Sentry` — frontend JS errors + FastAPI exception tracking
- [ ] `Prometheus` metrics exposed at `/metrics` + Grafana dashboard (or Render built-in)
- [ ] `PostHog` (open-source) — product analytics: page views, feature funnels, retention

### Portfolio & Launch
- [ ] `README.md` with architecture diagram, feature list, local setup instructions, live URL
- [ ] Architecture diagram (Excalidraw or draw.io) showing all services and data flows
- [ ] 3-min Loom demo for LinkedIn + job applications
- [ ] Product Hunt launch checklist

### Deliverable
> Live production URL with auth, Stripe subscriptions, real-time data, sentiment prediction, and a fully monitored CI/CD pipeline.

---

## Full Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | SPA, fast HMR |
| UI | shadcn/ui + Tailwind CSS | Finance-dark aesthetic |
| Charts | Recharts | Line, candlestick, area, scatter, sparklines |
| State | Zustand | Lightweight global state |
| Data Fetching | TanStack Query | Caching, polling, background refresh |
| Backend | FastAPI (async Python) | REST API + WebSocket |
| ORM / Migrations | SQLAlchemy (async) + Alembic | DB models, schema versioning |
| Database | PostgreSQL | Users, watchlists, sentiment |
| Cache / Pub-Sub | Redis | API cache, WebSocket fan-out |
| Task Queue | Celery + Redis | Async ingestion, retraining |
| NLP | FinBERT (HuggingFace) | Financial sentiment classification |
| Stock Data | Finnhub REST + WebSocket | Quotes, candles, news, ticks |
| Social Data | PRAW + Twitter API v2 + StockTwits | Sentiment signal sources |
| Auth | FastAPI Users (JWT + OAuth) | Authentication |
| Payments | Stripe | Subscription management |
| Containers | Docker + Docker Compose | Dev parity |
| CI/CD | GitHub Actions | Automated deploy pipeline |
| Hosting (FE) | Vercel / Netlify | CDN, static |
| Hosting (BE) | Railway / Render | Managed containers |
| Monitoring | Sentry + PostHog + Prometheus | Errors, analytics, metrics |

---

## Key Milestones

```
Week 1–3   ▓▓▓░░░░░░░░░░░░░  Phase 1 — Backend, DB, all APIs wired, Docker Compose running
Week 4–6   ░░░▓▓▓▓░░░░░░░░░  Phase 2 — Single-ticker dashboard UI live and shareable
Week 7–9   ░░░░░░░▓▓▓░░░░░░  Phase 3 — Compare + watchlist + market overview functional
Week 10–13 ░░░░░░░░░░▓▓▓▓░░  Phase 4 — Live ticks + news + Reddit/X sentiment engine
Week 14–16 ░░░░░░░░░░░░░░▓▓  Phase 5 — Auth + Stripe + production deployed + monitored
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
## Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Finnhub free tier rate limits (60 req/min) | High | Redis cache + Celery request queuing |
| X API v2 cost / access restrictions | High | Use StockTwits (free, finance-native, pre-labeled sentiment) as fallback |
| FinBERT inference latency | Medium | Async Celery worker; never block API response |
| Scope creep on prediction model | High | Ship sentiment score first; price signal is a Phase 4 stretch goal |
| WebSocket scale at many concurrent users | Medium | Redis pub/sub fan-out; cap WS connections per plan tier |
| Stripe webhook reliability | Medium | Idempotency keys + retry logic on all webhook handlers |
| Cold start on free hosting tiers | Low | Upgrade to paid tier before launch; add uptime ping |

---

*Generated: 2026 · Stack: React + FastAPI + Recharts + FinBERT · Goal: SaaS Production*
