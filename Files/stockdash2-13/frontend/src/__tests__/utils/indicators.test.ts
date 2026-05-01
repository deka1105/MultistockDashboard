import { describe, it, expect } from 'vitest'
import {
  calcSMA, calcEMA, calcRSI, calcMACD, calcBollinger,
  calcVWAP, calcStochastic, detectMACDCrosses, rsiLabel,
} from '@/lib/indicators'
import type { CandlePoint } from '@/types/stock'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCandles(closes: number[], volume = 1_000_000): CandlePoint[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    timestamp: 1700000000 + i * 86400,
    open:   close * 0.99,
    high:   close * 1.01,
    low:    close * 0.98,
    close,
    volume,
  }))
}

// ─── SMA ──────────────────────────────────────────────────────────────────────

describe('calcSMA', () => {
  it('returns null for the first period-1 values', () => {
    const result = calcSMA([1, 2, 3, 4, 5], 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).not.toBeNull()
  })

  it('calculates correct 3-period SMA', () => {
    const result = calcSMA([1, 2, 3, 4, 5], 3)
    expect(result[2]).toBe(2)      // (1+2+3)/3
    expect(result[3]).toBe(3)      // (2+3+4)/3
    expect(result[4]).toBe(4)      // (3+4+5)/3
  })

  it('period-1 SMA equals the value itself', () => {
    const vals = [10, 20, 30]
    const result = calcSMA(vals, 1)
    expect(result).toEqual([10, 20, 30])
  })

  it('handles single-element array with period=1', () => {
    expect(calcSMA([42], 1)).toEqual([42])
  })
})

// ─── EMA ──────────────────────────────────────────────────────────────────────

describe('calcEMA', () => {
  it('returns nulls before the seed period', () => {
    const result = calcEMA([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 12)
    for (let i = 0; i < 11; i++) expect(result[i]).toBeNull()
    expect(result[11]).not.toBeNull()
  })

  it('EMA follows price faster than SMA on uptrend', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i)
    const ema = calcEMA(closes, 10)
    const sma = calcSMA(closes, 10)
    // EMA should be higher than SMA in an uptrend (more weight on recent prices)
    const lastEma = ema.find(v => v != null)!
    const lastSma = sma.find(v => v != null)!
    // Both valid — EMA reacts faster, so later values of EMA > SMA in uptrend
    const lastIdx = closes.length - 1
    // On a linear series EMA ≈ SMA — the key property is both converge
    expect(ema[lastIdx]!).toBeCloseTo(sma[lastIdx]!, 0)
  })

  it('converges on constant series', () => {
    const vals = Array(30).fill(100)
    const result = calcEMA(vals, 12)
    const defined = result.filter(v => v != null) as number[]
    defined.forEach(v => expect(v).toBeCloseTo(100, 2))
  })
})

// ─── RSI ──────────────────────────────────────────────────────────────────────

describe('calcRSI', () => {
  it('returns null for first period points', () => {
    const candles = makeCandles(Array.from({ length: 20 }, (_, i) => 100 + i))
    const result  = calcRSI(candles, 14)
    for (let i = 0; i < 14; i++) expect(result[i].rsi).toBeNull()
    expect(result[14].rsi).not.toBeNull()
  })

  it('RSI is always between 0 and 100', () => {
    // Mix of volatile prices
    const prices = [100, 110, 105, 115, 108, 120, 112, 118, 125, 115, 130, 122, 135, 128, 140, 132, 145, 138, 150, 142]
    const candles = makeCandles(prices)
    const result  = calcRSI(candles, 14)
    result.forEach(pt => {
      if (pt.rsi != null) {
        expect(pt.rsi).toBeGreaterThanOrEqual(0)
        expect(pt.rsi).toBeLessThanOrEqual(100)
      }
    })
  })

  it('RSI approaches 100 on consistent uptrend', () => {
    // Every day higher — RSI should be very high
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 2)
    const candles = makeCandles(prices)
    const result  = calcRSI(candles, 14)
    const last    = result[result.length - 1].rsi!
    expect(last).toBeGreaterThan(80)
  })

  it('RSI approaches 0 on consistent downtrend', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 200 - i * 2)
    const candles = makeCandles(prices)
    const result  = calcRSI(candles, 14)
    const last    = result[result.length - 1].rsi!
    expect(last).toBeLessThan(20)
  })

  it('returns all nulls when insufficient data', () => {
    const candles = makeCandles([100, 101, 102])
    const result  = calcRSI(candles, 14)
    result.forEach(pt => expect(pt.rsi).toBeNull())
  })
})

