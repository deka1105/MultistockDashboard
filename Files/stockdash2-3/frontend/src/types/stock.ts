export interface Quote {
  ticker: string
  price: number | null
  change: number | null
  change_pct: number | null
  high: number | null
  low: number | null
  open: number | null
  prev_close: number | null
  timestamp: number | null
}

export interface CandlePoint {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CandlesResponse {
  ticker: string
  range: string
  resolution: string
  candles: CandlePoint[]
}

export interface SymbolResult {
  ticker: string | null
  description: string | null
  type: string | null
  exchange: string | null
}

export interface SearchResponse {
  query: string
  results: SymbolResult[]
}

export interface NewsArticle {
  id: number | null
  headline: string | null
  summary: string | null
  source: string | null
  url: string | null
  image: string | null
  sentiment: 'positive' | 'neutral' | 'negative'
  published_at: string | null
}

export interface CompanyProfile {
  ticker: string
  company_name: string | null
  sector: string | null
  market_cap: number | null
  logo_url: string | null
  exchange: string | null
  ipo_date: string | null
  website: string | null
  country: string | null
  currency: string | null
}

export interface BasicFinancials {
  ticker: string
  week_52_high: number | null
  week_52_low: number | null
  beta: number | null
  pe_ratio: number | null
  eps: number | null
  dividend_yield: number | null
}

export interface NormalizedPoint {
  date: string
  timestamp: number
  pct_return: number
  close: number
}

export interface CompareSeries {
  ticker: string
  color: string
  start_price: number
  end_price: number
  pct_change: number
  points: NormalizedPoint[]
}

export interface CompareResponse {
  tickers: string[]
  range: string
  series: CompareSeries[]
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'
export type ChartType = 'line' | 'candlestick'
