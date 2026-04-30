import { useMemo } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { calcMACD, detectMACDCrosses } from '@/lib/indicators'
import type { CandlePoint } from '@/types/stock'
import { cn } from '@/lib/utils'

function MACDTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card px-2.5 py-1.5 text-xs font-mono shadow-2xl shadow-black/60 space-y-0.5">
      <p className="text-text-muted text-[10px] mb-0.5">{label}</p>
      {d.macd    != null && <p className="text-accent-cyan">MACD {d.macd?.toFixed(3)}</p>}
      {d.signal  != null && <p className="text-accent-red">Signal {d.signal?.toFixed(3)}</p>}
      {d.histogram != null && (
        <p className={d.histogram >= 0 ? 'text-accent-green' : 'text-accent-red'}>
          Hist {d.histogram >= 0 ? '+' : ''}{d.histogram?.toFixed(3)}
        </p>
      )}
    </div>
  )
}

interface Props {
  candles: CandlePoint[]
}

export default function MACDPanel({ candles }: Props) {
  const { macdFast, macdSlow, macdSignal, setMacdFast, setMacdSlow, setMacdSignal, togglePanel } = useAppStore()

  const { chartData, lastMACD, lastSignal, isBullish } = useMemo(() => {
    const pts     = calcMACD(candles, macdFast, macdSlow, macdSignal)
    const crosses = detectMACDCrosses(pts)

    const data = candles.map((c, i) => ({
      date:      c.date,
      macd:      pts[i].macd,
      signal:    pts[i].signal,
      histogram: pts[i].histogram,
      cross:     crosses[i],
    }))

    const last = [...pts].reverse().find((p: any) => p.macd != null)
    return {
      chartData:  data,
      lastMACD:   last?.macd   ?? null,
      lastSignal: last?.signal ?? null,
      isBullish:  (last?.macd ?? 0) > (last?.signal ?? 0),
    }
  }, [candles, macdFast, macdSlow, macdSignal])

  const PeriodInput = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-text-muted font-mono">{label}</span>
      <input
        type="number" value={value}
        onChange={e => onChange(parseInt(e.target.value) || value)}
        className="w-10 bg-bg-hover border border-bg-border rounded px-1 py-0.5 font-mono text-[10px] text-text-primary text-center focus:outline-none focus:border-accent-cyan/50"
        min={1}
      />
    </div>
  )

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-1 pb-1 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">MACD</span>
        <span className="font-mono text-[10px] text-text-secondary">({macdFast},{macdSlow},{macdSignal})</span>
        {lastMACD != null && (
          <span className={cn('font-mono text-[11px] font-bold', isBullish ? 'text-accent-green' : 'text-accent-red')}>
            {isBullish ? '▲' : '▼'} {lastMACD.toFixed(3)}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <PeriodInput label="F" value={macdFast}   onChange={setMacdFast} />
          <PeriodInput label="S" value={macdSlow}   onChange={setMacdSlow} />
          <PeriodInput label="Sig" value={macdSignal} onChange={setMacdSignal} />
          <button onClick={() => togglePanel('macd')}
            className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <X size={11} />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={chartData} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="date" hide />
          <YAxis
            tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false} width={40}
            tickFormatter={v => v.toFixed(1)} orientation="right"
          />
          <Tooltip content={<MACDTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* Histogram bars */}
          <Bar dataKey="histogram" maxBarSize={6} radius={[1, 1, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={(entry.histogram ?? 0) >= 0 ? '#00e87a' : '#ff3c5a'}
                fillOpacity={0.7}
              />
            ))}
          </Bar>

          {/* MACD line */}
          <Line
            type="monotone" dataKey="macd"
            stroke="#00c4ff" strokeWidth={1.5}
            dot={false} connectNulls
            activeDot={{ r: 2, fill: '#00c4ff', strokeWidth: 0 }}
          />

          {/* Signal line */}
          <Line
            type="monotone" dataKey="signal"
            stroke="#ff3c5a" strokeWidth={1} strokeDasharray="4 2"
            dot={false} connectNulls
            activeDot={{ r: 2, fill: '#ff3c5a', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
