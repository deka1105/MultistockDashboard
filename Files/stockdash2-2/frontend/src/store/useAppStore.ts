import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimeRange, ChartType } from '@/types/stock'

interface AppState {
  // Watchlist (guest mode — persisted locally)
  watchlist: string[]
  addToWatchlist: (ticker: string) => void
  removeFromWatchlist: (ticker: string) => void
  isInWatchlist: (ticker: string) => boolean

  // Chart preferences
  chartType: ChartType
  setChartType: (type: ChartType) => void
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  showMA50: boolean
  showMA200: boolean
  toggleMA50: () => void
  toggleMA200: () => void

  // UI state
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Recent tickers
  recentTickers: string[]
  addRecentTicker: (ticker: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      watchlist: ['AAPL', 'MSFT', 'NVDA', 'TSLA'],
      addToWatchlist: (ticker) => {
        const t = ticker.toUpperCase()
        if (!get().watchlist.includes(t))
          set((s) => ({ watchlist: [...s.watchlist, t] }))
      },
      removeFromWatchlist: (ticker) =>
        set((s) => ({ watchlist: s.watchlist.filter((t) => t !== ticker.toUpperCase()) })),
      isInWatchlist: (ticker) => get().watchlist.includes(ticker.toUpperCase()),

      chartType: 'line',
      setChartType: (type) => set({ chartType: type }),
      timeRange: '1M',
      setTimeRange: (range) => set({ timeRange: range }),
      showMA50: false,
      showMA200: false,
      toggleMA50: () => set((s) => ({ showMA50: !s.showMA50 })),
      toggleMA200: () => set((s) => ({ showMA200: !s.showMA200 })),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      recentTickers: ['AAPL', 'MSFT', 'NVDA'],
      addRecentTicker: (ticker) => {
        const t = ticker.toUpperCase()
        set((s) => ({
          recentTickers: [t, ...s.recentTickers.filter((x) => x !== t)].slice(0, 6),
        }))
      },
    }),
    { name: 'stockdash-store' }
  )
)
