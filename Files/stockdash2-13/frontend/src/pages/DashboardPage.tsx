import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  useStockQuote, useCandles, useCompanyProfile,
  useBasicFinancials, useCompanyNews,
} from '@/hooks/useStockData'
import { useAppStore } from '@/store/useAppStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import QuoteCard from '@/components/stocks/QuoteCard'
import { StatsRow, WeekRangeBar, FinancialGrid } from '@/components/stocks/StatsRow'
import PriceChart, { TimeRangeSelector, ChartTypeToggle, MAToggles } from '@/components/charts/PriceChart'
import IndicatorControls from '@/components/indicators/IndicatorControls'
import NewsPanel from '@/components/news/NewsPanel'
import SentimentPanel from '@/components/sentiment/SentimentPanel'
import EarningsHistoryCard from '@/components/earnings/EarningsHistoryCard'
import InstitutionalOwnershipCard from '@/components/institutional/InstitutionalOwnershipCard'
import { ErrorCard } from '@/components/common/ErrorBoundary'
import {
  QuoteCardSkeleton, ChartSkeleton, StatsSkeleton,
  NewsSkeleton, Skeleton,
} from '@/components/common/Skeleton'

export default function DashboardPage() {
  const { ticker }   = useParams<{ ticker: string }>()
  const navigate     = useNavigate()
  const { timeRange, addRecentTicker } = useAppStore()
  const T = ticker?.toUpperCase() ?? 'AAPL'

  useEffect(() => { if (T) addRecentTicker(T) }, [T])

  const quoteQ   = useStockQuote(T)
  const candlesQ = useCandles(T, timeRange)
  const profileQ = useCompanyProfile(T)
  const finQ     = useBasicFinancials(T)
  const newsQ    = useCompanyNews(T)

  // WebSocket live tick — passed to QuoteCard + PriceChart
  const { tick } = useWebSocket(T)

  if (!ticker) { navigate('/dashboard/AAPL', { replace: true }); return null }

  const candles    = candlesQ.data?.candles ?? []
  const lastCandle = candles.length > 0 ? candles[candles.length - 1] : undefined

  return (
    <div className="space-y-4 animate-slide-up max-w-screen-2xl mx-auto">

      {/* Quote + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          {quoteQ.isLoading ? <QuoteCardSkeleton />
            : quoteQ.error  ? <ErrorCard message={quoteQ.error.message} onRetry={() => quoteQ.refetch()} />
            : quoteQ.data   ? <QuoteCard quote={quoteQ.data} profile={profileQ.data} />
            : null}
        </div>
        <div className="lg:col-span-2">
          {quoteQ.isLoading ? <StatsSkeleton />
            : quoteQ.data   ? <StatsRow quote={quoteQ.data} financials={finQ.data} profile={profileQ.data} lastCandle={lastCandle} />
            : null}
        </div>
      </div>

      {/* 52-week range */}
      {finQ.data && (
        <WeekRangeBar
          price={tick?.price ?? quoteQ.data?.price ?? null}
          low52={finQ.data.week_52_low}
          high52={finQ.data.week_52_high}
        />
      )}

      {/* Chart + News + Sentiment */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="xl:col-span-2">
          {candlesQ.isLoading ? <ChartSkeleton />
            : candlesQ.error  ? <ErrorCard message={candlesQ.error.message} onRetry={() => candlesQ.refetch()} />
            : (
              <div className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm text-text-primary">{T} Price</span>
                    <ChartTypeToggle />
                  </div>
                  <div className="flex items-center gap-2">
                    <IndicatorControls timeRange={timeRange} />
                    <TimeRangeSelector />
                  </div>
                </div>
                {candlesQ.data && (
                  <PriceChart candles={candlesQ.data.candles} ticker={T} liveTick={tick} />
                )}
              </div>
            )}
        </div>

        {/* Right column — News + Sentiment stacked */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          {/* Sentiment panel */}
          <SentimentPanel ticker={T} />

          {/* News */}
          <div className="flex-1 min-h-80">
            {newsQ.isLoading ? <div className="card p-4"><NewsSkeleton /></div>
              : newsQ.error  ? <ErrorCard message={newsQ.error.message} />
              : newsQ.data   ? <NewsPanel articles={newsQ.data.articles} ticker={T} />
              : null}
          </div>
        </div>
      </div>

      {/* Key metrics + Company info + Earnings + Institutional */}
      {finQ.data && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <FinancialGrid financials={finQ.data} />
          <div className="card p-4">
            <p className="stat-label mb-3">Company</p>
            {profileQ.isLoading
              ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
              : profileQ.data
              ? (
                <div className="space-y-2.5">
                  {[
                    { label: 'Exchange', value: profileQ.data.exchange },
                    { label: 'Sector',   value: profileQ.data.sector },
                    { label: 'Country',  value: profileQ.data.country },
                    { label: 'Currency', value: profileQ.data.currency },
                    { label: 'IPO Date', value: profileQ.data.ipo_date },
                    { label: 'Website',  value: profileQ.data.website },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-xs text-text-muted">{label}</span>
                      {label === 'Website'
                        ? <a href={value!} target="_blank" rel="noopener noreferrer"
                             className="font-mono text-xs text-accent-cyan hover:underline truncate max-w-48">{value}</a>
                        : <span className="font-mono text-xs text-text-primary">{value}</span>}
                    </div>
                  ))}
                </div>
              ) : null}
          </div>
          <EarningsHistoryCard ticker={T} />
          <InstitutionalOwnershipCard ticker={T} />
        </div>
      )}
    </div>
  )
}
