import { useState, useEffect, useMemo } from 'react'
import { Briefcase, Plus, FolderPlus, Trash2, RefreshCw, ChevronDown } from 'lucide-react'
import {
  usePortfolios, usePortfolioSummary, usePortfolioHistory,
  useCreatePortfolio, useDeletePortfolio, useCandles, useCompare,
} from '@/hooks/useStockData'
import PortfolioSummaryCards  from '@/components/portfolio/PortfolioSummaryCards'
import BenchmarkChart          from '@/components/portfolio/BenchmarkChart'
import AllocationDonut         from '@/components/portfolio/AllocationDonut'
import HoldingsTable           from '@/components/portfolio/HoldingsTable'
import DailyPnLCalendar        from '@/components/portfolio/DailyPnLCalendar'
import PnLBarChart             from '@/components/portfolio/PnLBarChart'
import AddPositionModal        from '@/components/portfolio/AddPositionModal'
import EarningsCalendarMini    from '@/components/portfolio/EarningsCalendarMini'
import AlertsSummaryCard       from '@/components/portfolio/AlertsSummaryCard'
import ScreenerPreviewCard     from '@/components/portfolio/ScreenerPreviewCard'
import RSIPanel                from '@/components/indicators/RSIPanel'
import MACDPanel               from '@/components/indicators/MACDPanel'
import SectorHeatmap           from '@/components/market/SectorHeatmap'
import CorrelationMatrix       from '@/components/compare/CorrelationMatrix'
import { Skeleton }            from '@/components/common/Skeleton'
import { ErrorCard }           from '@/components/common/ErrorBoundary'
import { cn }                  from '@/lib/utils'

