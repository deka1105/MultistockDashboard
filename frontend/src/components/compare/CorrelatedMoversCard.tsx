import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitCompare, TrendingUp, TrendingDown } from 'lucide-react'
import { useMultiCandles } from '@/hooks/useStockData'
import { cn } from '@/lib/utils'

const SP50 = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','JPM','V','UNH',
  'XOM','MA','AVGO','JNJ','PG','HD','MRK','COST','ABBV','CVX',
  'KO','PEP','WMT','BAC','CRM','NFLX','AMD','ORCL','CSCO','ACN',
  'MCD','NKE','ADBE','TMO','ABT','TXN','NEE','PM','RTX','QCOM',
  'HON','LIN','IBM','GS','CAT','AMGN','SBUX','INTU','LOW','DE',
]

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB
    num += da * db; denA += da * da; denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100
}

interface Props { ticker: string }

export default function CorrelatedMoversCard({ ticker }: Props) {
  const navigate = useNavigate()

  // Fetch 1M candles for ticker + all SP50 peers (excluding itself)
  const peers   = SP50.filter(t => t !== ticker)
  const allTix  = [ticker, ...peers]
  const candlesQuery = useMultiCandles(allTix, '1M')

  const { mostCorrelated, leastCorrelated } = useMemo(() => {
    if (!candlesQuery.data) return { mostCorrelated: [], leastCorrelated: [] }

    const returnsMap: Record<string, number[]> = {}
    ;(candlesQuery.data as any[]).forEach(({ ticker: t, data }: any) => {
      const candles = data?.candles ?? []
      if (candles.length > 1) returnsMap[t] = candles.map((c: any) => c.close)
    })

    const base = returnsMap[ticker]
    if (!base) return { mostCorrelated: [], leastCorrelated: [] }

    const corrs = peers
      .filter(p => returnsMap[p])
      .map(p => ({ ticker: p, corr: pearson(base, returnsMap[p]) }))
      .sort((a, b) => b.corr - a.corr)

    return {
      mostCorrelated:  corrs.slice(0, 5),
      leastCorrelated: corrs.slice(-5).reverse(),
    }
  }, [candlesQuery.data, ticker, peers])

  const isLoading = candlesQuery.isLoading || !candlesQuery.data

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitCompare size={14} className="text-accent-cyan" />
        <p className="font-display font-semibold text-sm text-text-primary">Correlated Movers</p>
        <p className="text-[10px] text-text-muted font-mono ml-auto">1M daily returns</p>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-7 rounded bg-bg-hover animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Most correlated */}
          <div>
            <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <TrendingUp size={9} className="text-accent-cyan" /> Moves with
            </p>
            <div className="space-y-1">
              {mostCorrelated.map(({ ticker: t, corr }) => (
                <button key={t}
                  onClick={() => navigate(`/compare?tickers=${ticker},${t}`)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-lg hover:bg-bg-hover transition-colors group">
                  <span className="font-mono font-bold text-xs text-text-primary group-hover:text-accent-cyan transition-colors">{t}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1 rounded-full bg-bg-hover overflow-hidden">
                      <div className="h-full bg-accent-cyan rounded-full"
                        style={{ width: `${Math.abs(corr) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-accent-cyan">{corr.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Least correlated (best hedges) */}
          <div>
            <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <TrendingDown size={9} className="text-accent-red" /> Moves opposite
            </p>
            <div className="space-y-1">
              {leastCorrelated.map(({ ticker: t, corr }) => (
                <button key={t}
                  onClick={() => navigate(`/compare?tickers=${ticker},${t}`)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-lg hover:bg-bg-hover transition-colors group">
                  <span className="font-mono font-bold text-xs text-text-primary group-hover:text-accent-red transition-colors">{t}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1 rounded-full bg-bg-hover overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          width: `${Math.abs(corr) * 100}%`,
                          background: corr < 0 ? '#ff3c5a' : '#ffb020',
                        }} />
                    </div>
                    <span className={cn('font-mono text-[10px]', corr < -0.3 ? 'text-accent-red' : 'text-accent-amber')}>
                      {corr.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-[9px] text-text-muted font-mono mt-3">Click any ticker to open comparison chart</p>
    </div>
  )
}
