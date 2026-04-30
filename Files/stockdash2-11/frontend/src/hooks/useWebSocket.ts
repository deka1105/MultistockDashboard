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
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // In Docker: same host as the page, proxied by Vite
  return `${proto}//${window.location.host}`
})()

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
