import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { useSearch } from '@/hooks/useStockData'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

const SERIES_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6',
]

interface TickerChipInputProps {
  tickers: string[]
  onChange: (tickers: string[]) => void
  max?: number
}

export default function TickerChipInput({ tickers, onChange, max = 8 }: TickerChipInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 200)
  const { data } = useSearch(debouncedQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addTicker = (ticker: string) => {
    const t = ticker.toUpperCase()
    if (!tickers.includes(t) && tickers.length < max) {
      onChange([...tickers, t])
    }
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const removeTicker = (ticker: string) => onChange(tickers.filter(t => t !== ticker))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2 p-2 card min-h-12">
        {tickers.map((ticker, i) => (
          <span
            key={ticker}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border"
            style={{
              backgroundColor: `${SERIES_COLORS[i % SERIES_COLORS.length]}18`,
              borderColor: `${SERIES_COLORS[i % SERIES_COLORS.length]}40`,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {ticker}
            <button onClick={() => removeTicker(ticker)} className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}

        {tickers.length < max && (
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={tickers.length === 0 ? 'Add tickers… (e.g. AAPL, MSFT)' : 'Add more…'}
            className="flex-1 min-w-24 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none px-1"
          />
        )}

        <span className="ml-auto text-[10px] font-mono text-text-muted">{tickers.length}/{max}</span>
      </div>

      {/* Dropdown */}
      {open && query.length > 0 && data?.results && data.results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 card shadow-2xl z-50 py-1.5 animate-fade-in">
          {data.results.slice(0, 6).map(result => result.ticker && (
            <button
              key={result.ticker}
              onClick={() => addTicker(result.ticker!)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-hover transition-colors text-left"
            >
              <Plus size={12} className="text-accent-cyan shrink-0" />
              <span className="font-mono text-sm font-semibold text-text-primary w-14 shrink-0">{result.ticker}</span>
              <span className="text-xs text-text-secondary truncate">{result.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
