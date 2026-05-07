import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { CompareResponse } from '@/types/stock'

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB
    num += da * db; denA += da * da; denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  return den === 0 ? 0 : num / den
}

function corrColor(v: number): string {
  if (v >= 0.7)  return 'bg-accent-green/20 text-accent-green border-accent-green/20'
  if (v >= 0.3)  return 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/15'
  if (v >= -0.3) return 'bg-bg-hover text-text-secondary border-bg-border'
  if (v >= -0.7) return 'bg-accent-amber/10 text-accent-amber border-accent-amber/20'
  return 'bg-accent-red/10 text-accent-red border-accent-red/20'
}

export default function CorrelationMatrix({ data }: { data: CompareResponse }) {
  const navigate = useNavigate()
  const matrix = useMemo(() => {
    const returns: Record<string, number[]> = {}
    data.series.forEach(s => {
      returns[s.ticker] = s.points.map(p => p.pct_return)
    })
    const tickers = data.series.map(s => s.ticker)
    return tickers.map(a =>
      tickers.map(b => (a === b ? 1 : pearson(returns[a], returns[b])))
    )
  }, [data])

  const tickers = data.series.map(s => s.ticker)
  if (tickers.length < 2) return null

  return (
    <div className="card p-4">
      <p className="stat-label mb-3">Correlation Matrix</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr>
              <th className="w-14" />
              {tickers.map(t => (
                <th key={t} className="px-1 py-1 text-text-muted font-semibold text-center">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((rowT, i) => (
              <tr key={rowT}>
                <td className="pr-2 py-1 text-text-muted font-semibold text-right">{rowT}</td>
                {tickers.map((colT, j) => (
                  <td key={j} className="px-1 py-1 text-center">
                    <span onClick={() => { if (rowT !== colT) navigate(`/compare?tickers=${rowT},${colT}`) }}
              style={{ cursor: rowT !== colT ? "pointer" : "default" }}
              className={cn('inline-flex items-center justify-center w-12 h-7 rounded border text-[11px] font-semibold', corrColor(matrix[i][j]))}>
                      {matrix[i][j].toFixed(2)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[
          { label: '≥ 0.7 Strong +',  cls: 'bg-accent-green/20 border-accent-green/20 text-accent-green' },
          { label: '0.3–0.7 Weak +',  cls: 'bg-accent-cyan/10 border-accent-cyan/15 text-accent-cyan' },
          { label: '±0.3 Neutral',    cls: 'bg-bg-hover border-bg-border text-text-secondary' },
          { label: '−0.7–−0.3 Weak −',cls: 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber' },
          { label: '≤ −0.7 Strong −', cls: 'bg-accent-red/10 border-accent-red/20 text-accent-red' },
        ].map(({ label, cls }) => (
          <span key={label}
              className={cn('inline-flex items-center gap-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded border', cls)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
