import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import AppShell from '@/components/layout/AppShell'
import DashboardPage from '@/pages/DashboardPage'
import ComparePage from '@/pages/ComparePage'
import WatchlistPage from '@/pages/WatchlistPage'
import MarketPage from '@/pages/MarketPage'
import PortfolioPage from '@/pages/PortfolioPage'
import ScreenerPage from '@/pages/ScreenerPage'
import AlertsPage from '@/pages/AlertsPage'
import EarningsCalendarPage from '@/pages/EarningsCalendarPage'
import { NotFoundPage } from '@/pages/PlaceholderPages'
import { ChartSkeleton } from '@/components/common/Skeleton'

function PageLoader() {
  return <div className="space-y-4"><ChartSkeleton /></div>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard/AAPL" replace />} />
            <Route path="/dashboard/:ticker" element={
              <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
            } />
            <Route path="/compare"   element={<Suspense fallback={<PageLoader />}><ComparePage /></Suspense>} />
            <Route path="/watchlist" element={<Suspense fallback={<PageLoader />}><WatchlistPage /></Suspense>} />
            <Route path="/market"     element={<Suspense fallback={<PageLoader />}><MarketPage /></Suspense>} />
            <Route path="/portfolio"  element={<Suspense fallback={<PageLoader />}><PortfolioPage /></Suspense>} />
            <Route path="/screener"   element={<Suspense fallback={<PageLoader />}><ScreenerPage /></Suspense>} />
            <Route path="/alerts"     element={<Suspense fallback={<PageLoader />}><AlertsPage /></Suspense>} />
            <Route path="/calendar"   element={<Suspense fallback={<PageLoader />}><EarningsCalendarPage /></Suspense>} />
            <Route path="*"          element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
