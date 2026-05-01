import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'
import type { CompareResponse } from '@/types/stock'

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)
}

export default function CompareSummaryTable({ data }: { data: CompareResponse }) {
  return (
    <div className="card p-4">
      <p className="stat-label mb-3">Summary</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bg-border">
              {['Ticker', 'Start', 'End', 'Return', 'Volatility'].map(h => (
                <th key={h} className="text-left pb-2 pr-4 font-medium text-text-muted uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.series.map(s => {
              const returns = s.points.map(p => p.pct_return)
              const vol = stdDev(returns)
              return (
                <tr key={s.ticker} className="border-b border-bg-border/50 last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2 font-mono font-semibold" style={{ color: s.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.ticker}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-text-secondary">{formatPrice(s.start_price)}</td>
                  <td className="py-2.5 pr-4 font-mono text-text-primary">{formatPrice(s.end_price)}</td>
                  <td className={cn('py-2.5 pr-4 font-mono font-semibold', getPriceClass(s.pct_change))}>
                    {formatPct(s.pct_change)}
                  </td>
                  <td className="py-2.5 font-mono text-text-secondary">{vol.toFixed(2)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
