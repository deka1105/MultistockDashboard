import { useEffect, useRef, useState } from 'react'
import { Star, StarOff, ExternalLink, Globe } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatPrice, formatChange, formatPct, getPriceClass, cn } from '@/lib/utils'
import type { Quote, CompanyProfile } from '@/types/stock'

interface QuoteCardProps {
  quote: Quote
  profile?: CompanyProfile
}

function MarketStatusBadge() {
  const now = new Date()
  const hour = now.getUTCHours()
  const day = now.getUTCDay()
  const isWeekend = day === 0 || day === 6
  // NYSE: 9:30am–4pm ET = 13:30–20:00 UTC (approx, ignoring DST)
  const isMarketHours = !isWeekend && hour >= 13 && hour < 20

  if (isMarketHours) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent-green/10 border border-accent-green/20 text-accent-green text-[10px] font-mono font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
        MARKET OPEN
      </span>
    )
  }
  const isPreMarket = !isWeekend && hour >= 9 && hour < 13
  if (isPreMarket) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-[10px] font-mono font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
        PRE-MARKET
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-border text-text-muted text-[10px] font-mono font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      CLOSED
    </span>
  )
}

export default function QuoteCard({ quote, profile }: QuoteCardProps) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useAppStore()
  const inWatchlist = isInWatchlist(quote.ticker)
  const prevPriceRef = useRef<number | null>(null)
  const [flashClass, setFlashClass] = useState('')

  // Flash animation on price change
  useEffect(() => {
    if (prevPriceRef.current !== null && quote.price !== null) {
      if (quote.price > prevPriceRef.current) setFlashClass('animate-flash-green')
      else if (quote.price < prevPriceRef.current) setFlashClass('animate-flash-red')
      const t = setTimeout(() => setFlashClass(''), 700)
      return () => clearTimeout(t)
    }
    prevPriceRef.current = quote.price
  }, [quote.price])

  const isUp = (quote.change_pct ?? 0) >= 0
  const pctClass = getPriceClass(quote.change_pct)

  return (
    <div className={cn('card p-5 relative overflow-hidden transition-colors duration-300', flashClass)}>
      {/* Subtle glow line at top */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-px',
        isUp ? 'bg-gradient-to-r from-transparent via-accent-green/40 to-transparent'
             : 'bg-gradient-to-r from-transparent via-accent-red/40 to-transparent'
      )} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {profile?.logo_url && (
            <img
              src={profile.logo_url}
              alt={quote.ticker}
              className="w-8 h-8 rounded-lg object-contain bg-white p-0.5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-text-primary tracking-tight">
                {quote.ticker}
              </h1>
              <MarketStatusBadge />
            </div>
            {profile?.company_name && (
              <p className="text-xs text-text-secondary mt-0.5 truncate max-w-48">
                {profile.company_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {profile?.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Globe size={14} />
            </a>
          )}
          <button
            onClick={() => inWatchlist ? removeFromWatchlist(quote.ticker) : addToWatchlist(quote.ticker)}
            className="p-1.5 rounded-md text-text-muted hover:text-accent-amber hover:bg-bg-hover transition-colors"
          >
            {inWatchlist
              ? <Star size={14} fill="currentColor" className="text-accent-amber" />
              : <StarOff size={14} />
            }
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-3 mb-1">
        <span className="font-mono text-4xl font-bold text-text-primary tabular-nums tracking-tight">
          {formatPrice(quote.price)}
        </span>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-mono text-base font-semibold tabular-nums', pctClass)}>
            {formatChange(quote.change)}
          </span>
          <span className={cn('badge-up', isUp ? 'badge-up' : 'badge-down')}>
            {isUp ? '▲' : '▼'} {formatPct(quote.change_pct)}
          </span>
        </div>
      </div>

      {/* Exchange / sector */}
      {(profile?.exchange || profile?.sector) && (
        <p className="text-[11px] text-text-muted font-mono">
          {[profile.exchange, profile.sector].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}
