import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  useStockQuote, useCandles, useCompanyProfile,
  useBasicFinancials, useCompanyNews,
} from '@/hooks/useStockData'
import { useAppStore } from '@/store/useAppStore'
import QuoteCard from '@/components/stocks/QuoteCard'
import { StatsRow, WeekRangeBar, FinancialGrid } from '@/components/stocks/StatsRow'
import PriceChart, { TimeRangeSelector, ChartTypeToggle, MAToggles } from '@/components/charts/PriceChart'
import NewsPanel from '@/components/news/NewsPanel'
import { ErrorCard } from '@/components/common/ErrorBoundary'
import { QuoteCardSkeleton, ChartSkeleton, StatsSkeleton, NewsSkeleton, Skeleton } from '@/components/common/Skeleton'

export default function DashboardPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const { timeRange, addRecentTicker } = useAppStore()

  const T = ticker?.toUpperCase() ?? 'AAPL'

  useEffect(() => {
    if (T) addRecentTicker(T)
  }, [T])

  const quoteQ    = useStockQuote(T)
  const candlesQ  = useCandles(T, timeRange)
  const profileQ  = useCompanyProfile(T)
  const finQ      = useBasicFinancials(T)
  const newsQ     = useCompanyNews(T)

  if (!ticker) {
    navigate('/dashboard/AAPL', { replace: true })
    return null
  }

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* ── Top row: Quote + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          {quoteQ.isLoading
            ? <QuoteCardSkeleton />
            : quoteQ.error
            ? <ErrorCard message={quoteQ.error.message} onRetry={() => quoteQ.refetch()} />
            : quoteQ.data
            ? <QuoteCard quote={quoteQ.data} profile={profileQ.data} />
            : null
          }
        </div>
        <div className="lg:col-span-2">
          {quoteQ.isLoading
            ? <StatsSkeleton />
            : quoteQ.data
            ? <StatsRow quote={quoteQ.data} financials={finQ.data} profile={profileQ.data} />
            : null
          }
        </div>
      </div>

      {/* ── 52-week range ── */}
      {finQ.data && (
        <WeekRangeBar
          price={quoteQ.data?.price ?? null}
          low52={finQ.data.week_52_low}
          high52={finQ.data.week_52_high}
        />
      )}

      {/* ── Main content: Chart + News ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Chart panel */}
        <div className="xl:col-span-2">
          {candlesQ.isLoading
            ? <ChartSkeleton />
            : candlesQ.error
            ? <ErrorCard message={candlesQ.error.message} onRetry={() => candlesQ.refetch()} />
            : (
              <div className="card p-4">
                {/* Chart controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm text-text-primary">{T} Price</span>
                    <ChartTypeToggle />
                  </div>
                  <div className="flex items-center gap-3">
                    <MAToggles />
                    <TimeRangeSelector />
                  </div>
                </div>

                {candlesQ.data && (
                  <PriceChart
                    candles={candlesQ.data.candles}
                    ticker={T}
                  />
                )}
              </div>
            )
          }
        </div>

        {/* News panel */}
        <div className="xl:col-span-1 min-h-96">
          {newsQ.isLoading
            ? <div className="card p-4"><NewsSkeleton /></div>
            : newsQ.error
            ? <ErrorCard message={newsQ.error.message} />
            : newsQ.data
            ? <NewsPanel articles={newsQ.data.articles} ticker={T} />
            : null
          }
        </div>
      </div>

      {/* ── Key metrics ── */}
      {finQ.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FinancialGrid financials={finQ.data} />
          <div className="card p-4">
            <p className="stat-label mb-3">Company</p>
            {profileQ.isLoading
              ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
              : profileQ.data
              ? (
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Exchange',  value: profileQ.data.exchange },
                    { label: 'Country',   value: profileQ.data.country },
                    { label: 'Currency',  value: profileQ.data.currency },
                    { label: 'IPO Date',  value: profileQ.data.ipo_date },
                    { label: 'Sector',    value: profileQ.data.sector },
                    { label: 'Website',   value: profileQ.data.website },
                  ].filter(item => item.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-text-muted text-xs">{label}</span>
                      {label === 'Website'
                        ? <a href={value!} target="_blank" rel="noopener noreferrer"
                             className="font-mono text-xs text-accent-cyan hover:underline truncate max-w-48">
                            {value}
                          </a>
                        : <span className="font-mono text-xs text-text-primary">{value}</span>
                      }
                    </div>
                  ))}
                </div>
              ) : null
            }
          </div>
        </div>
      )}
    </div>
  )
}
