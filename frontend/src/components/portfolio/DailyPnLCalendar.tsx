import { useMemo } from 'react'
import { format, subDays, startOfDay, parseISO } from 'date-fns'
import { cn, formatPrice } from '@/lib/utils'
import type { PnLSnapshot } from '@/types/stock'

interface Props {
  snapshots: PnLSnapshot[]
}

// Inline rgba styles — Tailwind cannot generate opacity classes built at runtime,
// so the cell colours must be applied via style, not dynamically-named utilities.
const GREEN = '0,255,136'
const RED   = '255,59,92'

function cellStyle(pct: number | null): { style: React.CSSProperties; text: string } {
  if (pct === null) {
    return { style: { backgroundColor: 'transparent', borderColor: 'transparent' }, text: 'text-text-muted' }
  }
  const intensity = Math.min(Math.abs(pct) / 3, 1)  // saturate at ±3%
  const rgb = pct > 0 ? GREEN : RED
  return {
    style: {
      backgroundColor: `rgba(${rgb},${(0.06 + intensity * 0.5).toFixed(2)})`,
      borderColor:     `rgba(${rgb},${(0.1 + intensity * 0.4).toFixed(2)})`,
    },
    text: pct > 0 ? 'text-accent-green' : 'text-accent-red',
  }
}

// Approximate the day's dollar move from the end-of-day value and its return.
function dayDollars(snap: PnLSnapshot): number {
  const pct = snap.daily_return_pct ?? 0
  return snap.total_value - snap.total_value / (1 + pct / 100)
}

function signedUsd(value: number): string {
  return `${value >= 0 ? '+' : '−'}${formatPrice(Math.abs(value))}`
}

export default function DailyPnLCalendar({ snapshots }: Props) {
  const snapshotMap = useMemo(() => {
    const map: Record<string, PnLSnapshot> = {}
    for (const s of snapshots) {
      const key = format(parseISO(s.date), 'yyyy-MM-dd')
      map[key] = s
    }
    return map
  }, [snapshots])

  // Build last 35 days grid
  const today = startOfDay(new Date())
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = subDays(today, 34 - i)
    const key = format(d, 'yyyy-MM-dd')
    const snap = snapshotMap[key]
    return {
      date: d,
      key,
      snap,
      dayNum: format(d, 'd'),
      label: format(d, 'MMM d'),
      pct: snap?.daily_return_pct ?? null,
      isToday: format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
      isFuture: d > today,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  // Windowed stats — only trading days that actually have a snapshot in view.
  const stats = useMemo(() => {
    const traded = days.filter(d => d.snap && d.pct !== null) as (typeof days[number] & { snap: PnLSnapshot })[]
    const totalPositive = traded.filter(d => (d.pct ?? 0) > 0).length
    const totalNegative = traded.filter(d => (d.pct ?? 0) < 0).length

    let best: (typeof traded)[number] | null = null
    let worst: (typeof traded)[number] | null = null
    for (const d of traded) {
      if (best === null || (d.pct ?? 0) > (best.pct ?? 0)) best = d
      if (worst === null || (d.pct ?? 0) < (worst.pct ?? 0)) worst = d
    }

    // Net change across the window (last value − first value).
    const netChange = traded.length >= 2
      ? traded[traded.length - 1].snap.total_value - traded[0].snap.total_value
      : traded.length === 1 ? dayDollars(traded[0].snap) : 0

    return { totalPositive, totalNegative, best, worst, netChange }
  }, [days])

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display font-semibold text-sm text-text-primary">Daily P&L</p>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">35-day calendar</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-accent-green">{stats.totalPositive} up</span>
          <span className="text-accent-red">{stats.totalNegative} down</span>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-xs">
          Daily snapshots will appear as your portfolio is tracked over time
        </div>
      ) : (
        <>
          {/* Monthly summary line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] font-mono">
            <span className="text-text-muted">This period</span>
            <span className={cn('font-semibold', stats.netChange >= 0 ? 'text-accent-green' : 'text-accent-red')}>
              {signedUsd(stats.netChange)}
            </span>
            <span className="text-text-muted">
              {stats.totalPositive} green · {stats.totalNegative} red
            </span>
          </div>

          {/* Best / worst day callouts */}
          {(stats.best || stats.worst) && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2">
                <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Best day</p>
                {stats.best ? (
                  <p className="text-[11px] font-mono font-semibold text-accent-green mt-0.5">
                    {stats.best.label} · {signedUsd(dayDollars(stats.best.snap))}
                    <span className="text-text-muted font-normal ml-1">({stats.best.pct! >= 0 ? '+' : ''}{stats.best.pct!.toFixed(2)}%)</span>
                  </p>
                ) : <p className="text-[11px] font-mono text-text-muted mt-0.5">—</p>}
              </div>
              <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 px-3 py-2">
                <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Worst day</p>
                {stats.worst ? (
                  <p className="text-[11px] font-mono font-semibold text-accent-red mt-0.5">
                    {stats.worst.label} · {signedUsd(dayDollars(stats.worst.snap))}
                    <span className="text-text-muted font-normal ml-1">({stats.worst.pct! >= 0 ? '+' : ''}{stats.worst.pct!.toFixed(2)}%)</span>
                  </p>
                ) : <p className="text-[11px] font-mono text-text-muted mt-0.5">—</p>}
              </div>
            </div>
          )}

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] text-text-muted font-mono py-0.5">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const muted = day.isFuture || day.isWeekend
              const c = cellStyle(muted ? null : day.pct)
              return (
                <div
                  key={day.key}
                  title={day.pct !== null ? `${day.label}: ${day.pct >= 0 ? '+' : ''}${day.pct?.toFixed(2)}%` : day.label}
                  style={c.style}
                  className={cn(
                    'rounded-lg border transition-transform hover:scale-105 cursor-default',
                    'flex flex-col items-center justify-center py-2',
                    day.isToday && !day.isFuture && 'ring-1 ring-accent-cyan/50',
                  )}
                >
                  <span className={cn('text-[9px] font-mono', day.isToday ? 'text-accent-cyan' : 'text-text-muted')}>
                    {day.dayNum}
                  </span>
                  {!muted && day.pct !== null && (
                    <span className={cn('text-[8px] font-mono font-semibold mt-0.5', c.text)}>
                      {day.pct >= 0 ? '+' : ''}{day.pct.toFixed(1)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scale legend */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[9px] text-text-muted font-mono">−3%+</span>
            <div className="flex-1 h-1.5 rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(255,60,90,0.7), rgba(255,60,90,0.1), rgba(0,232,122,0.1), rgba(0,232,122,0.7))' }} />
            <span className="text-[9px] text-text-muted font-mono">+3%+</span>
          </div>
        </>
      )}
    </div>
  )
}
