# 📈 Multi-Stock Dynamic Dashboard — SaaS Development Roadmap

**Stack:** React (Vite) · FastAPI · Recharts · PostgreSQL · Redis · Finnhub · Reddit API · X (Twitter) API · Docker · Railway / Render  
**Goal:** Production-grade SaaS stock dashboard with real-time data, multi-stock comparison, watchlists, news feed, social sentiment, portfolio analytics, and professional-grade technical analysis tools.  
**Total Estimated Timeline:** 26–34 weeks (solo developer, part-time)  
**Current Status:** Phases 1–9 complete · 242 backend tests · 158 frontend tests · Phase 10–11 in roadmap · Phase 5 deferred

---

## 📊 Project Health Snapshot

```
Overall Completion    ████████████████████░░░░  82%  (9 of 11 phases)
Backend Test Suite    ██████████████████████░░  242 tests passing
Frontend Test Suite   ████████████████░░░░░░░░  158 tests passing
Phase 5 (Auth/SaaS)   [DEFERRED — intentional]
Phases 10–11          [IN DESIGN]
```

### Test Coverage Breakdown

| Suite | Tests | Status | Coverage Indicator |
|---|---|---|---|
| Backend Unit | ~95 | ✅ Pass | `██████████████████░░` 90% |
| Backend Integration | ~85 | ✅ Pass | `█████████████████░░░` 85% |
| Backend E2E | ~62 | ✅ Pass | `████████████████░░░░` 80% |
| Frontend Utils | ~60 | ✅ Pass | `████████████████████` 95% |
| Frontend Components | ~58 | ✅ Pass | `███████████████░░░░░` 75% |
| Frontend Hooks | ~40 | ✅ Pass | `██████████████░░░░░░` 70% |

---

## 🗺️ Roadmap Overview

| Phase | Name | Focus | Duration | Status |
|---|---|---|---|---|
| 1 | Foundation & Data Pipeline | Architecture, API proxying, DB schema, data ingestion | 2–3 weeks | ✅ Complete |
| 2 | Core Dashboard UI | Single-ticker view, charts, price cards, search | 2–3 weeks | ✅ Complete |
| 3 | Multi-Stock & Watchlist Features | Comparison charts, watchlist persistence, market overview | 2–3 weeks | ✅ Complete |
| 4 | Real-Time, News & Sentiment Engine | WebSocket ticks, news feed, StockTwits sentiment, mock fallback | 3–4 weeks | ✅ Complete |
| 5 | SaaS Layer, Auth & Deployment | Auth, Stripe, rate limiting, CI/CD, production hosting | 2–3 weeks | ⏳ Deferred |
| 6 | Portfolio P&L Tracker | Holdings management, P&L tracking, allocation donut, vs-benchmark chart | 2–3 weeks | ✅ Complete |
| 7 | Technical Indicators | RSI, MACD, Bollinger Bands, VWAP — chart overlays and oscillator panels | 2–3 weeks | ✅ Complete |
| 8 | Advanced Analysis Tools | Earnings calendar, screener, price alerts, correlation heatmap | 2–3 weeks | ✅ Complete |
| 9 | Institutional & Options Intelligence | Options flow heatmap, institutional ownership, candlestick patterns, sector heatmap | 2–3 weeks | ✅ Complete |
| 10 | Portfolio Command Centre | Unified analytics dashboard — embed all widgets into Portfolio page | 2–3 weeks | 🔲 Not started |
| 11 | App Shell Polish & Navigation | Sidebar groups, NEW badges, LIVE indicator, header quick-actions, Pro banner | 1 week | 🔲 Not started |

---

## 📅 Full Timeline (Gantt-Style)

```
         W1  W2  W3  W4  W5  W6  W7  W8  W9  W10 W11 W12 W13 W14 W15 W16 W17 W18 W19 W20 W21 W22 W23 W24 W25 W26 W27 W28 W29 W30 W31
Phase 1  ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ✅
Phase 2  ·   ·   ·   ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ✅
Phase 3  ·   ·   ·   ·   ·   ·   ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ✅
Phase 4  ·   ·   ·   ·   ·   ·   ·   ·   ·   ███ ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ✅
Phase 5  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ─── ─── ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ⏳
Phase 6  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ✅
Phase 7  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ✅
Phase 8  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ███ ███ ███ ·   ·   ·   ·   ·   ·   ·   ✅
Phase 9  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ███ ███ ███ ·   ·   ·   ·   ✅
Phase 10 ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ░░░ ░░░ ░░░ ·   🔲
Phase 11 ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ░░░ 🔲

Legend:  ███ = Completed   ─── = Deferred   ░░░ = Planned
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                         │
│                                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Dashboard  │  │  Portfolio   │  │   Screener   │  │    Compare    │ │
│  │  /dashboard │  │  /portfolio  │  │  /screener   │  │   /compare    │ │
│  └────────────┘  └──────────────┘  └──────────────┘  └───────────────┘ │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Watchlist  │  │   Calendar   │  │    Market    │  │    Alerts     │ │
│  │  /watchlist │  │  /calendar   │  │   /market    │  │   /alerts     │ │
│  └────────────┘  └──────────────┘  └──────────────┘  └───────────────┘ │
│                                                                           │
│  State: Zustand · Data: TanStack Query · Charts: Recharts + D3           │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────────────┐
│                         BACKEND (FastAPI)                                 │
│                                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  /stocks   │  │  /portfolio  │  │  /screener   │  │  /sentiment   │ │
│  │  /candles  │  │  /positions  │  │  /alerts     │  │  /news        │ │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
│        └────────────────┴──────────────────┴──────────────────┘         │
│                                  │                                        │
│  ┌───────────────────────────────▼─────────────────────────────────┐   │
│  │              SQLAlchemy (async) + Alembic Migrations              │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                        │
│  ┌───────────────────────────────▼─────────────────────────────────┐   │
│  │              Celery Workers + Beat Scheduler                      │   │
│  │   ingest_stocktwits · compute_sentiment · check_alerts           │   │
│  │   pnl_snapshots · earnings_refresh · indicator_precompute        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
         │                      │                       │
┌────────▼──────┐     ┌─────────▼──────┐     ┌────────▼────────────────┐
│  PostgreSQL   │     │     Redis       │     │   External APIs          │
│               │     │                │     │                           │
│  users        │     │  Quote cache   │     │  Finnhub REST + WS        │
│  watchlists   │     │  Candle cache  │     │  StockTwits               │
│  positions    │     │  WS pub/sub    │     │  Reddit (PRAW)            │
│  pnl_snapshot │     │  Indicator     │     │  SEC EDGAR                │
│  alerts       │     │  pre-compute   │     │  Stripe (Phase 5)         │
│  earnings     │     │  TTL: 30s–5min │     │  SendGrid (Phase 5)       │
└───────────────┘     └────────────────┘     └───────────────────────────┘
```

---

## 📦 Phase Completion Tracker

```
Phase  1  ████████████████████  100%  Foundation & Data Pipeline        ✅
Phase  2  ████████████████████  100%  Core Dashboard UI                 ✅
Phase  3  ████████████████████  100%  Multi-Stock & Watchlist           ✅
Phase  4  ████████████████████  100%  Real-Time, News & Sentiment       ✅
Phase  5  ░░░░░░░░░░░░░░░░░░░░    0%  SaaS Layer (Deferred)             ⏳
Phase  6  ████████████████████  100%  Portfolio P&L Tracker             ✅
Phase  7  ████████████████████  100%  Technical Indicators              ✅
Phase  8  ████████████████████  100%  Advanced Analysis Tools           ✅
Phase  9  ████████████████████  100%  Institutional & Options           ✅
Phase 10  ░░░░░░░░░░░░░░░░░░░░    0%  Portfolio Command Centre          🔲
Phase 11  ░░░░░░░░░░░░░░░░░░░░    0%  App Shell Polish                  🔲
          ────────────────────
Overall   ████████████████░░░░   73%  (9/11 phases · feature-complete)
```

---

## Phase 1 — Foundation & Data Pipeline ✅
**Duration:** 2–3 weeks  
**Status:** Complete

