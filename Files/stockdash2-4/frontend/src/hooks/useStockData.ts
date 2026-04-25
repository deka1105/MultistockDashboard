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
