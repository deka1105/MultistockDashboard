# 📈 Multi-Stock Dynamic Dashboard — SaaS Development Roadmap

**Stack:** React (Vite) · FastAPI · Recharts · PostgreSQL · Redis · Finnhub · Reddit API · X (Twitter) API · Docker · Railway / Render  
**Goal:** Production-grade SaaS stock dashboard with real-time data, multi-stock comparison, watchlists, news feed, social sentiment, portfolio analytics, and professional-grade technical analysis tools.  
**Total Estimated Timeline:** 26–34 weeks (solo developer, part-time)  
**Current Status:** Phases 1–9 complete · 242 backend tests · 158 frontend tests · Phase 10–11 in roadmap · Phase 5 deferred

---

## Roadmap Overview

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
**Mockup:** `stockdash_portfolio_preview.html`

### New route
`/portfolio` — full-page portfolio dashboard

### Database additions
```sql
portfolios  (id, user_id, name, created_at)
positions   (id, portfolio_id, ticker, shares, avg_cost, opened_at, notes)
pnl_snapshots (id, portfolio_id, date, value, daily_return_pct)
```

### Backend endpoints
- [ ] `GET    /api/v1/portfolio/` — list portfolios
- [ ] `POST   /api/v1/portfolio/` — create portfolio
- [ ] `POST   /api/v1/portfolio/{id}/positions` — add position (ticker, shares, avg_cost)
- [ ] `PATCH  /api/v1/portfolio/{id}/positions/{pos_id}` — edit shares or cost basis
- [ ] `DELETE /api/v1/portfolio/{id}/positions/{pos_id}` — remove position
- [ ] `GET    /api/v1/portfolio/{id}/summary` — live P&L merged with current quotes

### KPI summary cards
- [ ] **Portfolio Value** — sum of (current_price × shares), with intraday mini sparkline
- [ ] **Total P&L** — unrealized gain/loss in $ and % vs total cost basis
- [ ] **Today's P&L** — live delta using WebSocket ticks where available
- [ ] **Best/Worst Performer** — ticker with highest/lowest % return
- [ ] **Portfolio Beta** — weighted average of individual position betas

### Portfolio vs Benchmark chart
- [ ] Normalized return comparison from portfolio inception date
- [ ] Benchmark overlay: S&P 500 (SPY), QQQ, or user-chosen ticker
- [ ] Time range selector: 1M / 3M / 6M / YTD / 1Y / All
- [ ] Reuses existing normalized-return logic from Compare page — minimal new code

### Allocation donut
- [ ] Recharts `PieChart` — weighted by current position value
- [ ] Sector grouping from `stock_metadata.sector`
- [ ] Click slice → filters holdings table to that sector
- [ ] Center label shows total portfolio value

### Holdings table
- [ ] Columns: Ticker, Company, Shares, Avg Cost, Current Price, Value, P&L $, P&L %, Today %, Weight bar, 7D sparkline
- [ ] Inline edit: click shares or cost basis to edit in place
- [ ] Row click → navigates to `/dashboard/:ticker`
- [ ] Export to CSV button (gated behind Pro plan in Phase 5)

### Daily P&L heatmap
- [ ] 30-day calendar grid — each square colored green (profit) or red (loss)
- [ ] Color intensity scales with magnitude (±0.5% = light tint, ±2%+ = saturated)
- [ ] Hover tooltip: date, P&L %, absolute dollar change
- [ ] Data stored in `pnl_snapshots` by Celery beat task at market close daily

### P&L by position bar chart
- [ ] Horizontal `BarChart` — one bar per position, sorted best to worst
- [ ] Shows unrealized P&L contribution per ticker as % of total portfolio gain

### Frontend components
- [ ] `PortfolioSummaryCards` — 5 KPI cards with sparklines
- [ ] `BenchmarkChart` — portfolio vs chosen benchmark using Compare series engine
- [ ] `AllocationDonut` — Recharts PieChart with sector legend
- [ ] `HoldingsTable` — sortable, inline-editable positions grid
- [ ] `DailyPnLCalendar` — 30-day heatmap grid
- [ ] `PnLBarChart` — horizontal BarChart per position
- [ ] `AddPositionModal` — ticker search + shares + avg cost input with validation

### Deliverable
> `/portfolio` shows a Bloomberg-style portfolio view: live P&L, benchmark comparison, sector allocation donut, full holdings grid with sparklines, and 30-day daily return calendar.

