import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { formatPrice } from '@/lib/utils'
import type { CompareResponse } from '@/types/stock'

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
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  )
}

interface CompareChartProps {
  data: CompareResponse
}

export default function CompareChart({ data }: CompareChartProps) {
  // Merge all series onto common date axis
  const dateMap: Record<string, Record<string, number>> = {}
  data.series.forEach(series => {
    series.points.forEach(pt => {
      const label = (() => {
        try { return format(parseISO(pt.date), 'MMM d') } catch { return pt.date }
      })()
      if (!dateMap[label]) dateMap[label] = {}
      dateMap[label][series.ticker] = pt.pct_return
    })
  })

  const chartData = Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals }))
  const colorMap: Record<string, string> = {}
  data.series.forEach(s => { colorMap[s.ticker] = s.color })

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
          width={52}
          orientation="right"
        />
        <Tooltip content={<CompareTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
        {/* Zero reference line */}
        <CartesianGrid horizontal={false} vertical={false} />
        {data.series.map(series => (
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
  )
}
