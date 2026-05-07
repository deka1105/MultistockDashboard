import { useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { calcStochastic } from '@/lib/indicators'
import type { CandlePoint } from '@/types/stock'
import { cn } from '@/lib/utils'

function StochTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card px-2.5 py-1.5 text-xs font-mono shadow-2xl shadow-black/60 space-y-0.5">
      <p className="text-text-muted text-[10px] mb-0.5">{label}</p>
      {d.stoch_k != null && <p className="text-accent-cyan">%K {d.stoch_k?.toFixed(1)}</p>}
      {d.stoch_d != null && <p className="text-accent-amber">%D {d.stoch_d?.toFixed(1)}</p>}
    </div>
  )
}

interface Props {
  candles: CandlePoint[]
}

export default function StochasticPanel({ candles }: Props) {
  const { stochK, stochD, setStochK, setStochD, togglePanel } = useAppStore()

  const chartData = useMemo(() => {
    const pts = calcStochastic(candles, stochK, stochD)
    return candles.map((c, i) => ({
      date:    c.date,
      stoch_k: pts[i].stoch_k,
      stoch_d: pts[i].stoch_d,
    }))
  }, [candles, stochK, stochD])

  const last = [...chartData].reverse().find((d: any) => d.stoch_k != null)
  const lastK = last?.stoch_k ?? null
  const signal = lastK != null
    ? lastK >= 80 ? 'overbought' : lastK <= 20 ? 'oversold' : 'neutral'
    : 'neutral'

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-1 pb-1 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Stoch</span>
        <span className="font-mono text-[10px] text-text-secondary">({stochK},{stochD})</span>
        {lastK != null && (
          <span className={cn(
            'font-mono text-[11px] font-bold',
            signal === 'overbought' ? 'text-accent-red' : signal === 'oversold' ? 'text-accent-green' : 'text-accent-amber'
          )}>
            %K {lastK.toFixed(1)}
          </span>
        )}
        {signal !== 'neutral' && (
          <span className={cn(
            'text-[9px] font-mono px-1.5 py-0.5 rounded-full border',
            signal === 'overbought'
              ? 'bg-accent-red/10 border-accent-red/20 text-accent-red'
              : 'bg-accent-green/10 border-accent-green/20 text-accent-green'
          )}>{signal}</span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {[
            { label: 'K', value: stochK, set: setStochK },
            { label: 'D', value: stochD, set: setStochD },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-[9px] text-text-muted font-mono">{label}</span>
              <input
                type="number" value={value}
                onChange={e => set(parseInt(e.target.value) || value)}
                className="w-10 bg-bg-hover border border-bg-border rounded px-1 py-0.5 font-mono text-[10px] text-text-primary text-center focus:outline-none focus:border-accent-cyan/50"
                min={1}
              />
            </div>
          ))}
          <button onClick={() => togglePanel('stochastic')}
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
            domain={[0, 100]} ticks={[20, 50, 80]}
            tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false} width={24} orientation="right"
          />
          <Tooltip content={<StochTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
          <ReferenceLine y={80} stroke="rgba(255,60,90,0.3)"  strokeWidth={1} strokeDasharray="3 3" />
          <ReferenceLine y={20} stroke="rgba(0,232,122,0.3)"  strokeWidth={1} strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

          <Line type="monotone" dataKey="stoch_k"
            stroke="#00c4ff" strokeWidth={1.5} dot={false} connectNulls
            activeDot={{ r: 2, fill: '#00c4ff', strokeWidth: 0 }} />
          <Line type="monotone" dataKey="stoch_d"
            stroke="#ffb020" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls
            activeDot={{ r: 2, fill: '#ffb020', strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