---

## Phase 7 — Technical Indicators ✅
**Duration:** 2–3 weeks  
**Status:** Complete
**Priority:** High — most-requested feature by traders; all math runs on existing candle data, no new API calls

### Indicators (all computed client-side in TypeScript from existing `CandlePoint[]`)

- [ ] **RSI (14-period default)**
  - Formula: `100 - (100 / (1 + avg_gain / avg_loss))`
  - Separate oscillator panel below the price chart
  - Reference lines at 70 (overbought, red dashed) and 30 (oversold, green dashed)
  - Current RSI badge colored: red > 70, amber 50–70, green < 50

- [ ] **MACD (12, 26, 9)**
  - MACD line = 12-period EMA − 26-period EMA
  - Signal line = 9-period EMA of MACD line
  - Histogram bars = MACD − Signal (green above zero, red below)
  - Second oscillator panel below RSI
  - Bullish/bearish crossover detection with arrow annotation on chart

- [ ] **Bollinger Bands (20-period SMA ± 2 std dev)**
  - Upper and lower bands overlaid directly on price chart as semi-transparent area fill
  - Band squeeze detection (low volatility signal)
  - Toggle button alongside existing MA50/MA200 controls

- [ ] **VWAP (Volume-Weighted Average Price)**
  - `VWAP = Σ(typical_price × volume) / Σ(volume)` accumulated from open
  - Single reference line on price chart (purple)
  - Auto-hidden when range > 1D (meaningless for multi-day)

- [ ] **Stochastic Oscillator (14, 3, 3)**
  - %K and %D lines in a third collapsible oscillator panel
  - Overbought > 80, oversold < 20 reference lines

- [ ] **EMA overlays (9, 21, 50, 200)**
  - Extend existing MA toggle bar to include EMA options
  - Different color per period, all toggleable independently

### Chart panel architecture
- [ ] Price chart top (~55% of chart area)
- [ ] Volume panel below price chart (~15%)
- [ ] Indicator oscillator panels stack below volume, each ~15%, individually collapsible
- [ ] Each panel shows label + current-value badge + close (×) button
- [ ] Panel order is drag-reorderable (dnd-kit)

### Indicator control bar
- [ ] Dropdown/tab to add/remove indicator panels
- [ ] Per-indicator parameter inputs (e.g. change RSI from 14 to 21 periods)
- [ ] "Save layout" button persists panel configuration to localStorage

### Backend (optional pre-compute endpoint)
- [ ] `GET /api/v1/stocks/indicators/{ticker}?indicators=rsi,macd&range=3M` — server-side for mobile clients
- [ ] Desktop clients compute client-side for zero latency

### Deliverable
> Price chart gains a full indicator suite: RSI and MACD oscillator panels below the chart, Bollinger Bands and VWAP overlaid on candles, all configurable from a control bar with adjustable parameters.

---

## Phase 8 — Advanced Analysis Tools ✅
**Duration:** 2–3 weeks  
**Status:** Complete
**Priority:** High — screener and alerts make the product sticky (users return daily to check triggers)

### 8A — Stock Screener (`/screener`)

#### Filter engine
- [ ] **Numeric range filters:** P/E < 35, Market Cap > $10B, Change % > 2%, Beta < 1.5, Dividend Yield > 2%, Revenue Growth > 20%
- [ ] **Categorical filters:** Sector = Technology, Exchange = NASDAQ
- [ ] **Technical filters:** RSI > 50, RSI < 30 (oversold entry), Price above MA50
- [ ] Filter chips UI — each active filter shown as removable tag
- [ ] Filter builder modal — field dropdown + operator + value
- [ ] Results update live as filters change (debounced 500ms)

#### Saved screeners
- [ ] Save named filter configurations per user (PostgreSQL)
- [ ] Built-in presets: "Oversold Tech", "High Momentum", "Dividend Growth", "Low Beta"
- [ ] Shareable via URL: `/screener?filters=<base64-encoded-json>`

#### Results table
- [ ] Columns: Ticker, Company, Sector, Price, P/E, Market Cap, Revenue Growth, Today %, RSI, Signal badge
- [ ] Row click → `/dashboard/:ticker`
- [ ] Bulk actions: add all results to watchlist, or open in Compare

