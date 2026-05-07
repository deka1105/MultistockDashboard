import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { detectPatterns, groupPatternsByIndex } from '@/lib/patterns'
import type { CandlePoint } from '@/types/stock'
import type { PatternResult } from '@/lib/patterns'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface PatternBadgeProps {
  pattern: PatternResult
  x: number
  y: number
  candleWidth: number
}

// Thin SVG annotation layer — rendered by PriceChart on top of candles
export function PatternAnnotationLayer({
  candles,
  chartWidth,
  chartHeight,
}: {
  candles: CandlePoint[]
  chartWidth: number
  chartHeight: number
}) {
  const [hovered, setHovered] = useState<PatternResult | null>(null)

  const patterns = useMemo(() => detectPatterns(candles), [candles])
  const byIndex  = useMemo(() => groupPatternsByIndex(patterns), [patterns])

  if (patterns.length === 0 || candles.length === 0) return null

  const n = candles.length
  const candleW = chartWidth / n

  return (
    <g>
      {Array.from(byIndex.entries()).map(([idx, pts]) => {
        const c    = candles[idx]
        if (!c) return null
        const cx   = (idx + 0.5) * candleW
        const topY = 8
        const botY = chartHeight - 8

        // Pick most confident pattern
        const primary = pts.reduce((best, p) => p.confidence > best.confidence ? p : best, pts[0])
        const isBull  = primary.signal === 'bullish'
        const isBear  = primary.signal === 'bearish'

        return (
          <g key={`pattern-${idx}`}>
            {/* Arrow pointing toward the candle */}
            {isBull && (
              <text x={cx} y={botY} textAnchor="middle" fontSize={10}
                fill="#00e87a" fontFamily="IBM Plex Mono, monospace"
                onMouseEnter={() => setHovered(primary)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}>
                ▲
              </text>
            )}
            {isBear && (
              <text x={cx} y={topY} textAnchor="middle" fontSize={10}
                fill="#ff3c5a" fontFamily="IBM Plex Mono, monospace"
                onMouseEnter={() => setHovered(primary)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}>
                ▼
              </text>
            )}
            {!isBull && !isBear && (
              <text x={cx} y={topY} textAnchor="middle" fontSize={8}
                fill="#ffb020" fontFamily="IBM Plex Mono, monospace"
                onMouseEnter={() => setHovered(primary)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}>
                ◆
              </text>
            )}

            {/* Label (only on wider candles) */}
            {candleW > 16 && (
              <text
                x={cx}
                y={isBull ? botY + 10 : topY - 2}
                textAnchor="middle"
                fontSize={Math.min(7, Math.max(5, candleW / 4))}
                fill={isBull ? '#00e87a' : isBear ? '#ff3c5a' : '#ffb020'}
                fontFamily="IBM Plex Mono, monospace"
                opacity={0.8}>
                {primary.name}
              </text>
            )}
          </g>
        )
      })}

      {/* Tooltip */}
      {hovered && (
        <foreignObject x={0} y={0} width={chartWidth} height={chartHeight} style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 16, left: 8 }}>
            <div className="bg-bg-surface border border-bg-border rounded-xl px-3 py-2 text-xs font-mono shadow-2xl shadow-black/60 max-w-52">
              <p className={cn(
                'font-semibold mb-0.5',
                hovered.signal === 'bullish' ? 'text-accent-green'
                : hovered.signal === 'bearish' ? 'text-accent-red' : 'text-accent-amber'
              )}>{hovered.fullName}</p>
              <p className="text-text-muted text-[10px]">{hovered.implication}</p>
              <p className="text-text-muted text-[10px] mt-1">Confidence: {Math.round(hovered.confidence * 100)}%</p>
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

// Pattern history table — shown below the chart
export function PatternHistoryTable({ candles }: { candles: CandlePoint[] }) {
  const patterns = useMemo(() => detectPatterns(candles), [candles])
  const [expanded, setExpanded] = useState(false)

  if (patterns.length === 0) return (
    <div className="text-center py-4 text-text-muted text-xs font-mono">No patterns detected in this time range</div>
  )

  const displayed = expanded ? patterns.slice(-20).reverse() : patterns.slice(-5).reverse()

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {['Date', 'Pattern', 'Signal', 'Confidence'].map(h => (
                <th key={h} className="text-left py-1.5 px-2 text-[9px] uppercase tracking-wider text-text-muted font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((p, i) => {
              const c = candles[p.index]
              return (
                <tr key={i} className="border-t border-bg-border/40 hover:bg-bg-hover transition-colors">
                  <td className="py-1.5 px-2 font-mono text-text-muted">
                    {c?.date ? (() => { try { return format(parseISO(c.date), 'MMM d') } catch { return '—' } })() : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary">{p.fullName}</td>
                  <td className="py-1.5 px-2">
                    <span className={cn(
                      'flex items-center gap-1',
                      p.signal === 'bullish' ? 'text-accent-green'
                      : p.signal === 'bearish' ? 'text-accent-red' : 'text-accent-amber'
                    )}>
                      {p.signal === 'bullish' ? <TrendingUp size={10} />
                        : p.signal === 'bearish' ? <TrendingDown size={10} /> : <Minus size={10} />}
                      {p.signal.charAt(0).toUpperCase() + p.signal.slice(1)}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-text-muted">{Math.round(p.confidence * 100)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {patterns.length > 5 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1 py-2 text-[10px] text-text-muted hover:text-text-secondary font-mono transition-colors">
          {expanded ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> Show all {patterns.length} patterns</>}
        </button>
      )}
    </div>
  )
}
