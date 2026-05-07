import { useNavigate } from 'react-router-dom'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useStockQuote, useMultiCandles } from '@/hooks/useStockData'
import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'

interface WatchlistCardProps {
  ticker: string
  color: string
  onRemove: () => void
  candles?: { close: number }[]
}

export function WatchlistCard({ ticker, color, onRemove, candles }: WatchlistCardProps) {
  const navigate = useNavigate()
  const { data: quote } = useStockQuote(ticker)
  const isUp = (quote?.change_pct ?? 0) >= 0

  return (
    <div
      onClick={() => navigate(`/dashboard/${ticker}`)}
      className="card-hover p-4 cursor-pointer group relative"
    >
      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="absolute top-2.5 right-2.5 p-1 rounded text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent-red hover:bg-accent-red/10 transition-all"
      >
        <X size={12} />
      </button>

      {/* Top row */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-mono font-bold text-base text-text-primary" style={{ color }}>{ticker}</p>
          <p className={cn('font-mono text-xs font-semibold mt-0.5', getPriceClass(quote?.change_pct))}>
            {formatPct(quote?.change_pct)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-text-primary tabular-nums">
            {formatPrice(quote?.price)}
          </p>
          <p className={cn('font-mono text-[11px]', getPriceClass(quote?.change))}>
            {quote?.change != null ? `${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      {candles && candles.length > 1 && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={candles}>
              <Line
                type="monotone"
                dataKey="close"
                stroke={isUp ? '#00ff88' : '#ff3b5c'}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
