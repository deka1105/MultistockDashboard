import { useState } from 'react'
import { Bell, Plus, X, Check } from 'lucide-react'
import { useCreateAlert, useAlerts } from '@/hooks/useStockData'
import { useStockQuote } from '@/hooks/useStockData'
import { formatPrice, cn } from '@/lib/utils'

const QUICK_TYPES = [
  { value: 'price_above', label: '↑ Above',    needsValue: true },
  { value: 'price_below', label: '↓ Below',    needsValue: true },
  { value: 'pct_move_day', label: '±% Day',    needsValue: true },
  { value: 'rsi_below',   label: 'RSI <',      needsValue: true },
  { value: 'ma_cross_above', label: 'MA50 ↑',  needsValue: false },
]

interface Props { ticker: string }

export default function InlineAlertCreator({ ticker }: Props) {
  const [open,      setOpen]      = useState(false)
  const [type,      setType]      = useState('price_above')
  const [threshold, setThreshold] = useState('')
  const [saved,     setSaved]     = useState(false)

  const { data: quoteData } = useStockQuote(ticker)
  const { data: alertsData } = useAlerts()
  const createAlert = useCreateAlert()

  // Active alerts for this ticker
  const tickerAlerts = (alertsData?.alerts ?? []).filter(
    (a: any) => a.ticker === ticker && a.is_active
  )

  const selectedType = QUICK_TYPES.find(t => t.value === type)!

  const handleCreate = () => {
    const thresh = selectedType.needsValue ? parseFloat(threshold) : undefined
    if (selectedType.needsValue && (isNaN(thresh!) || thresh! <= 0)) return

    if (Notification.permission === 'default') Notification.requestPermission()

    createAlert.mutate(
      { ticker, alert_type: type, threshold: thresh },
      {
        onSuccess: () => {
          setSaved(true)
          setThreshold('')
          setTimeout(() => { setSaved(false); setOpen(false) }, 1200)
        },
      }
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Active alert pills for this ticker */}
      {tickerAlerts.slice(0, 3).map((a: any) => (
        <div key={a.id}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-amber/8 border border-accent-amber/20 text-[10px] font-mono text-accent-amber">
          <Bell size={9} />
          {a.label} {a.threshold ?? ''}
          {a.proximity_pct != null && (
            <span className="text-text-muted">{a.proximity_pct.toFixed(1)}% away</span>
          )}
        </div>
      ))}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-full border border-bg-border text-[10px] font-mono text-text-muted hover:text-text-primary hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-all">
          <Plus size={9} /> Alert
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 flex-wrap">
          {/* Type tabs */}
          <div className="flex items-center gap-0.5">
            {QUICK_TYPES.map(t => (
              <button key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono transition-all',
                  type === t.value
                    ? 'bg-accent-cyan/15 text-accent-cyan'
                    : 'text-text-muted hover:text-text-secondary'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Threshold input */}
          {selectedType.needsValue && (
            <div className="flex items-center gap-1">
              <span className="text-text-muted text-[10px] font-mono">
                {type === 'pct_move_day' ? '±' : type.includes('rsi') ? '' : '$'}
              </span>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder={
                  type === 'pct_move_day' ? '5' :
                  type.includes('rsi') ? '30' :
                  quoteData?.price?.toFixed(0) ?? '200'
                }
                className="w-16 bg-bg-hover border border-bg-border rounded px-1.5 py-0.5 font-mono text-[11px] text-text-primary focus:outline-none focus:border-accent-cyan/50 text-center"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={createAlert.isPending || saved}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all',
              saved
                ? 'bg-accent-green/15 text-accent-green'
                : 'bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25'
            )}>
            {saved ? <><Check size={9} /> Saved</> : <><Bell size={9} /> Set</>}
          </button>

          <button onClick={() => setOpen(false)}
            className="p-0.5 text-text-muted hover:text-text-primary transition-colors">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