export default function PortfolioPage() {
  const { data: portfolios, isLoading: loadingList } = usePortfolios()
  const createPortfolio = useCreatePortfolio()
  const deletePortfolio = useDeletePortfolio()

  const [activeId,      setActiveId]      = useState<number | null>(null)
  const [showAddPos,    setShowAddPos]    = useState(false)
  const [initialised,   setInitialised]   = useState(false)
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null)
  const [tickerMenuOpen, setTickerMenuOpen] = useState(false)

  // Listen for TopBar "Export CSV" dispatch
  useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent).detail?.page
      if (page !== 'portfolio') return
      // Find summary positions and export
      const positions = summary?.positions ?? []
      if (!positions.length) return
      const headers = ['Ticker','Company','Shares','Avg Cost','Current Price','Value','P&L $','P&L %','Today %','Weight %']
      const rows = positions.map((p: any) => [
        p.ticker, p.company_name ?? '', p.shares, p.avg_cost,
        p.current_price, p.value?.toFixed(2), p.pnl?.toFixed(2),
        p.pnl_pct?.toFixed(2), p.today_pct?.toFixed(2), p.weight_pct?.toFixed(2),
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url
      a.download = `portfolio-${activeId ?? 'holdings'}.csv`; a.click()
      URL.revokeObjectURL(url)
    }
    window.addEventListener('stockdash:export-csv', handler)
    return () => window.removeEventListener('stockdash:export-csv', handler)
  }, [summary, activeId])

  useEffect(() => {
    if (loadingList || initialised) return
    setInitialised(true)
    if (portfolios && portfolios.length > 0) {
      setActiveId(portfolios[0].id)
    } else {
      createPortfolio.mutate('My Portfolio', {
        onSuccess: (data: any) => setActiveId(data.id),
      })
    }
  }, [loadingList, portfolios, initialised])

  const {
    data: summary,
    isLoading: loadingSummary,
    isError,
    refetch,
  } = usePortfolioSummary(activeId)

  const { data: historyData } = usePortfolioHistory(activeId)
  const sparkline = historyData?.snapshots?.map((s: any) => s.total_value) ?? []

  // Set focusedTicker to best performer when summary loads
  useEffect(() => {
    if (!summary?.positions?.length || focusedTicker) return
    const best = [...summary.positions].sort(
      (a: any, b: any) => (b.pnl_pct ?? 0) - (a.pnl_pct ?? 0)
    )[0]
    if (best) setFocusedTicker(best.ticker)
  }, [summary])

  const positions   = summary?.positions ?? []
  const heldTickers = useMemo(() => positions.map((p: any) => p.ticker), [positions])
  const effectiveTicker = focusedTicker ?? heldTickers[0] ?? 'AAPL'

  // Candle data for RSI + MACD panels
  const { data: candlesData } = useCandles(effectiveTicker, '3M')
  const candles = candlesData?.candles ?? []

  // Compare data for CorrelationMatrix
  const compareTickers = heldTickers.slice(0, 8)
  const { data: compareData } = useCompare(compareTickers, '3M')

  const handleNewPortfolio = () => {
    const name = `Portfolio ${(portfolios?.length ?? 0) + 1}`
    createPortfolio.mutate(name, {
      onSuccess: (data: any) => setActiveId(data.id),
    })
  }

  const handleDeletePortfolio = (id: number) => {
    if (!confirm('Delete this portfolio and all positions?')) return
    const remaining = (portfolios ?? []).filter((p: any) => p.id !== id)
    deletePortfolio.mutate(id, {
      onSuccess: () => setActiveId(remaining[0]?.id ?? null),
    })
  }

  if (loadingList || createPortfolio.isPending) {
    return (
      <div className="space-y-4 max-w-screen-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const hasPositions = positions.length > 0

  return (
    <div className="space-y-5 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-accent-cyan" />
          <h1 className="font-display font-bold text-xl text-text-primary">Portfolio Overview</h1>
          {hasPositions && (
            <span className="text-[10px] font-mono text-text-muted">
              {positions.length} positions · Last updated just now
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(portfolios ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center group">
              <button
                onClick={() => { setActiveId(p.id); setFocusedTicker(null) }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeId === p.id
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}>
                {p.name}
              </button>
              {(portfolios?.length ?? 0) > 1 && activeId === p.id && (
                <button
                  onClick={() => handleDeletePortfolio(p.id)}
                  className="ml-0.5 p-1 rounded text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ))}
          <button onClick={handleNewPortfolio} className="btn-ghost flex items-center gap-1 text-xs px-2 py-1.5">
            <FolderPlus size={13} /> New
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setShowAddPos(true)} disabled={!activeId} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={13} /> Add Position
          </button>
        </div>
      </div>

      {isError && <ErrorCard message="Failed to load portfolio data" onRetry={refetch} />}

      {/* KPI Summary Cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : summary ? (
        <PortfolioSummaryCards summary={summary} sparklineData={sparkline} />
      ) : null}

      {/* Benchmark chart + Allocation donut */}
      {summary && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2"><BenchmarkChart positions={summary.positions} /></div>
          <div className="xl:col-span-1"><AllocationDonut positions={summary.positions} totalValue={summary.total_value} /></div>
        </div>
      )}

      {/* Holdings table */}
      {activeId && summary && (
        <HoldingsTable
          portfolioId={activeId}
          positions={summary.positions}
          focusedTicker={focusedTicker}
          onFocusTicker={setFocusedTicker}
        />
      )}

      {/* Analysis Command Centre */}
      {hasPositions && activeId && (
        <>
          {/* Focused ticker selector */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-bg-border" />
            <div className="relative">
              <button
                onClick={() => setTickerMenuOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-bg-border bg-bg-card text-xs font-mono hover:border-accent-cyan/30 transition-colors">
                <span className="text-text-muted">Analysing:</span>
                <span className="font-bold text-accent-cyan">{effectiveTicker}</span>
                <ChevronDown size={11} className={cn('text-text-muted transition-transform', tickerMenuOpen && 'rotate-180')} />
              </button>
              {tickerMenuOpen && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-bg-card border border-bg-border rounded-xl shadow-2xl shadow-black/40 py-1 min-w-[120px]">
                  {heldTickers.map((t: string) => (
                    <button key={t} onClick={() => { setFocusedTicker(t); setTickerMenuOpen(false) }}
                      className={cn('w-full text-left px-3 py-1.5 text-xs font-mono transition-colors',
                        t === effectiveTicker ? 'text-accent-cyan bg-accent-cyan/5' : 'text-text-secondary hover:bg-bg-hover'
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="h-px flex-1 bg-bg-border" />
          </div>

          {/* Analysis Row 1: Sector Heatmap · RSI · MACD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sector Heatmap compact */}
            <div className="card p-4 flex flex-col gap-2 min-h-[220px]">
              <p className="font-display font-semibold text-sm text-text-primary shrink-0">Sector Heatmap
                <span className="ml-2 text-[9px] font-mono text-text-muted font-normal">S&P 500 · today</span>
              </p>
              <div className="flex-1 overflow-hidden">
                <SectorHeatmap compact />
              </div>
            </div>

            {/* RSI */}
            <div className="card p-4 flex flex-col gap-2 min-h-[220px]">
              <div>
                <p className="font-display font-semibold text-sm text-text-primary">
                  RSI (14) — <span className="text-accent-cyan">{effectiveTicker}</span>
                </p>
                <p className="text-[9px] font-mono text-text-muted">Relative Strength Index · 3Mo</p>
              </div>
              {candles.length >= 15
                ? <RSIPanel candles={candles} compact />
                : <div className="flex-1 flex items-center justify-center"><p className="text-[10px] text-text-muted font-mono">Loading…</p></div>
              }
            </div>

            {/* MACD */}
            <div className="card p-4 flex flex-col gap-2 min-h-[220px]">
              <div>
                <p className="font-display font-semibold text-sm text-text-primary">
                  MACD (12,26,9) — <span className="text-accent-cyan">{effectiveTicker}</span>
                </p>
                <p className="text-[9px] font-mono text-text-muted">Momentum Oscillator</p>
              </div>
              {candles.length >= 27
                ? <MACDPanel candles={candles} compact />
                : <div className="flex-1 flex items-center justify-center"><p className="text-[10px] text-text-muted font-mono">Loading…</p></div>
              }
            </div>
          </div>

          {/* Analysis Row 2: Earnings · Correlation · Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EarningsCalendarMini portfolioId={activeId} />

            {/* Correlation Matrix */}
            <div className="card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-sm text-text-primary">Correlation Matrix</p>
                <span className="text-[9px] font-mono text-text-muted">30-day Pearson r</span>
              </div>
              {compareData
                ? <CorrelationMatrix data={compareData} />
                : compareTickers.length < 2
                ? <p className="text-[10px] text-text-muted font-mono text-center py-8">Add 2+ positions to see correlations</p>
                : <div className="h-32 bg-bg-hover rounded animate-pulse" />
              }
            </div>

            <AlertsSummaryCard portfolioId={activeId} />
          </div>

          {/* Screener Preview */}
          <ScreenerPreviewCard portfolioId={activeId} />
        </>
      )}

      {/* Daily P&L Calendar */}
      {summary && hasPositions && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-bg-border" />
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Daily P&L — 30 Day Calendar</span>
            <span className="text-[9px] font-mono text-text-muted">Portfolio performance heatmap</span>
            <div className="h-px flex-1 bg-bg-border" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <PnLBarChart positions={summary.positions} />
            <DailyPnLCalendar snapshots={historyData?.snapshots ?? []} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {summary && !hasPositions && !loadingSummary && (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Briefcase size={36} className="text-text-muted" />
          <div>
            <p className="text-text-primary font-semibold mb-1">No positions yet</p>
            <p className="text-text-muted text-sm max-w-xs">Add your first holding to start tracking your portfolio's P&L, allocation, and performance vs the market.</p>
          </div>
          <button onClick={() => setShowAddPos(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Add First Position
          </button>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPos && activeId && (
        <AddPositionModal portfolioId={activeId} onClose={() => setShowAddPos(false)} />
      )}
    </div>
  )
}
