import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMultiCandles } from '@/hooks/useStockData'
import { cn } from '@/lib/utils'

// S&P 50 tickers — same list as backend SP500_TOP50
const SP50 = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','JPM','V','UNH',
  'XOM','MA','AVGO','JNJ','PG','HD','MRK','COST','ABBV','CVX',
  'KO','PEP','WMT','BAC','CRM','NFLX','AMD','ORCL','CSCO','ACN',
  'MCD','NKE','ADBE','TMO','ABT','TXN','NEE','PM','RTX','QCOM',
  'HON','LIN','IBM','GS','CAT','AMGN','SBUX','INTU','LOW','DE',
]

// Sector grouping for cluster coloring
const SECTOR: Record<string, string> = {
  AAPL:'Tech',MSFT:'Tech',NVDA:'Tech',META:'Tech',GOOGL:'Tech',AVGO:'Tech',
  AMD:'Tech',ORCL:'Tech',CSCO:'Tech',ACN:'Tech',ADBE:'Tech',TXN:'Tech',
  QCOM:'Tech',IBM:'Tech',INTU:'Tech',
  AMZN:'Cons',TSLA:'Cons',HD:'Cons',COST:'Cons',MCD:'Cons',
  NKE:'Cons',SBUX:'Cons',LOW:'Cons',
  JPM:'Fin',V:'Fin',MA:'Fin',BAC:'Fin',GS:'Fin',
  UNH:'Health',JNJ:'Health',MRK:'Health',ABBV:'Health',TMO:'Health',ABT:'Health',AMGN:'Health',
  XOM:'Energy',CVX:'Energy',
  PG:'Staple',KO:'Staple',PEP:'Staple',WMT:'Staple',PM:'Staple',
  CRM:'SaaS',NFLX:'Comm',
  NEE:'Util',RTX:'Ind',HON:'Ind',LIN:'Ind',CAT:'Ind',DE:'Ind',
}

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

function corrBg(v: number): string {
  const abs = Math.abs(v)
  if (v >= 0.7)  return `rgba(0,196,255,${0.12 + abs * 0.4})`
  if (v >= 0.3)  return `rgba(0,196,255,${0.05 + abs * 0.15})`
  if (v >= -0.3) return 'rgba(30,42,58,0.4)'
  if (v >= -0.7) return `rgba(255,176,32,${0.05 + abs * 0.15})`
  return `rgba(255,60,90,${0.12 + abs * 0.4})`
}

interface Props {
  /** When passed, show the condensed version suitable for the Compare page */
  condensed?: boolean
  /** Tickers to use when condensed=true */
  tickers?: string[]
}

