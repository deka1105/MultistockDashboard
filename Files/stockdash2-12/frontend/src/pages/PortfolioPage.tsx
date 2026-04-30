import { useState, useEffect } from 'react'
import { Briefcase, Plus, FolderPlus, Trash2, RefreshCw } from 'lucide-react'
import {
  usePortfolios, usePortfolioSummary, usePortfolioHistory,
  useCreatePortfolio, useDeletePortfolio,
} from '@/hooks/useStockData'
import PortfolioSummaryCards from '@/components/portfolio/PortfolioSummaryCards'
import BenchmarkChart        from '@/components/portfolio/BenchmarkChart'
import AllocationDonut       from '@/components/portfolio/AllocationDonut'
import HoldingsTable         from '@/components/portfolio/HoldingsTable'
import DailyPnLCalendar      from '@/components/portfolio/DailyPnLCalendar'
import PnLBarChart           from '@/components/portfolio/PnLBarChart'
import AddPositionModal      from '@/components/portfolio/AddPositionModal'
import { Skeleton }          from '@/components/common/Skeleton'
import { ErrorCard }         from '@/components/common/ErrorBoundary'
import { cn }                from '@/lib/utils'

export default function PortfolioPage() {
  const { data: portfolios, isLoading: loadingList } = usePortfolios()
  const createPortfolio = useCreatePortfolio()
  const deletePortfolio = useDeletePortfolio()

  const [activeId,      setActiveId]      = useState<number | null>(null)
  const [showAddPos,    setShowAddPos]    = useState(false)
  const [initialised,   setInitialised]   = useState(false)

  // Set first portfolio active on load, auto-create if none exists
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

  // Build sparkline from snapshots
  const sparkline = historyData?.snapshots?.map((s: any) => s.total_value) ?? []

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

  return (
    <div className="space-y-5 animate-slide-up max-w-screen-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-accent-cyan" />
          <h1 className="font-display font-bold text-xl text-text-primary">Portfolio</h1>
        </div>

        {/* Portfolio tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {(portfolios ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center group">
              <button
                onClick={() => setActiveId(p.id)}
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
          <button onClick={handleNewPortfolio}
            className="btn-ghost flex items-center gap-1 text-xs px-2 py-1.5">
            <FolderPlus size={13} /> New
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setShowAddPos(true)}
            disabled={!activeId}
            className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={13} /> Add Position
          </button>
        </div>
      </div>

      {/* ── Error state ── */}
      {isError && (
        <ErrorCard message="Failed to load portfolio data" onRetry={refetch} />
      )}

      {/* ── KPI Summary Cards ── */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : summary ? (
        <PortfolioSummaryCards summary={summary} sparklineData={sparkline} />
      ) : null}

      {/* ── Main chart row: Benchmark + Donut ── */}
      {summary && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <BenchmarkChart positions={summary.positions} />
          </div>
          <div className="xl:col-span-1">
            <AllocationDonut positions={summary.positions} totalValue={summary.total_value} />
          </div>
        </div>
      )}

      {/* ── Holdings table ── */}
      {activeId && summary && (
        <HoldingsTable portfolioId={activeId} positions={summary.positions} />
      )}

      {/* ── Bottom row: P&L bar + Calendar ── */}
      {summary && summary.positions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PnLBarChart positions={summary.positions} />
          <DailyPnLCalendar snapshots={historyData?.snapshots ?? []} />
        </div>
      )}

      {/* ── Empty state ── */}
      {summary && summary.positions.length === 0 && !loadingSummary && (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Briefcase size={36} className="text-text-muted" />
          <div>
            <p className="text-text-primary font-semibold mb-1">No positions yet</p>
            <p className="text-text-muted text-sm max-w-xs">
              Add your first holding to start tracking your portfolio's P&L, allocation, and performance vs the market.
            </p>
          </div>
          <button onClick={() => setShowAddPos(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Add First Position
          </button>
        </div>
      )}

      {/* ── Add Position Modal ── */}
      {showAddPos && activeId && (
        <AddPositionModal
          portfolioId={activeId}
          onClose={() => setShowAddPos(false)}
        />
      )}
    </div>
  )
}
