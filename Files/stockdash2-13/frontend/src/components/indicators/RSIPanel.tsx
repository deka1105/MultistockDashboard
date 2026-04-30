import { useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area,
} from 'recharts'
import { X, Settings } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { calcRSI, rsiLabel } from '@/lib/indicators'
import type { CandlePoint } from '@/types/stock'
import { cn } from '@/lib/utils'

function RSITooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const rsi = payload[0]?.value
  return (
    <div className="card px-2.5 py-1.5 text-xs font-mono shadow-2xl shadow-black/60">
      <p className="text-text-muted text-[10px] mb-0.5">{label}</p>
      <p className={cn(
        'font-semibold',
        rsi >= 70 ? 'text-accent-red' : rsi <= 30 ? 'text-accent-green' : 'text-accent-amber'
      )}>RSI {rsi?.toFixed(1)}</p>
    </div>
  )
}

interface Props {
  candles: CandlePoint[]
}

export default function RSIPanel({ candles }: Props) {
  const { rsiPeriod, setRsiPeriod, togglePanel } = useAppStore()

  const rsiData = useMemo(() => {
    const pts = calcRSI(candles, rsiPeriod)
    return candles.map((c, i) => ({
      date: c.date,
      rsi:  pts[i].rsi,
    }))
  }, [candles, rsiPeriod])

  const lastRSI   = [...rsiData].reverse().find((d: any) => d.rsi != null)?.rsi ?? null
  const signal    = rsiLabel(lastRSI)
  const signalColor = signal === 'overbought' ? 'text-accent-red' : signal === 'oversold' ? 'text-accent-green' : 'text-accent-amber'

  return (
    <div className="relative">
      {/* Panel header */}
      <div className="flex items-center gap-2 px-1 pb-1">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">RSI</span>
        <span className="font-mono text-[10px] font-semibold text-text-secondary">({rsiPeriod})</span>
        {lastRSI != null && (
          <span className={cn('font-mono text-[11px] font-bold', signalColor)}>
            {lastRSI.toFixed(1)}
          </span>
        )}
        {signal !== 'neutral' && (
          <span className={cn(
            'text-[9px] font-mono px-1.5 py-0.5 rounded-full border',
            signal === 'overbought'
              ? 'bg-accent-red/10 border-accent-red/20 text-accent-red'
              : 'bg-accent-green/10 border-accent-green/20 text-accent-green'
          )}>
            {signal}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {/* Period input */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted font-mono">Period</span>
            <input
              type="number"
              value={rsiPeriod}
              onChange={e => setRsiPeriod(parseInt(e.target.value) || 14)}
              className="w-10 bg-bg-hover border border-bg-border rounded px-1 py-0.5 font-mono text-[10px] text-text-primary text-center focus:outline-none focus:border-accent-cyan/50"
              min={2} max={50}
            />
          </div>
          <button onClick={() => togglePanel('rsi')}
            className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <X size={11} />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={rsiData} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
          {/* Overbought zone */}
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />

          <XAxis dataKey="date" hide />
          <YAxis
            domain={[0, 100]}
            ticks={[30, 50, 70]}
            tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false} width={24} orientation="right"
          />

          <Tooltip content={<RSITooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />

          {/* Overbought/oversold zone fills */}
          <ReferenceLine y={70} stroke="rgba(255,60,90,0.3)"   strokeWidth={1} strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="rgba(0,232,122,0.3)"   strokeWidth={1} strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

          <Line
            type="monotone" dataKey="rsi"
            stroke="#ffb020" strokeWidth={1.5}
            dot={false} connectNulls
            activeDot={{ r: 2, fill: '#ffb020', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
