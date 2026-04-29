import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-bg-hover', className)} />
  )
}

export function QuoteCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-5 w-24" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-1">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-10" />)}
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

export function NewsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}