### What was built
- Monorepo: `/frontend` (React/Vite/TypeScript) + `/backend` (FastAPI async Python)
- Docker Compose stack: `api`, `worker` (Celery), `beat` (Celery beat), `db` (PostgreSQL 15), `redis` (Redis 7), `frontend` (Node 20)
- PostgreSQL schema + Alembic migrations: `users`, `watchlists`, `watchlist_items`, `stock_metadata`, `social_posts`, `sentiment_scores`
- Finnhub REST proxy: quote, candles, search, news, profile, financials
- Redis caching: 30s TTL for quotes, 5min for candles, 60s for market overview
- SQLite-aware engine (no `pool_size` for test environments)
- Health check endpoint: `GET /health` → `{ status, db, redis, version }`

### Key architectural decisions
- SQLite in tests via URL detection — skips `pool_size`/`max_overflow`
- Guest mode: `GUEST_ID=1` with `_ensure_guest_user()` auto-creation on every write
- Mock mode: empty `FINNHUB_API_KEY` routes all calls to `mock_data.py`
- Alembic migrations only run in the `api` container, not `worker`/`beat`

### Redis Cache Strategy

| Data Type | TTL | Invalidation |
|---|---|---|
| Stock Quote | 30s | On WebSocket tick |
| Candle Data | 5 min | On range change |
| Market Overview | 60s | Celery beat |
| Indicators (RSI/MACD) | 15 min | Celery refresh |
| Sentiment Scores | 1 hr | Celery ingest task |

### Docker Service Map

```
docker-compose.yml
├── api        :8000  ← FastAPI + Alembic migrations
├── worker            ← Celery worker (ingestion, alerts, P&L)
├── beat              ← Celery beat (scheduled tasks)
├── db         :5432  ← PostgreSQL 15
├── redis      :6379  ← Cache + pub/sub
└── frontend   :5173  ← React/Vite dev server
```

---

## Phase 2 — Core Dashboard UI ✅
**Duration:** 2–3 weeks  
**Status:** Complete

### What was built
- App shell: collapsible left sidebar + sticky top header with global search
- Dashboard page (`/dashboard/:ticker`): quote card, stats row, 52-week range bar, price chart, news panel, sentiment panel
- Recharts `ComposedChart`: line + candlestick modes, volume panel, MA50/MA200 overlays
- Time range selector: 1D / 1W / 1M / 3M / 1Y / 5Y
- Dark/light theme toggle persisted to localStorage
- TanStack Query for all data fetching with 30s background refetch
- Skeleton loading states, error boundaries, retry buttons
- `cn()`, `formatPrice()`, `formatVolume()`, `formatMarketCap()`, `formatPct()` utilities

### Dashboard Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER  [🔍 Search]                    [LIVE●] [🌙] [Export]   │
├──────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR  │  AAPL  $189.42  +1.24 (+0.66%)  ●LIVE               │
│          │  ┌──────────┬──────────┬──────────┬────────────────┐ │
│ MARKETS  │  │ Mkt Cap  │ P/E Ratio│ 52W High │ 52W Low        │ │
│ Dashboard│  │ $2.94T   │  29.4×   │ $199.62  │ $164.08        │ │
│ Market   │  └──────────┴──────────┴──────────┴────────────────┘ │
│ Compare  │  52W Range:  ████████████████████░░░░░  $164 ──── $200│
│          │  ┌──────────────────────────────────────────────────┐ │
│PORTFOLIO │  │        PRICE CHART (Recharts ComposedChart)       │ │
│Portfolio │  │  [1D][1W][1M][3M][1Y][5Y]  [Line/Candle] [MA50] │ │
│Watchlist │  │                          ╱╲                       │ │
│          │  │                      ╱──╱  ╲──╱                  │ │
│ANALYSIS  │  │                 ╱───╱                             │ │
│Screener  │  │  VOLUME ▌▌▌▌  ▌▌▌▌▌▌  ▌▌▌▌▌▌▌▌                  │ │
│Indicators│  └──────────────────────────────────────────────────┘ │
│Calendar  │  ┌──────────────────────┐ ┌─────────────────────────┐ │
│Alerts    │  │   NEWS FEED          │ │  SENTIMENT GAUGE        │ │
│          │  │  · Reuters…          │ │     ╭────╮              │ │
│          │  │  · Bloomberg…        │ │   ╭─┤ 62 ├─╮  Bullish   │ │
│          │  │  · CNBC…             │ │   ╰─╯────╰─╯            │ │
│          │  └──────────────────────┘ └─────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## Phase 3 — Multi-Stock & Watchlist Features ✅
**Duration:** 2–3 weeks  
**Status:** Complete

### What was built
- Compare page (`/compare?tickers=AAPL,MSFT,NVDA`): normalized % return overlay, Pearson correlation matrix, summary table, color-coded series
- Watchlist page (`/watchlist`): named lists, CRUD, drag-to-reorder (dnd-kit), sparklines per card, auto-create default list on fresh DB
- Market overview (`/market`): 50 S&P stocks, sortable columns, sector filter, lazy 7D sparklines
- Backend: `quick-add`, `quick-remove`, `quick-check` endpoints for star buttons on all pages
- Star buttons on Dashboard + Market pages wired to PostgreSQL backend (not localStorage)
- `_ensure_guest_user()` auto-creates `User(id=1)` before any write — no FK errors on fresh DBs

### Sample Normalized Return Comparison Chart

```
  %
+60│                                                      NVDA ████
   │                                               ╱─────────────
+40│                                         ╱────╱
   │                                   ╱────╱             AAPL ████
+20│                             ╱────╱──────────────────────────
   │                       ──────╲──────────────────────
  0├─────────────────────────────────────────────────────────────▶ Time
   │           ╲─────────────────                        MSFT ████
-20│            ╲
   └─────────────────────────────────────────────────────────────
     Jan       Feb       Mar       Apr       May       Jun
```

### Pearson Correlation Matrix (example)

```
         AAPL   MSFT   NVDA   GOOG   TSLA
  AAPL  [1.00] [0.87] [0.72] [0.81] [0.43]
  MSFT  [0.87] [1.00] [0.69] [0.88] [0.39]
  NVDA  [0.72] [0.69] [1.00] [0.65] [0.51]
  GOOG  [0.81] [0.88] [0.65] [1.00] [0.37]
  TSLA  [0.43] [0.39] [0.51] [0.37] [1.00]

  Color scale:  ■ >0.8 strong  ■ 0.5–0.8 moderate  ■ <0.5 weak
```

---

## Phase 4 — Real-Time, News & Sentiment Engine ✅
**Duration:** 3–4 weeks  
**Status:** Complete

### What was built
- WebSocket endpoint (`WS /api/v1/ws/ticks/{ticker}`): Finnhub quote poller, Redis pub/sub fan-out, `_poller_running` guard prevents duplicate pollers on reconnect
- `useWebSocket` hook: exponential backoff reconnect, keepalive ping, Wifi/WifiOff indicator in QuoteCard
- Live tick overlay: price flash animation on QuoteCard, PriceChart appends new candle points in real-time
- News panel: 10 real URLs per ticker (Reuters, Bloomberg, CNBC, Reddit, X, StockTwits, Yahoo, MarketWatch, SeekingAlpha, SEC EDGAR) — social section separated with divider
- Sentiment panel: `SentimentGauge` (radial bar), score stats, trend area chart, Bullish/Neutral/Bearish signal badge
- StockTwits live fetch with deterministic mock fallback keyed by ticker (AAPL=+0.62, TSLA=-0.18, GME=-0.42) — endpoint never returns 502
- Celery tasks: `ingest_stocktwits`, `ingest_reddit_posts`, `compute_sentiment_scores`
- 233-test suite: 128 backend (unit / integration / E2E) + 105 frontend (utils / components / hooks)

### WebSocket Data Flow

```
Finnhub WS Feed
      │
      ▼
  FastAPI Poller  ──► Redis Pub/Sub Channel: "ticks:{ticker}"
  (1 per ticker)          │
                          │ Fan-out to N subscribers
                    ┌─────┼─────┐
                    ▼     ▼     ▼
                 User1  User2  User3
                 (WS)   (WS)   (WS)
                    │
                    ▼
             React useWebSocket hook
             → Exponential backoff
             → keepalive ping/pong
             → QuoteCard flash animation
             → PriceChart live append
```

### Sentiment Score Examples (deterministic mock)

