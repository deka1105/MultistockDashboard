import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, Plus, GitCompare, Star, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'
import { useScreener, useScreenerPresets, useScreenerFields, useQuickWatchlist } from '@/hooks/useStockData'
import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'
import { Skeleton } from '@/components/common/Skeleton'

interface Filter { field: string; operator: string; value: string | number }

const SIGNAL_CONFIG: Record<string, { label: string; cls: string }> = {
  strong_buy: { label: 'Strong Buy', cls: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
  buy:        { label: 'Buy',        cls: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  hold:       { label: 'Hold',       cls: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  watch:      { label: 'Watch',      cls: 'bg-accent-cyan/10  text-accent-cyan  border-accent-cyan/20'  },
  sell:       { label: 'Sell',       cls: 'bg-accent-red/10   text-accent-red   border-accent-red/20'   },
}

function FilterChip({ filter, fields, onRemove }: { filter: Filter; fields: any[]; onRemove: () => void }) {
  const fieldLabel = fields.find(f => f.key === filter.field)?.label ?? filter.field
  const opMap: Record<string, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', neq: '≠' }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-cyan/8 border border-accent-cyan/20 text-xs font-mono text-accent-cyan">
      <span>{fieldLabel} {opMap[filter.operator] ?? filter.operator} {filter.value}</span>
      <button onClick={onRemove} className="hover:text-white transition-colors"><X size={10} /></button>
    </div>
  )
}

function AddFilterModal({ fields, onAdd, onClose }: { fields: any[]; onAdd: (f: Filter) => void; onClose: () => void }) {
  const [field, setField]    = useState(fields[0]?.key ?? 'pe_ratio')
  const [operator, setOp]    = useState('lt')
  const [value, setValue]    = useState('')

  const isText = ['sector', 'exchange'].includes(field)
  const numericOps = ['gt', 'gte', 'lt', 'lte']
  const allOps     = ['gt', 'gte', 'lt', 'lte', 'eq', 'neq']
  const ops = isText ? ['eq', 'neq'] : numericOps
  const opLabels: Record<string, string> = { gt: 'greater than (>)', gte: '≥ at least', lt: 'less than (<)', lte: '≤ at most', eq: 'equals', neq: 'not equals' }

  const handleAdd = () => {
    if (!value) return
    onAdd({ field, operator, value: isText ? value : parseFloat(value) })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-surface border border-bg-border rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold text-text-primary">Add Filter</p>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary"><X size={14} /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="stat-label">Field</label>
            <select value={field} onChange={e => { setField(e.target.value); setOp(isText ? 'eq' : 'lt') }}
              className="input-base w-full">
              {fields.map((f: any) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="stat-label">Condition</label>
            <select value={operator} onChange={e => setOp(e.target.value)} className="input-base w-full">
              {ops.map(op => <option key={op} value={op}>{opLabels[op]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="stat-label">Value</label>
            <input value={value} onChange={e => setValue(e.target.value)}
              type={isText ? 'text' : 'number'}
              placeholder={isText ? 'Technology' : '30'}
              className="input-base w-full" autoFocus />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button onClick={handleAdd} disabled={!value} className="btn-primary flex-1 justify-center">Add Filter</button>
        </div>
      </div>
    </div>
  )
}

export default function ScreenerPage() {
  const navigate = useNavigate()
  const [filters, setFilters]   = useState<Filter[]>([])
  const [showModal, setShowModal] = useState(false)
  const [sortBy, setSortBy]     = useState('market_cap')
  const [sortDir, setSortDir]   = useState<'asc'|'desc'>('desc')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: presetsData } = useScreenerPresets()
  const { data: fieldsData }  = useScreenerFields()
  const { data, isLoading, refetch } = useScreener(filters, sortBy, sortDir, page)
  const { add: quickAdd }     = useQuickWatchlist()

  const fields = fieldsData?.fields ?? []

  const applyPreset = (preset: any) => {
    setFilters(preset.filters)
    setPage(1)
  }

  const removeFilter = useCallback((i: number) => {
    setFilters(f => f.filter((_, idx) => idx !== i))
    setPage(1)
  }, [])

  const handleSort = (col: string) => {
    if (col === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
    setPage(1)
  }

  const toggleSelect = (ticker: string) =>
    setSelected(s => { const n = new Set(s); n.has(ticker) ? n.delete(ticker) : n.add(ticker); return n })

  const Th = ({ label, col }: { label: string; col: string }) => (
    <th onClick={() => handleSort(col)}
      className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none whitespace-nowrap">
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && (sortDir === 'asc' ? <ChevronUp size={10} className="text-accent-cyan" /> : <ChevronDown size={10} className="text-accent-cyan" />)}
      </span>
    </th>
  )

  const results = data?.results ?? []

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-accent-cyan" />
          <h1 className="font-display font-bold text-xl text-text-primary">Screener</h1>
          {data && <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">{data.total} results</span>}
        </div>
        <div className="flex items-center gap-2">
          {selected.size >= 2 && (
            <button onClick={() => navigate(`/compare?tickers=${[...selected].join(',')}`)}
              className="btn-ghost flex items-center gap-1.5 text-xs">
              <GitCompare size={13} /> Compare ({selected.size})
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={() => [...selected].forEach(t => quickAdd.mutate(t))}
              className="btn-ghost flex items-center gap-1.5 text-xs">
              <Star size={13} /> Watch All
            </button>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={13} /> Add Filter
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {(presetsData?.presets ?? []).map((preset: any) => (
          <button key={preset.id} onClick={() => applyPreset(preset)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-bg-border text-text-secondary hover:text-text-primary hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-all">
            {preset.name}
          </button>
        ))}
      </div>

      {/* Active filter chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f, i) => (
            <FilterChip key={i} filter={f} fields={fields} onRemove={() => removeFilter(i)} />
          ))}
          <button onClick={() => { setFilters([]); setPage(1) }}
            className="text-[10px] text-text-muted hover:text-accent-red font-mono transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* Results table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : results.length === 0 ? (
          <div className="p-16 text-center text-text-muted text-sm">
            {filters.length > 0 ? 'No stocks match your filters — try relaxing the criteria' : 'Add filters above to screen stocks'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-bg-border">
                <tr>
                  <th className="w-8 py-2.5 px-3">
                    <input type="checkbox" checked={selected.size === results.length && results.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(results.map((r: any) => r.ticker)) : new Set())}
                      className="rounded border-bg-border" />
                  </th>
                  <Th label="Ticker"    col="ticker" />
                  <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium">Company</th>
                  <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium hidden md:table-cell">Sector</th>
                  <Th label="Price"     col="price" />
                  <Th label="Change %"  col="change_pct" />
                  <Th label="Mkt Cap"   col="market_cap" />
                  <Th label="P/E"       col="pe_ratio" />
                  <Th label="Beta"      col="beta" />
                  <Th label="RSI"       col="rsi" />
                  <th className="text-left py-2.5 px-3 text-[9px] uppercase tracking-widest text-text-muted font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row: any) => {
                  const sig = SIGNAL_CONFIG[row.signal] ?? null
                  const isSel = selected.has(row.ticker)
                  return (
                    <tr key={row.ticker}
                      onClick={() => navigate(`/dashboard/${row.ticker}`)}
                      className={cn('border-b border-bg-border/40 last:border-0 hover:bg-bg-hover cursor-pointer transition-colors', isSel && 'bg-accent-cyan/5')}>
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(row.ticker)} className="rounded border-bg-border" />
                      </td>
                      <td className="py-2.5 px-3 font-display font-bold text-text-primary">{row.ticker}</td>
                      <td className="py-2.5 px-3 text-text-secondary text-xs max-w-36 truncate">{row.company_name ?? '—'}</td>
                      <td className="py-2.5 px-3 text-text-muted text-xs hidden md:table-cell">{row.sector ?? '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-xs font-semibold text-text-primary">{formatPrice(row.price)}</td>
                      <td className={cn('py-2.5 px-3 font-mono text-xs font-semibold', getPriceClass(row.change_pct))}>{formatPct(row.change_pct)}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-text-secondary">
                        {row.market_cap ? `$${(row.market_cap / 1000).toFixed(0)}B` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-text-secondary">{row.pe_ratio?.toFixed(1) ?? '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-text-secondary">{row.beta?.toFixed(2) ?? '—'}</td>
                      <td className="py-2.5 px-3">
                        {row.rsi != null && (
                          <span className={cn('font-mono text-xs font-semibold',
                            row.rsi >= 70 ? 'text-accent-red' : row.rsi <= 30 ? 'text-accent-green' : 'text-accent-amber')}>
                            {row.rsi.toFixed(0)}
                          </span>
                        )}
                        {row.rsi == null && <span className="text-text-muted text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {sig && (
                          <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-full border', sig.cls)}>
                            {sig.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-bg-border">
            <span className="text-xs text-text-muted font-mono">Page {page} of {data.pages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-xs px-2 py-1 disabled:opacity-40">←</button>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-ghost text-xs px-2 py-1 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddFilterModal fields={fields} onAdd={f => { setFilters(prev => [...prev, f]); setPage(1) }} onClose={() => setShowModal(false)} />}
    </div>
  )
}
