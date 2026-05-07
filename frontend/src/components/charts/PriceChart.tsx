import { useMemo, useEffect, useState } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { formatPrice, formatVolume, cn } from '@/lib/utils'
import { calcSMA, calcEMA as calcEMAFn, calcBollinger, calcVWAP } from '@/lib/indicators'
import RSIPanel        from '@/components/indicators/RSIPanel'
import { detectPatterns, groupPatternsByIndex } from '@/lib/patterns'
import { PatternHistoryTable } from '@/components/patterns/PatternAnnotations'
import MACDPanel       from '@/components/indicators/MACDPanel'
import StochasticPanel from '@/components/indicators/StochasticPanel'
import type { CandlePoint, TimeRange } from '@/types/stock'
import type { PriceTick } from '@/hooks/useWebSocket'

// Re-export for external callers
export function calcMA(data: CandlePoint[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    return data.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) / period
  })
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="card px-3 py-2.5 shadow-2xl shadow-black/60 text-xs font-mono space-y-1 min-w-40">
      <p className="text-text-muted mb-1.5">{label}</p>
      {d.open != null && (
        <>
          <div className="flex justify-between gap-4"><span className="text-text-muted">O</span><span className="text-text-primary">{formatPrice(d.open)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-text-muted">H</span><span className="text-accent-green">{formatPrice(d.high)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-text-muted">L</span><span className="text-accent-red">{formatPrice(d.low)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-text-muted">C</span><span className="text-text-primary font-semibold">{formatPrice(d.close)}</span></div>
          <div className="flex justify-between gap-4 border-t border-bg-border pt-1 mt-1">
            <span className="text-text-muted">Vol</span>
            <span className="text-text-secondary">{formatVolume(d.volume)}</span>
          </div>
        </>
      )}
      {d.close != null && d.open == null && (
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Price</span>
          <span className="text-text-primary font-semibold">{formatPrice(d.close)}</span>
        </div>
      )}
      {d.bb_upper != null && (
        <div className="border-t border-bg-border pt-1 mt-1 space-y-0.5">
          <div className="flex justify-between gap-4"><span className="text-accent-cyan opacity-60">BB↑</span><span className="text-accent-cyan">{formatPrice(d.bb_upper)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-accent-cyan opacity-60">BB↓</span><span className="text-accent-cyan">{formatPrice(d.bb_lower)}</span></div>
        </div>
      )}
      {d.vwap != null && (
        <div className="flex justify-between gap-4 border-t border-bg-border pt-1 mt-1">
          <span className="text-purple-400">VWAP</span>
          <span className="text-purple-400">{formatPrice(d.vwap)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']

export function TimeRangeSelector() {
  const { timeRange, setTimeRange } = useAppStore()
  return (
    <div className="flex items-center gap-1">
      {RANGES.map(r => (
        <button key={r} onClick={() => setTimeRange(r)}
          className={timeRange === r ? 'range-btn-active' : 'range-btn'}>{r}</button>
      ))}
    </div>
  )
}

export function ChartTypeToggle() {
  const { chartType, setChartType } = useAppStore()
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-bg-hover">
      {(['line', 'candlestick'] as const).map(type => (
        <button key={type} onClick={() => setChartType(type)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
            chartType === type ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
          )}>
          {type === 'line' ? 'Line' : 'Candle'}
        </button>
      ))}
    </div>
  )
}

export function MAToggles() {
  const { showMA50, showMA200, toggleMA50, toggleMA200 } = useAppStore()
  return (
    <div className="flex items-center gap-2">
      {[
        { label: 'MA50',  active: showMA50,  toggle: toggleMA50,  color: 'amber' },
        { label: 'MA200', active: showMA200, toggle: toggleMA200, color: 'blue'  },
      ].map(({ label, active, toggle, color }) => (
        <button key={label} onClick={toggle}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all',
            active
              ? color === 'amber'
                ? 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
                : 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
              : 'border-bg-border text-text-muted hover:text-text-secondary'
          )}>
          {label}
        </button>
      ))}
    </div>
  )
}

function formatXAxis(isoDate: string, range: TimeRange): string {
  try {
    const d = parseISO(isoDate)
    if (range === '1D') return format(d, 'HH:mm')
    if (range === '5Y') return format(d, 'MMM yy')
    return format(d, 'MMM d')
  } catch { return '' }
}

// ─── Main chart ───────────────────────────────────────────────────────────────
interface PriceChartProps {
  candles:   CandlePoint[]
  ticker:    string
  liveTick?: PriceTick | null
}

export default function PriceChart({ candles, ticker, liveTick }: PriceChartProps) {
  const {
    chartType, timeRange,
    showMA50, showMA200, showBB, showVWAP, showEMA9, showEMA21,
    activePanels,
  } = useAppStore()

  // Live tick merging
  const [liveCandles, setLiveCandles] = useState<CandlePoint[]>(candles)
  useEffect(() => { setLiveCandles(candles) }, [candles])
  useEffect(() => {
    if (!liveTick?.price || liveTick.type === 'keepalive') return
    setLiveCandles(prev => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      const lp: CandlePoint = {
        date:      new Date(liveTick.timestamp * 1000).toISOString(),
        timestamp: liveTick.timestamp,
        open:      last.close,
        high:      Math.max(last.close, liveTick.price!),
        low:       Math.min(last.close, liveTick.price!),
        close:     liveTick.price!,
        volume:    0,
      }
      const ld = new Date(last.timestamp * 1000)
      const nd = new Date(liveTick.timestamp * 1000)
      if (ld.getMinutes() === nd.getMinutes() && ld.getHours() === nd.getHours())
        return [...prev.slice(0, -1), lp]
      return [...prev, lp]
    })
  }, [liveTick])

  const { showPatterns } = useAppStore()
  const closes = useMemo(() => liveCandles.map(c => c.close), [liveCandles])

  const patterns        = useMemo(() => showPatterns ? detectPatterns(liveCandles) : [], [liveCandles, showPatterns])
  const patternsByIndex = useMemo(() => groupPatternsByIndex(patterns), [patterns])

  const ma50Data  = useMemo(() => showMA50  ? calcMA(liveCandles, 50)  : [], [liveCandles, showMA50])
  const ma200Data = useMemo(() => showMA200 ? calcMA(liveCandles, 200) : [], [liveCandles, showMA200])
  const ema9Data  = useMemo(() => showEMA9  ? calcEMAFn(closes, 9)    : [], [closes, showEMA9])
  const ema21Data = useMemo(() => showEMA21 ? calcEMAFn(closes, 21)   : [], [closes, showEMA21])
  const bbData    = useMemo(() => showBB    ? calcBollinger(liveCandles) : [], [liveCandles, showBB])
  const vwapData  = useMemo(() => (showVWAP && timeRange === '1D') ? calcVWAP(liveCandles) : [], [liveCandles, showVWAP, timeRange])

  const chartData = useMemo(() => liveCandles.map((c, i) => ({
    ...c,
    dateLabel: formatXAxis(c.date, timeRange),
    ma50:      showMA50  ? (ma50Data[i]  ?? undefined) : undefined,
    ma200:     showMA200 ? (ma200Data[i] ?? undefined) : undefined,
    ema9:      showEMA9  ? (ema9Data[i]  ?? undefined) : undefined,
    ema21:     showEMA21 ? (ema21Data[i] ?? undefined) : undefined,
    bb_upper:  showBB    ? (bbData[i]?.bb_upper  ?? undefined) : undefined,
    bb_mid:    showBB    ? (bbData[i]?.bb_mid    ?? undefined) : undefined,
    bb_lower:  showBB    ? (bbData[i]?.bb_lower  ?? undefined) : undefined,
    vwap:      (showVWAP && timeRange === '1D') ? (vwapData[i]?.vwap ?? undefined) : undefined,
    pattern:   showPatterns ? (patternsByIndex.get(i)?.[0] ?? undefined) : undefined,
  })), [liveCandles, timeRange, patternsByIndex, showMA50, showMA200, showEMA9, showEMA21,
        showBB, showVWAP, ma50Data, ma200Data, ema9Data, ema21Data, bbData, vwapData])

  const isUp       = liveCandles.length >= 2
    ? liveCandles[liveCandles.length - 1].close >= liveCandles[0].close : true
  const priceColor = isUp ? '#00ff88' : '#ff3b5c'
  const gradientId = `grad-${ticker}`

  if (liveCandles.length === 0) return (
    <div className="h-64 flex items-center justify-center text-text-muted text-sm">
      No chart data available
    </div>
  )

  return (
    <div className="space-y-0">
      {/* Price chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={priceColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={priceColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="dateLabel"
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={['auto', 'auto']}
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`} width={55} orientation="right" />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />

          {chartType === 'line' ? (
            <Line type="monotone" dataKey="close" stroke={priceColor} strokeWidth={1.5}
              dot={false} activeDot={{ r: 3, fill: priceColor, strokeWidth: 0 }}
              fill={`url(#${gradientId})`} />
          ) : (
            <>
              <Bar dataKey="close" fill="transparent" maxBarSize={6} radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.close >= entry.open ? '#00ff88' : '#ff3b5c'} fillOpacity={0.85} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="high" stroke="rgba(255,255,255,0.1)" strokeWidth={1} dot={false} activeDot={false} />
              <Line type="monotone" dataKey="low"  stroke="rgba(255,255,255,0.1)" strokeWidth={1} dot={false} activeDot={false} />
            </>
          )}

          {showMA50  && <Line type="monotone" dataKey="ma50"  stroke="#ffb800" strokeWidth={1} dot={false} activeDot={false} strokeDasharray="4 2" connectNulls />}
          {showMA200 && <Line type="monotone" dataKey="ma200" stroke="#3b82f6" strokeWidth={1} dot={false} activeDot={false} strokeDasharray="4 2" connectNulls />}
          {showEMA9  && <Line type="monotone" dataKey="ema9"  stroke="#a855f7" strokeWidth={1.2} dot={false} activeDot={false} connectNulls />}
          {showEMA21 && <Line type="monotone" dataKey="ema21" stroke="#ec4899" strokeWidth={1.2} dot={false} activeDot={false} connectNulls />}
          {showBB && <>
            <Line type="monotone" dataKey="bb_upper" stroke="rgba(0,196,255,0.5)" strokeWidth={1} dot={false} activeDot={false} connectNulls strokeDasharray="2 2" />
            <Line type="monotone" dataKey="bb_mid"   stroke="rgba(0,196,255,0.25)" strokeWidth={1} dot={false} activeDot={false} connectNulls />
            <Line type="monotone" dataKey="bb_lower" stroke="rgba(0,196,255,0.5)" strokeWidth={1} dot={false} activeDot={false} connectNulls strokeDasharray="2 2" />
          </>}
          {/* Pattern annotations as reference dots */}
          {showPatterns && patterns.map(p => {
            const c = liveCandles[p.index]
            if (!c) return null
            const isBull = p.signal === 'bullish'
            const isBear = p.signal === 'bearish'
            return null // rendered via customized dot logic below
          })}

          {showVWAP && timeRange === '1D' && (
            <Line type="monotone" dataKey="vwap" stroke="#a855f7" strokeWidth={1.5} dot={false} activeDot={false} connectNulls strokeDasharray="6 2" />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume */}
      <ResponsiveContainer width="100%" height={48}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <Bar dataKey="volume" maxBarSize={8} radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.close >= entry.open ? '#00ff88' : '#ff3b5c'} fillOpacity={0.25} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Pattern history table */}
      {showPatterns && patterns.length > 0 && (
        <div className="border-t border-bg-border mt-1 pt-3">
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider px-1 mb-2">
            Detected Patterns ({patterns.length})
          </p>
          <PatternHistoryTable candles={liveCandles} />
        </div>
      )}

      {/* Oscillator panels */}
      {activePanels.length > 0 && (
        <div className="border-t border-bg-border mt-1 pt-2 space-y-2">
          {activePanels.map((panel, idx) => (
            <div key={panel} className={cn(idx > 0 && 'border-t border-bg-border/50 pt-2')}>
              {panel === 'rsi'        && <RSIPanel        candles={liveCandles} />}
              {panel === 'macd'       && <MACDPanel       candles={liveCandles} />}
              {panel === 'stochastic' && <StochasticPanel candles={liveCandles} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
