import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimeRange, ChartType } from '@/types/stock'

interface AppState {
  // Watchlist
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

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // UI
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

      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
        document.documentElement.classList.toggle('light', next === 'light')
      },

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
    {
      name: 'stockdash-store',
      onRehydrateStorage: () => (state) => {
        // Apply persisted theme on load
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
          document.documentElement.classList.toggle('light', state.theme === 'light')
        }
      },
    }
  )
)
