import { useState, useEffect } from 'react'
import { X, Search, Plus } from 'lucide-react'
import { useSearch, useStockQuote, useAddPosition } from '@/hooks/useStockData'
import { useDebounce } from '@/hooks/useDebounce'
import { formatPrice, cn } from '@/lib/utils'

interface Props {
  portfolioId: number
  onClose: () => void
}

export default function AddPositionModal({ portfolioId, onClose }: Props) {
  const [query,    setQuery]    = useState('')
  const [ticker,   setTicker]   = useState('')
  const [shares,   setShares]   = useState('')
  const [avgCost,  setAvgCost]  = useState('')
  const [notes,    setNotes]    = useState('')
  const [error,    setError]    = useState('')

  const debounced = useDebounce(query, 300)
  const { data: searchData } = useSearch(debounced)
  const { data: quoteData }  = useStockQuote(ticker || undefined)
  const addPosition = useAddPosition()

  // Pre-fill cost with current price when ticker selected
  useEffect(() => {
    if (quoteData?.price && !avgCost) {
      setAvgCost(quoteData.price.toFixed(2))
    }
  }, [quoteData?.price])

  const handleSelect = (t: string) => {
    setTicker(t)
    setQuery(t)
    setAvgCost('')  // reset so useEffect can fill from quote
  }

  const handleSubmit = () => {
    setError('')
    const s = parseFloat(shares)
    const c = parseFloat(avgCost)
    if (!ticker) { setError('Select a ticker'); return }
    if (isNaN(s) || s <= 0) { setError('Enter valid number of shares'); return }
    if (isNaN(c) || c <= 0) { setError('Enter valid cost basis per share'); return }

    addPosition.mutate(
      { portfolioId, ticker, shares: s, avg_cost: c, notes: notes || undefined },
      {
        onSuccess: onClose,
        onError: () => setError('Failed to add position — try again'),
      }
    )
  }

  const results = searchData?.results?.slice(0, 6) ?? []
  const showDropdown = debounced.length >= 1 && results.length > 0 && !ticker

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-surface border border-bg-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Plus size={15} className="text-accent-cyan" />
            <p className="font-display font-semibold text-text-primary">Add Position</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Ticker search */}
          <div className="space-y-1.5">
            <label className="stat-label">Ticker</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setTicker('') }}
                placeholder="AAPL, MSFT, NVDA…"
                className="input-base pl-9 w-full"
                autoFocus
              />
              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-bg-border rounded-xl shadow-2xl shadow-black/60 z-10 overflow-hidden">
                  {results.map((r: any) => (
                    <button key={r.ticker} onClick={() => handleSelect(r.ticker)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left">
                      <span className="font-mono font-bold text-sm text-text-primary w-16">{r.ticker}</span>
                      <span className="text-xs text-text-secondary truncate">{r.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Current price hint */}
            {quoteData?.price && (
              <p className="text-[10px] text-text-muted font-mono">
                Current price: <span className="text-text-primary">{formatPrice(quoteData.price)}</span>
              </p>
            )}
          </div>

          {/* Shares + Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="stat-label">Shares</label>
              <input
                type="number" value={shares} onChange={e => setShares(e.target.value)}
                placeholder="100" min="0" step="any"
                className="input-base w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="stat-label">Avg Cost / Share</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                <input
                  type="number" value={avgCost} onChange={e => setAvgCost(e.target.value)}
                  placeholder="189.50" min="0" step="any"
                  className="input-base pl-6 w-full"
                />
              </div>
            </div>
          </div>

          {/* Cost basis preview */}
          {shares && avgCost && !isNaN(parseFloat(shares)) && !isNaN(parseFloat(avgCost)) && (
            <div className="bg-bg-hover rounded-lg px-3 py-2 flex justify-between">
              <span className="text-xs text-text-muted">Total cost basis</span>
              <span className="font-mono text-xs text-text-primary font-semibold">
                {formatPrice(parseFloat(shares) * parseFloat(avgCost))}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="stat-label">Notes <span className="text-text-muted">(optional)</span></label>
            <input
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Long-term hold, DCA entry"
              className="input-base w-full"
              maxLength={200}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-accent-red font-mono">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={addPosition.isPending}
              className="btn-primary flex-1 justify-center flex items-center gap-1.5">
              <Plus size={13} />
              {addPosition.isPending ? 'Adding…' : 'Add Position'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
