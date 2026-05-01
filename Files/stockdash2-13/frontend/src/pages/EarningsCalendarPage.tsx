import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEarningsCalendar } from '@/hooks/useStockData'
import { Skeleton } from '@/components/common/Skeleton'
import { cn } from '@/lib/utils'

// ─── Calendar page ────────────────────────────────────────────────────────────

interface EarningsEvent {
  ticker: string
  report_date: string
  time_of_day: string | null
  eps_estimate: number | null
  eps_actual: number | null
  beat_miss: string | null
  surprise_pct: number | null
}

export default function EarningsCalendarPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(new Date())
  const { data, isLoading } = useEarningsCalendar(60)

  const events: EarningsEvent[] = data?.events ?? []

  // Group events by date string
  const eventMap: Record<string, EarningsEvent[]> = {}
  events.forEach(e => {
    const key = e.report_date.slice(0, 10)
    if (!eventMap[key]) eventMap[key] = []
    eventMap[key].push(e)
  })

  // Build calendar grid for current month
  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start to Monday
  const startPad = (monthStart.getDay() + 6) % 7
  const grid = [...Array(startPad).fill(null), ...days]

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const selectedEvents = selectedDay ? (eventMap[selectedDay] ?? []) : []

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-accent-cyan" />
          <h1 className="font-display font-bold text-xl text-text-primary">Earnings Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded-full bg-bg-hover">
            {events.length} upcoming events
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-sm text-text-primary min-w-32 text-center">
              {format(month, 'MMMM yyyy')}
            </span>
            <button onClick={() => setMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-green" /> Pre-market</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-amber" /> After-hours</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-cyan" /> Beat</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-red" /> Miss</div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar grid */}
          <div className="lg:col-span-2 card p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-[9px] font-mono text-text-muted py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />
                const key      = format(day, 'yyyy-MM-dd')
                const evts     = eventMap[key] ?? []
                const hasEvts  = evts.length > 0
                const isSelected = selectedDay === key
                const today    = isToday(day)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6

                return (
                  <div key={key}
                    onClick={() => hasEvts && setSelectedDay(isSelected ? null : key)}
                    className={cn(
                      'rounded-lg border transition-all min-h-14 p-1.5 flex flex-col',
                      hasEvts ? 'cursor-pointer hover:border-accent-amber/50' : '',
                      isWeekend ? 'opacity-40' : '',
                      today ? 'border-accent-cyan ring-1 ring-accent-cyan/30' : 'border-bg-border',
                      isSelected ? 'border-accent-cyan/60 bg-accent-cyan/5' : hasEvts ? 'border-accent-amber/25 bg-accent-amber/3' : 'border-bg-border/50',
                    )}>
                    <span className={cn(
                      'text-[10px] font-mono self-end',
                      today ? 'text-accent-cyan' : 'text-text-muted'
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {evts.slice(0, 3).map(e => (
                        <span key={e.ticker}
                          className={cn(
                            'text-[8px] font-mono font-bold px-1 rounded',
                            e.time_of_day === 'pre' ? 'bg-accent-green/15 text-accent-green'
                            : e.time_of_day === 'post' ? 'bg-accent-amber/15 text-accent-amber'
                            : 'bg-bg-hover text-text-muted'
                          )}>
                          {e.ticker}
                        </span>
                      ))}
                      {evts.length > 3 && (
                        <span className="text-[8px] font-mono text-text-muted">+{evts.length - 3}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side panel — selected day or upcoming list */}
          <div className="card p-4 overflow-y-auto max-h-[440px]">
            {selectedDay && selectedEvents.length > 0 ? (
              <>
                <p className="font-display font-semibold text-sm text-text-primary mb-3">
                  {format(parseISO(selectedDay), 'EEEE, MMMM d')}
                </p>
                <div className="space-y-2">
                  {selectedEvents.map(e => (
                    <button key={e.ticker} onClick={() => navigate(`/dashboard/${e.ticker}`)}
                      className="w-full text-left card p-2.5 hover:border-accent-cyan/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-text-primary">{e.ticker}</span>
                        <span className={cn(
                          'text-[9px] font-mono px-1.5 py-0.5 rounded-full',
                          e.time_of_day === 'pre' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-amber/10 text-accent-amber'
                        )}>
                          {e.time_of_day === 'pre' ? 'PRE-MKT' : 'AFTER-HRS'}
                        </span>
                      </div>
                      {e.eps_estimate != null && (
                        <p className="text-[10px] text-text-muted font-mono mt-1">
                          Est EPS: {e.eps_estimate.toFixed(2)}
                          {e.eps_actual != null && (
                            <span className={cn('ml-2 font-semibold', e.beat_miss === 'beat' ? 'text-accent-green' : 'text-accent-red')}>
                              Act: {e.eps_actual.toFixed(2)} ({e.beat_miss})
                            </span>
                          )}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="font-display font-semibold text-sm text-text-primary mb-3">Upcoming</p>
                <div className="space-y-1.5">
                  {events.filter(e => new Date(e.report_date) >= new Date()).slice(0, 15).map(e => (
                    <button key={`${e.ticker}-${e.report_date}`}
                      onClick={() => navigate(`/dashboard/${e.ticker}`)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-hover transition-colors text-left">
                      <div>
                        <span className={cn(
                          'w-2 h-2 rounded-full inline-block mr-1.5',
                          e.time_of_day === 'pre' ? 'bg-accent-green' : 'bg-accent-amber'
                        )} />
                        <span className="font-mono font-bold text-xs text-text-primary">{e.ticker}</span>
                      </div>
                      <span className="text-[10px] text-text-muted font-mono ml-auto">{e.report_date.slice(5)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