#### Backend
- [ ] `GET /api/v1/screener?filters=...` — server-side filtering against `stock_metadata` + cached quotes
- [ ] Pre-computed RSI stored in Redis (Celery refreshes every 15min during market hours)
- [ ] Paginated: 25 results per page

### 8B — Price Alerts

#### Alert types
- [ ] Price above threshold (e.g. NVDA crosses $700)
- [ ] Price below threshold (e.g. TSLA drops below $160)
- [ ] % move in one day exceeds threshold (e.g. AAPL > 5%)
- [ ] RSI crosses level (e.g. AAPL RSI drops below 30)
- [ ] MA crossover (e.g. price crosses above 50-day MA — golden cross)

#### Architecture
- [ ] `alerts` table: `(id, user_id, ticker, type, threshold, is_active, triggered_at, created_at)`
- [ ] Celery beat task checks all active alerts every 30s against cached quotes
- [ ] On trigger: mark triggered, fire browser `Notification` API push
- [ ] Alert history log with timestamp and price at trigger

#### Frontend
- [ ] Alert creation inline on dashboard page (ticker + type + value)
- [ ] Global alerts panel at `/alerts` — all active alerts sorted by proximity to trigger
- [ ] Browser notification permission prompt on first alert creation
- [ ] In-app toast notification when alert fires (any page)
- [ ] Retry/reactivate triggered alerts with one click

### 8C — Earnings Calendar (`/calendar`)

#### Data source
- [ ] Finnhub `/calendar/earnings` — free, covers all major US stocks
- [ ] Celery beat: refresh upcoming earnings weekly, store in `earnings_events` table
- [ ] Schema: `(ticker, report_date, time_of_day, eps_estimate, eps_actual, surprise_pct, beat_miss)`

#### Calendar view
- [ ] Month grid with earnings days highlighted (amber border)
- [ ] Ticker chips per day: green = pre-market, amber = after-hours
- [ ] Click day → popover with full list of reporting companies
- [ ] Click ticker → `/dashboard/:ticker`
- [ ] Filter toggle: show only watchlist or portfolio tickers

#### Earnings history per ticker (on dashboard page)
- [ ] Last 8 quarters grouped bar chart: actual EPS vs estimate
- [ ] Beat / Miss / In-line badge per quarter
- [ ] Surprise % as secondary y-axis line

### 8D — Global Correlation Heatmap (extend Compare page)

- [ ] Full S&P 50 correlation heatmap — 50×50 grid via D3 tiles
- [ ] Color: cyan = strong positive correlation, red = inverse, gray = uncorrelated
- [ ] Click cell → opens Compare chart for that ticker pair
- [ ] Cluster detection: group sectors with high internal correlation
- [ ] Drag to zoom into a sector region

#### Per-ticker "Correlated Movers" card (on dashboard page)
- [ ] Top 5 most correlated and 5 least correlated tickers
- [ ] Useful for hedging analysis

### Deliverable
> Four new tools: a dynamic screener with saved filters, price/RSI/MA-crossover alerts with browser notifications, a monthly earnings calendar with per-ticker history, and an S&P 50 correlation heatmap.

---

## Phase 9 — Institutional & Options Intelligence ✅
**Duration:** 2–3 weeks  
**Priority:** Medium-high — most visually impressive; differentiates from all free tools
**Status:** Complete

### 9A — Sector Heatmap (Market page upgrade)

- [ ] Replace/supplement market table with D3 treemap visualization
- [ ] 11 S&P 500 sectors as top-level tiles, sized by total market cap
- [ ] Each sector subdivided into constituent stocks, sized by individual market cap
- [ ] Color gradient: green (up) → red (down), intensity = magnitude of daily change
- [ ] Hover tooltip: ticker, company, price, change %, market cap
- [ ] Click tile → `/dashboard/:ticker`
- [ ] View toggle: Today % / 1W % / 1M % / YTD %
- [ ] SVG via D3 with smooth resize transitions and data-refresh animation

### 9B — Options Flow Heatmap (per-ticker tab)

- [ ] Data: Finnhub `/stock/option-chain` endpoint
- [ ] X-axis: strike prices (±20% of current price)
- [ ] Y-axis: expiry dates (next 4 Fridays + monthly expirations)
- [ ] Color: calls = green gradient, puts = red gradient
- [ ] Cell opacity/size = volume traded today
- [ ] Put/Call ratio badge per expiry row
- [ ] Max pain price as vertical reference line
- [ ] Toggle: All / Calls only / Puts only
- [ ] Cell tooltip: strike, expiry, call OI, put OI, implied volatility, today's volume

