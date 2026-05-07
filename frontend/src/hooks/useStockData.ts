import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Quote, CandlesResponse, SearchResponse, NewsArticle, CompanyProfile, BasicFinancials, TimeRange } from '@/types/stock'

export function useStockQuote(ticker: string | undefined) {
  return useQuery<Quote>({
    queryKey: ['quote', ticker],
    queryFn: () => api.get(`/stocks/quote/${ticker}`).then(r => r.data),
    enabled: !!ticker,
    refetchInterval: 30_000,
  })
}

export function useCandles(ticker: string | undefined, range: TimeRange) {
  return useQuery<CandlesResponse>({
    queryKey: ['candles', ticker, range],
    queryFn: () => api.get(`/stocks/candles/${ticker}`, { params: { range } }).then(r => r.data),
    enabled: !!ticker,
    staleTime: range === '1D' ? 60_000 : 5 * 60_000,
  })
}

export function useSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: ['search', query],
    queryFn: () => api.get('/stocks/search', { params: { q: query } }).then(r => r.data),
    enabled: query.length >= 1,
    staleTime: 5 * 60_000,
  })
}

export function useCompanyNews(ticker: string | undefined) {
  return useQuery<{ ticker: string; articles: NewsArticle[] }>({
    queryKey: ['news', ticker],
    queryFn: () => api.get(`/stocks/news/${ticker}`).then(r => r.data),
    enabled: !!ticker,
    staleTime: 3 * 60_000,
  })
}

export function useCompanyProfile(ticker: string | undefined) {
  return useQuery<CompanyProfile>({
    queryKey: ['profile', ticker],
    queryFn: () => api.get(`/stocks/profile/${ticker}`).then(r => r.data),
    enabled: !!ticker,
    staleTime: 60 * 60_000, // profiles don't change often
  })
}

export function useBasicFinancials(ticker: string | undefined) {
  return useQuery<BasicFinancials>({
    queryKey: ['financials', ticker],
    queryFn: () => api.get(`/stocks/financials/${ticker}`).then(r => r.data),
    enabled: !!ticker,
    staleTime: 60 * 60_000,
  })
}

export function useMarketOverview() {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: () => api.get('/stocks/market/overview').then(r => r.data),
    refetchInterval: 60_000,
  })
}

export function useCompare(tickers: string[], range: string) {
  return useQuery({
    queryKey: ['compare', tickers.join(','), range],
    queryFn: () =>
      api.get('/stocks/compare', { params: { tickers: tickers.join(','), range } }).then(r => r.data),
    enabled: tickers.length >= 2,
    staleTime: 5 * 60_000,
  })
}

export function useMultiQuote(tickers: string[]) {
  return useQuery({
    queryKey: ['multi-quote', tickers.join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(
        tickers.map(t => api.get(`/stocks/quote/${t}`).then(r => r.data))
      )
      return results.map((r, i) => ({
        ticker: tickers[i],
        data: r.status === 'fulfilled' ? r.value : null,
      }))
    },
    enabled: tickers.length > 0,
    refetchInterval: 30_000,
  })
}

export function useMultiCandles(tickers: string[], range = '1W') {
  return useQuery({
    queryKey: ['multi-candles', tickers.join(','), range],
    queryFn: async () => {
      const results = await Promise.allSettled(
        tickers.map(t => api.get(`/stocks/candles/${t}`, { params: { range } }).then(r => r.data))
      )
      return results.map((r, i) => ({
        ticker: tickers[i],
        data: r.status === 'fulfilled' ? r.value : null,
      }))
    },
    enabled: tickers.length > 0,
    staleTime: 5 * 60_000,
  })
}

export function useMarketSparklines(tickers: string[]) {
  return useQuery({
    queryKey: ['market-sparklines', tickers.join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(
        tickers.map(t =>
          api.get(`/stocks/candles/${t}`, { params: { range: '1W' } }).then(r => r.data)
        )
      )
      const map: Record<string, { close: number }[]> = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled')
          map[tickers[i]] = r.value.candles ?? []
      })
      return map
    },
    enabled: tickers.length > 0,
    staleTime: 5 * 60_000,
  })
}

