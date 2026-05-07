import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart } from 'recharts'
import { useEarningsHistory } from '@/hooks/useStockData'
import { Skeleton } from '@/components/common/Skeleton'
import { cn } from '@/lib/utils'

function EarningsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-2xl shadow-black/60 space-y-1">
      <p className="text-text-muted">{label}</p>
      {d.eps_estimate != null && <p className="text-text-secondary">Est: ${d.eps_estimate.toFixed(2)}</p>}
      {d.eps_actual   != null && (
        <p className={d.beat_miss === 'beat' ? 'text-accent-green' : 'text-accent-red'}>
          Act: ${d.eps_actual.toFixed(2)} ({d.beat_miss})
        </p>
      )}
      {d.surprise_pct != null && (
        <p className={d.surprise_pct >= 0 ? 'text-accent-green' : 'text-accent-red'}>
          {d.surprise_pct >= 0 ? '+' : ''}{d.surprise_pct.toFixed(1)}% surprise
        </p>
      )}
    </div>
  )
}

interface Props { ticker: string }

export default function EarningsHistoryCard({ ticker }: Props) {
  const { data, isLoading } = useEarningsHistory(ticker)

  const chartData = useMemo(() => {
    if (!data?.quarters) return []
    return data.quarters.map((q: any) => ({
      ...q,
      quarter_short: q.quarter.replace('20', "'"),
    }))
  }, [data])

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-semibold text-sm text-text-primary">Earnings History</p>
        <p className="text-[10px] text-text-muted font-mono">EPS estimate vs actual</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : chartData.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">No earnings history</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={130}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="quarter_short"
                tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                tickLine={false} axisLine={false} width={32}
                tickFormatter={v => `$${v.toFixed(1)}`} orientation="right" />
              <Tooltip content={<EarningsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />

              {/* Estimate bars (muted) */}
              <Bar dataKey="eps_estimate" maxBarSize={12} fill="rgba(255,255,255,0.1)" radius={[2, 2, 0, 0]} />

              {/* Actual bars (colored by beat/miss) */}
              <Bar dataKey="eps_actual" maxBarSize={12} radius={[2, 2, 0, 0]}>
                {chartData.map((entry: any, i: number) => (
                  <Cell key={i}
                    fill={entry.beat_miss === 'beat' ? '#00e87a' : entry.beat_miss === 'miss' ? '#ff3c5a' : '#4b5563'}
                    fillOpacity={0.85} />
                ))}
              </Bar>

              {/* Surprise % line */}
              <Line type="monotone" dataKey="surprise_pct" stroke="#ffb020" strokeWidth={1.2}
                dot={{ r: 2.5, fill: '#ffb020', strokeWidth: 0 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Beat/miss summary */}
          <div className="flex items-center gap-4 mt-2 text-[10px] font-mono">
            <span className="text-accent-green">
              {chartData.filter((q: any) => q.beat_miss === 'beat').length} beats
            </span>
            <span className="text-accent-red">
              {chartData.filter((q: any) => q.beat_miss === 'miss').length} misses
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-0.5 bg-accent-amber rounded" />
              <span className="text-text-muted">Surprise %</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
