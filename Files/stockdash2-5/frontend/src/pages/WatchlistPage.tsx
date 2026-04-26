import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, Plus, GitCompare, Trash2, GripVertical, Pencil, Check, X, FolderPlus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useMultiCandles } from '@/hooks/useStockData'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'
import { cn } from '@/lib/utils'

const SERIES_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6',
]

// ─── Sortable wrapper ────────────────────────────────────────────────────────

function SortableCard({
  ticker, index, color, candles, onRemove,
}: {
  ticker: string; index: number; color: string
  candles?: { close: number }[]; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticker })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-50 opacity-80 scale-105')}
    >
      {/* Drag handle */}
      <div
        {...attributes} {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded cursor-grab active:cursor-grabbing text-text-muted opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      >
        <GripVertical size={12} />
      </div>
      <WatchlistCard ticker={ticker} color={color} candles={candles} onRemove={onRemove} />
    </div>
  )
}

// ─── Named list tab ───────────────────────────────────────────────────────────

interface WatchlistTab {
  id: string
  name: string
}

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore()

  // Named lists — stored locally (PostgreSQL in Phase 5 when auth lands)
  const [lists, setLists] = useState<WatchlistTab[]>([{ id: 'default', name: 'My Watchlist' }])
  const [activeListId, setActiveListId] = useState('default')
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newTicker, setNewTicker] = useState('')
  const [order, setOrder] = useState<string[]>(watchlist)

  // Sync order when watchlist changes externally
  const syncedOrder = order.filter(t => watchlist.includes(t))
  const unordered = watchlist.filter(t => !syncedOrder.includes(t))
  const displayOrder = [...syncedOrder, ...unordered]

  const candlesQuery = useMultiCandles(displayOrder, '1W')
  const candlesMap: Record<string, { close: number }[]> = {}
  candlesQuery.data?.forEach(({ ticker, data }: any) => {
    if (data?.candles) candlesMap[ticker] = data.candles
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = displayOrder.indexOf(active.id as string)
      const newIdx = displayOrder.indexOf(over.id as string)
      setOrder(arrayMove(displayOrder, oldIdx, newIdx))
    }
  }

  const handleAdd = () => {
    const t = newTicker.trim().toUpperCase()
    if (t) { addToWatchlist(t); setOrder(prev => [...prev, t]); setNewTicker('') }
  }

  const handleRemove = (ticker: string) => {
    removeFromWatchlist(ticker)
    setOrder(prev => prev.filter(t => t !== ticker))
  }

  const addList = () => {
    const id = `list-${Date.now()}`
    setLists(prev => [...prev, { id, name: `List ${prev.length + 1}` }])
    setActiveListId(id)
  }

  const deleteList = (id: string) => {
    if (lists.length === 1) return
    setLists(prev => prev.filter(l => l.id !== id))
    if (activeListId === id) setActiveListId(lists[0].id)
  }

  const startRename = (list: WatchlistTab) => {
    setEditingListId(list.id)
    setEditingName(list.name)
  }

  const commitRename = () => {
    if (editingName.trim()) {
      setLists(prev => prev.map(l => l.id === editingListId ? { ...l, name: editingName.trim() } : l))
    }
    setEditingListId(null)
  }

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-accent-amber" />
          <h1 className="font-display font-bold text-xl text-text-primary">Watchlist</h1>
          <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">
            {watchlist.length} tickers
          </span>
        </div>
        <div className="flex items-center gap-2">
          {watchlist.length >= 2 && (
            <button
              onClick={() => navigate(`/compare?tickers=${displayOrder.slice(0, 8).join(',')}`)}
              className="btn-ghost flex items-center gap-1.5 text-xs">
              <GitCompare size={13} /> Compare All
            </button>
          )}
        </div>
      </div>

      {/* Named list tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {lists.map(list => (
          <div key={list.id} className="flex items-center group">
            {editingListId === list.id ? (
              <div className="flex items-center gap-1 px-2 py-1 card">
                <input
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingListId(null) }}
                  className="bg-transparent text-xs text-text-primary focus:outline-none w-24"
                  autoFocus
                />
                <button onClick={commitRename}><Check size={11} className="text-accent-green" /></button>
                <button onClick={() => setEditingListId(null)}><X size={11} className="text-text-muted" /></button>
              </div>
            ) : (
              <button
                onClick={() => setActiveListId(list.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeListId === list.id
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                {list.name}
                {activeListId === list.id && (
                  <span className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span onClick={e => { e.stopPropagation(); startRename(list) }}
                      className="hover:text-text-primary"><Pencil size={9} /></span>
                    {lists.length > 1 && (
                      <span onClick={e => { e.stopPropagation(); deleteList(list.id) }}
                        className="hover:text-accent-red"><X size={9} /></span>
                    )}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
        <button onClick={addList} className="btn-ghost flex items-center gap-1 text-xs px-2 py-1.5">
          <FolderPlus size={13} /> New List
        </button>
      </div>

      {/* Add ticker */}
      <div className="card p-3 flex items-center gap-2">
        <input
          value={newTicker}
          onChange={e => setNewTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add ticker (e.g. GOOGL) — drag cards to reorder"
          className="input-base flex-1"
          maxLength={10}
        />
        <button onClick={handleAdd} disabled={!newTicker.trim()} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Sortable grid */}
      {displayOrder.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Star size={32} className="text-text-muted" />
          <div>
            <p className="text-text-primary font-semibold mb-1">This list is empty</p>
            <p className="text-text-muted text-sm">Add tickers above or click ☆ on any stock page</p>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {displayOrder.map((ticker, i) => (
                <SortableCard
                  key={ticker}
                  ticker={ticker}
                  index={i}
                  color={SERIES_COLORS[i % SERIES_COLORS.length]}
                  candles={candlesMap[ticker]}
                  onRemove={() => handleRemove(ticker)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