```
Ticker   Score    Signal     Bar
──────   ──────   ────────   ─────────────────────────
AAPL     +0.62   🟢 Bullish  ██████████████░░░░░░  +62%
MSFT     +0.41   🟡 Neutral  ████████░░░░░░░░░░░░  +41%
TSLA     -0.18   🔴 Bearish  ░░░░░░░░░░░░░░░░░░░░  -18%
GME      -0.42   🔴 Bearish  ░░░░░░░░░░░░░░░░░░░░  -42%
```

### Celery Task Schedule

```
Task                        Schedule          Description
─────────────────────────   ──────────────    ──────────────────────────────
ingest_stocktwits           Every 15 min      Fetch & store StockTwits posts
ingest_reddit_posts         Every 30 min      PRAW fetch for watched tickers
compute_sentiment_scores    Every 15 min      FinBERT inference on new posts
check_price_alerts          Every 30 sec      Compare cached quotes vs alerts
pnl_snapshot                Daily at close    Record daily portfolio value
earnings_refresh            Weekly            Sync upcoming earnings calendar
indicator_precompute        Every 15 min*     RSI/MACD pre-cache for screener
                            (*market hours)
```

---

## Phase 5 — SaaS Layer, Auth & Deployment ⏳
**Duration:** 2–3 weeks  
**Status:** Deferred — intentionally not started  
**Prerequisite:** Phases 6–8 shipped first to maximize product value before monetizing

### What needs to be built
- `FastAPI Users` — JWT auth (email/password) + Google OAuth
- Access token (15min) + refresh token (7d) in httpOnly cookies
- Protected routes in React (`<PrivateRoute>` component)
- Auth pages: `/login`, `/register`, `/forgot-password`
- Email verification via `FastAPI-Mail` + SendGrid / Mailgun

### SaaS Tier Model

| Feature | Free | Pro ($9/mo) | Team ($29/mo) |
|---|---|---|---|
| Tickers tracked | 5 | Unlimited | Unlimited |
| Watchlists | 1 | 10 | Unlimited |
| Portfolio positions | — | 20 | Unlimited |
| Sentiment history | Last 24h | Last 90d | Full history |
| Technical indicators | Basic (MA only) | Full suite | Full suite |
| Real-time WebSocket | ❌ | ✅ | ✅ |
| Price alerts | — | 10 | Unlimited |
| Screener saved filters | — | 5 | Unlimited |
| Prediction signal | ❌ | ✅ | ✅ |
| Export (PNG/CSV) | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ |

### Tier Feature Coverage

```
Feature Gates        Free          Pro ($9)      Team ($29)
─────────────────    ──────────    ──────────    ──────────
Tickers              ███░░░░░░░    ██████████    ██████████
Watchlists           ██░░░░░░░░    ██████████    ██████████
Portfolio            ░░░░░░░░░░    █████░░░░░    ██████████
Sentiment Hist.      ██░░░░░░░░    █████████░    ██████████
Tech Indicators      ████░░░░░░    ██████████    ██████████
Real-time WS         ░░░░░░░░░░    ██████████    ██████████
Price Alerts         ░░░░░░░░░░    █████░░░░░    ██████████
Saved Screeners      ░░░░░░░░░░    █████░░░░░    ██████████
Export               ░░░░░░░░░░    ██████████    ██████████
API Access           ░░░░░░░░░░    ░░░░░░░░░░    ██████████
```

### Auth Flow

```
User → /login ──► FastAPI Users
                     │
              ┌──────┴──────────┐
              ▼                 ▼
         Email/PW          Google OAuth
              │                 │
              └──────┬──────────┘
                     ▼
              JWT Access Token (15 min)   → httpOnly cookie
              JWT Refresh Token (7 days)  → httpOnly cookie
                     │
                     ▼
              React <PrivateRoute>
              → Redirect to /login if expired
              → Auto-refresh via interceptor
```

- Stripe integration: checkout session (7-day trial), customer portal, webhook handlers for subscription lifecycle
- `require_plan("pro")` FastAPI dependency factory enforces tier limits
- Security headers middleware (CSP, X-Frame-Options, HSTS)
- Prometheus metrics at `/metrics`, Sentry for error tracking, PostHog for product analytics
- GitHub Actions CI/CD: lint → test → build → deploy on merge to `main`
- Frontend: Vercel / Netlify · Backend: Railway / Render · DB: Railway Postgres or Supabase

---

## Phase 6 — Portfolio P&L Tracker ✅
**Duration:** 2–3 weeks  
**Status:** Complete  
**Priority:** Highest — turns a stock viewer into a tool users check every single day

### New route
`/portfolio` — full-page portfolio dashboard

### Database additions
```sql
portfolios    (id, user_id, name, created_at)
positions     (id, portfolio_id, ticker, shares, avg_cost, opened_at, notes)
pnl_snapshots (id, portfolio_id, date, value, daily_return_pct)
```

### Portfolio Page Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  KPI CARDS ROW                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Portfolio Val │ │ Total P&L    │ │ Today's P&L  │ │ Best Perf.   │   │
│  │  $124,850     │ │  +$14,200    │ │   +$850      │ │  NVDA +42%   │   │
│  │  ▁▂▄▅▆▇█      │ │   +12.8%    │ │   +0.69%     │ │  TSLA  -8%  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  PORTFOLIO vs BENCHMARK          │  │     ALLOCATION DONUT         │ │
│  │                                  │  │          ┌──────┐            │ │
│  │  +20%│     ╱─── Portfolio        │  │       ╭──┤$124K ├──╮        │ │
│  │  +10%│ ╱──╱                      │  │  Tech ╯  └──────┘  ╰ Health │ │
│  │    0%├──────────── SPY Benchmark │  │       ╰────────────╯        │ │
│  │  -10%│                           │  │   Tech 48% · Finance 22%    │ │
│  │      └──────────────────────────  │  │   Health 18% · Energy 12%  │ │
│  │       [1M][3M][6M][YTD][1Y][All] │  └──────────────────────────────┘ │
│  └──────────────────────────────────┘                                    │
├──────────────────────────────────────────────────────────────────────────┤
│  HOLDINGS TABLE                                                           │
│  Ticker │ Shares │ Avg Cost │ Price  │ Value    │ P&L $   │ P&L %  │ 7D  │
│  AAPL   │    50  │ $152.00  │$189.42 │  $9,471  │ +$1,871 │ +12.3% │ ▁▃▅ │
│  NVDA   │    20  │ $340.00  │$875.00 │ $17,500  │+$10,700 │ +61.2% │ ▅▇█ │
│  TSLA   │    30  │ $220.00  │$202.00 │  $6,060  │  -$540  │  -2.4% │ ▇▅▃ │
├──────────────────────────────────────────────────────────────────────────┤
│  DAILY P&L CALENDAR (30-day heatmap)                                     │
│  Mon    Tue    Wed    Thu    Fri                                          │
│  ░░░░░  ████░  ░░░░░  ██░░░  ████░   ← green=profit, red=loss           │
│  ░░░░░  ░░░░░  ████░  ░░░░░  ████░   intensity = magnitude              │
│  ████░  ░░░░░  ░░░░░  ████░  ░░░░░                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Backend endpoints
- `GET    /api/v1/portfolio/` — list portfolios
- `POST   /api/v1/portfolio/` — create portfolio
- `POST   /api/v1/portfolio/{id}/positions` — add position (ticker, shares, avg_cost)
- `PATCH  /api/v1/portfolio/{id}/positions/{pos_id}` — edit shares or cost basis
- `DELETE /api/v1/portfolio/{id}/positions/{pos_id}` — remove position
- `GET    /api/v1/portfolio/{id}/summary` — live P&L merged with current quotes

### KPI summary cards
- **Portfolio Value** — sum of (current_price × shares), with intraday mini sparkline
- **Total P&L** — unrealized gain/loss in $ and % vs total cost basis
- **Today's P&L** — live delta using WebSocket ticks where available
- **Best/Worst Performer** — ticker with highest/lowest % return
- **Portfolio Beta** — weighted average of individual position betas

### Portfolio vs Benchmark chart
- Normalized return comparison from portfolio inception date
- Benchmark overlay: S&P 500 (SPY), QQQ, or user-chosen ticker
- Time range selector: 1M / 3M / 6M / YTD / 1Y / All
- Reuses existing normalized-return logic from Compare page — minimal new code

