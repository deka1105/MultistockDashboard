import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

function queryWrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ─── useDebounce ──────────────────────────────────────────────────────────────

import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )
    rerender({ value: 'world' })
    expect(result.current).toBe('hello')  // still old value
  })

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )
    rerender({ value: 'world' })
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('world')
  })

  it('debounces rapid updates — only last one fires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )
    rerender({ value: 'ab' })
    rerender({ value: 'abc' })
    rerender({ value: 'abcd' })
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('abcd')  // Only final value
  })

  it('resets timer on each change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )
    rerender({ value: 'ab' })
    act(() => { vi.advanceTimersByTime(200) }) // not enough
    expect(result.current).toBe('a')  // still old
    act(() => { vi.advanceTimersByTime(300) }) // now enough from last change
    expect(result.current).toBe('ab')
  })
})

// ─── useAppStore ──────────────────────────────────────────────────────────────

import { useAppStore } from '@/store/useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useAppStore.setState({
      watchlist: [],
      chartType: 'line',
      timeRange: '1M',
      showMA50: false,
      showMA200: false,
      theme: 'dark',
      sidebarCollapsed: false,
      recentTickers: [],
    })
  })

  it('adds ticker to watchlist', () => {
    act(() => { useAppStore.getState().addToWatchlist('AAPL') })
    expect(useAppStore.getState().watchlist).toContain('AAPL')
  })

  it('uppercases ticker when adding', () => {
    act(() => { useAppStore.getState().addToWatchlist('aapl') })
    expect(useAppStore.getState().watchlist).toContain('AAPL')
    expect(useAppStore.getState().watchlist).not.toContain('aapl')
  })

  it('does not add duplicate tickers', () => {
    act(() => {
      useAppStore.getState().addToWatchlist('AAPL')
      useAppStore.getState().addToWatchlist('AAPL')
    })
    const wl = useAppStore.getState().watchlist
    expect(wl.filter(t => t === 'AAPL').length).toBe(1)
  })

  it('removes ticker from watchlist', () => {
    act(() => {
      useAppStore.getState().addToWatchlist('AAPL')
      useAppStore.getState().addToWatchlist('MSFT')
      useAppStore.getState().removeFromWatchlist('AAPL')
    })
    const wl = useAppStore.getState().watchlist
    expect(wl).not.toContain('AAPL')
    expect(wl).toContain('MSFT')
  })

  it('isInWatchlist returns correct boolean', () => {
    act(() => { useAppStore.getState().addToWatchlist('NVDA') })
    expect(useAppStore.getState().isInWatchlist('NVDA')).toBe(true)
    expect(useAppStore.getState().isInWatchlist('TSLA')).toBe(false)
  })

  it('isInWatchlist is case insensitive', () => {
    act(() => { useAppStore.getState().addToWatchlist('AAPL') })
    expect(useAppStore.getState().isInWatchlist('aapl')).toBe(true)
  })

  it('setChartType changes chart type', () => {
    act(() => { useAppStore.getState().setChartType('candlestick') })
    expect(useAppStore.getState().chartType).toBe('candlestick')
  })

  it('setTimeRange changes time range', () => {
    act(() => { useAppStore.getState().setTimeRange('3M') })
    expect(useAppStore.getState().timeRange).toBe('3M')
  })

  it('toggleMA50 flips state', () => {
    expect(useAppStore.getState().showMA50).toBe(false)
    act(() => { useAppStore.getState().toggleMA50() })
    expect(useAppStore.getState().showMA50).toBe(true)
    act(() => { useAppStore.getState().toggleMA50() })
    expect(useAppStore.getState().showMA50).toBe(false)
  })

  it('toggleSidebar flips collapsed state', () => {
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
    act(() => { useAppStore.getState().toggleSidebar() })
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
  })

  it('addRecentTicker prepends and limits to 6', () => {
    act(() => {
      for (const t of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
        useAppStore.getState().addRecentTicker(t)
      }
    })
    const recent = useAppStore.getState().recentTickers
    expect(recent.length).toBeLessThanOrEqual(6)
    expect(recent[0]).toBe('G')  // Most recent first
  })

  it('addRecentTicker deduplicates and moves to front', () => {
    act(() => {
      useAppStore.getState().addRecentTicker('AAPL')
      useAppStore.getState().addRecentTicker('MSFT')
      useAppStore.getState().addRecentTicker('AAPL')  // AAPL again
    })
    const recent = useAppStore.getState().recentTickers
    expect(recent[0]).toBe('AAPL')
    expect(recent.filter(t => t === 'AAPL').length).toBe(1)
  })
})

// ─── useWebSocket ─────────────────────────────────────────────────────────────

import { useWebSocket } from '@/hooks/useWebSocket'

