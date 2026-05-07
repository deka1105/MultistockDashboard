import { TrendingUp, TrendingDown, DollarSign, Activity, Zap } from 'lucide-react'
import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'
import type { PortfolioSummary } from '@/types/stock'

interface KpiCardProps {
  label: string
  value: string
  sub: string
  subClass?: string
  accent: 'green' | 'red' | 'cyan' | 'amber' | 'purple'
  icon: React.ReactNode
  sparkline?: number[]
}

const ACCENT = {
  green:  { bar: 'via-accent-green/40',  badge: 'bg-accent-green/10 border-accent-green/20 text-accent-green' },
  red:    { bar: 'via-accent-red/40',    badge: 'bg-accent-red/10 border-accent-red/20 text-accent-red' },
  cyan:   { bar: 'via-accent-cyan/40',   badge: 'bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan' },
  amber:  { bar: 'via-accent-amber/40',  badge: 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber' },
  purple: { bar: 'via-purple-500/40',    badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 100, h = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  )
}

function KpiCard({ label, value, sub, subClass, accent, icon, sparkline }: KpiCardProps) {
  const a = ACCENT[accent]
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className={cn('absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent', a.bar)} />
      <div className="flex items-start justify-between mb-2">
        <span className="stat-label">{label}</span>
        <div className={cn('p-1.5 rounded-lg', `${a.badge} bg-opacity-50`)}>{icon}</div>
      </div>
      <div className="font-mono text-2xl font-semibold text-text-primary tracking-tight">{value}</div>
      <div className={cn('text-xs font-mono mt-1', subClass ?? 'text-text-muted')}>{sub}</div>
      {sparkline && (
        <MiniSparkline
          values={sparkline}
          color={accent === 'green' ? '#00ff88' : accent === 'red' ? '#ff3b5c' : '#00c4ff'}
        />
      )}
    </div>
  )
}

interface Props {
  summary: PortfolioSummary
  sparklineData?: number[]
}

export default function PortfolioSummaryCards({ summary, sparklineData }: Props) {
  const pnlUp   = summary.total_pnl >= 0
  const todayUp = summary.today_pnl >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard
        label="Portfolio Value"
        value={formatPrice(summary.total_value)}
        sub={`${summary.positions.length} position${summary.positions.length !== 1 ? 's' : ''}`}
        accent="cyan"
        icon={<DollarSign size={13} />}
        sparkline={sparklineData}
      />
      <KpiCard
        label="Total P&L"
        value={(pnlUp ? '+' : '') + formatPrice(summary.total_pnl).replace('$', '') + ' $'}
        sub={`${pnlUp ? '▲' : '▼'} ${formatPct(summary.total_pnl_pct)} vs cost basis`}
        subClass={getPriceClass(summary.total_pnl)}
        accent={pnlUp ? 'green' : 'red'}
        icon={pnlUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      />
      <KpiCard
        label="Today's P&L"
        value={(todayUp ? '+' : '') + formatPrice(Math.abs(summary.today_pnl)).replace('$', '') + ' $'}
        sub={`${todayUp ? '▲' : '▼'} ${formatPct(summary.today_pnl_pct)} today`}
        subClass={getPriceClass(summary.today_pnl)}
        accent={todayUp ? 'green' : 'red'}
        icon={<Activity size={13} />}
      />
      <KpiCard
        label="Best Performer"
        value={summary.best_performer?.ticker ?? '—'}
        sub={summary.best_performer ? `${formatPct(summary.best_performer.pnl_pct)} total return` : 'no positions'}
        subClass="text-accent-green"
        accent="green"
        icon={<TrendingUp size={13} />}
      />
      <KpiCard
        label="Portfolio Beta"
        value={summary.beta != null ? summary.beta.toFixed(2) : '—'}
        sub={
          summary.beta == null ? 'vs S&P 500'
          : summary.beta > 1.2 ? 'high volatility vs market'
          : summary.beta < 0.8 ? 'low volatility vs market'
          : 'similar to market'
        }
        subClass={
          summary.beta == null ? 'text-text-muted'
          : summary.beta > 1.2 ? 'text-accent-amber'
          : 'text-text-muted'
        }
        accent={summary.beta != null && summary.beta > 1.2 ? 'amber' : 'purple'}
        icon={<Zap size={13} />}
      />
    </div>
  )
}
