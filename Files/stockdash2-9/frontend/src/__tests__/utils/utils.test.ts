import { describe, it, expect } from 'vitest'
import {
  formatPrice, formatPct, formatChange, formatVolume,
  formatMarketCap, formatDate, isPositive, isNegative,
  getPriceClass, getBadgeClass, cn,
} from '@/lib/utils'

describe('formatPrice', () => {
  it('formats positive price with 2 decimal places', () => {
    expect(formatPrice(189.5)).toBe('$189.50')
  })
  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })
  it('formats null as dash', () => {
    expect(formatPrice(null)).toBe('—')
  })
  it('formats undefined as dash', () => {
    expect(formatPrice(undefined)).toBe('—')
  })
  it('formats large price with commas', () => {
    expect(formatPrice(1234567.89)).toBe('$1,234,567.89')
  })
})

describe('formatPct', () => {
  it('positive value has + prefix', () => {
    expect(formatPct(1.5)).toBe('+1.50%')
  })
  it('negative value has - prefix', () => {
    expect(formatPct(-2.3)).toBe('-2.30%')
  })
  it('zero shows +0.00%', () => {
    expect(formatPct(0)).toBe('+0.00%')
  })
  it('null returns dash', () => {
    expect(formatPct(null)).toBe('—')
  })
})

describe('formatChange', () => {
  it('positive shows + sign', () => {
    expect(formatChange(1.23)).toBe('+1.23')
  })
  it('negative shows - sign', () => {
    expect(formatChange(-0.77)).toBe('-0.77')
  })
  it('null returns dash', () => {
    expect(formatChange(null)).toBe('—')
  })
})

describe('formatVolume', () => {
  it('formats billions', () => {
    expect(formatVolume(2_500_000_000)).toBe('2.50B')
  })
  it('formats millions', () => {
    expect(formatVolume(50_000_000)).toBe('50.00M')
  })
  it('formats thousands', () => {
    expect(formatVolume(75_000)).toBe('75.0K')
  })
  it('formats small numbers as-is', () => {
    expect(formatVolume(999)).toBe('999')
  })
  it('null returns dash', () => {
    expect(formatVolume(null)).toBe('—')
  })
  it('zero returns 0', () => {
    expect(formatVolume(0)).toBe('0')
  })
})

describe('formatMarketCap', () => {
  // Finnhub returns market cap in millions
  it('formats trillions (value in millions)', () => {
    // 2_900_000 million = 2.9 trillion
    expect(formatMarketCap(2_900_000)).toBe('$2.90T')
  })
  it('formats billions', () => {
    // 500_000 million = 500 billion
    expect(formatMarketCap(500_000)).toBe('$500.00B')
  })
  it('formats null as dash', () => {
    expect(formatMarketCap(null)).toBe('—')
  })
})

describe('isPositive / isNegative', () => {
  it('isPositive returns true for positive', () => {
    expect(isPositive(1.5)).toBe(true)
    expect(isPositive(0.001)).toBe(true)
  })
  it('isPositive returns false for zero', () => {
    expect(isPositive(0)).toBe(false)
  })
  it('isPositive returns false for negative', () => {
    expect(isPositive(-1)).toBe(false)
  })
  it('isNegative returns true for negative', () => {
    expect(isNegative(-0.5)).toBe(true)
  })
  it('isPositive null returns false', () => {
    expect(isPositive(null)).toBe(false)
  })
})

describe('getPriceClass', () => {
  it('returns green class for positive', () => {
    expect(getPriceClass(1.5)).toContain('green')
  })
  it('returns red class for negative', () => {
    expect(getPriceClass(-1.5)).toContain('red')
  })
  it('returns secondary class for zero', () => {
    const cls = getPriceClass(0)
    expect(cls).not.toContain('green')
    expect(cls).not.toContain('red')
  })
  it('returns secondary class for null', () => {
    const cls = getPriceClass(null)
    expect(cls).not.toContain('green')
  })
})

describe('getBadgeClass', () => {
  it('positive returns badge-up', () => {
    expect(getBadgeClass(1)).toBe('badge-up')
  })
  it('negative returns badge-down', () => {
    expect(getBadgeClass(-1)).toBe('badge-down')
  })
  it('zero returns badge-neutral', () => {
    expect(getBadgeClass(0)).toBe('badge-neutral')
  })
})

describe('cn (classname merger)', () => {
  it('merges classes', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('deduplicates tailwind classes', () => {
    const result = cn('text-red-500', 'text-green-500')
    expect(result).toBe('text-green-500')
  })
  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active')
  })
  it('handles undefined/null', () => {
    expect(cn('base', undefined, null)).toBe('base')
  })
})

describe('formatDate', () => {
  it('formats ISO string', () => {
    const result = formatDate('2024-01-15T10:30:00+00:00')
    expect(result).toMatch(/Jan 15/)
  })
  it('null returns dash', () => {
    expect(formatDate(null)).toBe('—')
  })
  it('invalid string returns dash', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
})
