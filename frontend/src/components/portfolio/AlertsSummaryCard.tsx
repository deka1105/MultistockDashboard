import { useNavigate } from 'react-router-dom'
import { Bell, Plus, ExternalLink, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { usePortfolioAlerts } from '@/hooks/useStockData'
import { formatPrice, cn } from '@/lib/utils'

interface Props { portfolioId: number }

function AlertBadge({ type, threshold, ticker }: { type: string; threshold: number | null; ticker: string }) {
  const labels: Record<string, string> = {
    price_above:  `↑ Above ${threshold ? formatPrice(threshold) : '—'}`,
    price_below:  `↓ Below ${threshold ? formatPrice(threshold) : '—'}`,
    pct_move_day: `±${threshold ?? '—'}% Day`,
    rsi_below:    `RSI < ${threshold ?? '—'}`,
    rsi_above:    `RSI > ${threshold ?? '—'}`,
    ma_cross_above: 'MA50 Cross ↑',
  }
  return (
    <span className="text-[9px] font-mono text-text-muted">
      {labels[type] ?? type}
    </span>
  )
}

export default function AlertsSummaryCard({ portfolioId }: Props) {
  const navigate = useNavigate()
  const { data, isLoading } = usePortfolioAlerts(portfolioId)

  const active    = data?.active    ?? []
  const triggered = data?.triggered ?? []

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-accent-red" />
          <p className="font-display font-semibold text-sm text-text-primary">Price Alerts</p>
          {active.length > 0 && (
            <span className="text-[9px] font-mono text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 rounded px-1.5 py-0.5">
              {active.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/alerts')}
            className="flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-accent-cyan transition-colors">
            All alerts <ExternalLink size={9} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-bg-hover animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Active alerts */}
          {active.length === 0 && triggered.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <Bell size={20} className="text-text-muted mx-auto" />
              <p className="text-[10px] text-text-muted font-mono">No alerts for your holdings</p>
              <button
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-1 mx-auto text-[10px] font-mono text-accent-cyan hover:text-accent-cyan/80 transition-colors">
                <Plus size={10} /> Create an alert
              </button>
            </div>
          ) : (
            <>
              {active.map((alert: any) => {
                // Determine proximity colour
                const proximityPct = alert.proximity_pct ?? null
                const proximityColor = proximityPct != null
                  ? proximityPct < 2  ? 'text-accent-red'
                  : proximityPct < 5  ? 'text-accent-amber'
                  : 'text-text-muted'
                  : 'text-text-muted'

                return (
                  <div key={alert.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-bg-hover border border-bg-border hover:border-accent-cyan/20 transition-colors group">
                    {/* Ticker */}
                    <button
                      onClick={() => navigate(`/dashboard/${alert.ticker}`)}
                      className="font-mono font-bold text-xs text-text-primary group-hover:text-accent-cyan transition-colors w-12 shrink-0">
                      {alert.ticker}
                    </button>
                    {/* Alert type + threshold */}
                    <div className="flex-1 min-w-0">
                      <AlertBadge type={alert.alert_type} threshold={alert.threshold} ticker={alert.ticker} />
                    </div>
                    {/* Proximity + badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {proximityPct != null && (
                        <span className={cn('text-[9px] font-mono', proximityColor)}>
                          {proximityPct.toFixed(1)}% away
                        </span>
                      )}
                      <span className={cn(
                        'text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border',
                        proximityPct != null && proximityPct < 2
                          ? 'bg-accent-red/10 text-accent-red border-accent-red/20'
                          : proximityPct != null && proximityPct < 5
                          ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/20'
                          : 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                      )}>
                        {proximityPct != null && proximityPct < 2 ? 'NEAR' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Recent triggers section */}
              {triggered.length > 0 && (
                <>
                  <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mt-1 mb-0.5">
                    Recent Triggers
                  </p>
                  {triggered.slice(0, 3).map((alert: any) => {
                    const triggeredAt = alert.triggered_at
                      ? new Date(alert.triggered_at)
                      : null
                    const timeAgo = triggeredAt
                      ? (() => {
                          const mins = Math.floor((Date.now() - triggeredAt.getTime()) / 60000)
                          if (mins < 60) return `${mins}m ago`
                          const hrs = Math.floor(mins / 60)
                          if (hrs < 24) return `${hrs}h ago`
                          return `${Math.floor(hrs / 24)}d ago`
                        })()
                      : ''

                    return (
                      <div key={alert.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent-green/5 border border-accent-green/15">
                        <CheckCircle size={11} className="text-accent-green shrink-0" />
                        <button
                          onClick={() => navigate(`/dashboard/${alert.ticker}`)}
                          className="font-mono font-bold text-xs text-text-primary hover:text-accent-cyan transition-colors w-12 shrink-0">
                          {alert.ticker}
                        </button>
                        <div className="flex-1 min-w-0">
                          <AlertBadge type={alert.alert_type} threshold={alert.threshold} ticker={alert.ticker} />
                        </div>
                        {alert.triggered_price && (
                          <span className="text-[9px] font-mono text-accent-green shrink-0">
                            @ {formatPrice(alert.triggered_price)}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-text-muted shrink-0">{timeAgo}</span>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Add more */}
              <button
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-accent-cyan transition-colors mt-0.5">
                <Plus size={10} /> New alert
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
