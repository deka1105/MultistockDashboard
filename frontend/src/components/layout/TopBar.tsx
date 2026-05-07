import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, X, Clock, TrendingUp, Sun, Moon, Download, SlidersHorizontal } from 'lucide-react'
import { useSearch, useWebSocketStatus } from '@/hooks/useStockData'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

// ─── Search Dropdown ─────────────────────────────────────────────────────────

function SearchDropdown({ query, onSelect }: { query: string; onSelect: (t: string) => void }) {
  const { data, isLoading } = useSearch(query)
  const { recentTickers } = useAppStore()

  if (query.length === 0) {
    return (
      <div className="absolute top-full mt-2 left-0 right-0 card shadow-2xl shadow-black/50 z-50 py-2 animate-fade-in">
        <p className="stat-label px-3 py-1">Recent</p>
        {recentTickers.map((ticker) => (
          <button key={ticker} onClick={() => onSelect(ticker)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-hover transition-colors text-left">
            <Clock size={13} className="text-text-muted shrink-0" />
            <span className="font-mono text-sm text-text-primary">{ticker}</span>
          </button>
        ))}
        {recentTickers.length === 0 && (
          <p className="px-3 py-2 text-xs text-text-muted">Search for a ticker to get started</p>
        )}
      </div>
    )
  }

  return (
    <div className="absolute top-full mt-2 left-0 right-0 card shadow-2xl shadow-black/50 z-50 py-2 animate-fade-in">
      {isLoading && <div className="px-3 py-3 text-sm text-text-muted">Searching…</div>}
      {!isLoading && data?.results?.length === 0 && (
        <div className="px-3 py-3 text-sm text-text-muted">No results for "{query}"</div>
      )}
      {data?.results?.map((result) => result.ticker && (
        <button key={result.ticker} onClick={() => onSelect(result.ticker!)}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left">
          <TrendingUp size={13} className="text-accent-cyan shrink-0" />
          <span className="font-mono text-sm font-semibold text-text-primary w-16 shrink-0">{result.ticker}</span>
          <span className="text-xs text-text-secondary truncate">{result.description}</span>
          {result.exchange && (
            <span className="ml-auto text-[10px] text-text-muted font-mono shrink-0">{result.exchange}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Context-aware Export CSV ─────────────────────────────────────────────────

function useExportAction() {
  const location = useLocation()

  return useCallback(() => {
    const path = location.pathname
    if (path.startsWith('/portfolio')) {
      // Trigger HoldingsTable CSV export — dispatch a custom event
      window.dispatchEvent(new CustomEvent('stockdash:export-csv', { detail: { page: 'portfolio' } }))
    } else if (path.startsWith('/screener')) {
      window.dispatchEvent(new CustomEvent('stockdash:export-csv', { detail: { page: 'screener' } }))
    } else if (path.startsWith('/dashboard')) {
      window.dispatchEvent(new CustomEvent('stockdash:export-csv', { detail: { page: 'dashboard' } }))
    } else {
      window.dispatchEvent(new CustomEvent('stockdash:export-csv', { detail: { page: 'general' } }))
    }
  }, [location.pathname])
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const debouncedQuery        = useDebounce(query, 250)
  const containerRef          = useRef<HTMLDivElement>(null)
  const searchInputRef        = useRef<HTMLInputElement>(null)
  const { addRecentTicker, theme, toggleTheme, toggleSidebar } = useAppStore()
  const wsStatus = useWebSocketStatus()
  const handleExport = useExportAction()

  const handleSelect = (ticker: string) => {
    addRecentTicker(ticker)
    navigate(`/dashboard/${ticker}`)
    setQuery('')
    setOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcuts
  const gPressedRef = useRef(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input
      const target = e.target as HTMLElement
      const inInput = ['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable
      const mod = e.metaKey || e.ctrlKey

      // ⌘K → focus search
      if (mod && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setOpen(true)
        return
      }
      // ⌘B → toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }
      // ⌘⇧S → open screener
      if (mod && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        navigate('/screener')
        return
      }

      if (inInput) return

      // G → then letter navigation (like GitHub)
      if (e.key === 'g' && !mod) {
        gPressedRef.current = true
        setTimeout(() => { gPressedRef.current = false }, 1500)
        return
      }
      if (gPressedRef.current) {
        gPressedRef.current = false
        const routes: Record<string, string> = {
          d: '/dashboard/AAPL',
          p: '/portfolio',
          m: '/market',
          w: '/watchlist',
          c: '/compare',
          s: '/screener',
          a: '/alerts',
          e: '/calendar',
        }
        if (routes[e.key]) {
          e.preventDefault()
          navigate(routes[e.key])
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggleSidebar, navigate])

  // Update document title on route change
  useEffect(() => {
    const path = location.pathname
    const segments = path.split('/').filter(Boolean)
    let title = 'StockDash'
    if (segments[0] === 'dashboard' && segments[1]) title = `${segments[1].toUpperCase()} · StockDash`
    else if (segments[0] === 'portfolio')  title = 'Portfolio · StockDash'
    else if (segments[0] === 'screener')   title = 'Screener · StockDash'
    else if (segments[0] === 'alerts')     title = 'Alerts · StockDash'
    else if (segments[0] === 'calendar')   title = 'Earnings · StockDash'
    else if (segments[0] === 'compare')    title = 'Compare · StockDash'
    else if (segments[0] === 'watchlist')  title = 'Watchlist · StockDash'
    else if (segments[0] === 'market')     title = 'Market · StockDash'
    document.title = title
  }, [location.pathname])

  const isOnPortfolio = location.pathname.startsWith('/portfolio')
  const isOnScreener  = location.pathname.startsWith('/screener')

  return (
    <header role="banner" aria-label="Application header" className="h-14 border-b border-bg-border bg-bg-surface/80 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">

      {/* Search */}
      <div ref={containerRef} className="relative flex-1 max-w-sm">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          open
            ? 'bg-bg-card border-accent-cyan/50 ring-1 ring-accent-cyan/20'
            : 'bg-bg-card border-bg-border hover:border-bg-hover'
        )}>
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            aria-label="Search tickers and companies"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            placeholder="Search ticker or company…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          {query ? (
            <button onClick={() => { setQuery(''); setOpen(false) }}>
              <X size={13} className="text-text-muted hover:text-text-primary" />
            </button>
          ) : (
            <span className="text-[10px] font-mono text-text-muted/50 hidden sm:block">⌘K</span>
          )}
        </div>
        {open && <SearchDropdown query={debouncedQuery} onSelect={handleSelect} />}
      </div>

      {/* Right-side action buttons */}
      <div className="ml-auto flex items-center gap-2">

        {/* Export CSV — context-aware */}
        <button
          onClick={handleExport}
          aria-label="Export data as CSV"
          title="Export data as CSV"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bg-border text-text-secondary hover:text-text-primary hover:border-bg-hover hover:bg-bg-hover transition-colors text-xs font-medium"
        >
          <Download size={13} />
          <span>Export CSV</span>
        </button>

        {/* Run Screener CTA */}
        <button
          onClick={() => navigate('/screener')}
          aria-label="Open Stock Screener"
          title="Open Stock Screener (⌘⇧S)"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            isOnScreener
              ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
              : 'bg-accent-cyan text-bg-base hover:bg-accent-cyan/90 shadow-sm shadow-accent-cyan/20'
          )}
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">Run Screener</span>
        </button>

        {/* LIVE badge — connection-aware */}
        {(() => {
          const { status, totalActive, totalTracked, secondsAgo } = wsStatus
          const dotColor  = status === 'connected'    ? 'bg-accent-green'
            : status === 'partial'       ? 'bg-accent-amber'
            : status === 'disconnected'  ? 'bg-accent-red'
            : 'bg-text-muted'
          const textColor = status === 'connected'    ? 'text-accent-green'
            : status === 'partial'       ? 'text-accent-amber'
            : status === 'disconnected'  ? 'text-accent-red'
            : 'text-text-muted'
          const bgColor   = status === 'connected'    ? 'bg-accent-green/10 border-accent-green/20'
            : status === 'partial'       ? 'bg-accent-amber/10 border-accent-amber/20'
            : status === 'disconnected'  ? 'bg-accent-red/10 border-accent-red/20'
            : 'bg-bg-hover border-bg-border'
          const label     = status === 'idle' ? 'LIVE' : 'LIVE'
          const animate   = status === 'connected' || status === 'partial'
          const tooltip   = status === 'idle'
            ? 'Real-time data · No active subscriptions'
            : status === 'connected'
            ? `Real-time data · ${totalActive} ticker${totalActive !== 1 ? 's' : ''} live${secondsAgo != null ? ` · Last tick: ${secondsAgo}s ago` : ''}`
            : status === 'partial'
            ? `Partial connection · ${totalActive}/${totalTracked} connected`
            : 'WebSocket reconnecting…'

          return (
            <div
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-default transition-all', bgColor)}
              title={tooltip}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', dotColor, animate && 'animate-pulse-slow')} />
              <span className={cn('text-xs font-mono font-medium transition-colors', textColor)}>{label}</span>
            </div>
          )
        })()}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
