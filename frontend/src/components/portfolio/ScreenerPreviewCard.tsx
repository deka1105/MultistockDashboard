import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, ExternalLink, TrendingUp, Briefcase } from 'lucide-react'
import { usePortfolioScreenerPreview, useScreenerPresets } from '@/hooks/useStockData'
import { formatPrice, formatPct, cn } from '@/lib/utils'

interface Props { portfolioId: number }

const SIGNAL_COLORS: Record<string, string> = {
  strong_buy: 'bg-accent-green/15 text-accent-green border-accent-green/25',
  buy:        'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  hold:       'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  sell:       'bg-accent-red/10 text-accent-red border-accent-red/20',
}

const SIGNAL_LABELS: Record<string, string> = {
  strong_buy: 'Strong Buy',
  buy:        'Buy',
  hold:       'Hold',
  sell:       'Sell',
}

function RsiBadge({ rsi }: { rsi: number | null }) {
  if (rsi == null) return <span className="text-text-muted font-mono text-xs">—</span>
  const color = rsi >= 70 ? 'bg-accent-red/15 text-accent-red'
    : rsi <= 30 ? 'bg-accent-green/15 text-accent-green'
    : 'bg-bg-hover text-text-secondary'
  return (
    <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', color)}>
      {Math.round(rsi)}
    </span>
  )
}

export default function ScreenerPreviewCard({ portfolioId }: Props) {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = usePortfolioScreenerPreview(portfolioId)

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
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 gap-y-0 px-2 text-[9px] font-mono text-text-muted uppercase tracking-wider">
            <span>Ticker</span>
            <span>Company</span>
            <span className="text-right">Price</span>
            <span className="text-right">Today</span>
            <span className="text-right">Signal</span>
          </div>

          <div className="space-y-1">
            {data.results.map((row: any) => (
              <button
                key={row.ticker}
                onClick={() => navigate(`/dashboard/${row.ticker}`)}
                className={cn(
                  'w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-2.5 py-2 rounded-lg border transition-all text-left',
                  row.in_portfolio
                    ? 'bg-accent-cyan/5 border-accent-cyan/20 hover:bg-accent-cyan/10'
                    : 'bg-bg-hover border-bg-border hover:border-accent-cyan/20'
                )}>
                {/* Ticker */}
                <div className="flex items-center gap-1.5">
                  {row.in_portfolio && (
                    <Briefcase size={9} className="text-accent-cyan shrink-0" />
                  )}
                  <span className="font-mono font-bold text-xs text-text-primary">{row.ticker}</span>
                </div>

                {/* Company */}
                <span className="font-mono text-[10px] text-text-muted truncate">
                  {row.company_name ?? row.ticker}
                </span>

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

                {/* Signal */}
                {row.signal ? (
                  <span className={cn(
                    'text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border text-right',
                    SIGNAL_COLORS[row.signal] ?? 'bg-bg-hover text-text-muted border-bg-border'
                  )}>
                    {SIGNAL_LABELS[row.signal] ?? row.signal}
                  </span>
                ) : (
                  <span className="text-text-muted text-[10px] font-mono text-right">—</span>
                )}
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