### 9C — Institutional Ownership (per-ticker card)

- [ ] Data: Finnhub `/stock/institutional-ownership` + `/stock/insider-transactions`
- [ ] **Ownership Summary**: institutional % of float, # holders, QoQ change
- [ ] **Top 5 Holders** horizontal bar chart: institution name → % of shares held
- [ ] **Insider Transactions Timeline**: scatter plot of buys (green) and sells (red) over 12 months
- [ ] Click transaction point → SEC EDGAR filing link
- [ ] Store in `institutional_ownership` table, refreshed quarterly via Celery

### 9D — Candlestick Pattern Detection

#### Patterns detected (OHLC logic, client-side TypeScript)
- [ ] Doji (open ≈ close, long wicks)
- [ ] Hammer / Inverted Hammer (bullish reversal)
- [ ] Shooting Star (bearish reversal)
- [ ] Bullish Engulfing / Bearish Engulfing
- [ ] Morning Star / Evening Star (3-candle reversal)
- [ ] Three White Soldiers / Three Black Crows

#### UI integration
- [ ] Annotated arrows rendered directly on price chart candles
- [ ] Arrow above = bearish signal, below = bullish signal
- [ ] Abbreviated label on each annotation (e.g. "Hammer", "EngB")
- [ ] Hover tooltip: full pattern name, typical implication, confidence score
- [ ] "Show Patterns" toggle in chart control bar
- [ ] Pattern history table below chart: date, name, signal direction, subsequent move %
- [ ] Screener integration in Phase 8: "Show stocks with Hammer pattern this week"

### Deliverable
> Dashboard gains four professional analysis layers: D3 sector treemap on Market page, options flow heatmap per ticker, institutional ownership breakdown with insider transaction timeline, and automatic candlestick pattern annotations on the price chart.

---

---

## Phase 10 — Portfolio Command Centre 🔲
**Duration:** 2–3 weeks  
**Priority:** High — transforms the portfolio page from a holdings viewer into a true daily-use command centre, matching the unified dashboard layout seen in the product mockup  
**Status:** Not started

### Overview

The screenshot shows the `/portfolio` page as a **single scrollable command centre** that embeds compact, portfolio-aware versions of every analysis tool directly on one page. Currently each tool lives on its own route. Phase 10 moves the experience from "multiple pages to jump between" to "one page that shows everything at once."

### 10A — Focused Ticker Selector on Portfolio Page

When the user clicks a row in the Holdings Table, that ticker becomes the "focused holding" and drives the live indicator panels.

- [ ] `focusedTicker` state added to PortfolioPage (defaults to the best performer)
- [ ] Holdings table row click sets `focusedTicker` (single selection highlight)
- [ ] All analysis widgets below the Holdings table respond to `focusedTicker`
- [ ] Ticker selector pill shown above the analysis widgets row: `Analysing: NVDA ▼` with dropdown to switch to any held ticker
- [ ] `focusedTicker` persisted to `useAppStore` so refresh preserves selection

### 10B — Analysis Widgets Row 1 (Sector · RSI · MACD)

Three cards in a responsive 3-column grid, embedded directly in PortfolioPage below the Holdings Table:

#### Sector Heatmap Widget (compact)
- [ ] Reuses `SectorHeatmap` component in `compact` prop mode (reduced height, no header chrome)
- [ ] Shows only sectors represented in the portfolio (filters to held tickers)
- [ ] "Full view →" link routes to `/market?view=heatmap`
- [ ] Today % view only (no toggle needed in compact mode)

#### RSI Panel Widget
- [ ] Reuses `RSIPanel` component, fed with `useCandles(focusedTicker, '3M')`
- [ ] Shows current RSI badge prominently (e.g. `RSI 68 — Approaching Overbought`)
- [ ] Ticker label and change to `focusedTicker` when Holdings row is clicked
- [ ] "Full chart →" link routes to `/dashboard/:focusedTicker`

#### MACD Panel Widget
- [ ] Reuses `MACDPanel` component with same candle feed as RSI widget
- [ ] Shows Bullish/Bearish Cross badge when crossover detected
- [ ] Shares `focusedTicker` state with RSI widget (always same ticker)

