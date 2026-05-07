import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketOverview } from '@/hooks/useStockData'
import { formatPrice, formatPct, cn } from '@/lib/utils'

type ViewMode = 'today' | '1w' | '1m' | 'ytd'

interface Tile {
  ticker: string
  company: string | null
  sector: string | null
  price: number | null
  changePct: number | null
  marketCap: number | null
}

interface SectorGroup {
  sector: string
  tiles: Tile[]
  totalCap: number
  avgChange: number
}

// Treemap layout: squarify-lite — recursive binary subdivision
interface Rect { x: number; y: number; w: number; h: number }

function layoutTiles(items: { value: number }[], rect: Rect): Rect[] {
  if (items.length === 0) return []
  if (items.length === 1) return [rect]

  const total = items.reduce((s, i) => s + i.value, 0)
  const split = Math.floor(items.length / 2)
  const firstSum = items.slice(0, split).reduce((s, i) => s + i.value, 0)
  const ratio = firstSum / total

  const isWide = rect.w >= rect.h
  const [r1, r2] = isWide
    ? [
        { x: rect.x,                y: rect.y, w: rect.w * ratio,         h: rect.h },
        { x: rect.x + rect.w * ratio, y: rect.y, w: rect.w * (1 - ratio), h: rect.h },
      ]
    : [
        { x: rect.x, y: rect.y,                  w: rect.w, h: rect.h * ratio         },
        { x: rect.x, y: rect.y + rect.h * ratio,  w: rect.w, h: rect.h * (1 - ratio) },
      ]

  return [
    ...layoutTiles(items.slice(0, split), r1),
    ...layoutTiles(items.slice(split), r2),
  ]
}

function changePctToColor(pct: number | null): string {
  if (pct == null) return 'rgba(30,42,58,0.8)'
  const intensity = Math.min(Math.abs(pct) / 4, 1)
  if (pct > 0) return `rgba(0,232,122,${0.08 + intensity * 0.55})`
  return `rgba(255,60,90,${0.08 + intensity * 0.55})`
}

function changePctToBorder(pct: number | null): string {
  if (pct == null) return 'rgba(30,42,58,1)'
  const intensity = Math.min(Math.abs(pct) / 4, 1)
  if (pct > 0) return `rgba(0,232,122,${0.2 + intensity * 0.5})`
  return `rgba(255,60,90,${0.2 + intensity * 0.5})`
}

// Tooltip state
interface TooltipState {
  tile: Tile
  x: number
  y: number
}

interface SectorHeatmapProps { compact?: boolean }

