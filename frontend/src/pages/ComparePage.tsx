import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GitCompare, Download } from 'lucide-react'
import { useCompare } from '@/hooks/useStockData'
import { useAppStore } from '@/store/useAppStore'
import TickerChipInput from '@/components/compare/TickerChipInput'
import CompareChart from '@/components/compare/CompareChart'
import CorrelationMatrix from '@/components/compare/CorrelationMatrix'
import SP500CorrelationHeatmap from '@/components/compare/SP500CorrelationHeatmap'
import CompareSummaryTable from '@/components/compare/CompareSummaryTable'
import { ChartSkeleton } from '@/components/common/Skeleton'
import { ErrorCard } from '@/components/common/ErrorBoundary'
import { cn } from '@/lib/utils'
import type { TimeRange } from '@/types/stock'

const RANGES: TimeRange[] = ['1W', '1M', '3M', '1Y', '5Y']

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'NVDA']

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { watchlist } = useAppStore()

  const initialTickers = searchParams.get('tickers')?.split(',').filter(Boolean) ?? DEFAULT_TICKERS
  const [tickers, setTickers] = useState<string[]>(initialTickers)
  const [range, setRange] = useState<TimeRange>('3M')

  // Sync tickers to URL
  useEffect(() => {
    if (tickers.length > 0)
      setSearchParams({ tickers: tickers.join(',') }, { replace: true })
  }, [tickers])

  const { data, isLoading, error, refetch } = useCompare(tickers, range)

  const handleExport = () => {
    const el = document.getElementById('compare-chart-area')
    if (!el) return
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(el, { backgroundColor: '#080b12' }).then(canvas => {
        const a = document.createElement('a')
        a.download = `compare-${tickers.join('-')}-${range}.png`
        a.href = canvas.toDataURL()
        a.click()
      })
    }).catch(() => alert('html2canvas not installed. Run: npm i html2canvas'))
  }

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare size={18} className="text-accent-cyan" />
          <h1 className="font-display font-bold text-xl text-text-primary">Compare</h1>
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-1.5 text-xs">
          <Download size={13} /> Export PNG
        </button>
      </div>

      {/* Controls */}
      <div className="card p-4 space-y-3">
        <TickerChipInput tickers={tickers} onChange={setTickers} max={8} />

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Range:</span>
          <div className="flex items-center gap-1">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={range === r ? 'range-btn-active' : 'range-btn'}>
                {r}
              </button>
            ))}
          </div>

          {/* Add watchlist shortcut */}
          {watchlist.length > 0 && (
            <button
              onClick={() => setTickers(watchlist.slice(0, 8))}
              className="ml-auto btn-ghost text-xs"
            >
              Load Watchlist
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {tickers.length < 2 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <GitCompare size={28} className="text-text-muted" />
          <p className="text-text-secondary text-sm">Add at least 2 tickers to compare</p>
        </div>
      ) : isLoading ? (
        <ChartSkeleton />
      ) : error ? (
        <ErrorCard message={(error as Error).message} onRetry={refetch} />
      ) : isError ? (
        <div className="card p-8 text-center">
          <p className="text-text-primary font-semibold mb-2">Failed to load comparison data</p>
          <button onClick={() => refetch()} className="btn-primary text-sm">Retry</button>
        </div>
      ) : data?.series?.length ? (
        <div className="space-y-4">
          <div id="compare-chart-area" className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-text-primary">
                Normalized % Return — {range}
              </p>
              <p className="text-xs text-text-muted font-mono">Base = 0% at period start</p>
            </div>
            <CompareChart data={data} />
          </div>
          <CompareSummaryTable data={data} />
          <CorrelationMatrix data={data} />

          {/* Full S&P 50 correlation heatmap */}
          <div className="card p-4">
            <SP500CorrelationHeatmap condensed={false} />
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center text-text-muted text-sm">No data returned for selected tickers</div>
      )}
    </div>
  )
}