### Allocation donut
- Recharts `PieChart` — weighted by current position value
- Sector grouping from `stock_metadata.sector`
- Click slice → filters holdings table to that sector
- Center label shows total portfolio value

### Holdings table
- Columns: Ticker, Company, Shares, Avg Cost, Current Price, Value, P&L $, P&L %, Today %, Weight bar, 7D sparkline
- Inline edit: click shares or cost basis to edit in place
- Row click → navigates to `/dashboard/:ticker`
- Export to CSV button (gated behind Pro plan in Phase 5)

### Daily P&L heatmap
- 30-day calendar grid — each square colored green (profit) or red (loss)
- Color intensity scales with magnitude (±0.5% = light tint, ±2%+ = saturated)
- Hover tooltip: date, P&L %, absolute dollar change
- Data stored in `pnl_snapshots` by Celery beat task at market close daily

### P&L by position bar chart
- Horizontal `BarChart` — one bar per position, sorted best to worst
- Shows unrealized P&L contribution per ticker as % of total portfolio gain

### P&L Contribution (example)

```
P&L by Position (% of total gain)

NVDA  ████████████████████████████████  +75.4%
AAPL  ████████████                      +13.2%
GOOG  ██████                             +7.0%
MSFT  ████                               +4.4%
TSLA  ░░░░░░                             -3.8%  (drag)
AMC   ░░░░                               -2.5%  (drag)
      ────────────────────────────────────────
      Net  +$14,200  (+12.8%)
```

### Frontend components
- `PortfolioSummaryCards` — 5 KPI cards with sparklines
- `BenchmarkChart` — portfolio vs chosen benchmark using Compare series engine
- `AllocationDonut` — Recharts PieChart with sector legend
- `HoldingsTable` — sortable, inline-editable positions grid
- `DailyPnLCalendar` — 30-day heatmap grid
- `PnLBarChart` — horizontal BarChart per position
- `AddPositionModal` — ticker search + shares + avg cost input with validation

---

## Phase 7 — Technical Indicators ✅
**Duration:** 2–3 weeks  
**Status:** Complete  
**Priority:** High — most-requested feature by traders; all math runs on existing candle data, no new API calls

### Indicators (all computed client-side in TypeScript from existing `CandlePoint[]`)

- **RSI (14-period default)**
  - Formula: `100 - (100 / (1 + avg_gain / avg_loss))`
  - Separate oscillator panel below the price chart
  - Reference lines at 70 (overbought, red dashed) and 30 (oversold, green dashed)
  - Current RSI badge colored: red > 70, amber 50–70, green < 50

- **MACD (12, 26, 9)**
  - MACD line = 12-period EMA − 26-period EMA
  - Signal line = 9-period EMA of MACD line
  - Histogram bars = MACD − Signal (green above zero, red below)
  - Second oscillator panel below RSI
  - Bullish/bearish crossover detection with arrow annotation on chart

- **Bollinger Bands (20-period SMA ± 2 std dev)**
  - Upper and lower bands overlaid directly on price chart as semi-transparent area fill
  - Band squeeze detection (low volatility signal)
  - Toggle button alongside existing MA50/MA200 controls

- **VWAP (Volume-Weighted Average Price)**
  - `VWAP = Σ(typical_price × volume) / Σ(volume)` accumulated from open
  - Single reference line on price chart (purple)
  - Auto-hidden when range > 1D (meaningless for multi-day)

- **Stochastic Oscillator (14, 3, 3)**
  - %K and %D lines in a third collapsible oscillator panel
  - Overbought > 80, oversold < 20 reference lines

- **EMA overlays (9, 21, 50, 200)**
  - Extend existing MA toggle bar to include EMA options
  - Different color per period, all toggleable independently

### Full Chart Panel Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PRICE CHART (55%)                                           │
│  [Toggle: MA9 MA21 MA50 MA200 EMA BB VWAP]                  │
│                                                              │
│  ╭─ BB Upper ─────────────────────────────────────────╮     │
│  │         ╱──────────╲  ╱──╲                         │     │
│  │  VWAP──╱────────────╲╱   ╲──────────────           │     │
│  │            ╱──╲                                     │     │
│  ╰─ BB Lower ─────────────────────────────────────────╯     │
│  [MA50 ─── MA200 ─ ─ ─]                                     │
├─────────────────────────────────────────────────────────────┤
│  VOLUME BARS (15%)                                           │
│  ▌ ▌▌ ▌▌▌▌▌  ▌▌▌▌▌▌▌▌  ▌▌▌▌▌▌▌▌▌▌▌▌                        │
├─────────────────────────────────────────────────────────────┤
│  RSI PANEL (15%)  [RSI 14 ▼]  [×]   Current: RSI 62 🟡      │
│  100 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  overbought (70)         │
│   50 ───────────────────────────                             │
│    0 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  oversold   (30)         │
├─────────────────────────────────────────────────────────────┤
│  MACD PANEL (15%)  [MACD 12,26,9 ▼]  [×]   🟢 Bullish Cross │
│  MACD line  ──────────────────────────────────────          │
│  Signal     ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─          │
│  Histogram  ▌▌▌▌░░░░░░░░▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌                   │
├─────────────────────────────────────────────────────────────┤
│  [+ Add Indicator ▼]  [Save Layout 💾]                       │
└─────────────────────────────────────────────────────────────┘
```

### Chart panel architecture
- Price chart top (~55% of chart area)
- Volume panel below price chart (~15%)
- Indicator oscillator panels stack below volume, each ~15%, individually collapsible
- Each panel shows label + current-value badge + close (×) button
- Panel order is drag-reorderable (dnd-kit)

### Indicator control bar
- Dropdown/tab to add/remove indicator panels
- Per-indicator parameter inputs (e.g. change RSI from 14 to 21 periods)
- "Save layout" button persists panel configuration to localStorage

### Backend (optional pre-compute endpoint)
- `GET /api/v1/stocks/indicators/{ticker}?indicators=rsi,macd&range=3M` — server-side for mobile clients
- Desktop clients compute client-side for zero latency

---

## Phase 8 — Advanced Analysis Tools ✅
**Duration:** 2–3 weeks  
**Status:** Complete  
**Priority:** High — screener and alerts make the product sticky (users return daily to check triggers)

### 8A — Stock Screener (`/screener`)

#### Filter engine
- **Numeric range filters:** P/E < 35, Market Cap > $10B, Change % > 2%, Beta < 1.5, Dividend Yield > 2%, Revenue Growth > 20%
- **Categorical filters:** Sector = Technology, Exchange = NASDAQ
- **Technical filters:** RSI > 50, RSI < 30 (oversold entry), Price above MA50
- Filter chips UI — each active filter shown as removable tag
- Filter builder modal — field dropdown + operator + value
- Results update live as filters change (debounced 500ms)

#### Screener Filter Chip Example

```
Active Filters:
  [Sector = Tech ×]  [P/E < 35 ×]  [RSI < 30 ×]  [Market Cap > $10B ×]
  [+ Add Filter]                                     Results: 12 stocks
```

#### Saved screeners
- Save named filter configurations per user (PostgreSQL)
- Built-in presets: "Oversold Tech", "High Momentum", "Dividend Growth", "Low Beta"
- Shareable via URL: `/screener?filters=<base64-encoded-json>`

#### Results table
- Columns: Ticker, Company, Sector, Price, P/E, Market Cap, Revenue Growth, Today %, RSI, Signal badge
- Row click → `/dashboard/:ticker`
- Bulk actions: add all results to watchlist, or open in Compare

#### Backend
- `GET /api/v1/screener?filters=...` — server-side filtering against `stock_metadata` + cached quotes
- Pre-computed RSI stored in Redis (Celery refreshes every 15min during market hours)
- Paginated: 25 results per page

### 8B — Price Alerts

#### Alert types
- Price above threshold (e.g. NVDA crosses $700)
- Price below threshold (e.g. TSLA drops below $160)
- % move in one day exceeds threshold (e.g. AAPL > 5%)
- RSI crosses level (e.g. AAPL RSI drops below 30)
- MA crossover (e.g. price crosses above 50-day MA — golden cross)

#### Alert Proximity Dashboard (example)

```
Active Alerts — Sorted by proximity to trigger

