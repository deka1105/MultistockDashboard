/**
 * useWebSocket — subscribes to real-time price ticks via WS /api/v1/ws/ticks/{ticker}
 * Falls back gracefully to REST polling (already handled by useStockQuote) if WS fails.
 */
import { useEffect, useRef, useState, useCallback } from 'react'

export interface PriceTick {
  type: 'tick' | 'snapshot' | 'keepalive'
  ticker: string
  price: number | null
  change: number | null
  change_pct: number | null
  timestamp: number
  direction: 'up' | 'down' | 'flat'
}

interface UseWebSocketResult {
  tick: PriceTick | null
  connected: boolean
  error: string | null
}

const WS_BASE = (() => {
  // In production (Render): use VITE_WS_URL env var
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  // In Docker local dev: derive from current host (proxied by Vite)
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
})()

// Forward status to global registry (read by useWebSocketStatus in TopBar)
let _registerWsTick: ((ticker: string, connected: boolean) => void) | null = null
try {
  // Dynamic import to avoid circular dependency
  import('@/hooks/useStockData').then(m => { _registerWsTick = m._registerWsTick })
} catch {}

export function useWebSocket(ticker: string | undefined): UseWebSocketResult {
  const [tick, setTick]         = useState<PriceTick | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const wsRef                   = useRef<WebSocket | null>(null)
  const reconnectTimer          = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts       = useRef(0)
  const mountedRef              = useRef(true)

  const connect = useCallback(() => {
    if (!ticker || !mountedRef.current) return

    try {
      const url = `${WS_BASE}/api/v1/ws/ticks/${ticker}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setError(null)
        reconnectAttempts.current = 0
        if (ticker) _registerWsTick?.(ticker, true)
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'keepalive') return
          setTick(data as PriceTick)
        } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        wsRef.current = null
        if (ticker) _registerWsTick?.(ticker, false)

        // Exponential backoff reconnect (max 30s)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30_000)
        reconnectAttempts.current++
        reconnectTimer.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setError('WebSocket connection failed — using polling fallback')
        setConnected(false)
        ws.close()
      }
    } catch (e) {
      setError('WebSocket unavailable')
    }
  }, [ticker])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
      }
    }
  }, [connect])

  // Keepalive ping every 25s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 25_000)
    return () => clearInterval(interval)
  }, [])

  return { tick, connected, error }
}
