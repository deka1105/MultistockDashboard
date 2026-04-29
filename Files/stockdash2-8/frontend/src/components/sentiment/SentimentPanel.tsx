import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import SentimentGauge from './SentimentGauge'
import { useSentiment, useSentimentHistory } from '@/hooks/useStockData'
import { Skeleton } from '@/components/common/Skeleton'
import { cn } from '@/lib/utils'

function SentimentTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div className="card px-2.5 py-1.5 text-xs font-mono">
      <span className={val >= 0 ? 'text-accent-green' : 'text-accent-red'}>
        {val >= 0 ? '+' : ''}{val?.toFixed(3)}
      </span>
    </div>
  )
}

interface SentimentPanelProps {
  ticker: string
}

export default function SentimentPanel({ ticker }: SentimentPanelProps) {
  const { data: sentiment, isLoading, refetch } = useSentiment(ticker, 24)
  const { data: history } = useSentimentHistory(ticker, 24)

  const historyPoints = (history?.history ?? []).map((h: any) => ({
    date: h.computed_at ? (() => { try { return format(parseISO(h.computed_at), 'MMM d HH:mm') } catch { return '' } })() : '',
    score: h.score,
  }))

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Social Sentiment</p>
        <button onClick={() => refetch()} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Skeleton className="w-28 h-28 rounded-full" /></div>
      ) : sentiment ? (
        <>
          {/* Gauge */}
          <div className="flex justify-center">
            <SentimentGauge
              score={sentiment.score}
              label={sentiment.label}
              postVolume={sentiment.post_volume}
              source={sentiment.source ?? 'StockTwits'}
            />
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Score',   value: `${sentiment.score >= 0 ? '+' : ''}${sentiment.score.toFixed(2)}` },
              { label: 'Volume',  value: sentiment.post_volume },
              { label: 'Window',  value: `${sentiment.window_hours}h` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-bg-hover rounded-lg p-2">
                <p className="stat-label mb-0.5">{label}</p>
                <p className="font-mono text-sm font-semibold text-text-primary">{value}</p>
              </div>
            ))}
          </div>

          {/* Signal badge */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold',
            sentiment.label === 'positive'
              ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
              : sentiment.label === 'negative'
              ? 'bg-accent-red/10 border-accent-red/20 text-accent-red'
              : 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber'
          )}>
            {sentiment.label === 'positive' ? <TrendingUp size={13} />
              : sentiment.label === 'negative' ? <TrendingDown size={13} />
              : <Minus size={13} />}
            {sentiment.label === 'positive' ? 'Bullish Signal'
              : sentiment.label === 'negative' ? 'Bearish Signal'
              : 'Neutral Signal'}
            <span className="ml-auto text-[10px] opacity-70 font-normal">social data only</span>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-text-muted text-xs">No sentiment data</div>
      )}

      {/* History chart */}
      {historyPoints.length >= 2 && (
        <div>
          <p className="stat-label mb-2">Sentiment Trend (24h window)</p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={historyPoints} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[-1, 1]} hide />
              <Tooltip content={<SentimentTooltip />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
              <Area type="monotone" dataKey="score"
                stroke="#00ff88" strokeWidth={1.5}
                fill="url(#sentGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[10px] text-text-muted text-center leading-relaxed">
        Based on StockTwits community sentiment. Not financial advice.
      </p>
    </div>
  )
}
