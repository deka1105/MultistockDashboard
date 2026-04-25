import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Plus, GitCompare, Trash2, GripVertical } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useMultiCandles } from '@/hooks/useStockData'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'

const SERIES_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6',
]

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore()
  const [newTicker, setNewTicker] = useState('')

  const candlesQuery = useMultiCandles(watchlist, '1W')
  const candlesMap: Record<string, { close: number }[]> = {}
  candlesQuery.data?.forEach(({ ticker, data }) => {
    if (data?.candles) candlesMap[ticker] = data.candles
  })

  const handleAdd = () => {
    const t = newTicker.trim().toUpperCase()
    if (t) { addToWatchlist(t); setNewTicker('') }
  }

  const handleCompareAll = () => {
    if (watchlist.length >= 2)
      navigate(`/compare?tickers=${watchlist.slice(0, 8).join(',')}`)
  }

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-accent-amber" />
          <h1 className="font-display font-bold text-xl text-text-primary">Watchlist</h1>
          <span className="font-mono text-xs text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">
            {watchlist.length} tickers
          </span>
        </div>
        <div className="flex items-center gap-2">
          {watchlist.length >= 2 && (
            <button onClick={handleCompareAll} className="btn-ghost flex items-center gap-1.5 text-xs">
              <GitCompare size={13} /> Compare All
            </button>
          )}
          {watchlist.length > 0 && (
            <button
              onClick={() => watchlist.forEach(t => removeFromWatchlist(t))}
              className="btn-ghost flex items-center gap-1.5 text-xs text-accent-red hover:bg-accent-red/10"
            >
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Add ticker */}
      <div className="card p-3 flex items-center gap-2">
        <input
          value={newTicker}
          onChange={e => setNewTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add ticker symbol (e.g. GOOGL)"
          className="input-base flex-1"
          maxLength={10}
        />
        <button onClick={handleAdd} disabled={!newTicker.trim()} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Grid */}
      {watchlist.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Star size={32} className="text-text-muted" />
          <div>
            <p className="text-text-primary font-semibold mb-1">Your watchlist is empty</p>
            <p className="text-text-muted text-sm">Add tickers above or click ☆ on any stock page</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {watchlist.map((ticker, i) => (
            <WatchlistCard
              key={ticker}
              ticker={ticker}
              color={SERIES_COLORS[i % SERIES_COLORS.length]}
              onRemove={() => removeFromWatchlist(ticker)}
              candles={candlesMap[ticker]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
