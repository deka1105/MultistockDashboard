import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimeRange, ChartType } from '@/types/stock'

// ─── Indicator panel IDs ──────────────────────────────────────────────────────
export type IndicatorPanel = 'rsi' | 'macd' | 'stochastic'
export type OverlayIndicator = 'bb' | 'vwap' | 'ema9' | 'ema21'

interface AppState {
  // Watchlist (local mirror — backend is source of truth)
  watchlist: string[]
  addToWatchlist: (ticker: string) => void
  removeFromWatchlist: (ticker: string) => void
  isInWatchlist: (ticker: string) => boolean

  // Chart preferences
  chartType: ChartType
  setChartType: (type: ChartType) => void
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void

  // MA overlays (existing)
  showMA50:   boolean
  showMA200:  boolean
  toggleMA50:  () => void
  toggleMA200: () => void

  // Indicator overlays (on price chart)
  showBB:   boolean   // Bollinger Bands
  showVWAP: boolean   // VWAP — only meaningful on 1D
  showEMA9:  boolean
  showEMA21: boolean
  toggleBB:   () => void
  toggleVWAP: () => void
  toggleEMA9:  () => void
  toggleEMA21: () => void

  // Oscillator panels (below chart, ordered)
  activePanels: IndicatorPanel[]
  togglePanel:  (panel: IndicatorPanel) => void
  reorderPanels:(panels: IndicatorPanel[]) => void

  // RSI settings
  rsiPeriod:    number
  setRsiPeriod: (n: number) => void

  // MACD settings
  macdFast:   number
  macdSlow:   number
  macdSignal: number
  setMacdFast:   (n: number) => void
  setMacdSlow:   (n: number) => void
  setMacdSignal: (n: number) => void

  // Candlestick patterns
  showPatterns:    boolean
  showOptionsFlow: boolean
  togglePatterns:    () => void
  toggleOptionsFlow: () => void

  // Stochastic settings
  stochK:    number
  stochD:    number
  setStochK: (n: number) => void
  setStochD: (n: number) => void

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
      // ── Watchlist ────────────────────────────────────────────────────────────
      watchlist: ['AAPL', 'MSFT', 'NVDA', 'TSLA'],
      addToWatchlist: (ticker) => {
        const t = ticker.toUpperCase()
        if (!get().watchlist.includes(t))
          set((s) => ({ watchlist: [...s.watchlist, t] }))
      },
      removeFromWatchlist: (ticker) =>
        set((s) => ({ watchlist: s.watchlist.filter((t) => t !== ticker.toUpperCase()) })),
      isInWatchlist: (ticker) => get().watchlist.includes(ticker.toUpperCase()),

      // ── Chart ────────────────────────────────────────────────────────────────
      chartType: 'line',
      setChartType: (type) => set({ chartType: type }),
      timeRange: '1M',
      setTimeRange: (range) => set({ timeRange: range }),

      // ── MA overlays ──────────────────────────────────────────────────────────
      showMA50:  false,
      showMA200: false,
      toggleMA50:  () => set((s) => ({ showMA50:  !s.showMA50 })),
      toggleMA200: () => set((s) => ({ showMA200: !s.showMA200 })),

      // ── Indicator overlays ───────────────────────────────────────────────────
      showBB:   false,
      showVWAP: false,
      showEMA9:  false,
      showEMA21: false,
      toggleBB:   () => set((s) => ({ showBB:   !s.showBB })),
      toggleVWAP: () => set((s) => ({ showVWAP: !s.showVWAP })),
      toggleEMA9:  () => set((s) => ({ showEMA9:  !s.showEMA9 })),
      toggleEMA21: () => set((s) => ({ showEMA21: !s.showEMA21 })),

      // ── Oscillator panels ────────────────────────────────────────────────────
      activePanels: [],
      togglePanel: (panel) => set((s) => ({
        activePanels: s.activePanels.includes(panel)
          ? s.activePanels.filter(p => p !== panel)
          : [...s.activePanels, panel],
      })),
      reorderPanels: (panels) => set({ activePanels: panels }),

      // ── RSI ──────────────────────────────────────────────────────────────────
      rsiPeriod: 14,
      setRsiPeriod: (n) => set({ rsiPeriod: Math.max(2, Math.min(50, n)) }),

      // ── MACD ─────────────────────────────────────────────────────────────────
      macdFast:   12,
      macdSlow:   26,
      macdSignal: 9,
      setMacdFast:   (n) => set({ macdFast:   Math.max(1, n) }),
      setMacdSlow:   (n) => set({ macdSlow:   Math.max(1, n) }),
      setMacdSignal: (n) => set({ macdSignal: Math.max(1, n) }),

      // ── Patterns ─────────────────────────────────────────────────────────────
      showPatterns: false,
      togglePatterns: () => set((s) => ({ showPatterns: !s.showPatterns })),

      // ── Stochastic ───────────────────────────────────────────────────────────
      stochK: 14,
      stochD: 3,
      setStochK: (n) => set({ stochK: Math.max(1, n) }),
      setStochD: (n) => set({ stochD: Math.max(1, n) }),

      // ── Theme ────────────────────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark',  next === 'dark')
        document.documentElement.classList.toggle('light', next === 'light')
      },

      // ── UI ───────────────────────────────────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // ── Recent tickers ───────────────────────────────────────────────────────
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
        if (state) {
          document.documentElement.classList.toggle('dark',  state.theme === 'dark')
          document.documentElement.classList.toggle('light', state.theme === 'light')
        }
      },
    }
  )
)