### 10C — Analysis Widgets Row 2 (Earnings · Correlation · Alerts)

Three more cards in a second 3-column grid:

#### Earnings Calendar Mini Widget
- [ ] New `EarningsCalendarMini` component: shows next 30 days, portfolio-filtered only
- [ ] 5-column week row layout (Mon–Fri) with ticker chips per day
- [ ] Pre/after-hours colour coding preserved (green PRE / amber POST)
- [ ] Click ticker chip → `/dashboard/:ticker`
- [ ] "Full calendar →" link to `/calendar?filter=portfolio`
- [ ] Empty state: "No earnings this month for your holdings"

#### Correlation Matrix Widget
- [ ] Reuses existing `CorrelationMatrix` component
- [ ] Automatically populated with portfolio tickers (no manual input required)
- [ ] Shows `n × n` grid where `n` = number of held positions (max 8)
- [ ] Click cell → `/compare?tickers=AAPL,MSFT`
- [ ] "Add more tickers →" link to `/compare`

#### Price Alerts Summary Widget
- [ ] New `AlertsSummaryCard` component: compact list of active alerts for portfolio tickers
- [ ] Shows: ticker icon, alert type, threshold, proximity %, Active/Near/Triggered badge
- [ ] "Recent Triggers" section at bottom: last 3 triggered alerts with timestamp
- [ ] "+ New Alert" button → opens `InlineAlertCreator` expanded for that ticker
- [ ] "All alerts →" link to `/alerts`

### 10D — Stock Screener Preview Widget

A compact screener results strip at the bottom of the Portfolio page:

- [ ] New `ScreenerPreviewCard` component: shows top 5 screener results matching a default preset
- [ ] Default preset auto-selected = any preset that overlaps with held tickers (e.g. "High Momentum")
- [ ] Preset selector chip row: user can swap preset without leaving the page
- [ ] Columns: Ticker, Price, P/E, Today %, RSI (colored), Signal badge
- [ ] "Matches X of your holdings" subtitle when overlap detected
- [ ] Run full screener / Save screen buttons
- [ ] "Full screener →" link to `/screener`

### 10E — Daily P&L Calendar (already on page, polish pass)

- [ ] Already built — ensure it renders below the Screener preview widget
- [ ] Add "30-day P&L Calendar" section header with subtitle "Portfolio performance heatmap"
- [ ] Show total monthly P&L summary line above the grid (e.g. "+$4,120 this month, 12 green days / 8 red days")
- [ ] Best day / worst day callouts beside the grid

### Backend additions

- [ ] `GET /api/v1/portfolio/{id}/upcoming-earnings` — earnings events for portfolio tickers in next 30 days (filtered from earnings_events table)
- [ ] `GET /api/v1/portfolio/{id}/alerts` — active alerts for tickers in this portfolio
- [ ] `GET /api/v1/portfolio/{id}/screener-preview` — run the "best matching" preset screener for portfolio tickers, return top 5

### New hooks

- [ ] `usePortfolioEarnings(portfolioId)` — portfolio-filtered earnings
- [ ] `usePortfolioAlerts(portfolioId)` — alerts for portfolio tickers only
- [ ] `usePortfolioScreenerPreview(portfolioId)` — screener preview results

### New components

- [ ] `EarningsCalendarMini` — compact 4-week calendar filtered to portfolio tickers
- [ ] `AlertsSummaryCard` — compact active + recent-trigger alerts for portfolio tickers
- [ ] `ScreenerPreviewCard` — top-5 screener results with preset switcher
- [ ] `PortfolioAnalysisRow` — wrapper grid for the 3+3 analysis widget layout

### Deliverable
> The `/portfolio` page becomes a single-page command centre matching the product mockup: Holdings table up top, followed by two rows of analysis widgets (Sector Heatmap · RSI · MACD in row 1; Earnings Calendar · Correlation · Alerts in row 2), then a Screener preview strip and the Daily P&L calendar at the bottom. Clicking any holding in the table instantly updates all indicator panels.

---

## Phase 11 — App Shell Polish & Navigation 🔲
**Duration:** 1 week  
**Priority:** Medium — visual quality and navigation UX improvements that make the app feel production-grade  
**Status:** Not started

