import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Info } from 'lucide-react'
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
  const {
    data: sentiment,
    isLoading,
    isError,
    refetch,
  } = useSentiment(ticker, 24)

  const { data: history } = useSentimentHistory(ticker, 24)

  const historyPoints = (history?.history ?? []).map((h: any) => ({
    date: h.computed_at
      ? (() => { try { return format(parseISO(h.computed_at), 'HH:mm') } catch { return '' } })()
      : '',
    score: h.score,
  })).filter((p: any) => p.date !== '')

  const isMock = sentiment?.source === 'mock'

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-text-primary">Social Sentiment</p>
          {isMock && (
            <span title="Live StockTwits data unavailable — showing estimated sentiment"
              className="cursor-help">
              <Info size={12} className="text-text-muted" />
            </span>
          )}
        </div>
        <button onClick={() => refetch()}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="flex justify-center"><Skeleton className="w-28 h-28 rounded-full" /></div>
          <Skeleton className="h-8 w-full" />
        </div>
      ) : isError || !sentiment ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-text-muted text-xs">Sentiment data unavailable</p>
          <button onClick={() => refetch()} className="btn-ghost text-xs flex items-center gap-1 mx-auto">
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* Gauge */}
          <div className="flex justify-center">
            <SentimentGauge
              score={sentiment.score}
              label={sentiment.label}
              postVolume={sentiment.post_volume}
              source={isMock ? 'estimated' : (sentiment.source === 'db' ? 'StockTwits' : 'StockTwits live')}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Score',  value: `${sentiment.score >= 0 ? '+' : ''}${sentiment.score.toFixed(2)}` },
              { label: 'Posts',  value: sentiment.post_volume },
              { label: 'Window', value: `${sentiment.window_hours}h` },
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
            {sentiment.label === 'positive'  ? <TrendingUp size={13} />
              : sentiment.label === 'negative' ? <TrendingDown size={13} />
              : <Minus size={13} />}
            {sentiment.label === 'positive'  ? 'Bullish Signal'
              : sentiment.label === 'negative' ? 'Bearish Signal'
              : 'Neutral Signal'}
            <span className="ml-auto text-[10px] opacity-60 font-normal">
              {isMock ? 'estimated · not financial advice' : 'social data · not financial advice'}
            </span>
          </div>

          {/* History chart */}
          {historyPoints.length >= 2 && (
            <div>
              <p className="stat-label mb-2">Sentiment Trend</p>
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart data={historyPoints} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`sentGrad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
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
                    fill={`url(#sentGrad-${ticker})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <p className="text-[10px] text-text-muted text-center leading-relaxed">
        {isMock
          ? 'Estimated based on historical patterns. Not financial advice.'
          : 'Based on StockTwits community posts. Not financial advice.'}
      </p>
    </div>
  )
}
