import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); cleanup() })
afterAll(() => server.close())

// ─── ResizeObserver — required by Recharts ResponsiveContainer ────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe:   vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// ─── window.matchMedia ────────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ─── WebSocket ────────────────────────────────────────────────────────────────
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(), close: vi.fn(),
  addEventListener: vi.fn(), removeEventListener: vi.fn(),
  onopen: null, onclose: null, onmessage: null, onerror: null,
  readyState: 1, OPEN: 1,
})) as any

// ─── localStorage ─────────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
    length: 0,
    key: (_: number) => null,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// ─── Suppress expected React/test warnings ────────────────────────────────────
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (msg.includes('Warning:') || msg.includes('ReactDOM.render') ||
        msg.includes('act(') || msg.includes('not wrapped in act')) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })
