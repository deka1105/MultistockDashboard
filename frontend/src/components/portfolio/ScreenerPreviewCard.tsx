import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, ExternalLink, TrendingUp, Briefcase } from 'lucide-react'
import { usePortfolioScreenerPreview } from '@/hooks/useStockData'
import { formatPrice, formatPct, cn } from '@/lib/utils'

interface Props { portfolioId: number }

export default function ScreenerPreviewCard({ portfolioId }: Props) {
  const navigate = useNavigate()
  const { data, isLoading } = usePortfolioScreenerPreview(portfolioId)

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-accent-cyan" />
          <p className="font-display font-semibold text-sm text-text-primary">Stock Screener</p>
          {data && (
            <span className="text-[9px] font-mono text-text-muted bg-bg-hover rounded px-1.5 py-0.5 border border-bg-border">
              {data.total_matches} results match your filters
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.overlap_count > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-accent-amber">
              <Briefcase size={9} />
              {data.overlap_count} in your portfolio
            </span>
          )}
          <button
            onClick={() => navigate('/screener')}
            className="flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-accent-cyan transition-colors">
            Full screener <ExternalLink size={9} />
          </button>
        </div>
      </div>

      {/* Preset badge */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted">Preset:</span>
        <span className="text-[9px] font-mono font-bold text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 rounded px-1.5 py-0.5 flex items-center gap-1">
          <TrendingUp size={8} /> High Momentum
        </span>
      </div>

      {/* Results table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-bg-hover animate-pulse" />
          ))}
        </div>
      ) : !data?.results?.length ? (
        <div className="text-center py-6">
          <p className="text-[10px] text-text-muted font-mono">No results match current filters</p>
          <button onClick={() => navigate('/screener')}
            className="text-[10px] font-mono text-accent-cyan hover:underline mt-1">
            Open full screener →
          </button>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0 px-2.5 text-[9px] font-mono text-text-muted uppercase tracking-wider">
            <span>Ticker</span>
            <span className="text-right">Price</span>
            <span className="text-right">Today</span>
          </div>

          <div className="space-y-1">
            {data.results.map((row: any) => (
              <button
                key={row.ticker}
                onClick={() => navigate(`/dashboard/${row.ticker}`)}
                className={cn(
                  'w-full grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-2.5 py-2 rounded-lg border transition-all text-left',
                  row.in_portfolio
                    ? 'bg-accent-cyan/5 border-accent-cyan/20 hover:bg-accent-cyan/10'
                    : 'bg-bg-hover border-bg-border hover:border-accent-cyan/20'
                )}>
                {/* Ticker */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {row.in_portfolio && (
                    <Briefcase size={9} className="text-accent-cyan shrink-0" />
                  )}
                  <span className="font-mono font-bold text-xs text-text-primary truncate">{row.ticker}</span>
                </div>

                {/* Price */}
                <span className="font-mono text-xs text-text-primary text-right">
                  {row.price ? formatPrice(row.price) : '—'}
                </span>

                {/* Change */}
                <span className={cn(
                  'font-mono text-xs font-semibold text-right',
                  row.change_pct > 0 ? 'text-accent-green' : row.change_pct < 0 ? 'text-accent-red' : 'text-text-muted'
                )}>
                  {row.change_pct != null ? formatPct(row.change_pct) : '—'}
                </span>
              </button>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] font-mono text-text-muted">
              Showing top 5 of {data.total_matches} results
            </span>
            <button
              onClick={() => navigate('/screener')}
              className="text-[9px] font-mono text-accent-cyan hover:underline flex items-center gap-1">
              Run full screener <ExternalLink size={8} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
