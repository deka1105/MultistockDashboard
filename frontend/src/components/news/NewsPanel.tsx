import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { NewsArticle } from '@/types/stock'

// Source → color + icon character
const SOURCE_STYLES: Record<string, { color: string; badge: string }> = {
  'Reuters':       { color: 'text-orange-400',   badge: 'R' },
  'Bloomberg':     { color: 'text-accent-cyan',  badge: 'B' },
  'CNBC':          { color: 'text-accent-amber',  badge: 'C' },
  'MarketWatch':   { color: 'text-green-400',    badge: 'MW' },
  'WSJ':           { color: 'text-text-primary',  badge: 'WSJ' },
  'Yahoo Finance': { color: 'text-purple-400',   badge: 'YF' },
  'Seeking Alpha': { color: 'text-accent-blue',  badge: 'SA' },
  'StockTwits':    { color: 'text-accent-green',  badge: 'ST' },
  'Reddit':        { color: 'text-orange-500',   badge: 'R/' },
  'X / Twitter':   { color: 'text-text-primary',  badge: '𝕏' },
  'SEC EDGAR':     { color: 'text-text-secondary', badge: 'SEC' },
}

function SourceBadge({ source }: { source: string | null }) {
  const style = source ? SOURCE_STYLES[source] : null
  return (
    <span className={cn(
      'text-[10px] font-mono font-bold',
      style?.color ?? 'text-text-muted'
    )}>
      {style?.badge ?? source ?? '?'}
    </span>
  )
}

function SentimentIcon({ sentiment }: { sentiment: NewsArticle['sentiment'] }) {
  if (sentiment === 'positive') return <TrendingUp size={10} className="text-accent-green" />
  if (sentiment === 'negative') return <TrendingDown size={10} className="text-accent-red" />
  return <Minus size={10} className="text-text-muted" />
}

function NewsItem({ article }: { article: NewsArticle }) {
  const isReddit     = article.source === 'Reddit'
  const isX          = article.source === 'X / Twitter'
  const isStockTwits = article.source === 'StockTwits'
  const isSocial     = isReddit || isX || isStockTwits

  return (
    <a
      href={article.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block p-3.5 rounded-lg transition-colors group border border-transparent',
        isSocial
          ? 'hover:bg-accent-cyan/5 hover:border-accent-cyan/10'
          : 'hover:bg-bg-hover hover:border-bg-border'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <SentimentIcon sentiment={article.sentiment} />
          <SourceBadge source={article.source} />
          {isSocial && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-accent-cyan/20 text-accent-cyan font-mono">
              SOCIAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-text-muted font-mono">
            {formatDate(article.published_at, 'MMM d HH:mm')}
          </span>
          <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <p className="text-sm text-text-primary leading-snug group-hover:text-white transition-colors line-clamp-2">
        {article.headline}
      </p>

      {article.summary && !isSocial && (
        <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{article.summary}</p>
      )}
    </a>
  )
}

interface NewsPanelProps {
  articles: NewsArticle[]
  ticker: string
}

export default function NewsPanel({ articles, ticker }: NewsPanelProps) {
  const positive = articles.filter(a => a.sentiment === 'positive').length
  const negative = articles.filter(a => a.sentiment === 'negative').length
  const total    = articles.length

  const newsArticles   = articles.filter(a => !['Reddit','X / Twitter','StockTwits'].includes(a.source ?? ''))
  const socialArticles = articles.filter(a => ['Reddit','X / Twitter','StockTwits'].includes(a.source ?? ''))

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <p className="text-sm font-semibold text-text-primary">{ticker} News & Social</p>
        {total > 0 && (
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-accent-green">{positive} pos</span>
            <span className="text-text-muted">·</span>
            <span className="text-accent-red">{negative} neg</span>
          </div>
        )}
      </div>

      {/* Sentiment bar */}
      {total > 0 && (
        <div className="h-1 flex mx-4 mt-3 rounded-full overflow-hidden gap-px">
          <div className="bg-accent-green/60 rounded-full transition-all"
            style={{ width: `${(positive / total) * 100}%` }} />
          <div className="bg-accent-red/60 rounded-full transition-all"
            style={{ width: `${(negative / total) * 100}%` }} />
          <div className="bg-bg-border flex-1 rounded-full" />
        </div>
      )}

      {/* Articles */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {articles.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No recent news</p>
        ) : (
          <div className="space-y-0.5">
            {/* Financial news first */}
            {newsArticles.map((article, i) => (
              <NewsItem key={article.id ?? `news-${i}`} article={article} />
            ))}

            {/* Social links section */}
            {socialArticles.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 mt-1">
                  <div className="h-px flex-1 bg-bg-border" />
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Social</span>
                  <div className="h-px flex-1 bg-bg-border" />
                </div>
                {socialArticles.map((article, i) => (
                  <NewsItem key={article.id ?? `social-${i}`} article={article} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
