import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { CompareResponse } from '@/types/stock'

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function CompareTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2.5 shadow-2xl text-xs font-mono space-y-1.5 min-w-40">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span style={{ color: p.color }} className="font-semibold">{p.dataKey}</span>
          </span>
          <span className="text-text-primary">
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}{p.unit ?? '%'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────

type ChartMode = 'normalized' | 'absolute'

// ─── Main chart ──────────────────────────────────────────────────────────────

interface CompareChartProps {
  data: CompareResponse
}

export default function CompareChart({ data }: CompareChartProps) {
  const [mode, setMode] = useState<ChartMode>('normalized')
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const toggleSeries = (ticker: string) =>
    setHidden(prev => {
      const next = new Set(prev)
      next.has(ticker) ? next.delete(ticker) : next.add(ticker)
      return next
    })

  // Build merged date → {ticker: value} map
  const chartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {}
    data.series.forEach(series => {
      series.points.forEach(pt => {
        let label: string
        try { label = format(parseISO(pt.date), 'MMM d') } catch { label = pt.date }
        if (!dateMap[label]) dateMap[label] = {}
        dateMap[label][series.ticker] = mode === 'normalized' ? pt.pct_return : pt.close
      })
    })
    return Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals }))
  }, [data, mode])

  const visibleSeries = data.series.filter(s => !hidden.has(s.ticker))

  return (
    <div className="space-y-3">
      {/* Mode toggle + interactive legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-bg-hover">
          {(['normalized', 'absolute'] as ChartMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize',
                mode === m
                  ? 'bg-bg-card text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {m === 'normalized' ? '% Return' : 'Abs Price'}
            </button>
          ))}
        </div>

        {/* Clickable legend */}
        <div className="flex flex-wrap items-center gap-2">
          {data.series.map(s => (
            <button
              key={s.ticker}
              onClick={() => toggleSeries(s.ticker)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono font-semibold transition-all',
                hidden.has(s.ticker)
                  ? 'opacity-30 border-bg-border text-text-muted bg-transparent'
                  : 'border-opacity-30 hover:opacity-80'
              )}
              style={hidden.has(s.ticker) ? {} : {
                backgroundColor: `${s.color}15`,
                borderColor: `${s.color}40`,
                color: s.color,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hidden.has(s.ticker) ? '#4b5563' : s.color }} />
              {s.ticker}
            </button>
          ))}
          {hidden.size > 0 && (
            <button onClick={() => setHidden(new Set())} className="text-[10px] text-text-muted hover:text-text-secondary font-mono transition-colors">
              Show all
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => mode === 'normalized'
              ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
              : `$${v.toFixed(0)}`
            }
            width={56}
            orientation="right"
          />
          <Tooltip content={<CompareTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
          {visibleSeries.map(series => (
            <Line
              key={series.ticker}
              type="monotone"
              dataKey={series.ticker}
              stroke={series.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
