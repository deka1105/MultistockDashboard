import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { EnrichedPosition } from '@/types/stock'
import { formatPrice } from '@/lib/utils'

interface Props {
  positions: EnrichedPosition[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="card px-3 py-2 text-xs font-mono shadow-2xl shadow-black/60">
      <p className="text-text-primary font-bold mb-1">{d.payload.ticker}</p>
      <p className={d.value >= 0 ? 'text-accent-green' : 'text-accent-red'}>
        {d.value >= 0 ? '+' : ''}{formatPrice(d.value)}
      </p>
      <p className="text-text-muted">{d.payload.pnl_pct >= 0 ? '+' : ''}{d.payload.pnl_pct.toFixed(2)}%</p>
    </div>
  )
}

export default function PnLBarChart({ positions }: Props) {
  if (positions.length === 0) return null

  const data = [...positions]
    .sort((a, b) => b.pnl - a.pnl)
    .map(p => ({ ticker: p.ticker, pnl: p.pnl, pnl_pct: p.pnl_pct }))

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-semibold text-sm text-text-primary">P&L by Position</p>
        <p className="text-[10px] text-text-muted font-mono">unrealized gain/loss</p>
      </div>
      <ResponsiveContainer width="100%" height={positions.length * 36 + 8}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number"
            tickFormatter={v => `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(0)}`}
            tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
            tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="ticker" width={42}
            tick={{ fill: '#8a9ab5', fontSize: 11, fontFamily: 'Syne', fontWeight: 700 }}
            tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.pnl >= 0 ? '#00e87a' : '#ff3c5a'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
