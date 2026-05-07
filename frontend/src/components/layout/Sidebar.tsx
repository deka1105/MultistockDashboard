import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, GitCompare, Star, BarChart3,
  Briefcase, SlidersHorizontal, Bell, CalendarDays,
  TrendingUp, ChevronLeft, ChevronRight, Zap, Lock,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useStockQuote } from '@/hooks/useStockData'
import { formatPrice, formatPct, getPriceClass, cn } from '@/lib/utils'

// ─── Nav structure with section groupings ────────────────────────────────────

interface NavItem {
  to:    string
  label: string
  icon:  React.ElementType
  isNew?: boolean
}
interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'MARKETS',
    items: [
      { to: '/dashboard/AAPL', label: 'Dashboard',         icon: LayoutDashboard   },
      { to: '/market',         label: 'Market Overview',   icon: BarChart3         },
      { to: '/compare',        label: 'Compare',           icon: GitCompare        },
      { to: '/watchlist',      label: 'Watchlist',         icon: Star              },
    ],
  },
  {
    label: 'PORTFOLIO',
    items: [
      { to: '/portfolio', label: 'Portfolio P&L', icon: Briefcase, isNew: true },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { to: '/screener',  label: 'Screener',          icon: SlidersHorizontal, isNew: true },
      { to: '/alerts',    label: 'Alerts',            icon: Bell,              isNew: true },
      { to: '/calendar',  label: 'Earnings Calendar', icon: CalendarDays,      isNew: true },
    ],
  },
]

// ─── Watchlist ticker mini-row ────────────────────────────────────────────────

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

// ─── Plan Banner ──────────────────────────────────────────────────────────────

function PlanBanner({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="px-3 py-3 border-t border-bg-border flex justify-center">
        <div className="w-7 h-7 rounded-full bg-accent-cyan/15 border border-accent-cyan/25 flex items-center justify-center">
          <Zap size={12} className="text-accent-cyan" />
        </div>
      </div>
    )
  }
  return (
    <div className="px-3 py-3 border-t border-bg-border">
      <div className="rounded-xl border border-bg-border bg-gradient-to-br from-bg-hover to-bg-surface p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-accent-cyan/15 border border-accent-cyan/25 flex items-center justify-center shrink-0">
            <Zap size={10} className="text-accent-cyan" />
          </div>
          <span className="text-[11px] font-semibold text-text-primary">Guest Mode</span>
        </div>
        <p className="text-[9px] font-mono text-text-muted leading-relaxed">
          Sign up to save your data, set alerts, and sync across devices.
        </p>
        <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 text-[10px] font-mono font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors">
          <Lock size={9} /> Upgrade to Pro
        </button>
      </div>
    </div>
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, watchlist } = useAppStore()

  return (
    <aside aria-label="Application sidebar" className={cn(
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
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar (Cmd+B)' : 'Collapse sidebar (Cmd+B)'}
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors ml-auto"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Sectioned Nav */}
      <nav aria-label="Main navigation" className="flex flex-col px-2 py-3 gap-0 overflow-y-auto flex-1">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} className={cn(si > 0 && 'mt-3')}>

            {/* Section label */}
            {!sidebarCollapsed && (
              <div className="px-2 pb-1 flex items-center gap-2">
                <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-text-muted/50 select-none">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-bg-border/60" />
              </div>
            )}
            {sidebarCollapsed && si > 0 && (
              <div className="mx-2 h-px bg-bg-border/60 mb-2" />
            )}

            {/* Nav items */}
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ to, label, icon: Icon, isNew }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to !== '/dashboard/AAPL'}
                  aria-label={label}
                  className={({ isActive }) => cn(
                    'relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all',
                    'hover:bg-bg-hover hover:text-text-primary',
                    isActive ? 'bg-accent-cyan/8 text-text-primary' : 'text-text-muted'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator dot on left edge */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-accent-cyan" />
                      )}
                      <Icon size={15} className={cn('shrink-0', isActive && 'text-accent-cyan')} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 truncate">{label}</span>
                          {isNew && (
                            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-sm bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25 leading-none">
                              NEW
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Watchlist quick-view */}
        {!sidebarCollapsed && watchlist.length > 0 && (
          <div className="mt-4 border-t border-bg-border pt-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-text-muted/50 px-2 pb-1 select-none">
              Watchlist
            </p>
            <div className="flex flex-col gap-0.5">
              {watchlist.slice(0, 5).map(ticker => (
                <WatchlistItem key={ticker} ticker={ticker} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Plan Banner */}
      <PlanBanner collapsed={sidebarCollapsed} />
    </aside>
  )
}