### 11A — Sidebar Section Labels & NEW Badges

The sidebar currently shows 8 nav items as a flat list. The mockup groups them into labelled sections with "NEW" badges on recently-shipped features.

#### Section grouping
- [ ] Add section label components between nav groups:
  - **MARKETS** — Dashboard, Market Overview, Compare
  - **PORTFOLIO** — Portfolio P&L, Watchlist
  - **ANALYSIS** — Screener, Indicators, Earnings Calendar, Correlation, Alerts
- [ ] Section labels: `text-[9px] font-mono uppercase tracking-widest text-text-muted/50` above each group
- [ ] Thin divider line between sections
- [ ] "Market Overview" nav item added (currently missing — goes to `/market`)

#### NEW badges
- [ ] `NEW` pill badge on nav items for features shipped in the last 30 days
- [ ] Badge: `bg-accent-cyan/15 text-accent-cyan text-[8px] font-bold rounded-sm px-1`
- [ ] Configurable `isNew` prop per nav item — flip to `false` after 30 days
- [ ] Initially show NEW on: Portfolio P&L, Screener, Indicators, Earnings Calendar, Correlation, Alerts

#### Active indicator dot
- [ ] Blue dot on the left edge of the active nav item (already has active highlight, add dot)
- [ ] Matches the blue dot shown on "Portfolio P&L" in the mockup

### 11B — Header Quick-Action Buttons

The mockup shows two prominent buttons in the top-right header area beyond the LIVE badge and theme toggle:

#### Export CSV button
- [ ] "Export CSV" button in header (visible on all pages)
- [ ] Context-aware: on `/portfolio` exports Holdings CSV; on `/screener` exports screener results; on other pages exports chart data as CSV
- [ ] `useLocation()` to determine current page → dispatch to correct export handler
- [ ] Ghost button style: `border border-bg-border text-text-secondary hover:text-text-primary`

#### Run Screener button
- [ ] "Run Screener" CTA button in header (accent blue, always visible)
- [ ] Click → navigates to `/screener` (or opens screener in a slide-over panel if already on Portfolio page)
- [ ] Keyboard shortcut: `Cmd/Ctrl + K` then type ticker or `Cmd/Ctrl + Shift + S` for screener

### 11C — LIVE WebSocket Status Indicator (enhance existing)

The LIVE badge already exists in the header. Polish it to match the mockup more closely:

- [ ] Show connection state: green pulse = connected, amber = reconnecting, red = disconnected
- [ ] Tooltip on hover: "Real-time data · Last tick: 2s ago" with connection quality
- [ ] Count of active WebSocket subscriptions shown on hover (e.g. "3 tickers live")
- [ ] `useWebSocketStatus()` hook in `useAppStore` that aggregates status across all active sockets
- [ ] Smooth colour transition on state change (no flash)

### 11D — Sidebar Bottom: Plan Status Banner

At the very bottom of the sidebar, below the watchlist mini-cards:

- [ ] `PlanBanner` component: shows current plan name + tagline
- [ ] Guest mode (current): `Guest Mode · Sign up to save your data`
- [ ] Once Phase 5 is built: `Pro Plan Active · Powered by real-time data`
- [ ] Click → navigates to `/account` (placeholder, wired in Phase 5)
- [ ] Subtle gradient background matching the tier colour (amber for free, cyan for pro)
- [ ] Upgrade CTA for guest users: `Upgrade to Pro →` link

### 11E — Responsive Layout & Keyboard Navigation

- [ ] Keyboard shortcut: `Cmd/Ctrl + K` → open global search from anywhere
- [ ] Keyboard shortcut: `Cmd/Ctrl + B` → toggle sidebar collapse
- [ ] Keyboard shortcut: `G then D` → go to Dashboard, `G then P` → Portfolio, etc.
- [ ] `aria-label` and `role` attributes on all interactive components (accessibility pass)
- [ ] Mobile-responsive sidebar: swipe-to-close on touch devices, hamburger menu
- [ ] Page title updates (`document.title`) on route change: "AAPL · StockDash", "Portfolio · StockDash"

### Deliverable
> The app shell matches the product mockup exactly: sidebar with MARKETS / PORTFOLIO / ANALYSIS section labels, NEW badges on recently-shipped features, active-page dot indicator, Export CSV and Run Screener buttons in the header, enhanced LIVE badge with connection quality, Pro Plan Active banner at sidebar bottom, and full keyboard navigation support.


