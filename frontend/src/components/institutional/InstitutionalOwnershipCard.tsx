import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, ReferenceLine } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Building2, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// Mock data derived deterministically from ticker
function mockOwnership(ticker: string) {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng  = (n: number) => ((seed * 9301 + 49297 * n) % 233280) / 233280

  const instPct     = 60 + rng(1) * 30   // 60–90%
  const numHolders  = Math.floor(800 + rng(2) * 2200)
  const qoqChange   = (rng(3) - 0.5) * 6  // ±3%

  const INSTITUTIONS = [
    'Vanguard Group','BlackRock','State Street','Fidelity','T. Rowe Price',
    'Capital Research','Wellington Mgmt','Geode Capital','JP Morgan','Goldman Sachs',
  ]

  const holders = INSTITUTIONS.slice(0, 5).map((name, i) => ({
    name,
    pct: parseFloat((instPct / 5 * (1 - i * 0.12) * (0.8 + rng(i + 4) * 0.4)).toFixed(2)),
  })).sort((a, b) => b.pct - a.pct)

  // Insider transactions over last 12 months
  const insiders = Array.from({ length: 12 }, (_, i) => {
    const monthsAgo = i + 1
    const daysAgo   = monthsAgo * 30 + Math.floor(rng(i + 10) * 15)
    const d = new Date(); d.setDate(d.getDate() - daysAgo)
    const isBuy   = rng(i + 20) > 0.45
    const shares  = Math.floor(5000 + rng(i + 30) * 45000)
    return {
      date:    d.toISOString().slice(0, 10),
      type:    isBuy ? 'Buy' : 'Sell',
      shares,
      value:   null as null, // would need price data
      officer: ['CEO', 'CFO', 'COO', 'Director', 'VP'][Math.floor(rng(i + 40) * 5)],
      secUrl:  `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=4`,
    }
  })

  return { instPct, numHolders, qoqChange, holders, insiders }
}

function HolderTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-2.5 py-1.5 text-xs font-mono shadow-xl shadow-black/60">
      <p className="text-text-primary">{payload[0]?.payload?.name}</p>
      <p className="text-accent-cyan">{payload[0]?.value?.toFixed(2)}% of shares</p>
    </div>
  )
}

interface Props { ticker: string }

export default function InstitutionalOwnershipCard({ ticker }: Props) {
  const [tab, setTab] = useState<'holders' | 'insiders'>('holders')

  // In production this would call a backend endpoint
  // For now we use deterministic mock data
  const data = mockOwnership(ticker)

  const qoqUp = data.qoqChange > 0
  const scatterData = data.insiders.map((t, i) => ({
    ...t,
    x: i,   // position on timeline
    y: t.type === 'Buy' ? 1 : -1,
    size: Math.min(Math.sqrt(t.shares / 1000) * 3, 16),
  }))

  if (loadingInst || loadingInsider) {
    return (
      <div className="card p-4 space-y-3">
        <div className="h-5 w-48 bg-bg-hover rounded animate-pulse" />
        <div className="h-32 bg-bg-hover rounded animate-pulse" />
        <div className="h-24 bg-bg-hover rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={14} className="text-accent-cyan" />
        <p className="font-display font-semibold text-sm text-text-primary">Institutional Ownership</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Inst. %',  value: `${data.instPct.toFixed(1)}%`, color: 'text-text-primary' },
          { label: 'Holders',  value: data.numHolders.toLocaleString(), color: 'text-text-primary' },
          { label: 'QoQ',      value: `${qoqUp ? '+' : ''}${data.qoqChange.toFixed(1)}%`, color: qoqUp ? 'text-accent-green' : 'text-accent-red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg-hover rounded-lg p-2 text-center">
            <p className="stat-label mb-0.5">{label}</p>
            <p className={cn('font-mono text-sm font-semibold', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-3 p-0.5 rounded-lg bg-bg-hover w-fit">
        {(['holders', 'insiders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
              tab === t ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
            )}>{t}</button>
        ))}
      </div>

      {tab === 'holders' && (
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data.holders} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="name" width={90}
              tick={{ fill: '#8a9ab5', fontSize: 9, fontFamily: 'Instrument Sans' }}
              tickLine={false} axisLine={false} />
            <Tooltip content={<HolderTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={14} fill="#00c4ff" fillOpacity={0.75} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {tab === 'insiders' && (
        <div>
          <p className="text-[10px] text-text-muted font-mono mb-2">Last 12 months · click for SEC filing</p>
          <ResponsiveContainer width="100%" height={80}>
            <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <XAxis dataKey="x" hide />
              <YAxis dataKey="y" domain={[-1.5, 1.5]} hide />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.type === 'Buy' ? '#00e87a' : '#ff3c5a'}
                    fillOpacity={0.8}
                    r={entry.size} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Recent transactions list */}
          <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
            {data.insiders.slice(0, 6).map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={cn('font-semibold w-6', t.type === 'Buy' ? 'text-accent-green' : 'text-accent-red')}>
                  {t.type === 'Buy' ? '▲' : '▼'}
                </span>
                <span className="text-text-muted w-16">{t.date.slice(5)}</span>
                <span className="text-text-secondary flex-1">{t.officer}</span>
                <span className="text-text-primary">{t.shares.toLocaleString()} sh</span>
                <a href={t.secUrl} target="_blank" rel="noopener noreferrer"
                  className="text-text-muted hover:text-accent-cyan transition-colors">
                  <ExternalLink size={9} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
