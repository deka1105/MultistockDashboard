import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, Plus, RefreshCw, Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react'
import { useAlerts, useCreateAlert, useDeleteAlert, useReactivateAlert, useCheckAlerts, useSearch } from '@/hooks/useStockData'
import { useDebounce } from '@/hooks/useDebounce'
import { formatPrice, cn } from '@/lib/utils'
import { Skeleton } from '@/components/common/Skeleton'

const ALERT_TYPES = [
  { value: 'price_above',    label: 'Price rises above',    needsThreshold: true,  unit: '$' },
  { value: 'price_below',    label: 'Price drops below',    needsThreshold: true,  unit: '$' },
  { value: 'pct_move_day',   label: 'Day move exceeds ±',   needsThreshold: true,  unit: '%' },
  { value: 'rsi_above',      label: 'RSI rises above',      needsThreshold: true,  unit: '' },
  { value: 'rsi_below',      label: 'RSI falls below',      needsThreshold: true,  unit: '' },
  { value: 'ma_cross_above', label: 'Crosses above MA50',   needsThreshold: false, unit: '' },
  { value: 'ma_cross_below', label: 'Crosses below MA50',   needsThreshold: false, unit: '' },
]

function CreateAlertForm({ onClose }: { onClose: () => void }) {
  const [ticker,    setTicker]    = useState('')
  const [query,     setQuery]     = useState('')
  const [alertType, setAlertType] = useState('price_above')
  const [threshold, setThreshold] = useState('')
  const [error,     setError]     = useState('')

  const debounced = useDebounce(query, 300)
  const { data: searchData } = useSearch(debounced)
  const createAlert = useCreateAlert()

  const typeConfig = ALERT_TYPES.find(t => t.value === alertType)!
  const results = searchData?.results?.slice(0, 5) ?? []

  const handleSubmit = () => {
    if (!ticker) { setError('Select a ticker'); return }
    const thresh = typeConfig.needsThreshold ? parseFloat(threshold) : undefined
    if (typeConfig.needsThreshold && (isNaN(thresh!) || thresh! <= 0)) {
      setError('Enter a valid threshold'); return
    }
    createAlert.mutate(
      { ticker, alert_type: alertType, threshold: thresh },
      {
        onSuccess: () => {
          // Request browser notification permission on first alert
          if (Notification.permission === 'default') Notification.requestPermission()
          onClose()
        },
        onError: () => setError('Failed to create alert'),
      }
    )
  }

  return (
    <div className="card p-4 space-y-3 border-accent-cyan/20">
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold text-sm text-text-primary">New Alert</p>
        <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary"><X size={13} /></button>
      </div>

      {/* Ticker search */}
      <div className="relative">
        <input value={query} onChange={e => { setQuery(e.target.value); setTicker('') }}
          placeholder="Search ticker…" className="input-base w-full" autoFocus />
        {results.length > 0 && !ticker && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-bg-border rounded-xl shadow-xl z-10 overflow-hidden">
            {results.map((r: any) => (
              <button key={r.ticker} onClick={() => { setTicker(r.ticker); setQuery(r.ticker) }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-hover text-left">
                <span className="font-mono font-bold text-xs text-text-primary w-14">{r.ticker}</span>
                <span className="text-xs text-text-secondary truncate">{r.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alert type */}
      <select value={alertType} onChange={e => setAlertType(e.target.value)} className="input-base w-full">
        {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {/* Threshold */}
      {typeConfig.needsThreshold && (
        <div className="relative">
          {typeConfig.unit && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">{typeConfig.unit}</span>
          )}
          <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)}
            placeholder={alertType.includes('rsi') ? '30' : alertType.includes('pct') ? '5' : '200'}
            className={cn('input-base w-full', typeConfig.unit && 'pl-6')} min={0} />
        </div>
      )}

      {error && <p className="text-xs text-accent-red font-mono">{error}</p>}

      <button onClick={handleSubmit} disabled={createAlert.isPending} className="btn-primary w-full justify-center flex items-center gap-1.5 text-xs">
        <Bell size={12} /> {createAlert.isPending ? 'Creating…' : 'Create Alert'}
      </button>
    </div>
  )
}

function AlertCard({ alert, onDelete, onReactivate }: { alert: any; onDelete: () => void; onReactivate?: () => void }) {
  const navigate = useNavigate()
  const isNear = alert.proximity_pct != null && alert.proximity_pct < 5

  return (
    <div className={cn(
      'card p-3.5 flex items-center gap-3 transition-all',
      isNear && 'border-accent-amber/30 bg-accent-amber/3',
      !alert.is_active && 'opacity-60',
    )}>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        alert.is_active
          ? isNear ? 'bg-accent-amber/15' : 'bg-accent-cyan/10'
          : 'bg-bg-hover'
      )}>
        {alert.is_active ? <Bell size={14} className={isNear ? 'text-accent-amber' : 'text-accent-cyan'} />
          : <BellOff size={14} className="text-text-muted" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/dashboard/${alert.ticker}`)}
            className="font-display font-bold text-sm text-text-primary hover:text-accent-cyan transition-colors">
            {alert.ticker}
          </button>
          {isNear && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 text-accent-amber">NEAR</span>}
        </div>
        <p className="text-xs text-text-muted font-mono">
          {alert.label} {alert.threshold != null ? <span className="text-text-secondary">{alert.threshold}</span> : ''}
        </p>
        {alert.current_price != null && (
          <p className="text-[10px] text-text-muted font-mono">
            Current: <span className="text-text-secondary">{formatPrice(alert.current_price)}</span>
            {alert.proximity_pct != null && ` · ${alert.proximity_pct.toFixed(1)}% away`}
          </p>
        )}
        {alert.triggered_at && (
          <p className="text-[10px] text-accent-amber font-mono">
            Triggered {new Date(alert.triggered_at).toLocaleDateString()} @ {formatPrice(alert.triggered_price)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!alert.is_active && onReactivate && (
          <button onClick={onReactivate} className="p-1.5 rounded text-text-muted hover:text-accent-green hover:bg-accent-green/10 transition-colors" title="Reactivate">
            <RotateCcw size={12} />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 rounded text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading, refetch } = useAlerts()
  const deleteAlert    = useDeleteAlert()
  const reactivate     = useReactivateAlert()
  const checkAlerts    = useCheckAlerts()

  // Check alerts on page focus and fire browser notifications for newly triggered
  useEffect(() => {
    const check = () => {
      checkAlerts.mutate(undefined, {
        onSuccess: (result: any) => {
          const triggered = result?.triggered ?? []
          triggered.forEach((a: any) => {
            if (Notification.permission === 'granted') {
              new Notification(`${a.ticker} alert triggered!`, {
                body: `${a.label} ${a.threshold ?? ''} — price: ${a.triggered_price?.toFixed(2)}`,
                icon: '/favicon.ico',
              })
            }
          })
        },
      })
    }
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [])

  const active    = data?.alerts    ?? []
  const triggered = data?.triggered ?? []

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-accent-cyan" />
          <h1 className="font-display font-bold text-xl text-text-primary">Price Alerts</h1>
          {active.length > 0 && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan">
              {active.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setShowCreate(s => !s)} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={13} /> New Alert
          </button>
        </div>
      </div>

      {/* Notification permission banner */}
      {Notification.permission === 'default' && (
        <div className="card p-3 flex items-center gap-3 border-accent-amber/20 bg-accent-amber/5">
          <AlertTriangle size={14} className="text-accent-amber shrink-0" />
          <p className="text-xs text-text-secondary flex-1">Enable browser notifications to get alerted even when StockDash isn't in focus.</p>
          <button onClick={() => Notification.requestPermission()} className="btn-sm text-xs">Enable</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && <CreateAlertForm onClose={() => setShowCreate(false)} />}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      )}

      {/* Active alerts */}
      {!isLoading && active.length === 0 && !showCreate && (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <Bell size={32} className="text-text-muted" />
          <div>
            <p className="text-text-primary font-semibold mb-1">No active alerts</p>
            <p className="text-text-muted text-sm">Create an alert to be notified when a stock hits your target price.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Create First Alert
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="stat-label px-1">Active ({active.length})</p>
          {active.map((a: any) => (
            <AlertCard key={a.id} alert={a}
              onDelete={() => deleteAlert.mutate(a.id)} />
          ))}
        </div>
      )}

      {/* Triggered history */}
      {triggered.length > 0 && (
        <div className="space-y-2">
          <p className="stat-label px-1">Recently Triggered ({triggered.length})</p>
          {triggered.map((a: any) => (
            <AlertCard key={a.id} alert={a}
              onDelete={() => deleteAlert.mutate(a.id)}
              onReactivate={() => reactivate.mutate(a.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
