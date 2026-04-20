import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { NewsArticle } from '@/types/stock'

function SentimentBadge({ sentiment }: { sentiment: NewsArticle['sentiment'] }) {
  if (sentiment === 'positive') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold font-mono text-accent-green">
      <TrendingUp size={10} /> POS
    </span>
  )
  if (sentiment === 'negative') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold font-mono text-accent-red">
      <TrendingDown size={10} /> NEG
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold font-mono text-text-muted">
      <Minus size={10} /> NEU
    </span>
  )
}

function NewsItem({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3.5 rounded-lg hover:bg-bg-hover transition-colors group border border-transparent hover:border-bg-border"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <SentimentBadge sentiment={article.sentiment} />
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
      {article.source && (
        <p className="text-[11px] text-text-muted mt-1.5">{article.source}</p>
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
  const total = articles.length

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <p className="text-sm font-semibold text-text-primary">{ticker} News</p>
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
          <div className="bg-accent-green/60 rounded-full transition-all" style={{ width: `${(positive / total) * 100}%` }} />
          <div className="bg-accent-red/60 rounded-full transition-all" style={{ width: `${(negative / total) * 100}%` }} />
          <div className="bg-bg-border flex-1 rounded-full" />
        </div>
      )}

      {/* Articles */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {articles.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No recent news</p>
        ) : (
          articles.map((article, i) => (
            <NewsItem key={article.id ?? i} article={article} />
          ))
        )}
      </div>
    </div>
  )
}
