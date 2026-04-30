import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Clock, TrendingUp, Sun, Moon } from 'lucide-react'
import { useSearch } from '@/hooks/useStockData'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

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

export default function TopBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 250)
  const containerRef = useRef<HTMLDivElement>(null)
  const { addRecentTicker, theme, toggleTheme } = useAppStore()

  const handleSelect = (ticker: string) => {
    addRecentTicker(ticker)
    navigate(`/dashboard/${ticker}`)
    setQuery('')
    setOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-14 border-b border-bg-border bg-bg-surface/80 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0">
      {/* Search */}
      <div ref={containerRef} className="relative flex-1 max-w-sm">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          open ? 'bg-bg-card border-accent-cyan/50 ring-1 ring-accent-cyan/20'
               : 'bg-bg-card border-bg-border hover:border-bg-hover'
        )}>
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search ticker or company…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setOpen(false) }}>
              <X size={13} className="text-text-muted hover:text-text-primary" />
            </button>
          )}
        </div>
        {open && <SearchDropdown query={debouncedQuery} onSelect={handleSelect} />}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Live badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-green/10 border border-accent-green/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
          <span className="text-xs font-mono font-medium text-accent-green">LIVE</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
