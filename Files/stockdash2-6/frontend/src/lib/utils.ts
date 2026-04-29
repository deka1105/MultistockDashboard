import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(value: number | null | undefined, currency = 'USD'): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatChange(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export function formatMarketCap(value: number | null | undefined): string {
  if (value == null) return '—'
  // Finnhub returns market cap in millions
  const v = value * 1_000_000
  if (v >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(2)}T`
  if (v >= 1_000_000_000)     return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000)         return `$${(v / 1_000_000).toFixed(2)}M`
  return `$${v.toLocaleString()}`
}

export function formatDate(isoString: string | null | undefined, fmt = 'MMM d, HH:mm'): string {
  if (!isoString) return '—'
  try { return format(parseISO(isoString), fmt) }
  catch { return '—' }
}

export function isPositive(value: number | null | undefined): boolean {
  return value != null && value > 0
}

export function isNegative(value: number | null | undefined): boolean {
  return value != null && value < 0
}

export function getPriceClass(value: number | null | undefined): string {
  if (isPositive(value)) return 'text-accent-green'
  if (isNegative(value)) return 'text-accent-red'
  return 'text-text-secondary'
}

export function getBadgeClass(value: number | null | undefined): string {
  if (isPositive(value)) return 'badge-up'
  if (isNegative(value)) return 'badge-down'
  return 'badge-neutral'
}
