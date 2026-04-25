import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ArrowUpDown, ArrowUp, ArrowDown, Star, StarOff, TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useMarketOverview } from '@/hooks/useStockData'
import { useAppStore } from '@/store/useAppStore'
import { formatPrice, formatPct, formatMarketCap, getPriceClass, cn } from '@/lib/utils'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorCard } from '@/components/common/ErrorBoundary'

type SortKey = 'ticker' | 'price' | 'change_pct' | 'market_cap'
type SortDir = 'asc' | 'desc'

const SECTORS = ['All', 'Technology', 'Financial Services', 'Consumer Cyclical',
  'Communication', 'Healthcare', 'Energy', 'Industrials']

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: SortDir }) {
  if (col !== current) return <ArrowUpDown size={11} className="text-text-muted opacity-40" />
  return dir === 'asc'
    ? <ArrowUp size={11} className="text-accent-cyan" />
    : <ArrowDown size={11} className="text-accent-cyan" />
}

export default function MarketPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useMarketOverview()
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useAppStore()
  const [sortKey, setSortKey] = useState<SortKey>('market_cap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [sector, setSector] = useState('All')
  const [search, setSearch] = useState('')

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rows = useMemo(() => {
    if (!data?.items) return []
    let items = [...data.items]
    if (sector !== 'All') items = items.filter(r => r.sector === sector)
    if (search) {
      const q = search.toUpperCase()
      items = items.filter(r => r.ticker?.includes(q) || r.company_name?.toUpperCase().includes(q))
    }
    items.sort((a, b) => {
      let av: any = a[sortKey], bv: any = b[sortKey]
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return items
  }, [data, sector, search, sortKey, sortDir])

  const ThCell = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <SortIcon col={col} current={sortKey} dir={sortDir} />
      </span>
    </th>
  )

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-accent-cyan" />
        <h1 className="font-display font-bold text-xl text-text-primary">Market Overview</h1>
        {data && (
          <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">
            {rows.length} stocks · refreshes every 60s
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ticker or company…"
          className="input-base max-w-56"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={s === sector ? 'range-btn-active' : 'range-btn'}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-4 space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : error ? (
        <ErrorCard message={(error as Error).message} onRetry={refetch} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-bg-border bg-bg-surface/50">
                <tr>
                  <th className="w-8" />
                  <ThCell label="Ticker" col="ticker" />
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium">Company</th>
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium hidden md:table-cell">Sector</th>
                  <ThCell label="Price" col="price" />
                  <ThCell label="Change %" col="change_pct" />
                  <ThCell label="Mkt Cap" col="market_cap" />
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-text-muted font-medium hidden lg:table-cell">Trend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const inWl = isInWatchlist(row.ticker)
                  return (
                    <tr
                      key={row.ticker}
                      className="border-b border-bg-border/40 last:border-0 hover:bg-bg-hover cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/${row.ticker}`)}
                    >
                      {/* Watchlist star */}
                      <td className="pl-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => inWl ? removeFromWatchlist(row.ticker) : addToWatchlist(row.ticker)}
                          className="p-1 rounded text-text-muted hover:text-accent-amber transition-colors"
                        >
                          {inWl
                            ? <Star size={13} fill="currentColor" className="text-accent-amber" />
                            : <StarOff size={13} />}
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-text-primary">{row.ticker}</span>
                      </td>

                      <td className="py-3 px-3 text-text-secondary text-xs truncate max-w-40">
                        {row.company_name ?? '—'}
                      </td>

                      <td className="py-3 px-3 text-text-muted text-xs hidden md:table-cell">
                        {row.sector ?? '—'}
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-text-primary tabular-nums">
                        {formatPrice(row.price)}
                      </td>

                      <td className={cn('py-3 px-3 font-mono font-semibold tabular-nums', getPriceClass(row.change_pct))}>
                        <span className="flex items-center gap-1">
                          {(row.change_pct ?? 0) >= 0
                            ? <TrendingUp size={11} />
                            : <ArrowDown size={11} />}
                          {formatPct(row.change_pct)}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-text-secondary tabular-nums text-xs">
                        {formatMarketCap(row.market_cap)}
                      </td>

                      {/* Mini trend bar */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 rounded-full bg-bg-hover overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', (row.change_pct ?? 0) >= 0 ? 'bg-accent-green' : 'bg-accent-red')}
                              style={{ width: `${Math.min(100, Math.abs(row.change_pct ?? 0) * 10)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="p-8 text-center text-text-muted text-sm">No stocks match your filters</div>
          )}
        </div>
      )}
    </div>
  )
}