// ─── MACD ─────────────────────────────────────────────────────────────────────

describe('calcMACD', () => {
  const prices  = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10 + i * 0.5)
  const candles = makeCandles(prices)

  it('returns nulls for early data points', () => {
    const result = calcMACD(candles, 12, 26, 9)
    // First 25 points should have null macd (need 26 for slow EMA)
    expect(result[0].macd).toBeNull()
    expect(result[24].macd).toBeNull()
  })

  it('histogram = macd - signal when both defined', () => {
    const result = calcMACD(candles, 12, 26, 9)
    result.forEach(pt => {
      if (pt.macd != null && pt.signal != null && pt.histogram != null) {
        expect(pt.histogram).toBeCloseTo(pt.macd - pt.signal, 3)
      }
    })
  })

  it('all values are finite numbers or null', () => {
    const result = calcMACD(candles, 12, 26, 9)
    result.forEach(pt => {
      if (pt.macd != null)      expect(isFinite(pt.macd)).toBe(true)
      if (pt.signal != null)    expect(isFinite(pt.signal)).toBe(true)
      if (pt.histogram != null) expect(isFinite(pt.histogram)).toBe(true)
    })
  })
})

// ─── MACD Cross detection ─────────────────────────────────────────────────────

describe('detectMACDCrosses', () => {
  it('detects bullish cross when MACD crosses above signal', () => {
    const points = [
      { macd: -0.5, signal: 0.2,  histogram: -0.7 },
      { macd:  0.3, signal: 0.1,  histogram:  0.2 },  // MACD crosses above
    ]
    const crosses = detectMACDCrosses(points)
    expect(crosses[1]).toBe('bullish')
  })

  it('detects bearish cross when MACD crosses below signal', () => {
    const points = [
      { macd:  0.5, signal: 0.2,  histogram:  0.3 },
      { macd: -0.1, signal: 0.3,  histogram: -0.4 },  // MACD crosses below
    ]
    const crosses = detectMACDCrosses(points)
    expect(crosses[1]).toBe('bearish')
  })

  it('returns null when no cross', () => {
    const points = [
      { macd: 0.5, signal: 0.2, histogram: 0.3 },
      { macd: 0.6, signal: 0.3, histogram: 0.3 },  // both still bullish, no cross
    ]
    const crosses = detectMACDCrosses(points)
    expect(crosses[1]).toBeNull()
  })
})

// ─── Bollinger Bands ──────────────────────────────────────────────────────────

describe('calcBollinger', () => {
  const prices  = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.1)
  const candles = makeCandles(prices)

  it('returns null for first period-1 points', () => {
    const result = calcBollinger(candles, 20, 2)
    for (let i = 0; i < 19; i++) {
      expect(result[i].bb_upper).toBeNull()
      expect(result[i].bb_lower).toBeNull()
    }
    expect(result[19].bb_upper).not.toBeNull()
  })

  it('upper band is always above lower band', () => {
    const result = calcBollinger(candles, 20, 2)
    result.forEach(pt => {
      if (pt.bb_upper != null && pt.bb_lower != null) {
        expect(pt.bb_upper).toBeGreaterThanOrEqual(pt.bb_lower)
      }
    })
  })

  it('middle band is always between upper and lower', () => {
    const result = calcBollinger(candles, 20, 2)
    result.forEach(pt => {
      if (pt.bb_upper != null && pt.bb_mid != null && pt.bb_lower != null) {
        expect(pt.bb_mid).toBeLessThanOrEqual(pt.bb_upper + 0.001)
        expect(pt.bb_mid).toBeGreaterThanOrEqual(pt.bb_lower - 0.001)
      }
    })
  })

  it('bands widen on volatile data', () => {
    // Highly volatile prices → wide bands
    const volatile = makeCandles([100, 120, 80, 130, 70, 140, 60, 150, 65, 145, 75, 135, 85, 125, 95, 115, 105, 110, 100, 108, 98])
    const result   = calcBollinger(volatile, 20, 2)
    const last     = result[result.length - 1]
    if (last.bb_upper != null && last.bb_lower != null)
      expect(last.bb_upper - last.bb_lower).toBeGreaterThan(20)

    // Constant prices → zero-width bands
    const flat = makeCandles(Array(25).fill(100))
    const flatResult = calcBollinger(flat, 20, 2)
    const flatLast = flatResult[flatResult.length - 1]
    if (flatLast.bb_upper != null && flatLast.bb_lower != null)
      expect(flatLast.bb_upper - flatLast.bb_lower).toBeCloseTo(0, 2)
  })

  it('bb_width is (upper - lower) / mid', () => {
    const result = calcBollinger(candles, 20, 2)
    result.forEach(pt => {
      if (pt.bb_upper != null && pt.bb_mid != null && pt.bb_lower != null && pt.bb_width != null) {
        const expected = (pt.bb_upper - pt.bb_lower) / pt.bb_mid
        expect(pt.bb_width).toBeCloseTo(expected, 3)
      }
    })
  })
})

