import { http, HttpResponse } from 'msw'

const BASE = '/api/v1'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const MOCK_QUOTE = {
  ticker: 'AAPL', price: 189.50, change: 1.23, change_pct: 0.65,
  high: 191.00, low: 187.50, open: 188.00, prev_close: 188.27,
  timestamp: 1700000000,
}

export const MOCK_CANDLES = {
  ticker: 'AAPL', range: '1M', resolution: 'D',
  candles: Array.from({ length: 30 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00+00:00`,
    timestamp: 1700000000 + i * 86400,
    open: 185 + i, high: 192 + i, low: 183 + i,
    close: 189 + i, volume: 50_000_000,
  })),
}

export const MOCK_PROFILE = {
  ticker: 'AAPL', company_name: 'Apple Inc', sector: 'Technology',
  market_cap: 2_900_000, logo_url: null, exchange: 'NASDAQ',
  ipo_date: '1980-12-12', website: 'https://www.apple.com',
  country: 'US', currency: 'USD',
}

export const MOCK_FINANCIALS = {
  ticker: 'AAPL', week_52_high: 230.0, week_52_low: 155.0,
  beta: 1.25, pe_ratio: 28.5, eps: 6.57,
  revenue_per_share: 24.33, dividend_yield: 0.52,
}

export const MOCK_NEWS = {
  ticker: 'AAPL',
  articles: [
    {
      id: 1, headline: 'Apple beats Q4 earnings',
      summary: 'Better than expected', source: 'Reuters',
      url: 'https://www.reuters.com/search/news?blob=AAPL',
      image: null, sentiment: 'positive',
      published_at: '2024-01-15T10:00:00+00:00',
    },
    {
      id: 2, headline: '$AAPL Reddit discussion',
      summary: 'Community sentiment', source: 'Reddit',
      url: 'https://www.reddit.com/search/?q=%24AAPL&sort=new',
      image: null, sentiment: 'positive',
      published_at: '2024-01-15T09:00:00+00:00',
    },
    {
      id: 3, headline: '$AAPL on X (Twitter)',
      summary: 'Trending', source: 'X / Twitter',
      url: 'https://x.com/search?q=%24AAPL&src=typed_query&f=live',
      image: null, sentiment: 'neutral',
      published_at: '2024-01-15T08:00:00+00:00',
    },
    {
      id: 4, headline: '$AAPL StockTwits feed',
      summary: 'Live stream', source: 'StockTwits',
      url: 'https://stocktwits.com/symbol/AAPL',
      image: null, sentiment: 'positive',
      published_at: '2024-01-15T07:00:00+00:00',
    },
  ],
}

export const MOCK_SEARCH = {
  query: 'APP',
  results: [
    { ticker: 'AAPL', description: 'Apple Inc', type: 'Common Stock', exchange: 'NASDAQ' },
  ],
}

export const MOCK_COMPARE = {
  tickers: ['AAPL', 'MSFT'],
  range: '3M',
  series: [
    {
      ticker: 'AAPL', color: '#6366f1',
      start_price: 175.0, end_price: 189.5, pct_change: 8.28,
      points: Array.from({ length: 90 }, (_, i) => ({
        date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00+00:00`,
        timestamp: 1700000000 + i * 86400,
        pct_return: i * 0.1,
        close: 175 + i * 0.16,
      })),
    },
    {
      ticker: 'MSFT', color: '#f59e0b',
      start_price: 380.0, end_price: 415.2, pct_change: 9.26,
      points: Array.from({ length: 90 }, (_, i) => ({
        date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00+00:00`,
        timestamp: 1700000000 + i * 86400,
        pct_return: i * 0.12,
        close: 380 + i * 0.39,
      })),
    },
  ],
}

export const MOCK_MARKET = {
  items: Array.from({ length: 50 }, (_, i) => ({
    ticker: `TICK${i}`, company_name: `Company ${i}`,
    sector: 'Technology', price: 100 + i,
    change: i % 3 === 0 ? -1.5 : 1.5,
    change_pct: i % 3 === 0 ? -0.5 : 0.5,
    volume: 1_000_000 * (i + 1),
    market_cap: 500_000 * (50 - i),
  })),
  updated_at: '2024-01-15T12:00:00+00:00',
}

export const MOCK_WATCHLISTS = [
  { id: 1, name: 'My Watchlist', tickers: ['AAPL', 'MSFT', 'NVDA'] },
]

export const MOCK_SENTIMENT = {
  ticker: 'AAPL', score: 0.6, label: 'positive',
  post_volume: 142, window_hours: 24,
  computed_at: '2024-01-15T12:00:00+00:00',
  source: 'stocktwits_live',
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  http.get(`${BASE}/stocks/quote/:ticker`,        () => HttpResponse.json(MOCK_QUOTE)),
  http.get(`${BASE}/stocks/candles/:ticker`,      () => HttpResponse.json(MOCK_CANDLES)),
  http.get(`${BASE}/stocks/search`,               () => HttpResponse.json(MOCK_SEARCH)),
  http.get(`${BASE}/stocks/news/:ticker`,         () => HttpResponse.json(MOCK_NEWS)),
  http.get(`${BASE}/stocks/profile/:ticker`,      () => HttpResponse.json(MOCK_PROFILE)),
  http.get(`${BASE}/stocks/financials/:ticker`,   () => HttpResponse.json(MOCK_FINANCIALS)),
  http.get(`${BASE}/stocks/compare`,              () => HttpResponse.json(MOCK_COMPARE)),
  http.get(`${BASE}/stocks/market/overview`,      () => HttpResponse.json(MOCK_MARKET)),
  http.get(`${BASE}/watchlist/`,                  () => HttpResponse.json(MOCK_WATCHLISTS)),
  http.post(`${BASE}/watchlist/`,                 () => HttpResponse.json({ id: 99, name: 'New List', tickers: [] })),
  http.patch(`${BASE}/watchlist/:id`,             () => HttpResponse.json({ id: 1, name: 'Renamed' })),
  http.delete(`${BASE}/watchlist/:id`,            () => HttpResponse.json({ deleted: true })),
  http.post(`${BASE}/watchlist/:id/items`,        () => HttpResponse.json({ ticker: 'GOOG', watchlist_id: 1 })),
  http.delete(`${BASE}/watchlist/:id/items/:ticker`, () => HttpResponse.json({ deleted: true, ticker: 'GOOG' })),
  http.put(`${BASE}/watchlist/:id/reorder`,       () => HttpResponse.json({ reordered: true })),
  http.get(`${BASE}/sentiment/:ticker/history`,   () => HttpResponse.json({ ticker: 'AAPL', history: [] })),
  http.get(`${BASE}/sentiment/:ticker`,           () => HttpResponse.json(MOCK_SENTIMENT)),
  http.get('/health',                             () => HttpResponse.json({ status: 'ok', db: 'ok', redis: 'ok', version: '1.0.0' })),
]
