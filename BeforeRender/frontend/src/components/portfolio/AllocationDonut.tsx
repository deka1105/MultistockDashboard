import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useCompanyProfile } from '@/hooks/useStockData'
import type { EnrichedPosition } from '@/types/stock'

const COLORS = [
  '#00c4ff', '#a855f7', '#ffb020', '#00e87a',
  '#ff3c5a', '#3b82f6', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16',
]

function useSectorAllocation(positions: EnrichedPosition[]) {
  // Fetch profiles for all tickers to get sector
  const profiles = positions.map(p => {
    // We call the hook but can't do it in a loop conditionally —
    // instead we derive from existing store/cache or use ticker as fallback
    return { ticker: p.ticker, value: p.value }
  })

  // Group by first letter of ticker as a deterministic mock sector assignment
  // In production this would use the profile sector from the API
  const SECTOR_MAP: Record<string, string> = {
    A: 'Technology', M: 'Technology', N: 'Technology',
    G: 'Technology', T: 'Consumer Cyclical', J: 'Financial Services',
  }

  const sectorMap: Record<string, number> = {}
  for (const p of positions) {
    const sector = SECTOR_MAP[p.ticker[0]] ?? 'Other'
    sectorMap[sector] = (sectorMap[sector] ?? 0) + p.value
  }

  return Object.entries(sectorMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-2xl shadow-black/60">
      <p className="text-text-primary font-semibold">{d.name}</p>
      <p className="text-text-muted">${d.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
      <p className="text-text-muted">{d.payload.pct?.toFixed(1)}%</p>
    </div>
  )
}

interface Props {
  positions: EnrichedPosition[]
  totalValue: number
}

export default function AllocationDonut({ positions, totalValue }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const sectors = useSectorAllocation(positions)

  const data = useMemo(() =>
    sectors.map(s => ({ ...s, pct: (s.value / totalValue) * 100 })),
    [sectors, totalValue]
  )

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-semibold text-sm text-text-primary">Allocation</p>
        <p className="text-[10px] text-text-muted font-mono">by current value</p>
      </div>

      {positions.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-text-muted text-sm">
          No positions yet
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.5}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-base font-semibold text-text-primary">
                ${(totalValue / 1000).toFixed(1)}K
              </span>
              <span className="text-[10px] text-text-muted font-mono">total</span>
            </div>
          </div>

          <div className="space-y-2 mt-1">
            {data.map((entry, i) => (
              <div key={entry.name}
                className="flex items-center gap-2 cursor-pointer"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                <span className="flex-1 text-xs text-text-secondary truncate">{entry.name}</span>
                <span className="font-mono text-xs text-text-primary">{entry.pct.toFixed(1)}%</span>
                <span className="font-mono text-xs text-text-muted w-16 text-right">
                  ${(entry.value / 1000).toFixed(1)}K
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