export default function SectorHeatmap({ compact = false }: SectorHeatmapProps) {
  const navigate  = useNavigate()
  const [view, setView]       = useState<ViewMode>('today')
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const { data, isLoading }   = useMarketOverview()

  // Group tiles by sector, sorted by total market cap descending
  const groups: SectorGroup[] = useMemo(() => {
    const items: Tile[] = (data?.items ?? []).map((item: any) => ({
      ticker:    item.ticker,
      company:   item.company_name,
      sector:    item.sector ?? 'Other',
      price:     item.price,
      changePct: item.change_pct,
      marketCap: item.market_cap,
    }))

    const sectorMap = new Map<string, Tile[]>()
    for (const t of items) {
      const s = t.sector ?? 'Other'
      if (!sectorMap.has(s)) sectorMap.set(s, [])
      sectorMap.get(s)!.push(t)
    }

    return Array.from(sectorMap.entries())
      .map(([sector, tiles]) => {
        const totalCap  = tiles.reduce((s, t) => s + (t.marketCap ?? 0), 0)
        const capSum    = tiles.filter(t => t.changePct != null).reduce((s, t) => s + (t.marketCap ?? 1), 0)
        const avgChange = capSum > 0
          ? tiles.reduce((s, t) => s + (t.changePct ?? 0) * (t.marketCap ?? 1), 0) / capSum
          : 0
        return { sector, tiles: tiles.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)), totalCap, avgChange }
      })
      .sort((a, b) => b.totalCap - a.totalCap)
  }, [data])

  const totalCap = groups.reduce((s, g) => s + g.totalCap, 0)

  const handleMouseEnter = useCallback((tile: Tile, e: React.MouseEvent) => {
    setTooltip({ tile, x: e.clientX, y: e.clientY })
  }, [])
  const handleMouseLeave = useCallback(() => setTooltip(null), [])
  const handleMouseMove  = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
  }, [])

  if (isLoading) return (
    <div className="w-full h-96 rounded-xl bg-bg-hover animate-pulse" />
  )

  // Outer layout: sectors as large blocks
  const W = 900, H = 500
  const sectorRects = layoutTiles(
    groups.map(g => ({ value: g.totalCap || 1 })),
    { x: 0, y: 0, w: W, h: H }
  )

  return (
    <div className={compact ? 'space-y-1' : 'space-y-3'}>
      {!compact && (
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          S&P 500 — Sector Performance
        </p>
        <div className="flex items-center gap-1">
          {([['today', 'Today %'], ['1w', '1W %'], ['1m', '1M %'], ['ytd', 'YTD %']] as [ViewMode, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={v === view ? 'range-btn-active' : 'range-btn'}>{l}</button>
          ))}
        </div>
      </div>
      )}

      {/* Treemap SVG */}
      <div className="relative rounded-xl overflow-hidden border border-bg-border"
        onMouseLeave={handleMouseLeave} onMouseMove={handleMouseMove}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ display: 'block' }}>
          {groups.map((group, gi) => {
            const sRect = sectorRects[gi]
            if (!sRect || sRect.w < 2 || sRect.h < 2) return null

            // Inner tile layout for tickers within this sector
            const tileRects = layoutTiles(
              group.tiles.map(t => ({ value: Math.max(t.marketCap ?? 1, 1) })),
              { x: sRect.x + 1, y: sRect.y + 1, w: sRect.w - 2, h: sRect.h - 2 }
            )

            return (
              <g key={group.sector}>
                {/* Sector border */}
                <rect x={sRect.x} y={sRect.y} width={sRect.w} height={sRect.h}
                  fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={2} />

                {/* Stock tiles */}
                {group.tiles.map((tile, ti) => {
                  const r = tileRects[ti]
                  if (!r || r.w < 2 || r.h < 2) return null
                  const bg     = changePctToColor(tile.changePct)
                  const border = changePctToBorder(tile.changePct)
                  const showLabel = r.w > 28 && r.h > 18
                  const showPct   = r.w > 40 && r.h > 30

                  return (
                    <g key={tile.ticker}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/dashboard/${tile.ticker}`)}
                      onMouseEnter={e => handleMouseEnter(tile, e)}>
                      <rect x={r.x + 0.5} y={r.y + 0.5}
                        width={r.w - 1} height={r.h - 1}
                        rx={2} ry={2}
                        fill={bg} stroke={border} strokeWidth={0.8} />
                      {showLabel && (
                        <text
                          x={r.x + r.w / 2} y={r.y + r.h / 2 + (showPct ? -5 : 4)}
                          textAnchor="middle"
                          fontSize={Math.min(11, Math.max(7, r.w / 5))}
                          fontFamily="Syne, sans-serif"
                          fontWeight="700"
                          fill="rgba(232,238,247,0.9)">
                          {tile.ticker}
                        </text>
                      )}
                      {showPct && tile.changePct != null && (
                        <text
                          x={r.x + r.w / 2} y={r.y + r.h / 2 + 10}
                          textAnchor="middle"
                          fontSize={Math.min(9, Math.max(6, r.w / 7))}
                          fontFamily="IBM Plex Mono, monospace"
                          fill={tile.changePct >= 0 ? 'rgba(0,232,122,0.9)' : 'rgba(255,60,90,0.9)'}>
                          {tile.changePct >= 0 ? '+' : ''}{tile.changePct.toFixed(1)}%
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Sector label */}
                {sRect.w > 60 && sRect.h > 20 && (
                  <text x={sRect.x + 5} y={sRect.y + 13}
                    fontSize={9} fontFamily="IBM Plex Mono, monospace"
                    fill="rgba(138,154,181,0.7)" fontWeight="500">
                    {group.sector.replace('Financial Services', 'Financials').slice(0, Math.floor(sRect.w / 7))}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
            <div className="bg-bg-surface border border-bg-border rounded-xl px-3 py-2 shadow-2xl shadow-black/60 text-xs font-mono min-w-36">
              <p className="font-display font-bold text-sm text-text-primary">{tooltip.tile.ticker}</p>
              {tooltip.tile.company && <p className="text-text-muted text-[10px] truncate max-w-40">{tooltip.tile.company}</p>}
              <div className="mt-1.5 space-y-0.5">
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Price</span>
                  <span className="text-text-primary">{tooltip.tile.price != null ? `$${tooltip.tile.price.toFixed(2)}` : '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Change</span>
                  <span className={tooltip.tile.changePct != null && tooltip.tile.changePct >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                    {tooltip.tile.changePct != null ? `${tooltip.tile.changePct >= 0 ? '+' : ''}${tooltip.tile.changePct.toFixed(2)}%` : '—'}
                  </span>
                </div>
                {tooltip.tile.marketCap && (
                  <div className="flex justify-between gap-4">
                    <span className="text-text-muted">Mkt Cap</span>
                    <span className="text-text-secondary">${(tooltip.tile.marketCap / 1000).toFixed(0)}B</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Color scale */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-text-muted font-mono">−4%+</span>
        <div className="flex-1 h-1.5 rounded-full"
          style={{ background: 'linear-gradient(90deg,rgba(255,60,90,0.8),rgba(30,42,58,0.6),rgba(0,232,122,0.8))' }} />
        <span className="text-[9px] text-text-muted font-mono">+4%+</span>
        <span className="text-[9px] text-text-muted font-mono ml-2">size = market cap</span>
      </div>
    </div>
  )
}