// ─── Watchlist backend hooks ──────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useBackendWatchlists() {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: () => api.get('/watchlist/').then(r => r.data),
    staleTime: 30_000,
  })
}

export function useCreateWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post('/watchlist/', { name }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useRenameWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/watchlist/${id}`, { name }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useDeleteWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/watchlist/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useAddWatchlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ticker }: { id: number; ticker: string }) =>
      api.post(`/watchlist/${id}/items`, { ticker }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useRemoveWatchlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ticker }: { id: number; ticker: string }) =>
      api.delete(`/watchlist/${id}/items/${ticker}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useReorderWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ticker_order }: { id: number; ticker_order: string[] }) =>
      api.put(`/watchlist/${id}/reorder`, { ticker_order }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useSentiment(ticker: string | undefined, window = 24) {
  return useQuery({
    queryKey: ['sentiment', ticker, window],
    queryFn: () => api.get(`/sentiment/${ticker}`, { params: { window } }).then(r => r.data),
    enabled: !!ticker,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

export function useSentimentHistory(ticker: string | undefined, window = 24) {
  return useQuery({
    queryKey: ['sentiment-history', ticker, window],
    queryFn: () => api.get(`/sentiment/${ticker}/history`, { params: { window } }).then(r => r.data),
    enabled: !!ticker,
    staleTime: 10 * 60_000,
  })
}

// ─── Quick watchlist (used by Dashboard + Market star buttons) ────────────────

export function useQuickWatchlist() {
  const qc = useQueryClient()

  const add = useMutation({
    mutationFn: (ticker: string) =>
      api.post('/watchlist/quick-add', { ticker }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })

  const remove = useMutation({
    mutationFn: (ticker: string) =>
      api.delete(`/watchlist/quick-remove/${ticker}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })

  return { add, remove }
}

export function useIsInWatchlist(ticker: string | undefined) {
  // Derive from backend watchlist list — avoids extra API call
  const { data: lists } = useBackendWatchlists()
  if (!ticker || !lists) return false
  return lists.some((wl: any) =>
    (wl.tickers ?? []).includes(ticker.toUpperCase())
  )
}


// ─── Portfolio hooks ──────────────────────────────────────────────────────────

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => api.get('/portfolio/').then(r => r.data),
    staleTime: 30_000,
  })
}

export function usePortfolioSummary(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio-summary', portfolioId],
    queryFn: () => api.get(`/portfolio/${portfolioId}/summary`).then(r => r.data),
    enabled: portfolioId !== null,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

export function usePortfolioHistory(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio-history', portfolioId],
    queryFn: () => api.get(`/portfolio/${portfolioId}/history`).then(r => r.data),
    enabled: portfolioId !== null,
    staleTime: 60_000,
  })
}

export function useCreatePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post('/portfolio/', { name }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useDeletePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/portfolio/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useAddPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ portfolioId, ...body }: { portfolioId: number; ticker: string; shares: number; avg_cost: number; notes?: string }) =>
      api.post(`/portfolio/${portfolioId}/positions`, body).then(r => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['portfolio-summary', v.portfolioId] })
    },
  })
}

export function useUpdatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ portfolioId, positionId, ...body }: { portfolioId: number; positionId: number; shares?: number; avg_cost?: number; notes?: string }) =>
      api.patch(`/portfolio/${portfolioId}/positions/${positionId}`, body).then(r => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['portfolio-summary', v.portfolioId] })
    },
  })
}

export function useDeletePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ portfolioId, positionId }: { portfolioId: number; positionId: number }) =>
      api.delete(`/portfolio/${portfolioId}/positions/${positionId}`).then(r => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['portfolio-summary', v.portfolioId] })
    },
  })
}


// ─── Screener ─────────────────────────────────────────────────────────────────

export function useScreener(filters: object[], sortBy = 'market_cap', sortDir = 'desc', page = 1) {
  return useQuery({
    queryKey: ['screener', filters, sortBy, sortDir, page],
    queryFn: () => api.get('/screener/', {
      params: {
        filters: JSON.stringify(filters),
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: 25,
      },
    }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
  })
}

export function useScreenerPresets() {
  return useQuery({
    queryKey: ['screener-presets'],
    queryFn: () => api.get('/screener/presets').then(r => r.data),
    staleTime: Infinity,
  })
}

export function useScreenerFields() {
  return useQuery({
    queryKey: ['screener-fields'],
    queryFn: () => api.get('/screener/fields').then(r => r.data),
    staleTime: Infinity,
  })
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts/').then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { ticker: string; alert_type: string; threshold?: number }) =>
      api.post('/alerts/', body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useDeleteAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/alerts/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useReactivateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch(`/alerts/${id}/reactivate`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useCheckAlerts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/alerts/check').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export function useEarningsCalendar(days = 30) {
  return useQuery({
    queryKey: ['earnings-calendar', days],
    queryFn: () => api.get('/earnings/calendar', { params: { days } }).then(r => r.data),
    staleTime: 3_600_000,
  })
}

export function useEarningsHistory(ticker: string | undefined) {
  return useQuery({
    queryKey: ['earnings-history', ticker],
    queryFn: () => api.get(`/earnings/${ticker}/history`).then(r => r.data),
    enabled: !!ticker,
    staleTime: 3_600_000,
  })
}

export function useOptionsChain(ticker: string) {
  return useQuery({
    queryKey: ['options', ticker],
    queryFn:  () => api.get(`/stocks/options/${ticker}`).then(r => r.data),
    enabled:  !!ticker,
    staleTime: 5 * 60_000,   // 5-min — options data changes slowly
    retry: 1,
  })
}

// ─── Phase 10: Portfolio command-centre hooks ──────────────────────────────

export function usePortfolioEarnings(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio-earnings', portfolioId],
    queryFn:  () => api.get(`/portfolio/${portfolioId}/upcoming-earnings`).then(r => r.data),
    enabled:  !!portfolioId,
    staleTime: 3_600_000,
  })
}

export function usePortfolioAlerts(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio-alerts', portfolioId],
    queryFn:  () => api.get(`/portfolio/${portfolioId}/active-alerts`).then(r => r.data),
    enabled:  !!portfolioId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function usePortfolioScreenerPreview(portfolioId: number | null) {
  return useQuery({
    queryKey: ['portfolio-screener-preview', portfolioId],
    queryFn:  () => api.get(`/portfolio/${portfolioId}/screener-preview`).then(r => r.data),
    enabled:  !!portfolioId,
    staleTime: 5 * 60_000,
  })
}

// ─── Phase 11: WebSocket Status ───────────────────────────────────────────────

interface WsSubscription {
  ticker:    string
  connected: boolean
  lastTick:  number | null   // epoch ms
}

// Module-level registry so TopBar can observe without re-subscribing
const _wsRegistry = new Map<string, WsSubscription>()
const _wsListeners = new Set<() => void>()

export function _registerWsTick(ticker: string, connected: boolean) {
  _wsRegistry.set(ticker, {
    ticker,
    connected,
    lastTick: connected ? Date.now() : (_wsRegistry.get(ticker)?.lastTick ?? null),
  })
  _wsListeners.forEach(fn => fn())
}

export function useWebSocketStatus() {
  const [, rerender] = useState(0)

  useEffect(() => {
    const fn = () => rerender(n => n + 1)
    _wsListeners.add(fn)
    return () => { _wsListeners.delete(fn) }
  }, [])

  const subs = Array.from(_wsRegistry.values())
  const totalActive   = subs.filter(s => s.connected).length
  const totalTracked  = subs.length
  const anyConnected  = totalActive > 0
  const allConnected  = totalTracked > 0 && totalActive === totalTracked

  // Most recent tick across all subscriptions
  const lastTickMs = subs.reduce<number | null>((best, s) => {
    if (s.lastTick == null) return best
    return best == null ? s.lastTick : Math.max(best, s.lastTick)
  }, null)

  const secondsAgo = lastTickMs ? Math.floor((Date.now() - lastTickMs) / 1000) : null

  const status: 'connected' | 'partial' | 'disconnected' | 'idle' =
    totalTracked === 0  ? 'idle'
    : allConnected      ? 'connected'
    : anyConnected      ? 'partial'
    : 'disconnected'

  return { status, totalActive, totalTracked, secondsAgo, lastTickMs }
}