Ticker  Type              Threshold   Current    Distance   Status
──────  ────────────────  ─────────   ────────   ────────   ──────────
NVDA    Price above       $900.00     $875.00    2.9% away  🟡 Near
TSLA    Price below       $185.00     $202.00    9.2% away  🟢 Active
AAPL    RSI below 30      RSI=30      RSI=42     40% away   🟢 Active
MSFT    MA crossover(50)  MA50=$400   $412.00    3.0% away  🟡 Near
GME     Price above       $25.00      $18.40     35.9% away 🟢 Active
```

#### Architecture
- `alerts` table: `(id, user_id, ticker, type, threshold, is_active, triggered_at, created_at)`
- Celery beat task checks all active alerts every 30s against cached quotes
- On trigger: mark triggered, fire browser `Notification` API push
- Alert history log with timestamp and price at trigger

#### Frontend
- Alert creation inline on dashboard page (ticker + type + value)
- Global alerts panel at `/alerts` — all active alerts sorted by proximity to trigger
- Browser notification permission prompt on first alert creation
- In-app toast notification when alert fires (any page)
- Retry/reactivate triggered alerts with one click

### 8C — Earnings Calendar (`/calendar`)

#### Calendar View (example)

```
◄ March 2026                                             April 2026 ►

 Mon        Tue        Wed        Thu        Fri
─────────────────────────────────────────────────────────────────────
            [AAPL]     [TSLA]               [GOOG]
            [MSFT]     [AMD]                [META]
             PRE        PRE                  AMC

[NVDA]     [AMZN]                [NFLX]
[JPM]       AMC                   PRE
 PRE

                       [BAC]                [V]
                       [GS]                 [MA]
                        PRE                  PRE
─────────────────────────────────────────────────────────────────────
PRE = Pre-market  ·  AMC = After market close
```

#### Data source
- Finnhub `/calendar/earnings` — free, covers all major US stocks
- Celery beat: refresh upcoming earnings weekly, store in `earnings_events` table
- Schema: `(ticker, report_date, time_of_day, eps_estimate, eps_actual, surprise_pct, beat_miss)`

#### Earnings history per ticker (on dashboard page)
- Last 8 quarters grouped bar chart: actual EPS vs estimate
- Beat / Miss / In-line badge per quarter
- Surprise % as secondary y-axis line

#### EPS History Chart (example)

```
EPS (actual vs estimate) — AAPL last 8 quarters

$2.50│         ▐█▌                          ▐█▌
$2.00│   ▐█▌   ▐█▌  ▐█▌             ▐█▌    ▐█▌  ▐█▌
$1.50│   ▐█▌   ▐█▌  ▐█▌   ▐█▌  ▐█▌ ▐█▌    ▐█▌  ▐█▌
$1.00│   ▐█▌   ▐█▌  ▐█▌   ▐█▌  ▐█▌ ▐█▌    ▐█▌  ▐█▌
     └───────────────────────────────────────────────▶ Quarter
       Q1'24  Q2'24 Q3'24 Q4'24 Q1'25 Q2'25 Q3'25 Q4'25
       ✅Beat ✅Beat ✅Beat ❌Miss ✅Beat ✅Beat ✅Beat ✅Beat

  ▐ Actual   █ Estimate   ── Surprise %
```

### 8D — Global Correlation Heatmap (extend Compare page)

- Full S&P 50 correlation heatmap — 50×50 grid via D3 tiles
- Color: cyan = strong positive correlation, red = inverse, gray = uncorrelated
- Click cell → opens Compare chart for that ticker pair
- Cluster detection: group sectors with high internal correlation
- Drag to zoom into a sector region

#### Per-ticker "Correlated Movers" card (on dashboard page)
- Top 5 most correlated and 5 least correlated tickers
- Useful for hedging analysis

---

## Phase 9 — Institutional & Options Intelligence ✅
**Duration:** 2–3 weeks  
**Priority:** Medium-high — most visually impressive; differentiates from all free tools  
**Status:** Complete

### 9A — Sector Heatmap (Market page upgrade)

```
S&P 500 Sector Heatmap — Today's Performance

┌──────────────────────────────────────────────────────────────────────┐
│ TECHNOLOGY (32% of S&P)          │ HEALTHCARE (13%)                  │
│ ┌────────────┬──────┬──────────┐ │ ┌─────────────┬─────────────────┐ │
│ │  NVDA      │ AAPL │   MSFT   │ │ │   JNJ       │      UNH        │ │
│ │  +3.2% 🟢  │+0.7% │  -0.3%   │ │ │  +0.4% 🟡   │    +1.1% 🟢    │ │
│ └────────────┴──────┴──────────┘ │ └─────────────┴─────────────────┘ │
│ ┌──────┬───────────┬──────────┐  │                                    │
│ │ META │  GOOGL    │   AMZN   │  │ FINANCIALS (12%)                  │
│ │+1.4% │  +0.9%    │  +2.1%   │  │ ┌──────────┬───────────────────┐ │
│ └──────┴───────────┴──────────┘  │ │   JPM    │   BAC  │   GS      │ │
│                                  │ │  +0.3%   │  -0.2% │  +0.8%    │ │
│ ENERGY (5%)                      │ └──────────┴────────┴───────────┘ │
│ ┌──────┬──────┐                  │                                    │
│ │ XOM  │ CVX  │  Color scale:    │ CONS. STAPLES (6%)                 │
│ │-0.8% │-1.2% │  🟢>2% 🟡±1%   │ ┌──────────────────────────────┐  │
│ └──────┴──────┘  🔴<-2%         │ │  PG +0.1%  KO +0.4%  WMT -0.2%│ │
│                                  │ └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
  [Today %] [1W %] [1M %] [YTD %]   Tile size = Market Cap
```

### 9B — Options Flow Heatmap (per-ticker tab)

```
AAPL Options Flow — Current Price: $189.42

Strike  │ Apr 18  │ Apr 25  │ May 2   │ May 16  │ Jun 20
────────┼─────────┼─────────┼─────────┼─────────┼─────────
  $210  │ 🔴░░░░  │ 🔴░░░   │ 🔴░░    │ 🔴░     │ 🔴░
  $200  │ 🔴░░░░░ │ 🔴░░░░  │ 🔴░░░   │ 🔴░░    │ 🔴░░
  $195  │ 🔴████  │ 🔴███░  │ 🔴██░   │ 🔴█░    │ 🔴░░
──$190──┤─────────┼─────────┼─────────┼─────────┼─────────  ← ATM
  $185  │ 🟢████  │ 🟢████  │ 🟢███░  │ 🟢██░   │ 🟢█░
  $180  │ 🟢██░░  │ 🟢███░  │ 🟢████  │ 🟢███   │ 🟢██░
  $175  │ 🟢░░░   │ 🟢█░░   │ 🟢██░   │ 🟢███░  │ 🟢███
  $170  │ 🟢░░    │ 🟢░░    │ 🟢█░    │ 🟢██░   │ 🟢██░

🟢 Calls   🔴 Puts   █ = High volume   ░ = Low volume
Max Pain: $187.50 │ P/C Ratio Apr18: 0.68 (Bullish)
```

### 9C — Institutional Ownership (per-ticker card)

```
AAPL — Institutional Ownership Summary
────────────────────────────────────────────────────────
Institutional %:   73.2%   ████████████████████████████░░░
# of Holders:      5,421
QoQ Change:        +1.3%   ▲ Net buyers this quarter

Top 5 Holders:
Vanguard Group     ████████████████████████████░  8.5%
BlackRock Inc.     ████████████████████████░░░░░  7.1%
Berkshire Hathaway ████████████████████░░░░░░░░░  5.8%
State Street Corp  ████████████████░░░░░░░░░░░░░  4.6%
FMR LLC (Fidelity) █████████████░░░░░░░░░░░░░░░░  3.9%

Insider Transactions (last 12 months)
J  F  M  A  M  J  J  A  S  O  N  D
·  🟢 ·  🔴 ·  🟢 🟢 ·  🔴 ·  🟢 ·
   Buy  Sell = Insider trade dot (click → SEC EDGAR)