export default function SP500CorrelationHeatmap({ condensed = false, tickers }: Props) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<{ row: string; col: string; val: number } | null>(null)
  const [zoomSector, setZoomSector] = useState<string | null>(null)

  const activeTickers = condensed && tickers?.length ? tickers : SP50

  // Batch fetch 1M candles — the multi-candles hook fetches up to N tickers
  // For the full S&P50 grid we fetch in the background (stale time = 5min)
  const candlesQuery = useMultiCandles(activeTickers, '1M')

  const returnsMap = useMemo(() => {
    const map: Record<string, number[]> = {}
    if (!candlesQuery.data) return map
    ;(candlesQuery.data as any[]).forEach(({ ticker, data }: any) => {
      const candles = data?.candles ?? []
      if (candles.length > 1) {
        map[ticker] = candles.map((c: any) => c.close)
      }
    })
    return map
  }, [candlesQuery.data])

  // Build correlation matrix
  const matrix = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    activeTickers.forEach(a => {
      result[a] = {}
      activeTickers.forEach(b => {
        if (a === b) { result[a][b] = 1; return }
        if (result[b]?.[a] !== undefined) { result[a][b] = result[b][a]; return }
        const ra = returnsMap[a], rb = returnsMap[b]
        result[a][b] = ra && rb ? pearson(ra, rb) : 0
      })
    })
    return result
  }, [returnsMap, activeTickers])

  // Apply sector zoom filter
  const displayTickers = zoomSector
    ? activeTickers.filter(t => SECTOR[t] === zoomSector)
    : activeTickers

  const isLoading = candlesQuery.isLoading || !candlesQuery.data

  const CELL = condensed ? 20 : Math.max(12, Math.floor(480 / displayTickers.length))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-display font-semibold text-sm text-text-primary">
            {condensed ? 'Correlation Matrix' : 'S&P 50 Correlation Heatmap'}
          </p>
          <p className="text-[10px] text-text-muted font-mono">
            1-month daily return Pearson correlation
          </p>
        </div>
        {!condensed && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-text-muted font-mono mr-1">Zoom sector:</span>
            {['Tech','Fin','Health','Cons','Ind','Staple','Energy'].map(s => (
              <button key={s} onClick={() => setZoomSector(z => z === s ? null : s)}
                className={cn(
                  'px-2 py-0.5 rounded text-[9px] font-mono border transition-all',
                  zoomSector === s
                    ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan'
                    : 'border-bg-border text-text-muted hover:text-text-secondary'
                )}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="w-full h-48 rounded-xl bg-bg-hover animate-pulse" />
      ) : (
        <div className="overflow-auto">
          <div className="relative inline-block">
            {/* Column headers */}
            <div className="flex" style={{ marginLeft: CELL * 2 + 4 }}>
              {displayTickers.map(t => (
                <div key={t} style={{ width: CELL, minWidth: CELL }}
                  className="flex items-end justify-center pb-1">
                  {CELL >= 16 && (
                    <span className="text-[7px] font-mono text-text-muted"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
                      {t.slice(0, 4)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            {displayTickers.map(rowTicker => (
              <div key={rowTicker} className="flex items-center">
                {/* Row label */}
                <div style={{ width: CELL * 2, minWidth: CELL * 2 }}
                  className="flex items-center justify-end pr-1">
                  <span className="text-[8px] font-mono text-text-muted truncate">{rowTicker}</span>
                </div>
                {/* Cells */}
                {displayTickers.map(colTicker => {
                  const val = matrix[rowTicker]?.[colTicker] ?? 0
                  const isHov = hovered?.row === rowTicker || hovered?.col === colTicker
                  const isSelf = rowTicker === colTicker
                  return (
                    <div key={colTicker}
                      style={{
                        width: CELL, height: CELL, minWidth: CELL,
                        background: isSelf ? 'rgba(255,255,255,0.08)' : corrBg(val),
                        opacity: hovered && !isHov ? 0.5 : 1,
                        transition: 'opacity 0.1s',
                        cursor: isSelf ? 'default' : 'pointer',
                      }}
                      className="border border-bg-border/20 flex items-center justify-center"
                      onMouseEnter={() => !isSelf && setHovered({ row: rowTicker, col: colTicker, val })}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => {
                        if (!isSelf) navigate(`/compare?tickers=${rowTicker},${colTicker}`)
                      }}
                      title={isSelf ? rowTicker : `${rowTicker} / ${colTicker}: ${val.toFixed(2)}`}>
                      {CELL >= 20 && !isSelf && (
                        <span className="text-[7px] font-mono" style={{
                          color: val >= 0.5 ? '#00c4ff' : val <= -0.5 ? '#ff3c5a' : '#4b5563'
                        }}>
                          {val.toFixed(1)}
                        </span>
                      )}
                      {isSelf && CELL >= 14 && (
                        <span className="text-[7px] font-mono text-text-muted">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div className="text-xs font-mono text-text-secondary bg-bg-hover rounded-lg px-3 py-1.5 w-fit">
          <span className="text-text-primary font-bold">{hovered.row}</span>
          {' / '}
          <span className="text-text-primary font-bold">{hovered.col}</span>
          {' → '}
          <span className={hovered.val >= 0.5 ? 'text-accent-cyan' : hovered.val <= -0.5 ? 'text-accent-red' : 'text-text-muted'}>
            {hovered.val.toFixed(2)}
          </span>
          <span className="text-text-muted ml-2">Click to compare →</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] font-mono text-text-muted">
        <span>−1.0</span>
        <div className="flex-1 h-1.5 rounded-full" style={{
          background: 'linear-gradient(90deg,rgba(255,60,90,0.7),rgba(30,42,58,0.6),rgba(0,196,255,0.7))'
        }} />
        <span>+1.0</span>
        <span className="ml-2 text-text-muted">cyan = correlated · red = inverse · click = compare</span>
      </div>
    </div>
  )
}
