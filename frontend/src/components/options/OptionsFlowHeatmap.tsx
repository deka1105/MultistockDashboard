import { useState, useMemo } from 'react'
import { useOptionsChain } from '@/hooks/useStockData'
import { formatPrice, cn } from '@/lib/utils'

type Mode = 'all' | 'calls' | 'puts'

// Color intensity for a normalised 0–1 value
function cellBg(value: number, side: 'call' | 'put', opacity?: number): string {
  const base  = side === 'call' ? '34,197,94' : '239,68,68'   // green / red
  const alpha = Math.max(0.05, Math.min(0.85, value * 0.85)) * (opacity ?? 1)
  return `rgba(${base},${alpha})`
}

interface Props { ticker: string }

export default function OptionsFlowHeatmap({ ticker }: Props) {
  const [mode,    setMode]    = useState<Mode>('all')
  const [metric,  setMetric]  = useState<'oi' | 'volume'>('oi')
  const [hovCell, setHovCell] = useState<null | {
    expiry: string; strike: number; row: Record<string, number>
  }>(null)

  const { data, isLoading } = useOptionsChain(ticker)

  // Normalise OI/volume per column (per expiry) so colour scales independently
  const { normMap, maxValues } = useMemo(() => {
    if (!data) return { normMap: new Map(), maxValues: {} }
    const maxValues: Record<string, number> = {}
    data.expiries.forEach((exp: string) => {
      const rows = data.chain.filter((r: any) => r.expiry === exp)
      const callMax = Math.max(...rows.map((r: any) => metric === 'oi' ? r.call_oi : r.call_volume), 1)
      const putMax  = Math.max(...rows.map((r: any) => metric === 'oi' ? r.put_oi  : r.put_volume), 1)
      maxValues[`${exp}_call`] = callMax
      maxValues[`${exp}_put`]  = putMax
    })
    // Build key → normalised [call, put]
    const normMap = new Map<string, [number, number]>()
    data.chain.forEach((r: any) => {
      const callVal = metric === 'oi' ? r.call_oi : r.call_volume
      const putVal  = metric === 'oi' ? r.put_oi  : r.put_volume
      normMap.set(`${r.expiry}_${r.strike}`, [
        callVal / (maxValues[`${r.expiry}_call`] || 1),
        putVal  / (maxValues[`${r.expiry}_put`]  || 1),
      ])
    })
    return { normMap, maxValues }
  }, [data, metric])

  // Build lookup: expiry+strike → row
  const rowMap = useMemo(() => {
    const m = new Map<string, any>()
    data?.chain?.forEach((r: any) => m.set(`${r.expiry}_${r.strike}`, r))
    return m
  }, [data])

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="h-6 w-48 bg-bg-hover rounded animate-pulse mb-3" />
        <div className="h-64 bg-bg-hover rounded animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  const strikes: number[]  = data.strikes  ?? []
  const expiries: string[] = data.expiries  ?? []
  const maxPain: number    = data.max_pain_strike
  const currentPrice: number = data.current_price

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-display font-semibold text-sm text-text-primary">
            Options Flow — {ticker}
          </p>
          <p className="text-[10px] text-text-muted font-mono">
            Current: <span className="text-text-primary">{formatPrice(currentPrice)}</span>
            &nbsp;·&nbsp;Max Pain: <span className="text-accent-amber">{formatPrice(maxPain)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-hover">
            {(['oi', 'volume'] as const).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={cn('px-2.5 py-1 rounded-md text-[10px] font-mono uppercase transition-all',
                  metric === m ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                )}>{m === 'oi' ? 'Open Interest' : 'Volume'}</button>
            ))}
          </div>
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-hover">
            {(['all', 'calls', 'puts'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('px-2.5 py-1 rounded-md text-[10px] font-mono capitalize transition-all',
                  mode === m ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                )}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="text-[10px] font-mono border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th className="text-right pr-2 text-text-muted font-normal">Strike</th>
              {expiries.map(exp => {
                const pcRatio = data.expiry_pc_ratio?.[exp] ?? 1
                const pcColor = pcRatio > 1.2 ? 'text-accent-red' : pcRatio < 0.8 ? 'text-accent-green' : 'text-text-muted'
                return (
                  <th key={exp} className="px-1 text-center min-w-[52px]">
                    <div className="text-text-muted">{exp.slice(5)}</div>
                    <div className={cn('text-[9px]', pcColor)}>P/C {pcRatio.toFixed(2)}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {strikes.map(strike => {
              const isMaxPain = strike === maxPain
              const isATM     = Math.abs(strike - currentPrice) / currentPrice < 0.025

              return (
                <tr key={strike}
                  className={cn(
                    isMaxPain && 'outline outline-1 outline-accent-amber/50',
                    isATM     && 'outline outline-1 outline-accent-cyan/30',
                  )}>
                  {/* Strike label */}
                  <td className={cn(
                    'pr-2 py-0.5 text-right font-semibold',
                    isATM     && 'text-accent-cyan',
                    isMaxPain && 'text-accent-amber',
                    !isATM && !isMaxPain && 'text-text-secondary',
                  )}>
                    {formatPrice(strike)}
                    {isATM     && <span className="ml-1 text-accent-cyan/70">←</span>}
                    {isMaxPain && <span className="ml-1 text-accent-amber/70">★</span>}
                  </td>

                  {/* Expiry cells */}
                  {expiries.map(exp => {
                    const row  = rowMap.get(`${exp}_${strike}`)
                    const norm = normMap.get(`${exp}_${strike}`) ?? [0, 0]
                    const callN = norm[0], putN = norm[1]
                    const callVal = metric === 'oi' ? row?.call_oi : row?.call_volume
                    const putVal  = metric === 'oi' ? row?.put_oi  : row?.put_volume

                    return (
                      <td key={exp} className="px-0.5 py-0.5">
                        <div className="flex gap-0.5"
                          onMouseEnter={() => row && setHovCell({ expiry: exp, strike, row })}
                          onMouseLeave={() => setHovCell(null)}>

                          {/* Call cell */}
                          {mode !== 'puts' && (
                            <div
                              className="flex items-center justify-center rounded text-[8px] font-bold cursor-default transition-all"
                              style={{
                                width: 24, height: 20,
                                background: cellBg(callN, 'call'),
                                color: callN > 0.5 ? '#fff' : 'rgba(255,255,255,0.6)',
                              }}>
                              {callVal ? (callVal >= 1000 ? `${(callVal/1000).toFixed(0)}k` : callVal) : '—'}
                            </div>
                          )}

                          {/* Put cell */}
                          {mode !== 'calls' && (
                            <div
                              className="flex items-center justify-center rounded text-[8px] font-bold cursor-default transition-all"
                              style={{
                                width: 24, height: 20,
                                background: cellBg(putN, 'put'),
                                color: putN > 0.5 ? '#fff' : 'rgba(255,255,255,0.6)',
                              }}>
                              {putVal ? (putVal >= 1000 ? `${(putVal/1000).toFixed(0)}k` : putVal) : '—'}
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Hover tooltip */}
      {hovCell && (() => {
        const r = hovCell.row
        return (
          <div className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-[10px] font-mono space-y-0.5">
            <p className="font-bold text-text-primary">
              {ticker} {formatPrice(hovCell.strike)} · {hovCell.expiry} · {r.dte}d
            </p>
            <div className="grid grid-cols-2 gap-x-4">
              <span className="text-accent-green">Call OI: {r.call_oi?.toLocaleString()}</span>
              <span className="text-accent-red">  Put OI: {r.put_oi?.toLocaleString()}</span>
              <span className="text-accent-green">Call Vol: {r.call_volume?.toLocaleString()}</span>
              <span className="text-accent-red">  Put Vol: {r.put_volume?.toLocaleString()}</span>
              <span className="text-text-muted">  Call IV: {((r.call_iv ?? 0) * 100).toFixed(1)}%</span>
              <span className="text-text-muted">  Put IV: {((r.put_iv  ?? 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        )
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] font-mono text-text-muted flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: 'rgba(34,197,94,0.5)' }} /> Calls
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.5)' }} /> Puts
        </span>
        <span className="flex items-center gap-1 text-accent-cyan">← ATM price</span>
        <span className="flex items-center gap-1 text-accent-amber">★ Max pain ({formatPrice(maxPain)})</span>
        <span className="ml-auto">Darker = higher {metric === 'oi' ? 'open interest' : 'volume'}</span>
      </div>
    </div>
  )
}