```

### 9D — Candlestick Pattern Detection

#### Patterns detected (OHLC logic, client-side TypeScript)
- Doji (open ≈ close, long wicks)
- Hammer / Inverted Hammer (bullish reversal)
- Shooting Star (bearish reversal)
- Bullish Engulfing / Bearish Engulfing
- Morning Star / Evening Star (3-candle reversal)
- Three White Soldiers / Three Black Crows

#### Pattern Annotation on Chart (example)

```
Price Chart with Pattern Annotations

  $195 │           ▼ Shooting Star (Bearish, 78%)
  $190 │    ┬      │     ┬
       │    █      │     █      ┬
  $185 │    █   ┬  │     ▽      █      ▲ Hammer (Bullish, 82%)
       │    ┴   █     Morning   █──────│
  $180 │        █      Star     ┴
       │        ┴   (Bullish,
  $175 │            91%)
```

#### UI integration
- Annotated arrows rendered directly on price chart candles
- Arrow above = bearish signal, below = bullish signal
- Abbreviated label on each annotation (e.g. "Hammer", "EngB")
- Hover tooltip: full pattern name, typical implication, confidence score
- "Show Patterns" toggle in chart control bar
- Pattern history table below chart: date, name, signal direction, subsequent move %

---

## Phase 10 — Portfolio Command Centre 🔲
**Duration:** 2–3 weeks  
**Priority:** High — transforms the portfolio page from a holdings viewer into a true daily-use command centre  
**Status:** Not started

### Overview

The `/portfolio` page becomes a **single scrollable command centre** that embeds compact, portfolio-aware versions of every analysis tool directly on one page.

### Full Portfolio Command Centre Layout

```
/portfolio ─── Single Scrollable Command Centre
──────────────────────────────────────────────────────────────────────────
  KPI CARDS (Phase 6 — existing)
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │Portfolio Val │ │  Total P&L   │ │  Today P&L   │ │ Best Perf.   │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

  BENCHMARK CHART + ALLOCATION DONUT (Phase 6 — existing)
  ┌──────────────────────────────────┐ ┌─────────────────────────────┐
  │  Portfolio vs SPY (normalized)   │ │  Sector Allocation Donut    │
  └──────────────────────────────────┘ └─────────────────────────────┘

  HOLDINGS TABLE  [Analysing: NVDA ▼]  ← focusedTicker selector (10A)
  ┌──────────────────────────────────────────────────────────────────┐
  │ → NVDA · AAPL · TSLA · MSFT · GOOG                              │
  └──────────────────────────────────────────────────────────────────┘

  ANALYSIS ROW 1 (10B)
  ┌─────────────────────┐ ┌────────────────────┐ ┌──────────────────┐
  │  Sector Heatmap     │ │   RSI Panel        │ │   MACD Panel     │
  │  (portfolio sectors)│ │   NVDA: RSI 68 🟡  │ │  🟢 Bullish Cross│
  │  [Full view →]      │ │   [Full chart →]   │ │  [Full chart →]  │
  └─────────────────────┘ └────────────────────┘ └──────────────────┘

  ANALYSIS ROW 2 (10C)
  ┌─────────────────────┐ ┌────────────────────┐ ┌──────────────────┐
  │  Earnings Calendar  │ │ Correlation Matrix │ │  Alerts Summary  │
  │  (portfolio filter) │ │  (held tickers)    │ │  NVDA near $900  │
  │  NVDA earns Apr 23  │ │  AAPL↔MSFT: 0.87   │ │  [+ New Alert]   │
  │  [Full calendar →]  │ │  [Add tickers →]   │ │  [All alerts →]  │
  └─────────────────────┘ └────────────────────┘ └──────────────────┘

  SCREENER PREVIEW STRIP (10D)
  ┌──────────────────────────────────────────────────────────────────┐
  │  "High Momentum" preset  · Matches 3 of your holdings            │
  │  Ticker  Price    P/E   Today%   RSI    Signal                   │
  │  NVDA    $875     42×   +3.2%   68 🟡  Approaching OB           │
  │  META    $498     22×   +1.4%   55 🟡  Neutral                  │
  │  AMZN    $195     32×   +2.1%   61 🟡  Neutral                  │
  │  [Full Screener →]                    [Save Screen]              │
  └──────────────────────────────────────────────────────────────────┘

  DAILY P&L CALENDAR (10E)
  ┌──────────────────────────────────────────────────────────────────┐
  │  30-day P&L Calendar   +$4,120 this month · 12 green · 8 red    │
  │  Best: Apr 9 +$1,240 ▲   Worst: Apr 3 -$580 ▼                  │
  │  Mon   Tue   Wed   Thu   Fri                                     │
  │  ████  ░░░░  ████  ░░░░  ████                                    │
  │  ░░░░  ████  ░░░░  ████  ░░░░                                    │
  └──────────────────────────────────────────────────────────────────┘
```

### 10A — Focused Ticker Selector on Portfolio Page

When the user clicks a row in the Holdings Table, that ticker becomes the "focused holding" and drives the live indicator panels.

- `focusedTicker` state added to PortfolioPage (defaults to the best performer)
- Holdings table row click sets `focusedTicker` (single selection highlight)
- All analysis widgets below the Holdings table respond to `focusedTicker`
- Ticker selector pill shown above the analysis widgets row: `Analysing: NVDA ▼` with dropdown to switch to any held ticker
- `focusedTicker` persisted to `useAppStore` so refresh preserves selection

### 10B — Analysis Widgets Row 1 (Sector · RSI · MACD)

Three cards in a responsive 3-column grid, embedded directly in PortfolioPage below the Holdings Table:

#### Sector Heatmap Widget (compact)
- Reuses `SectorHeatmap` component in `compact` prop mode (reduced height, no header chrome)
- Shows only sectors represented in the portfolio (filters to held tickers)
- "Full view →" link routes to `/market?view=heatmap`
- Today % view only (no toggle needed in compact mode)

#### RSI Panel Widget
- Reuses `RSIPanel` component, fed with `useCandles(focusedTicker, '3M')`
- Shows current RSI badge prominently (e.g. `RSI 68 — Approaching Overbought`)
- Ticker label and change to `focusedTicker` when Holdings row is clicked
- "Full chart →" link routes to `/dashboard/:focusedTicker`

#### MACD Panel Widget
- Reuses `MACDPanel` component with same candle feed as RSI widget
- Shows Bullish/Bearish Cross badge when crossover detected
- Shares `focusedTicker` state with RSI widget (always same ticker)

### 10C — Analysis Widgets Row 2 (Earnings · Correlation · Alerts)

Three more cards in a second 3-column grid:

#### Earnings Calendar Mini Widget
- New `EarningsCalendarMini` component: shows next 30 days, portfolio-filtered only
- 5-column week row layout (Mon–Fri) with ticker chips per day
- Pre/after-hours colour coding preserved (green PRE / amber POST)
- Click ticker chip → `/dashboard/:ticker`
- "Full calendar →" link to `/calendar?filter=portfolio`
- Empty state: "No earnings this month for your holdings"

#### Correlation Matrix Widget
- Reuses existing `CorrelationMatrix` component
- Automatically populated with portfolio tickers (no manual input required)
- Shows `n × n` grid where `n` = number of held positions (max 8)
- Click cell → `/compare?tickers=AAPL,MSFT`
- "Add more tickers →" link to `/compare`

#### Price Alerts Summary Widget
- New `AlertsSummaryCard` component: compact list of active alerts for portfolio tickers
- Shows: ticker icon, alert type, threshold, proximity %, Active/Near/Triggered badge
- "Recent Triggers" section at bottom: last 3 triggered alerts with timestamp
- "+ New Alert" button → opens `InlineAlertCreator` expanded for that ticker
- "All alerts →" link to `/alerts`

### 10D — Stock Screener Preview Widget

A compact screener results strip at the bottom of the Portfolio page:

- New `ScreenerPreviewCard` component: shows top 5 screener results matching a default preset
- Default preset auto-selected = any preset that overlaps with held tickers (e.g. "High Momentum")
- Preset selector chip row: user can swap preset without leaving the page
- Columns: Ticker, Price, P/E, Today %, RSI (colored), Signal badge
- "Matches X of your holdings" subtitle when overlap detected
- Run full screener / Save screen buttons
- "Full screener →" link to `/screener`

### 10E — Daily P&L Calendar (already on page, polish pass)

- Already built — ensure it renders below the Screener preview widget
- Add "30-day P&L Calendar" section header with subtitle "Portfolio performance heatmap"
- Show total monthly P&L summary line above the grid (e.g. "+$4,120 this month, 12 green days / 8 red days")
- Best day / worst day callouts beside the grid

### Backend additions

- `GET /api/v1/portfolio/{id}/upcoming-earnings` — earnings events for portfolio tickers in next 30 days (filtered from earnings_events table)
- `GET /api/v1/portfolio/{id}/alerts` — active alerts for tickers in this portfolio
- `GET /api/v1/portfolio/{id}/screener-preview` — run the "best matching" preset screener for portfolio tickers, return top 5

### New hooks

- `usePortfolioEarnings(portfolioId)` — portfolio-filtered earnings
- `usePortfolioAlerts(portfolioId)` — alerts for portfolio tickers only
- `usePortfolioScreenerPreview(portfolioId)` — screener preview results

### New components

- `EarningsCalendarMini` — compact 4-week calendar filtered to portfolio tickers
- `AlertsSummaryCard` — compact active + recent-trigger alerts for portfolio tickers
- `ScreenerPreviewCard` — top-5 screener results with preset switcher
- `PortfolioAnalysisRow` — wrapper grid for the 3+3 analysis widget layout

---

## Phase 11 — App Shell Polish & Navigation 🔲
**Duration:** 1 week  
**Priority:** Medium — visual quality and navigation UX improvements that make the app feel production-grade  
**Status:** Not started

### Final Sidebar Structure

```
┌────────────────────────────┐
│  ≡  StockDash              │
├────────────────────────────┤
│  MARKETS                   │  ← section label
│  ● Dashboard               │  ← active dot
│    Market Overview         │
│    Compare                 │
├────────────────────────────┤
│  PORTFOLIO                 │
│    Portfolio P&L  [NEW]    │  ← NEW badge
│    Watchlist               │
├────────────────────────────┤
│  ANALYSIS                  │
│    Screener       [NEW]    │
│    Indicators     [NEW]    │
│    Earnings Cal.  [NEW]    │
│    Correlation    [NEW]    │
│    Alerts         [NEW]    │
├────────────────────────────┤
│  ┌──────────────────────┐  │
│  │ ⭐ Pro Plan Active   │  │  ← PlanBanner
│  │ Real-time data on    │  │
│  │ Upgrade to Pro →     │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