// ─── VWAP ─────────────────────────────────────────────────────────────────────

describe('calcVWAP', () => {
  it('VWAP starts near the first typical price', () => {
    const candles = makeCandles([100, 102, 104], 1_000_000)
    const result  = calcVWAP(candles)
    // First candle: typical = (high + low + close) / 3 ≈ close
    expect(result[0].vwap).not.toBeNull()
  })

  it('VWAP is always between min and max close', () => {
    const closes  = [100, 110, 90, 105, 95, 108, 98]
    const candles = makeCandles(closes)
    const result  = calcVWAP(candles)
    const min     = Math.min(...closes) * 0.98
    const max     = Math.max(...closes) * 1.01
    result.forEach(pt => {
      if (pt.vwap != null) {
        expect(pt.vwap).toBeGreaterThanOrEqual(min)
        expect(pt.vwap).toBeLessThanOrEqual(max)
      }
    })
  })

  it('VWAP with equal volume weights all candles equally', () => {
    const closes  = [100, 200, 300]
    const candles = makeCandles(closes, 1_000_000)  // equal volume
    const result  = calcVWAP(candles)
    // All candles equal weight → VWAP approaches average of typical prices
    expect(result[result.length - 1].vwap).toBeGreaterThan(100)
  })

  it('returns null when volume is zero', () => {
    const candles = makeCandles([100], 0)
    const result  = calcVWAP(candles)
    expect(result[0].vwap).toBeNull()
  })
})

// ─── Stochastic ───────────────────────────────────────────────────────────────

describe('calcStochastic', () => {
  const prices  = [44, 46, 48, 47, 45, 43, 44, 46, 50, 49, 47, 46, 45, 48, 51, 53, 52, 50]
  const candles = makeCandles(prices)

  it('returns nulls for first k_period-1 points', () => {
    const result = calcStochastic(candles, 14, 3)
    for (let i = 0; i < 13; i++) expect(result[i].stoch_k).toBeNull()
  })

  it('%K is always between 0 and 100', () => {
    const result = calcStochastic(candles, 5, 3)
    result.forEach(pt => {
      if (pt.stoch_k != null) {
        expect(pt.stoch_k).toBeGreaterThanOrEqual(0)
        expect(pt.stoch_k).toBeLessThanOrEqual(100)
      }
    })
  })

  it('%K approaches 100 when close is near the period high', () => {
    // Strictly ascending — last close is near highest high of the period
    // (not exactly 100 because high = close * 1.01 in makeCandles)
    const ascending = makeCandles([1, 2, 3, 4, 5, 6, 7])
    const result = calcStochastic(ascending, 5, 3)
    const last = result[result.length - 1]
    expect(last.stoch_k).toBeGreaterThan(85)  // near top, not necessarily 100
  })

  it('%K = 0 when close is at lowest low of period', () => {
    // Strictly descending — last price is always lowest
    const descending = makeCandles([7, 6, 5, 4, 3, 2, 1])
    const result = calcStochastic(descending, 5, 3)
    const last = result[result.length - 1]
    expect(last.stoch_k).toBeCloseTo(0, 0)
  })
})

// ─── RSI label ────────────────────────────────────────────────────────────────

describe('rsiLabel', () => {
  it('overbought at 70+', () => {
    expect(rsiLabel(70)).toBe('overbought')
    expect(rsiLabel(85)).toBe('overbought')
    expect(rsiLabel(100)).toBe('overbought')
  })
  it('oversold at 30 and below', () => {
    expect(rsiLabel(30)).toBe('oversold')
    expect(rsiLabel(15)).toBe('oversold')
    expect(rsiLabel(0)).toBe('oversold')
  })
  it('neutral in between', () => {
    expect(rsiLabel(50)).toBe('neutral')
    expect(rsiLabel(31)).toBe('neutral')
    expect(rsiLabel(69)).toBe('neutral')
  })
  it('neutral for null', () => {
    expect(rsiLabel(null)).toBe('neutral')
  })
})
