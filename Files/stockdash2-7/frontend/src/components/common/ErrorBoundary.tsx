import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <ErrorCard message={this.state.error?.message} />
      )
    }
    return this.props.children
  }
}

export function ErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card p-6 flex flex-col items-center justify-center gap-3 text-center min-h-32">
      <AlertTriangle size={20} className="text-accent-amber" />
      <p className="text-sm text-text-secondary">{message ?? 'Something went wrong'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost flex items-center gap-1.5 text-xs">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="card p-8 flex flex-col items-center justify-center gap-2 text-center">
      <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center">
        <AlertTriangle size={14} className="text-text-muted" />
      </div>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}