### 11A — Sidebar Section Labels & NEW Badges

The sidebar currently shows 8 nav items as a flat list. The mockup groups them into labelled sections with "NEW" badges on recently-shipped features.

#### Section grouping
- **MARKETS** — Dashboard, Market Overview, Compare
- **PORTFOLIO** — Portfolio P&L, Watchlist
- **ANALYSIS** — Screener, Indicators, Earnings Calendar, Correlation, Alerts
- Section labels: `text-[9px] font-mono uppercase tracking-widest text-text-muted/50` above each group
- Thin divider line between sections
- "Market Overview" nav item added (currently missing — goes to `/market`)

#### NEW badges
- `NEW` pill badge on nav items for features shipped in the last 30 days
- Badge: `bg-accent-cyan/15 text-accent-cyan text-[8px] font-bold rounded-sm px-1`
- Configurable `isNew` prop per nav item — flip to `false` after 30 days
- Initially show NEW on: Portfolio P&L, Screener, Indicators, Earnings Calendar, Correlation, Alerts

#### Active indicator dot
- Blue dot on the left edge of the active nav item (already has active highlight, add dot)
- Matches the blue dot shown on "Portfolio P&L" in the mockup

### 11B — Header Quick-Action Buttons

The mockup shows two prominent buttons in the top-right header area beyond the LIVE badge and theme toggle:

#### Enhanced Header Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ≡  StockDash  │  🔍 Search (Cmd+K)          │●LIVE│🌙│Export│Run│
└─────────────────────────────────────────────────────────────────┘
                                                  │    │  │      │
                                                  │    │  │      └ "Run Screener" (accent blue)
                                                  │    │  └─ "Export CSV" (ghost border)
                                                  │    └─ Dark/light toggle
                                                  └─ WebSocket status (green=live, amber=reconnecting)
```

#### Export CSV button
- "Export CSV" button in header (visible on all pages)
- Context-aware: on `/portfolio` exports Holdings CSV; on `/screener` exports screener results; on other pages exports chart data as CSV
- `useLocation()` to determine current page → dispatch to correct export handler
- Ghost button style: `border border-bg-border text-text-secondary hover:text-text-primary`

#### Run Screener button
- "Run Screener" CTA button in header (accent blue, always visible)
- Click → navigates to `/screener` (or opens screener in a slide-over panel if already on Portfolio page)
- Keyboard shortcut: `Cmd/Ctrl + K` then type ticker or `Cmd/Ctrl + Shift + S` for screener

### 11C — LIVE WebSocket Status Indicator (enhance existing)

The LIVE badge already exists in the header. Polish it to match the mockup more closely:

#### WebSocket State Machine

```
        ┌──────────────────────────────────┐
        │  LIVE Badge State Machine        │
        └──────────────────────────────────┘

  [Disconnected] ──connect──► [Connecting]
        ▲                          │
        │                     success │ fail
     timeout                    ┌───┘  └────┐
        │                       ▼           ▼
  [Reconnecting] ◄──lost── [Connected]  [Failed]
   (amber pulse)            (green ●)  (red ●)
        │
   backoff×2 ──► retry ──► [Connecting]
```

- Show connection state: green pulse = connected, amber = reconnecting, red = disconnected
- Tooltip on hover: "Real-time data · Last tick: 2s ago" with connection quality
- Count of active WebSocket subscriptions shown on hover (e.g. "3 tickers live")
- `useWebSocketStatus()` hook in `useAppStore` that aggregates status across all active sockets
- Smooth colour transition on state change (no flash)

### 11D — Sidebar Bottom: Plan Status Banner

At the very bottom of the sidebar, below the watchlist mini-cards:

- `PlanBanner` component: shows current plan name + tagline
- Guest mode (current): `Guest Mode · Sign up to save your data`
- Once Phase 5 is built: `Pro Plan Active · Powered by real-time data`
- Click → navigates to `/account` (placeholder, wired in Phase 5)
- Subtle gradient background matching the tier colour (amber for free, cyan for pro)
- Upgrade CTA for guest users: `Upgrade to Pro →` link

### 11E — Responsive Layout & Keyboard Navigation

- Keyboard shortcut: `Cmd/Ctrl + K` → open global search from anywhere
- Keyboard shortcut: `Cmd/Ctrl + B` → toggle sidebar collapse
- Keyboard shortcut: `G then D` → go to Dashboard, `G then P` → Portfolio, etc.
- `aria-label` and `role` attributes on all interactive components (accessibility pass)
- Mobile-responsive sidebar: swipe-to-close on touch devices, hamburger menu
- Page title updates (`document.title`) on route change: "AAPL · StockDash", "Portfolio · StockDash"

### Keyboard Shortcuts Reference

```
Shortcut           Action
─────────────────  ───────────────────────────────────────
Cmd/Ctrl + K       Open global search
Cmd/Ctrl + B       Toggle sidebar collapse
Cmd/Ctrl + Shift+S Open screener
G → D              Navigate to /dashboard
G → P              Navigate to /portfolio
G → M              Navigate to /market
G → W              Navigate to /watchlist
G → S              Navigate to /screener
G → A              Navigate to /alerts
```

---

## 🛠️ Full Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | SPA, fast HMR |
| UI | Tailwind CSS | Finance-dark design system |
| Charts | Recharts + D3 | Line, candlestick, RSI, MACD, treemap, heatmaps, options |
| State | Zustand | Lightweight global state |
| Data Fetching | TanStack Query | Caching, polling, background refresh |
| Backend | FastAPI (async Python) | REST API + WebSocket |
| ORM / Migrations | SQLAlchemy (async) + Alembic | DB models, schema versioning |
| Database | PostgreSQL | Users, watchlists, portfolio, sentiment, alerts, earnings |
| Cache / Pub-Sub | Redis | API cache, WebSocket fan-out, pre-computed indicators |
| Task Queue | Celery + Redis | Ingestion, alert checking, indicator pre-compute, P&L snapshots |
| NLP | FinBERT (HuggingFace) | Financial sentiment classification |
| Stock Data | Finnhub REST + WebSocket | Quotes, candles, news, ticks, options, earnings, institutional |
| Social Data | PRAW + StockTwits | Sentiment signal sources |
| Auth | FastAPI Users (JWT + OAuth) | Authentication (Phase 5) |
| Payments | Stripe | Subscription management (Phase 5) |
| Containers | Docker + Docker Compose | Dev environment parity |
| CI/CD | GitHub Actions | lint → test → build → deploy (Phase 5) |
| Hosting FE | Vercel / Netlify | CDN, static |
| Hosting BE | Railway / Render | Managed containers |
| Monitoring | Sentry + PostHog + Prometheus | Errors, analytics, metrics (Phase 5) |

### Tech Stack by Layer

```
PRESENTATION
  React 18 ── Vite ── TypeScript ── Tailwind CSS
     │
     ├── Recharts (line/candle/bar/pie/area)
     ├── D3 (treemap/heatmap/correlation)
     ├── Zustand (global state)
     └── TanStack Query (data fetching/cache)