---

## Full Tech Stack

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

---

## Updated Milestones

```
Week 1–3   ████░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 1  — Backend + DB + APIs ✅
Week 4–6   ░░░░████░░░░░░░░░░░░░░░░░░░░░░  Phase 2  — Dashboard UI ✅
Week 7–9   ░░░░░░░░████░░░░░░░░░░░░░░░░░░  Phase 3  — Compare + Watchlist + Market ✅
Week 10–13 ░░░░░░░░░░░░██████░░░░░░░░░░░░  Phase 4  — WebSocket + News + Sentiment ✅
Week 14–15 ░░░░░░░░░░░░░░░░░░██░░░░░░░░░░  Phase 5  — Auth + Stripe + Deploy ⏳ (deferred)
Week 16–18 ░░░░░░░░░░░░░░░░░░░░████░░░░░░  Phase 6  — Portfolio P&L Tracker ✅
Week 19–21 ░░░░░░░░░░░░░░░░░░░░░░░░████░░  Phase 7  — Technical Indicators ✅
Week 22–24 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  Phase 8  — Screener + Alerts + Calendar ✅
Week 25–27 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 9  — Options + Institutional + Patterns ✅
Week 28–30 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 10 — Portfolio Command Centre 🔲
Week 31    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 11 — App Shell Polish & Navigation 🔲
```

---

## Feature Dependency Map

```
Phase 1 (data) ──► Phase 2 (UI) ──► Phase 3 (multi-stock) ──► Phase 4 (real-time)
                                                                        │
                                               ┌────────────────────────┼──────────────────────┐
                                               ▼                        ▼                       ▼
                                          Phase 6                  Phase 7               Phase 8
                                        (portfolio)             (indicators)         (screener/alerts)
                                               │                        │                       │
                                               └────────────────────────┼───────────────────────┘
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

## Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Finnhub free tier rate limits (60 req/min) | High | Redis cache + Celery request queuing |
| Options chain data limited on free Finnhub tier | Medium | Gate behind Pro plan; use mock data for preview |
| D3 treemap performance with 500+ stock tiles | Medium | Canvas rendering fallback; virtualize off-screen tiles |
| RSI/MACD computed on large candle datasets | Low | `useMemo` keyed on candle array length |
| Portfolio P&L accuracy with stock splits | Medium | Store split-adjusted prices; note limitation in UI |
| Earnings calendar data freshness | Low | Weekly Celery refresh; show last-updated timestamp |
| Candlestick pattern false positives | Medium | Require minimum body/wick ratios; show confidence % |
| Browser Notification API permission denied | Low | Fall back gracefully to in-app toast only |
| X API v2 cost / access restrictions | High | StockTwits (free, pre-labeled sentiment) as primary source |
| FinBERT inference latency | Medium | Async Celery worker; never blocks API response |
| WebSocket scale at many concurrent users | Medium | Redis pub/sub fan-out; cap connections per plan tier |
| Stripe webhook reliability | Medium | Idempotency keys + retry logic on all handlers |

---

## Build Order Rationale

**Why Phase 6 before Phase 5 (auth)?**  
Portfolio tracking is the highest-retention feature — users who track their real holdings return every day. Shipping it first maximizes the value of the product before locking anything behind a paywall. Phase 5 gates features that already exist, so it attracts more paid signups with a larger feature set.

**Why Phase 7 (indicators) before Phase 8 (screener)?**  
The screener filters on RSI and MA crossovers — those computations need to exist (Phase 7) before the screener can use them as filter criteria. The screener can also immediately display RSI values in its results table.

**Why Phase 9 last?**  
Options data and institutional ownership have the highest external dependency risk (paid Finnhub tier or alternative data sources). Phase 9 features are the most visually impressive for a portfolio showcase but are the most likely to require paid API access.

**Why Phase 5 deferred indefinitely?**  
Auth creates friction. Every unauth'd feature keeps the funnel wide. The current guest-mode architecture (`GUEST_ID=1`) works cleanly in production for a solo-use or demo deployment. Phase 5 should only be started when there's a clear monetization path and real users waiting for accounts.

---

*Updated: 2026 · Phases 1–9 complete · 242 backend + 158 frontend tests passing · Phases 10–11 designed and roadmapped · Phase 5 deferred*
