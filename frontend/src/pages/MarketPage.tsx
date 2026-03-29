import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, ArrowUpDown, ArrowUp, ArrowDown,
  Star, StarOff, TrendingUp, TrendingDown,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useMarketOverview, useBackendWatchlists, useQuickWatchlist } from '@/hooks/useStockData'
import { formatPrice, formatPct, formatMarketCap, getPriceClass, cn } from '@/lib/utils'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorCard } from '@/components/common/ErrorBoundary'
import api from '@/lib/api'

type SortKey = 'ticker' | 'price' | 'change_pct' | 'market_cap' | 'volume'
type SortDir  = 'asc' | 'desc'

const SECTORS = [
  'All','Technology','Financial Services','Consumer Cyclical',
  'Communication','Healthcare','Energy','Industrials',
]

function Sparkline({ ticker, isUp }: { ticker: string; isUp: boolean }) {
  const [candles, setCandles] = useState<{ close: number }[]>([])
  const fetched = useRef(false)
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    api.get(`/stocks/candles/${ticker}`, { params: { range: '1W' } })
      .then(r => setCandles(r.data?.candles ?? []))
      .catch(() => {})
  }, [ticker])
  if (candles.length < 2)
    return <div className="w-16 h-8 rounded bg-bg-hover animate-pulse" />
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={candles}>
          <Line type="monotone" dataKey="close"
            stroke={isUp ? '#00ff88' : '#ff3b5c'} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: SortDir }) {
  if (col !== current) return <ArrowUpDown size={11} className="opacity-30" />
  return dir === 'asc'
    ? <ArrowUp size={11} className="text-accent-cyan" />
    : <ArrowDown size={11} className="text-accent-cyan" />
}

export default function MarketPage() {
  const navigate  = useNavigate()
  const { data, isLoading, error, refetch } = useMarketOverview()

  // Backend-driven watchlist state
  const { data: watchlists } = useBackendWatchlists()
  const { add: addToWatchlist, remove: removeFromWatchlist } = useQuickWatchlist()

  // Derive set of tickers in any watchlist
  const watchlistTickers = useMemo(() => {
    const set = new Set<string>()
    ;(watchlists ?? []).forEach((wl: any) =>
      (wl.tickers ?? []).forEach((t: string) => set.add(t))
    )
    return set
  }, [watchlists])

  const [sortKey, setSortKey] = useState<SortKey>('market_cap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [sector,  setSector]  = useState('All')
  const [search,  setSearch]  = useState('')

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rows = useMemo(() => {
    const items: any[] = data?.items ?? []
    let filtered = items
    if (sector !== 'All') filtered = filtered.filter(r => r.sector === sector)
    if (search) {
      const q = search.toUpperCase()
      filtered = filtered.filter(r =>
        (r.ticker ?? '').includes(q) ||
        (r.company_name ?? '').toUpperCase().includes(q)
      )
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [data, sector, search, sortKey, sortDir])

  const Th = ({ label, col }: { label: string; col: SortKey }) => (
    <th onClick={() => handleSort(col)}
      className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors select-none whitespace-nowrap">
      <span className="flex items-center gap-1.5">
        {label} <SortIcon col={col} current={sortKey} dir={sortDir} />
      </span>
    </th>
  )

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-accent-cyan" />
        <h1 className="font-display font-bold text-xl text-text-primary">Market Overview</h1>
        {rows.length > 0 && (
          <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">
            {rows.length} stocks · 60s refresh
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search ticker or company…" className="input-base max-w-56" />
        <div className="flex items-center gap-1 flex-wrap">
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={s === sector ? 'range-btn-active' : 'range-btn'}>{s}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card p-4 space-y-2">
          {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <ErrorCard message={(error as Error).message} onRetry={refetch} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-bg-border bg-bg-surface/50">
                <tr>
                  <th className="w-10" />
                  <Th label="Ticker"   col="ticker" />
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium">
                    Company
                  </th>
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium hidden md:table-cell">
                    Sector
                  </th>
                  <Th label="Price"    col="price" />
                  <Th label="Change %" col="change_pct" />
                  <Th label="Mkt Cap"  col="market_cap" />
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium hidden lg:table-cell">
                    7D Chart
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const inWl = watchlistTickers.has(row.ticker)
                  const isUp = (row.change_pct ?? 0) >= 0
                  return (
                    <tr key={row.ticker}
                      onClick={() => navigate(`/dashboard/${row.ticker}`)}
                      className="border-b border-bg-border/40 last:border-0 hover:bg-bg-hover cursor-pointer transition-colors">
                      <td className="pl-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            inWl
                              ? removeFromWatchlist.mutate(row.ticker)
                              : addToWatchlist.mutate(row.ticker)
                          }
                          disabled={addToWatchlist.isPending || removeFromWatchlist.isPending}
                          className="p-1 rounded text-text-muted hover:text-accent-amber transition-colors">
                          {inWl
                            ? <Star size={13} fill="currentColor" className="text-accent-amber" />
                            : <StarOff size={13} />}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-text-primary">{row.ticker}</td>
                      <td className="py-3 px-3 text-text-secondary text-xs max-w-36 truncate">{row.company_name ?? '—'}</td>
                      <td className="py-3 px-3 text-text-muted text-xs hidden md:table-cell">{row.sector ?? '—'}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-text-primary tabular-nums">{formatPrice(row.price)}</td>
                      <td className={cn('py-3 px-3 font-mono font-semibold tabular-nums', getPriceClass(row.change_pct))}>
                        <span className="flex items-center gap-1">
                          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {formatPct(row.change_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-text-secondary text-xs tabular-nums">
                        {row.market_cap ? `$${(row.market_cap / 1000).toFixed(0)}B` : '—'}
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                        <Sparkline ticker={row.ticker} isUp={isUp} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="p-10 text-center text-text-muted text-sm">No stocks match your filters</div>
          )}
        </div>
      )}
    </div>
  )
}
