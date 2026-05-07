import { useMemo } from 'react'
import { format, subDays, startOfDay, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { PnLSnapshot } from '@/types/stock'

interface Props {
  snapshots: PnLSnapshot[]
}

function pnlColor(pct: number | null) {
  if (pct === null) return { bg: 'bg-bg-hover', border: 'border-bg-border', text: 'text-text-muted' }
  const intensity = Math.min(Math.abs(pct) / 3, 1)  // saturate at ±3%
  if (pct > 0) return {
    bg: `bg-accent-green/[${(0.06 + intensity * 0.5).toFixed(2)}]`,
    border: `border-accent-green/[${(0.1 + intensity * 0.4).toFixed(2)}]`,
    text: 'text-accent-green',
  }
  return {
    bg: `bg-accent-red/[${(0.06 + intensity * 0.5).toFixed(2)}]`,
    border: `border-accent-red/[${(0.1 + intensity * 0.4).toFixed(2)}]`,
    text: 'text-accent-red',
  }
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
      dayNum: format(d, 'd'),
      label: format(d, 'MMM d'),
      pct: snap?.daily_return_pct ?? null,
      isToday: format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
      isFuture: d > today,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  const totalPositive = days.filter(d => (d.pct ?? 0) > 0).length
  const totalNegative = days.filter(d => (d.pct ?? 0) < 0).length

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display font-semibold text-sm text-text-primary">Daily P&L</p>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">35-day calendar</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-accent-green">{totalPositive} up</span>
          <span className="text-accent-red">{totalNegative} down</span>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-xs">
          Daily snapshots will appear as your portfolio is tracked over time
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] text-text-muted font-mono py-0.5">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const c = pnlColor(day.isFuture || day.isWeekend ? null : day.pct)
              return (
                <div
                  key={day.key}
                  title={day.pct !== null ? `${day.label}: ${day.pct >= 0 ? '+' : ''}${day.pct?.toFixed(2)}%` : day.label}
                  className={cn(
                    'rounded-lg border transition-transform hover:scale-105 cursor-default',
                    'flex flex-col items-center justify-center py-2',
                    day.isFuture || day.isWeekend
                      ? 'bg-transparent border-transparent'
                      : c.bg + ' ' + c.border,
                    day.isToday && !day.isFuture && 'ring-1 ring-accent-cyan/50',
                  )}
                >
                  <span className={cn('text-[9px] font-mono', day.isToday ? 'text-accent-cyan' : 'text-text-muted')}>
                    {day.dayNum}
                  </span>
                  {!day.isFuture && !day.isWeekend && day.pct !== null && (
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
