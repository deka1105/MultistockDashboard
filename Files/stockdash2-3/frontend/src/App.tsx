import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import AppShell from '@/components/layout/AppShell'
import DashboardPage from '@/pages/DashboardPage'
import { ComparePage, WatchlistPage, MarketPage, NotFoundPage } from '@/pages/PlaceholderPages'
import { ChartSkeleton } from '@/components/common/Skeleton'

function PageLoader() {
  return (
    <div className="space-y-4">
      <ChartSkeleton />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard/AAPL" replace />} />
            <Route path="/dashboard/:ticker" element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            } />
            <Route path="/compare"   element={<ComparePage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/market"    element={<MarketPage />} />
            <Route path="*"          element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
