import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, GitCompare, Star, BarChart3, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useStockQuote } from '@/hooks/useStockData'
import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard/AAPL', label: 'Dashboard',  icon: LayoutDashboard, exact: false },
  { to: '/compare',         label: 'Compare',    icon: GitCompare,      exact: true },
  { to: '/watchlist',       label: 'Watchlist',  icon: Star,            exact: true },
  { to: '/market',          label: 'Market',     icon: BarChart3,       exact: true },
]

function WatchlistItem({ ticker }: { ticker: string }) {
  const navigate = useNavigate()
  const { data } = useStockQuote(ticker)
  const pctClass = getPriceClass(data?.change_pct)

  return (
    <button
      onClick={() => navigate(`/dashboard/${ticker}`)}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-hover transition-colors group"
    >
      <span className="font-mono text-xs font-semibold text-text-secondary group-hover:text-text-primary transition-colors">
        {ticker}
      </span>
      <div className="text-right">
        <div className="font-mono text-xs text-text-primary">{formatPrice(data?.price)}</div>
        <div className={cn('font-mono text-[10px]', pctClass)}>{formatPct(data?.change_pct)}</div>
      </div>
    </button>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, watchlist } = useAppStore()

  return (
    <aside className={cn(
      'flex flex-col h-full bg-bg-surface border-r border-bg-border transition-all duration-300 shrink-0',
      sidebarCollapsed ? 'w-14' : 'w-56'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-bg-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent-cyan" />
            <span className="font-display font-bold text-base text-text-primary tracking-tight">StockDash</span>
          </div>
        )}
        {sidebarCollapsed && <TrendingUp size={18} className="text-accent-cyan mx-auto" />}
        <button onClick={toggleSidebar}
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors ml-auto">
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 py-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => cn('sidebar-item', isActive && 'sidebar-item-active')}
          >
            <Icon size={16} className="shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Watchlist quick-view */}
      {!sidebarCollapsed && watchlist.length > 0 && (
        <div className="mt-auto border-t border-bg-border px-3 py-3">
          <p className="stat-label mb-2 px-1">Watchlist</p>
          <div className="flex flex-col gap-0.5">
            {watchlist.slice(0, 6).map(ticker => (
              <WatchlistItem key={ticker} ticker={ticker} />
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
