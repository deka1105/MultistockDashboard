import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, Plus, GitCompare, GripVertical, Pencil, Check, X, FolderPlus, Trash2 } from 'lucide-react'
import {
  useBackendWatchlists, useCreateWatchlist, useRenameWatchlist,
  useDeleteWatchlist, useAddWatchlistItem, useRemoveWatchlistItem,
  useReorderWatchlist, useMultiCandles,
} from '@/hooks/useStockData'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'
import { Skeleton } from '@/components/common/Skeleton'
import { cn } from '@/lib/utils'

const SERIES_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6',
]

// ─── Sortable card wrapper ────────────────────────────────────────────────────

function SortableCard({ ticker, index, color, candles, onRemove }: {
  ticker: string; index: number; color: string
  candles?: { close: number }[]; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticker })
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative group', isDragging && 'z-50 opacity-80 scale-105')}>
      <div {...attributes} {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded cursor-grab active:cursor-grabbing text-text-muted opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
        <GripVertical size={12} />
      </div>
      <WatchlistCard ticker={ticker} color={color} candles={candles} onRemove={onRemove} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const navigate = useNavigate()

  // Backend state
  const { data: lists, isLoading } = useBackendWatchlists()
  const createList   = useCreateWatchlist()
  const renameList   = useRenameWatchlist()
  const deleteList   = useDeleteWatchlist()
  const addItem      = useAddWatchlistItem()
  const removeItem   = useRemoveWatchlistItem()
  const reorderItems = useReorderWatchlist()

  // Local UI state
  const [activeId,     setActiveId]     = useState<number | null>(null)
  const [editingId,    setEditingId]    = useState<number | null>(null)
  const [editingName,  setEditingName]  = useState('')
  const [newTicker,    setNewTicker]    = useState('')
  const [localOrder,   setLocalOrder]   = useState<string[]>([])

  // Set first list active when data loads
  useEffect(() => {
    if (lists?.length && activeId === null) setActiveId(lists[0].id)
  }, [lists])

  // Sync local order from backend
  const activeList = lists?.find((l: any) => l.id === activeId)
  useEffect(() => {
    if (activeList) setLocalOrder(activeList.tickers)
  }, [activeList?.id, activeList?.tickers?.join(',')])

  const tickers = localOrder.length ? localOrder : (activeList?.tickers ?? [])

  const candlesQuery = useMultiCandles(tickers, '1W')
  const candlesMap: Record<string, { close: number }[]> = {}
  candlesQuery.data?.forEach(({ ticker, data }: any) => {
    if (data?.candles) candlesMap[ticker] = data.candles
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !activeId) return
    const oldIdx = tickers.indexOf(active.id as string)
    const newIdx = tickers.indexOf(over.id as string)
    const newOrder = arrayMove(tickers as string[], oldIdx, newIdx) as string[]
    setLocalOrder(newOrder as string[])
    reorderItems.mutate({ id: activeId, ticker_order: newOrder })
  }

  const handleAdd = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && activeId) {
      addItem.mutate({ id: activeId, ticker: t })
      setNewTicker('')
    }
  }

  const handleRemove = (ticker: string) => {
    if (activeId) removeItem.mutate({ id: activeId, ticker })
  }

  const handleCreateList = () => {
    createList.mutate(`List ${(lists?.length ?? 0) + 1}`, {
      onSuccess: (data: any) => setActiveId(data.id),
    })
  }

  const commitRename = () => {
    if (editingName.trim() && editingId) {
      renameList.mutate({ id: editingId, name: editingName.trim() })
    }
    setEditingId(null)
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-accent-amber" />
          <h1 className="font-display font-bold text-xl text-text-primary">Watchlist</h1>
          <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">
            {tickers.length} tickers
          </span>
        </div>
        {tickers.length >= 2 && (
          <button onClick={() => navigate(`/compare?tickers=${tickers.slice(0, 8).join(',')}`)}
            className="btn-ghost flex items-center gap-1.5 text-xs">
            <GitCompare size={13} /> Compare All
          </button>
        )}
      </div>

      {/* Named list tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {(lists ?? []).map((list: any) => (
          <div key={list.id} className="flex items-center group">
            {editingId === list.id ? (
              <div className="flex items-center gap-1 px-2 py-1 card">
                <input value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="bg-transparent text-xs text-text-primary focus:outline-none w-24" autoFocus />
                <button onClick={commitRename}><Check size={11} className="text-accent-green" /></button>
                <button onClick={() => setEditingId(null)}><X size={11} className="text-text-muted" /></button>
              </div>
            ) : (
              <button onClick={() => setActiveId(list.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeId === list.id
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}>
                {list.name}
                {activeId === list.id && (
                  <span className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span onClick={e => { e.stopPropagation(); setEditingId(list.id); setEditingName(list.name) }}
                      className="hover:text-text-primary"><Pencil size={9} /></span>
                    {(lists?.length ?? 0) > 1 && (
                      <span onClick={e => { e.stopPropagation(); deleteList.mutate(list.id); setActiveId(lists[0].id) }}
                        className="hover:text-accent-red"><Trash2 size={9} /></span>
                    )}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
        <button onClick={handleCreateList}
          className="btn-ghost flex items-center gap-1 text-xs px-2 py-1.5">
          <FolderPlus size={13} /> New List
        </button>
      </div>

      {/* Add ticker */}
      <div className="card p-3 flex items-center gap-2">
        <input value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add ticker (e.g. GOOGL) — drag cards to reorder"
          className="input-base flex-1" maxLength={10} />
        <button onClick={handleAdd} disabled={!newTicker.trim() || addItem.isPending}
          className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Sortable grid */}
      {tickers.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Star size={32} className="text-text-muted" />
          <div>
            <p className="text-text-primary font-semibold mb-1">This list is empty</p>
            <p className="text-text-muted text-sm">Add tickers above or click ☆ on any stock page</p>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tickers} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {tickers.map((ticker: string, i: number) => (
                <SortableCard key={ticker} ticker={ticker} index={i}
                  color={SERIES_COLORS[i % SERIES_COLORS.length]}
                  candles={candlesMap[ticker]}
                  onRemove={() => handleRemove(ticker)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