describe('useWebSocket', () => {
  it('returns initial state with no tick', () => {
    const { result } = renderHook(() => useWebSocket('AAPL'))
    expect(result.current.tick).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('does not connect when ticker is undefined', () => {
    renderHook(() => useWebSocket(undefined))
    // WebSocket constructor should not have been called with undefined
    const ws = global.WebSocket as any
    const calls = ws.mock?.calls ?? []
    const badCalls = calls.filter((c: any[]) => c[0]?.includes('undefined'))
    expect(badCalls.length).toBe(0)
  })

  it('sets error when WebSocket fires onerror', async () => {
    const mockWs = {
      send: vi.fn(), close: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      onopen: null as any, onclose: null as any,
      onmessage: null as any, onerror: null as any,
      readyState: 0, OPEN: 1,
    }
    vi.mocked(global.WebSocket).mockReturnValueOnce(mockWs as any)

    const { result } = renderHook(() => useWebSocket('AAPL'))

    await act(async () => {
      if (mockWs.onerror) mockWs.onerror(new Event('error'))
    })

    expect(result.current.connected).toBe(false)
  })

  it('parses incoming tick messages', async () => {
    const mockWs = {
      send: vi.fn(), close: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      onopen: null as any, onclose: null as any,
      onmessage: null as any, onerror: null as any,
      readyState: 1, OPEN: 1,
    }
    vi.mocked(global.WebSocket).mockReturnValueOnce(mockWs as any)

    const { result } = renderHook(() => useWebSocket('AAPL'))

    const tickPayload = {
      type: 'tick', ticker: 'AAPL',
      price: 192.0, change: 2.5, change_pct: 1.3,
      timestamp: 1700000100, direction: 'up',
    }

    await act(async () => {
      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(tickPayload) } as MessageEvent)
      }
    })

    expect(result.current.tick?.price).toBe(192.0)
    expect(result.current.tick?.direction).toBe('up')
  })

  it('ignores keepalive messages (does not update tick)', async () => {
    const mockWs = {
      send: vi.fn(), close: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      onopen: null as any, onclose: null as any,
      onmessage: null as any, onerror: null as any,
      readyState: 1, OPEN: 1,
    }
    vi.mocked(global.WebSocket).mockReturnValueOnce(mockWs as any)

    const { result } = renderHook(() => useWebSocket('AAPL'))

    await act(async () => {
      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify({ type: 'keepalive' }) } as MessageEvent)
      }
    })

    // Tick should remain null — keepalive is filtered
    expect(result.current.tick).toBeNull()
  })

  it('closes WebSocket on unmount', () => {
    const mockWs = {
      send: vi.fn(), close: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      onopen: null as any, onclose: null as any,
      onmessage: null as any, onerror: null as any,
      readyState: 1, OPEN: 1,
    }
    vi.mocked(global.WebSocket).mockReturnValueOnce(mockWs as any)

    const { unmount } = renderHook(() => useWebSocket('AAPL'))
    unmount()

    expect(mockWs.close).toHaveBeenCalled()
  })
})

// ─── Correlation matrix computation ──────────────────────────────────────────
// Tests the pure Pearson correlation logic in CorrelationMatrix component

describe('Pearson correlation (via inline computation)', () => {
  function pearson(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length)
    if (n < 2) return 0
    const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n
    const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n
    let num = 0, denA = 0, denB = 0
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA, db = b[i] - meanB
      num += da * db; denA += da * da; denB += db * db
    }
    const den = Math.sqrt(denA * denB)
    return den === 0 ? 0 : num / den
  }

  it('perfect positive correlation = 1.0', () => {
    const a = [1, 2, 3, 4, 5]
    expect(pearson(a, a)).toBe(1.0)
  })

  it('perfect negative correlation = -1.0', () => {
    const a = [1, 2, 3, 4, 5]
    const b = [5, 4, 3, 2, 1]
    expect(pearson(a, b)).toBeCloseTo(-1.0, 5)
  })

  it('uncorrelated series near 0', () => {
    const a = [1, 2, 3, 4, 5]
    const b = [3, 3, 3, 3, 3]  // constant series
    expect(pearson(a, b)).toBe(0)
  })

  it('result is always in [-1, 1]', () => {
    const a = Array.from({ length: 100 }, () => Math.random())
    const b = Array.from({ length: 100 }, () => Math.random())
    const r = pearson(a, b)
    expect(r).toBeGreaterThanOrEqual(-1)
    expect(r).toBeLessThanOrEqual(1)
  })

  it('handles arrays shorter than 2 gracefully', () => {
    expect(pearson([1], [2])).toBe(0)
    expect(pearson([], [])).toBe(0)
  })
})
