import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Check, X, Download } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'
import { useUpdatePosition, useDeletePosition, useMultiCandles } from '@/hooks/useStockData'
import type { EnrichedPosition } from '@/types/stock'

type SortKey = 'ticker' | 'value' | 'pnl_pct' | 'today_pct' | 'weight_pct'
type SortDir = 'asc' | 'desc'

function Sparkline({ candles, isUp }: { candles?: { close: number }[]; isUp: boolean }) {
  if (!candles || candles.length < 2) return <div className="w-14 h-7 bg-bg-hover rounded animate-pulse" />
  return (
    <div className="w-14 h-7">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={candles}>
          <Line type="monotone" dataKey="close"
            stroke={isUp ? '#00ff88' : '#ff3b5c'} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: SortDir }) {
  if (col !== current) return <ArrowUpDown size={10} className="opacity-30" />
  return dir === 'asc' ? <ArrowUp size={10} className="text-accent-cyan" /> : <ArrowDown size={10} className="text-accent-cyan" />
}

interface EditState {
  positionId: number
  shares: string
  avg_cost: string
}


function exportToCSV(positions: EnrichedPosition[]) {
  const headers = ['Ticker', 'Shares', 'Avg Cost', 'Current Price', 'Value', 'P&L $', 'P&L %', 'Today %', 'Weight %']
  const rows = positions.map(p => [
    p.ticker, p.shares, p.avg_cost, p.current_price,
    p.value.toFixed(2), p.pnl.toFixed(2),
    p.pnl_pct.toFixed(2), p.today_pct.toFixed(2), p.weight_pct.toFixed(2),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'holdings.csv'; a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  portfolioId: number
  positions: EnrichedPosition[]
}

export default function HoldingsTable({ portfolioId, positions }: Props) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [editState, setEditState] = useState<EditState | null>(null)

  const updatePos = useUpdatePosition()
  const deletePos = useDeletePosition()

  const tickers = positions.map(p => p.ticker)
  const candlesQuery = useMultiCandles(tickers, '1W')
  const candlesMap: Record<string, { close: number }[]> = {}
  candlesQuery.data?.forEach(({ ticker, data }: any) => {
    if (data?.candles) candlesMap[ticker] = data.candles
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...positions].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const commitEdit = (pos: EnrichedPosition) => {
    if (!editState) return
    const shares   = parseFloat(editState.shares)
    const avg_cost = parseFloat(editState.avg_cost)
    if (isNaN(shares) || isNaN(avg_cost) || shares <= 0 || avg_cost <= 0) {
      setEditState(null); return
    }
    updatePos.mutate({ portfolioId, positionId: pos.id, shares, avg_cost })
    setEditState(null)
  }

  const Th = ({ label, col }: { label: string; col: SortKey }) => (
    <th onClick={() => handleSort(col)}
      className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none whitespace-nowrap">
      <span className="flex items-center gap-1">
        {label} <SortIcon col={col} current={sortKey} dir={sortDir} />
      </span>
    </th>
  )

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <p className="font-display font-semibold text-sm text-text-primary">
          Holdings <span className="font-mono text-[10px] text-text-muted ml-2">{positions.length} positions</span>
        </p>
        {positions.length > 0 && (
          <button onClick={() => exportToCSV(positions)}
            className="flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors">
            <Download size={11} /> CSV
          </button>
        )}
      </div>

      {positions.length === 0 ? (
        <div className="p-12 text-center text-text-muted text-sm">
          No positions yet — add your first holding above
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-bg-border">
              <tr>
                <Th label="Ticker"  col="ticker" />
                <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium">Shares</th>
                <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium">Avg Cost</th>
                <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium">Current</th>
                <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium">Value</th>
                <Th label="P&L %"   col="pnl_pct" />
                <Th label="Today %"  col="today_pct" />
                <Th label="Weight"   col="weight_pct" />
                <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium hidden lg:table-cell">7D</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(pos => {
                const isEditing = editState?.positionId === pos.id
                const isUp = pos.pnl_pct >= 0
                const todayUp = pos.today_pct >= 0
                return (
                  <tr key={pos.id}
                    onClick={() => !isEditing && navigate(`/dashboard/${pos.ticker}`)}
                    className={cn(
                      'border-b border-bg-border/40 last:border-0 transition-colors',
                      isEditing ? 'bg-bg-hover' : 'hover:bg-bg-hover cursor-pointer'
                    )}>
                    {/* Ticker */}
                    <td className="py-3 px-3">
                      <span className="font-display font-bold text-text-primary">{pos.ticker}</span>
                    </td>

                    {/* Shares — inline editable */}
                    <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <input
                          value={editState.shares}
                          onChange={e => setEditState(s => s ? {...s, shares: e.target.value} : s)}
                          className="w-20 bg-bg-base border border-accent-cyan/30 rounded px-2 py-1 font-mono text-xs text-text-primary focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono text-xs text-text-secondary">{pos.shares}</span>
                      )}
                    </td>

                    {/* Avg cost — inline editable */}
                    <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <input
                          value={editState.avg_cost}
                          onChange={e => setEditState(s => s ? {...s, avg_cost: e.target.value} : s)}
                          className="w-20 bg-bg-base border border-accent-cyan/30 rounded px-2 py-1 font-mono text-xs text-text-primary focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono text-xs text-text-muted">{formatPrice(pos.avg_cost)}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-xs font-semibold text-text-primary">{formatPrice(pos.current_price)}</td>
                    <td className="py-3 px-3 font-mono text-xs text-text-primary">{formatPrice(pos.value)}</td>

                    {/* P&L % */}
                    <td className={cn('py-3 px-3 font-mono text-xs font-semibold', getPriceClass(pos.pnl_pct))}>
                      {isUp ? '▲' : '▼'} {formatPct(pos.pnl_pct)}
                    </td>

                    {/* Today % */}
                    <td className={cn('py-3 px-3 font-mono text-xs', getPriceClass(pos.today_pct))}>
                      {todayUp ? '+' : ''}{pos.today_pct.toFixed(2)}%
                    </td>

                    {/* Weight bar */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                          <div className="h-full bg-accent-cyan rounded-full transition-all"
                            style={{ width: `${Math.min(pos.weight_pct, 100)}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-text-muted">{pos.weight_pct.toFixed(1)}%</span>
                      </div>
                    </td>

                    {/* Sparkline */}
                    <td className="py-2 px-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                      <Sparkline candles={candlesMap[pos.ticker]} isUp={isUp} />
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => commitEdit(pos)}
                              className="p-1 rounded text-accent-green hover:bg-accent-green/10 transition-colors">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setEditState(null)}
                              className="p-1 rounded text-text-muted hover:bg-bg-hover transition-colors">
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditState({
                                positionId: pos.id,
                                shares: String(pos.shares),
                                avg_cost: String(pos.avg_cost),
                              })}
                              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100">
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${pos.ticker}?`))
                                  deletePos.mutate({ portfolioId, positionId: pos.id })
                              }}
                              className="p-1 rounded text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