DATA TRANSPORT
  REST: Axios → FastAPI → Redis cache → Finnhub
  WS:   useWebSocket → FastAPI WS → Redis Pub/Sub → Finnhub WS

BACKEND
  FastAPI (async Python)
     ├── SQLAlchemy async ORM
     ├── Alembic migrations
     ├── Celery workers + beat
     └── FinBERT NLP inference

PERSISTENCE
  PostgreSQL ── primary store (users, portfolio, alerts, events)
  Redis      ── cache (quotes 30s, candles 5m, indicators 15m)

EXTERNAL DATA
  Finnhub  ── quotes, candles, news, options, earnings, institutional
  StockTwits── social sentiment (free, pre-labeled)
  Reddit    ── PRAW for r/stocks, r/investing, r/wallstreetbets
  SEC EDGAR ── insider transaction links
```

---

## 🔗 Feature Dependency Map

```
Phase 1 (data) ──► Phase 2 (UI) ──► Phase 3 (multi-stock) ──► Phase 4 (real-time)
                                                                        │
                               ┌────────────────────────┬──────────────┴──────────────┐
                               ▼                        ▼                              ▼
                          Phase 6                  Phase 7                        Phase 8
                        (portfolio)             (indicators)               (screener/alerts/calendar)
                               │                        │                              │
                               └────────────────────────┼──────────────────────────────┘
                                                        ▼
                                                   Phase 9
                                             (options/institutional)
                                                        │
                                                        ▼
                                                   Phase 10
                                            (portfolio command centre)
                                                        │
                                                        ▼
                                                   Phase 11
                                              (app shell polish)
                                                        │
                                                        ▼
                                                   Phase 5
                                               (auth + SaaS)
                                     [best shipped after max feature value]
```

---

## ⚠️ Risk & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Finnhub free tier rate limits (60 req/min) | 🔴 High | Medium | Redis cache + Celery request queuing |
| Options chain data limited on free Finnhub tier | 🟡 Medium | High | Gate behind Pro plan; use mock data for preview |
| D3 treemap performance with 500+ stock tiles | 🟡 Medium | Low | Canvas rendering fallback; virtualize off-screen tiles |
| RSI/MACD computed on large candle datasets | 🟢 Low | Medium | `useMemo` keyed on candle array length |
| Portfolio P&L accuracy with stock splits | 🟡 Medium | Medium | Store split-adjusted prices; note limitation in UI |
| Earnings calendar data freshness | 🟢 Low | Low | Weekly Celery refresh; show last-updated timestamp |
| Candlestick pattern false positives | 🟡 Medium | Medium | Require minimum body/wick ratios; show confidence % |
| Browser Notification API permission denied | 🟢 Low | High | Fall back gracefully to in-app toast only |
| X API v2 cost / access restrictions | 🔴 High | High | StockTwits (free, pre-labeled sentiment) as primary source |
| FinBERT inference latency | 🟡 Medium | Medium | Async Celery worker; never blocks API response |
| WebSocket scale at many concurrent users | 🟡 Medium | Low | Redis pub/sub fan-out; cap connections per plan tier |
| Stripe webhook reliability | 🟡 Medium | Low | Idempotency keys + retry logic on all handlers |

### Risk Matrix

```
         │  Low Likelihood  │  Med Likelihood  │  High Likelihood
─────────┼──────────────────┼──────────────────┼──────────────────
High     │                  │  Rate Limits      │  X API Cost
Impact   │                  │                   │
─────────┼──────────────────┼──────────────────┼──────────────────
Medium   │  D3 Perf         │  Split Accuracy   │  Options Data
Impact   │  WS Scale        │  FinBERT Latency  │  Notif. Denied
         │  Stripe Webhooks │  Pattern FP       │
─────────┼──────────────────┼──────────────────┼──────────────────
Low      │  Earnings Fresh  │  RSI/MACD Perf    │
Impact   │                  │                   │
```

---

## 🧠 Build Order Rationale

**Why Phase 6 before Phase 5 (auth)?**  
Portfolio tracking is the highest-retention feature — users who track their real holdings return every day. Shipping it first maximizes the value of the product before locking anything behind a paywall. Phase 5 gates features that already exist, so it attracts more paid signups with a larger feature set.

**Why Phase 7 (indicators) before Phase 8 (screener)?**  
The screener filters on RSI and MA crossovers — those computations need to exist (Phase 7) before the screener can use them as filter criteria. The screener can also immediately display RSI values in its results table.

**Why Phase 9 last?**  
Options data and institutional ownership have the highest external dependency risk (paid Finnhub tier or alternative data sources). Phase 9 features are the most visually impressive for a portfolio showcase but are the most likely to require paid API access.

**Why Phase 5 deferred indefinitely?**  
Auth creates friction. Every unauth'd feature keeps the funnel wide. The current guest-mode architecture (`GUEST_ID=1`) works cleanly in production for a solo-use or demo deployment. Phase 5 should only be started when there's a clear monetization path and real users waiting for accounts.

### Decision Flow: When to Ship Phase 5

```
Phase 5 Gate Checklist
───────────────────────────────────────────────
☑ Phase 6  Portfolio P&L Tracker    (complete)
☑ Phase 7  Technical Indicators     (complete)
☑ Phase 8  Screener, Alerts, Cal.   (complete)
☑ Phase 9  Options + Institutional  (complete)
☐ Phase 10 Portfolio Command Centre (not yet)
☐ Phase 11 App Shell Polish         (not yet)
☐ Real users asking for accounts    (pending)
☐ Clear monetization path           (pending)
───────────────────────────────────────────────
→ Begin Phase 5 when all boxes checked
```

---

## 📈 Milestones Timeline

```
Week 1–3   ████░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 1  — Backend + DB + APIs ✅
Week 4–6   ░░░░████░░░░░░░░░░░░░░░░░░░░░░  Phase 2  — Dashboard UI ✅
Week 7–9   ░░░░░░░░████░░░░░░░░░░░░░░░░░░  Phase 3  — Compare + Watchlist + Market ✅
Week 10–13 ░░░░░░░░░░░░██████░░░░░░░░░░░░  Phase 4  — WebSocket + News + Sentiment ✅
Week 14–15 ░░░░░░░░░░░░░░░░░░──░░░░░░░░░░  Phase 5  — Auth + Stripe + Deploy ⏳ (deferred)
Week 16–18 ░░░░░░░░░░░░░░░░░░░░████░░░░░░  Phase 6  — Portfolio P&L Tracker ✅
Week 19–21 ░░░░░░░░░░░░░░░░░░░░░░░░████░░  Phase 7  — Technical Indicators ✅
Week 22–24 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  Phase 8  — Screener + Alerts + Calendar ✅
Week 25–27 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 9  — Options + Institutional + Patterns ✅
Week 28–30 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 10 — Portfolio Command Centre 🔲
Week 31    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 11 — App Shell Polish & Navigation 🔲
```

---

*Updated: 2026 · Phases 1–9 complete · 242 backend + 158 frontend tests passing · Phases 10–11 designed and roadmapped · Phase 5 deferred*
