import { useMemo, useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useCompare } from '@/hooks/useStockData'
import { cn } from '@/lib/utils'
import type { EnrichedPosition } from '@/types/stock'

type Range = '1M' | '3M' | '6M' | '1Y'
const RANGES: Range[] = ['1M', '3M', '6M', '1Y']

// Build a synthetic portfolio return series from positions + candle data
function usePortfolioSeries(positions: EnrichedPosition[], range: Range) {
  const tickers = useMemo(() => positions.map(p => p.ticker), [positions])
  const { data: compareData, isLoading } = useCompare(tickers, range)

  const portfolioSeries = useMemo(() => {
    if (!compareData?.series?.length || !positions.length) return []

    const totalCost = positions.reduce((s, p) => s + p.avg_cost * p.shares, 0)
    const weights   = Object.fromEntries(
      positions.map(p => [p.ticker, (p.avg_cost * p.shares) / totalCost])
    )

    // Align all series to the same dates
    const dates = compareData.series[0]?.points.map((pt: any) => pt.date) ?? []

    return dates.map((date: string, i: number) => {
      let portfolioPct = 0
      for (const series of compareData.series as any[]) {
        const w   = weights[series.ticker] ?? 0
        const pct = series.points[i]?.pct_return ?? 0
        portfolioPct += w * pct
      }
      return {
        date,
        label: (() => { try { return format(parseISO(date), 'MMM d') } catch { return '' } })(),
        portfolio: parseFloat(portfolioPct.toFixed(3)),
      }
    })
  }, [compareData, positions])

  return { portfolioSeries, compareData, isLoading }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs font-mono space-y-1 shadow-2xl shadow-black/60">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className={p.value >= 0 ? 'text-accent-green' : 'text-accent-red'}>
            {p.value >= 0 ? '+' : ''}{p.value?.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  positions: EnrichedPosition[]
}

export default function BenchmarkChart({ positions }: Props) {
  const [range, setRange] = useState<Range>('3M')
  const { portfolioSeries, compareData, isLoading } = usePortfolioSeries(positions, range)

  // Merge portfolio series with SPY benchmark
  const spySeries = useMemo(() => {
    const spy = compareData?.series?.find((s: any) => s.ticker === 'SPY')
    return spy?.points ?? []
  }, [compareData])

  const chartData = useMemo(() => {
    return portfolioSeries.map((pt: any, i: number) => ({
      ...pt,
      spy: spySeries[i]?.pct_return ?? null,
    }))
  }, [portfolioSeries, spySeries])

  // Also fetch SPY to use as benchmark
  const { data: spyData } = useCompare(['SPY'], range)
  const spyPoints = spyData?.series?.[0]?.points ?? []

  const mergedData = useMemo(() => {
    return portfolioSeries.map((pt: any, i: number) => ({
      ...pt,
      spy: spyPoints[i]?.pct_return ?? null,
    }))
  }, [portfolioSeries, spyPoints])

  const portfolioFinal = mergedData.at(-1)?.portfolio ?? 0
  const spyFinal       = mergedData.at(-1)?.spy ?? 0

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-display font-semibold text-sm text-text-primary">Portfolio vs S&P 500</p>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">Normalized return since start of period</p>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={r === range ? 'range-btn-active' : 'range-btn'}>{r}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-52 bg-bg-hover rounded-lg animate-pulse" />
      ) : mergedData.length < 2 ? (
        <div className="h-52 flex items-center justify-center text-text-muted text-sm">
          Add positions to see performance chart
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={mergedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label"
                tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                width={52} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <Line type="monotone" dataKey="portfolio" name="My Portfolio"
                stroke="#00c4ff" strokeWidth={2} dot={false}
                activeDot={{ r: 3, fill: '#00c4ff', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="spy" name="S&P 500"
                stroke="#4b5563" strokeWidth={1.5} strokeDasharray="5 3" dot={false}
                activeDot={{ r: 2, fill: '#4b5563', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-accent-cyan rounded" />
              <span className="text-[11px] text-text-muted font-mono">
                My Portfolio <span className={portfolioFinal >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                  {portfolioFinal >= 0 ? '+' : ''}{portfolioFinal.toFixed(2)}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-text-muted rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#4b5563 0,#4b5563 4px,transparent 4px,transparent 7px)' }} />
              <span className="text-[11px] text-text-muted font-mono">
                S&P 500 <span className={spyFinal >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                  {spyFinal >= 0 ? '+' : ''}{spyFinal.toFixed(2)}%
                </span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
