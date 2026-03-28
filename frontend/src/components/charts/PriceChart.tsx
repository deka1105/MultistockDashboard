import { useMemo } from 'react'
import {
  ComposedChart, LineChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '@/store/useAppStore'
import { formatPrice, formatVolume, cn } from '@/lib/utils'
import type { CandlePoint, TimeRange } from '@/types/stock'

// ─── Moving average calculator ──────────────────────────────────────────────

function calcMA(data: CandlePoint[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    const slice = data.slice(i - period + 1, i + 1)
    return slice.reduce((sum, c) => sum + c.close, 0) / period
  })
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  return (
    <div className="card px-3 py-2.5 shadow-2xl shadow-black/60 text-xs font-mono space-y-1 min-w-36">
      <p className="text-text-muted mb-1.5">{label}</p>
      {d.open != null && (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">O</span>
            <span className="text-text-primary tabular-nums">{formatPrice(d.open)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">H</span>
            <span className="text-accent-green tabular-nums">{formatPrice(d.high)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">L</span>
            <span className="text-accent-red tabular-nums">{formatPrice(d.low)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">C</span>
            <span className="text-text-primary font-semibold tabular-nums">{formatPrice(d.close)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-bg-border pt-1 mt-1">
            <span className="text-text-muted">Vol</span>
            <span className="text-text-secondary tabular-nums">{formatVolume(d.volume)}</span>
          </div>
        </>
      )}
      {d.close != null && d.open == null && (
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Price</span>
          <span className="text-text-primary font-semibold tabular-nums">{formatPrice(d.close)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Time range selector ─────────────────────────────────────────────────────

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']

export function TimeRangeSelector() {
  const { timeRange, setTimeRange } = useAppStore()
  return (
    <div className="flex items-center gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => setTimeRange(r)}
          className={timeRange === r ? 'range-btn-active' : 'range-btn'}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

// ─── Chart type toggle ────────────────────────────────────────────────────────

export function ChartTypeToggle() {
  const { chartType, setChartType } = useAppStore()
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-bg-hover">
      {(['line', 'candlestick'] as const).map((type) => (
        <button
          key={type}
          onClick={() => setChartType(type)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
            chartType === type
              ? 'bg-bg-card text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          )}
        >
          {type === 'line' ? 'Line' : 'Candle'}
        </button>
      ))}
    </div>
  )
}

// ─── MA toggles ──────────────────────────────────────────────────────────────

export function MAToggles() {
  const { showMA50, showMA200, toggleMA50, toggleMA200 } = useAppStore()
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMA50}
        className={cn(
          'px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all',
          showMA50
            ? 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
            : 'border-bg-border text-text-muted hover:text-text-secondary'
        )}
      >
        MA50
      </button>
      <button
        onClick={toggleMA200}
        className={cn(
          'px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all',
          showMA200
            ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
            : 'border-bg-border text-text-muted hover:text-text-secondary'
        )}
      >
        MA200
      </button>
    </div>
  )
}

// ─── X-axis date formatter ────────────────────────────────────────────────────

function formatXAxis(isoDate: string, range: TimeRange): string {
  try {
    const d = parseISO(isoDate)
    if (range === '1D') return format(d, 'HH:mm')
    if (range === '1W' || range === '1M') return format(d, 'MMM d')
    if (range === '3M' || range === '1Y') return format(d, 'MMM d')
    return format(d, 'MMM yy')
  } catch { return '' }
}

// ─── Main price chart ─────────────────────────────────────────────────────────

interface PriceChartProps {
  candles: CandlePoint[]
  ticker: string
}

export default function PriceChart({ candles, ticker }: PriceChartProps) {
  const { chartType, showMA50, showMA200, timeRange } = useAppStore()

  const ma50 = useMemo(() => showMA50 ? calcMA(candles, 50) : [], [candles, showMA50])
  const ma200 = useMemo(() => showMA200 ? calcMA(candles, 200) : [], [candles, showMA200])

  const chartData = useMemo(() => candles.map((c, i) => ({
    ...c,
    dateLabel: formatXAxis(c.date, timeRange),
    ma50: showMA50 ? ma50[i] : undefined,
    ma200: showMA200 ? ma200[i] : undefined,
  })), [candles, ma50, ma200, showMA50, showMA200, timeRange])

  const isUp = candles.length >= 2
    ? candles[candles.length - 1].close >= candles[0].close
    : true

  const priceColor = isUp ? '#00ff88' : '#ff3b5c'
  const gradientId = `grad-${ticker}`

  const tickCount = Math.min(8, Math.floor(chartData.length / 5))

  if (candles.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm">
        No chart data available
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Price chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={priceColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={priceColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />

          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickCount={tickCount}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={55}
            orientation="right"
          />

          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />

          {chartType === 'line' ? (
            <Line
              type="monotone"
              dataKey="close"
              stroke={priceColor}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: priceColor, strokeWidth: 0 }}
              fill={`url(#${gradientId})`}
            />
          ) : (
            /* Candlestick simulation with bar + whiskers */
            <>
              {/* Body bars */}
              <Bar dataKey="close" fill="transparent" maxBarSize={6} radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.close >= entry.open ? '#00ff88' : '#ff3b5c'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
              {/* High-Low lines */}
              <Line
                type="monotone"
                dataKey="high"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                dot={false}
                activeDot={false}
              />
              <Line
                type="monotone"
                dataKey="low"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                dot={false}
                activeDot={false}
              />
            </>
          )}

          {/* MA overlays */}
          {showMA50 && (
            <Line type="monotone" dataKey="ma50" stroke="#ffb800" strokeWidth={1}
              dot={false} activeDot={false} strokeDasharray="4 2" connectNulls />
          )}
          {showMA200 && (
            <Line type="monotone" dataKey="ma200" stroke="#3b82f6" strokeWidth={1}
              dot={false} activeDot={false} strokeDasharray="4 2" connectNulls />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume chart */}
      <ResponsiveContainer width="100%" height={56}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <Bar dataKey="volume" maxBarSize={8} radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.close >= entry.open ? '#00ff88' : '#ff3b5c'}
                fillOpacity={0.25}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
