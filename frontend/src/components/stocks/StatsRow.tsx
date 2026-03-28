import { formatPrice, formatVolume, formatMarketCap } from '@/lib/utils'
import type { Quote, BasicFinancials, CompanyProfile, CandlePoint } from '@/types/stock'

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3.5">
      <p className="stat-label mb-1.5">{label}</p>
      <p className="font-mono text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

interface StatsRowProps {
  quote: Quote
  financials?: BasicFinancials
  profile?: CompanyProfile
  lastCandle?: CandlePoint   // used for volume — not available in /quote
}

export function StatsRow({ quote, financials, profile, lastCandle }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <StatCell label="Open"      value={formatPrice(quote.open)} />
      <StatCell label="High"      value={formatPrice(quote.high)} />
      <StatCell label="Low"       value={formatPrice(quote.low)} />
      <StatCell label="Prev Close" value={formatPrice(quote.prev_close)} />
      <StatCell label="Volume"    value={lastCandle ? formatVolume(lastCandle.volume) : '—'} />
      <StatCell label="Mkt Cap"   value={formatMarketCap(profile?.market_cap)} />
    </div>
  )
}

interface WeekRangeBarProps {
  price: number | null
  low52: number | null
  high52: number | null
}

export function WeekRangeBar({ price, low52, high52 }: WeekRangeBarProps) {
  if (!price || !low52 || !high52 || high52 === low52) return null
  const pct = Math.min(100, Math.max(0, ((price - low52) / (high52 - low52)) * 100))

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="stat-label">52-Week Range</p>
        <p className="font-mono text-xs text-text-secondary tabular-nums">
          {Math.round(pct)}th percentile
        </p>
      </div>
      <div className="relative h-1.5 bg-bg-hover rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent-red via-accent-amber to-accent-green rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-text-primary border-2 border-bg-card shadow-lg transition-all duration-500"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="font-mono text-xs text-accent-red">{formatPrice(low52)}</span>
        <span className="font-mono text-xs text-accent-green">{formatPrice(high52)}</span>
      </div>
    </div>
  )
}

export function FinancialGrid({ financials }: { financials: BasicFinancials }) {
  const items = [
    { label: 'P/E Ratio', value: financials.pe_ratio?.toFixed(2) ?? '—' },
    { label: 'EPS',       value: financials.eps != null ? formatPrice(financials.eps) : '—' },
    { label: 'Div Yield', value: financials.dividend_yield != null ? `${financials.dividend_yield.toFixed(2)}%` : '—' },
    { label: '52W High',  value: formatPrice(financials.week_52_high) },
    { label: '52W Low',   value: formatPrice(financials.week_52_low) },
    { label: 'Beta',      value: financials.beta?.toFixed(2) ?? '—' },
  ]
  return (
    <div className="card p-4">
      <p className="stat-label mb-3">Key Metrics</p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
        {items.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">{label}</p>
            <p className="font-mono text-sm font-semibold text-text-primary tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
