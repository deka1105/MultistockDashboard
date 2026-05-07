import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ExternalLink } from 'lucide-react'
import { usePortfolioEarnings } from '@/hooks/useStockData'
import { cn } from '@/lib/utils'

interface Props { portfolioId: number }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function EarningsCalendarMini({ portfolioId }: Props) {
  const navigate = useNavigate()
  const { data, isLoading } = usePortfolioEarnings(portfolioId)

  // Build a 4-week Mon–Fri grid starting from this Monday
  const weeks = useMemo(() => {
    const today = new Date()
    const dow   = today.getDay()  // 0=Sun, 1=Mon…
    const diff  = dow === 0 ? -6 : 1 - dow  // back to Monday
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)

    const grid: string[][] = []
    for (let w = 0; w < 4; w++) {
      const week: string[] = []
      for (let d = 0; d < 5; d++) {
        const day = new Date(monday)
        day.setDate(monday.getDate() + w * 7 + d)
        week.push(day.toISOString().slice(0, 10))
      }
      grid.push(week)
    }
    return grid
  }, [])

  // Group events by date
  const eventMap = useMemo(() => {
    const m: Record<string, any[]> = {}
    for (const ev of (data?.events ?? [])) {
      if (!m[ev.report_date]) m[ev.report_date] = []
      m[ev.report_date].push(ev)
    }
    return m
  }, [data])

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-accent-amber" />
          <p className="font-display font-semibold text-sm text-text-primary">Earnings Calendar</p>
          {data?.count > 0 && (
            <span className="text-[9px] font-mono text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded px-1.5 py-0.5">
              {data.count} upcoming
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/calendar?filter=portfolio')}
          className="flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-accent-cyan transition-colors">
          Full calendar <ExternalLink size={9} />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-5 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-[9px] font-mono text-text-muted text-center mb-1">{d}</div>
          ))}
          {[...Array(20)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-bg-hover animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-5 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-[9px] font-mono text-text-muted text-center">{d}</div>
            ))}
          </div>

          {/* Week rows */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-5 gap-1 mb-1">
              {week.map(dateStr => {
                const events    = eventMap[dateStr] ?? []
                const isToday   = dateStr === todayStr
                const isPast    = dateStr < todayStr
                const hasEvents = events.length > 0

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      'min-h-[40px] rounded-lg border p-1 flex flex-col gap-0.5 transition-colors',
                      isToday
                        ? 'border-accent-cyan/40 bg-accent-cyan/5'
                        : hasEvents
                        ? 'border-accent-amber/25 bg-accent-amber/5 cursor-pointer hover:bg-accent-amber/10'
                        : 'border-bg-border bg-bg-hover/30',
                      isPast && !hasEvents && 'opacity-40'
                    )}>
                    {/* Date number */}
                    <span className={cn(
                      'text-[9px] font-mono leading-none',
                      isToday ? 'text-accent-cyan font-bold' : 'text-text-muted'
                    )}>
                      {parseInt(dateStr.slice(8), 10)}
                    </span>

                    {/* Ticker chips */}
                    {events.slice(0, 2).map(ev => (
                      <button
                        key={ev.ticker}
                        onClick={() => navigate(`/dashboard/${ev.ticker}`)}
                        className={cn(
                          'text-[8px] font-mono font-bold rounded px-1 py-0.5 leading-none truncate text-left',
                          ev.time_of_day === 'pre-market'
                            ? 'bg-accent-green/20 text-accent-green'
                            : 'bg-accent-amber/20 text-accent-amber'
                        )}>
                        {ev.ticker}
                      </button>
                    ))}
                    {events.length > 2 && (
                      <span className="text-[8px] font-mono text-text-muted">+{events.length - 2}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[9px] font-mono text-text-muted">
              <span className="w-2 h-2 rounded-sm bg-accent-green/30" /> Pre-market
            </span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-text-muted">
              <span className="w-2 h-2 rounded-sm bg-accent-amber/30" /> After-hours
            </span>
          </div>

          {/* Empty state */}
          {(data?.events ?? []).length === 0 && !isLoading && (
            <p className="text-[10px] text-text-muted font-mono text-center py-2">
              No earnings this month for your holdings
            </p>
          )}
        </div>
      )}
    </div>
  )
}
