import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useAppStore, type IndicatorPanel } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

interface OverlayItem {
  key: string
  label: string
  color: string
  active: boolean
  toggle: () => void
  vwapOnly?: boolean  // only meaningful on 1D
}

interface PanelItem {
  key: IndicatorPanel
  label: string
  active: boolean
}

export default function IndicatorControls({ timeRange }: { timeRange: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const store = useAppStore()
  const { showPatterns, togglePatterns } = store

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const overlays: OverlayItem[] = [
    { key: 'ma50',  label: 'MA 50',          color: '#ffb020', active: store.showMA50,  toggle: store.toggleMA50 },
    { key: 'ma200', label: 'MA 200',          color: '#3b82f6', active: store.showMA200, toggle: store.toggleMA200 },
    { key: 'ema9',  label: 'EMA 9',           color: '#a855f7', active: store.showEMA9,  toggle: store.toggleEMA9 },
    { key: 'ema21', label: 'EMA 21',          color: '#ec4899', active: store.showEMA21, toggle: store.toggleEMA21 },
    { key: 'bb',    label: 'Bollinger Bands', color: '#00c4ff', active: store.showBB,    toggle: store.toggleBB },
    { key: 'vwap',  label: 'VWAP (1D only)',  color: '#a855f7', active: store.showVWAP,  toggle: store.toggleVWAP, vwapOnly: true },
    { key: 'patterns', label: 'Candlestick Patterns', color: '#ffb020', active: showPatterns, toggle: togglePatterns },
  ]

  const panels: PanelItem[] = [
    { key: 'rsi',        label: `RSI (${store.rsiPeriod})`,                              active: store.activePanels.includes('rsi') },
    { key: 'macd',       label: `MACD (${store.macdFast},${store.macdSlow},${store.macdSignal})`, active: store.activePanels.includes('macd') },
    { key: 'stochastic', label: `Stochastic (${store.stochK},${store.stochD})`,          active: store.activePanels.includes('stochastic') },
  ]

  const activeCount = overlays.filter(o => o.active).length + store.activePanels.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
          activeCount > 0
            ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
            : 'bg-bg-hover border-bg-border text-text-muted hover:text-text-primary'
        )}>
        Indicators
        {activeCount > 0 && (
          <span className="bg-accent-cyan text-bg-base rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-bg-surface border border-bg-border rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">

          {/* Overlays section */}
          <div className="px-3 py-2 border-b border-bg-border">
            <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest mb-1.5">Price Overlays</p>
            <div className="space-y-0.5">
              {overlays.map(overlay => (
                <button
                  key={overlay.key}
                  onClick={overlay.toggle}
                  disabled={overlay.vwapOnly && timeRange !== '1D'}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                    overlay.active ? 'bg-bg-hover' : 'hover:bg-bg-hover',
                    overlay.vwapOnly && timeRange !== '1D' && 'opacity-40 cursor-not-allowed'
                  )}>
                  <div className="w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: overlay.color, background: overlay.active ? overlay.color : 'transparent' }}>
                    {overlay.active && <Check size={7} color="#000" strokeWidth={3} />}
                  </div>
                  <span className={overlay.active ? 'text-text-primary' : 'text-text-secondary'}>
                    {overlay.label}
                  </span>
                  {overlay.active && (
                    <div className="ml-auto w-8 h-0.5 rounded" style={{ background: overlay.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Oscillator panels section */}
          <div className="px-3 py-2">
            <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest mb-1.5">Oscillator Panels</p>
            <div className="space-y-0.5">
              {panels.map(panel => (
                <button
                  key={panel.key}
                  onClick={() => store.togglePanel(panel.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                    panel.active ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                  )}>
                  <div className={cn(
                    'w-3 h-3 rounded border-2 flex items-center justify-center shrink-0',
                    panel.active
                      ? 'bg-accent-cyan border-accent-cyan'
                      : 'border-bg-border'
                  )}>
                    {panel.active && <Check size={7} color="#000" strokeWidth={3} />}
                  </div>
                  <span className={panel.active ? 'text-text-primary' : 'text-text-secondary'}>
                    {panel.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Save / clear layout */}
          <div className="px-3 py-2 border-t border-bg-border flex items-center justify-between">
            <button
              onClick={() => {
                // Layout is auto-persisted to localStorage via Zustand persist middleware
                // This button provides explicit confirmation feedback
                const saved = {
                  overlays: overlays.filter(o => o.active).map(o => o.key),
                  panels: store.activePanels,
                }
                localStorage.setItem('stockdash-indicator-layout', JSON.stringify(saved))
              }}
              className="text-[10px] text-text-muted hover:text-accent-cyan transition-colors font-mono">
              Save layout
            </button>
            {activeCount > 0 && (
              <button
                onClick={() => {
                  overlays.forEach(o => { if (o.active) o.toggle() })
                  store.activePanels.forEach(p => store.togglePanel(p))
                }}
                className="text-[10px] text-text-muted hover:text-accent-red transition-colors font-mono">
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
