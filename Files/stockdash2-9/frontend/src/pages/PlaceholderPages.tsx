import { GitCompare, Star, BarChart3, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function PlaceholderPage({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: React.ElementType
  title: string
  description: string
  phase: number
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-5 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
        <Icon size={24} className="text-accent-cyan" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="font-display font-bold text-xl text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      </div>
      <span className="px-3 py-1 rounded-full bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-xs font-mono font-semibold">
        Coming in Phase {phase}
      </span>
    </div>
  )
}

export function ComparePage() {
  return (
    <PlaceholderPage
      icon={GitCompare}
      title="Multi-Stock Comparison"
      description="Overlay normalized % return charts for up to 8 tickers. Correlation matrix and summary stats."
      phase={3}
    />
  )
}

export function WatchlistPage() {
  return (
    <PlaceholderPage
      icon={Star}
      title="Watchlist"
      description="Manage your saved tickers with sparklines, price cards, and drag-to-reorder."
      phase={3}
    />
  )
}

export function MarketPage() {
  return (
    <PlaceholderPage
      icon={BarChart3}
      title="Market Overview"
      description="Sortable S&P 500 table with sector filters, sparklines, and watchlist actions."
      phase={3}
    />
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4">
      <p className="font-mono text-6xl font-bold text-text-muted">404</p>
      <p className="text-text-secondary">Page not found</p>
      <button onClick={() => navigate('/dashboard/AAPL')} className="btn-primary flex items-center gap-2">
        Go to Dashboard <ArrowRight size={14} />
      </button>
    </div>
  )
}
