/**
 * indicators.ts — Pure TypeScript technical indicator computations.
 * All functions are stateless and operate on CandlePoint arrays.
 * No external dependencies — all math is inline.
 */
import type { CandlePoint } from '@/types/stock'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple Moving Average — null for the first (period-1) points */
export function calcSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    return sum / period
  })
}

/** Exponential Moving Average — uses Wilder smoothing by default */
export function calcEMA(
  data: number[],
  period: number,
  wilder = false
): (number | null)[] {
  const k = wilder ? 1 / period : 2 / (period + 1)
  const result: (number | null)[] = new Array(data.length).fill(null)
  if (data.length < period) return result

  // Seed with SMA of first `period` points
  let seed = 0
  for (let i = 0; i < period; i++) seed += data[i]
  result[period - 1] = seed / period

  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + (result[i - 1]! * (1 - k))
  }
  return result
}

// ─── RSI ──────────────────────────────────────────────────────────────────────

export interface RSIPoint {
  rsi: number | null
}

/**
 * RSI (Relative Strength Index) using Wilder's smoothing method.
 * Standard period = 14.
 */
export function calcRSI(candles: CandlePoint[], period = 14): RSIPoint[] {
  if (candles.length < period + 1) {
    return candles.map(() => ({ rsi: null }))
  }

  const closes = candles.map(c => c.close)
  const result: RSIPoint[] = new Array(candles.length).fill(null).map(() => ({ rsi: null }))

  // Initial average gain/loss over first period
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1]
    if (delta > 0) avgGain += delta
    else avgLoss += Math.abs(delta)
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result[period] = { rsi: 100 - 100 / (1 + rs) }

  // Wilder smoothing for remaining points
  for (let i = period + 1; i < candles.length; i++) {
    const delta = closes[i] - closes[i - 1]
    const gain  = delta > 0 ? delta : 0
    const loss  = delta < 0 ? Math.abs(delta) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss
    result[i] = { rsi: Math.round((100 - 100 / (1 + r)) * 100) / 100 }
  }
  return result
}

// ─── MACD ─────────────────────────────────────────────────────────────────────

export interface MACDPoint {
  macd:      number | null
  signal:    number | null
  histogram: number | null
}

/**
 * MACD (12, 26, 9) by default.
 * macd = EMA(fast) - EMA(slow)
 * signal = EMA(macd, signal_period)
 * histogram = macd - signal
 */
export function calcMACD(
  candles: CandlePoint[],
  fast   = 12,
  slow   = 26,
  signal = 9
): MACDPoint[] {
  const closes  = candles.map(c => c.close)
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)

  const macdLine: (number | null)[] = closes.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) return null
    return emaFast[i]! - emaSlow[i]!
  })

  // Signal line = EMA of MACD line (only over non-null values)
  const macdValues = macdLine.map(v => v ?? 0)
  const signalLine = calcEMA(macdValues, signal)

  return candles.map((_, i) => {
    const m = macdLine[i]
    const s = macdLine[i] != null ? signalLine[i] : null
    const h = m != null && s != null ? m - s : null
    return {
      macd:      m != null ? Math.round(m * 10000) / 10000 : null,
      signal:    s != null ? Math.round(s * 10000) / 10000 : null,
      histogram: h != null ? Math.round(h * 10000) / 10000 : null,
    }
  })
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────

export interface BollingerPoint {
  bb_upper: number | null
  bb_mid:   number | null
  bb_lower: number | null
  bb_width: number | null   // (upper - lower) / mid — squeeze indicator
}

/**
 * Bollinger Bands: 20-period SMA ± (stddev × multiplier).
 * Standard: period=20, mult=2.
 */
export function calcBollinger(
  candles: CandlePoint[],
  period = 20,
  mult   = 2
): BollingerPoint[] {
  const closes = candles.map(c => c.close)
  return candles.map((_, i) => {
    if (i < period - 1) return { bb_upper: null, bb_mid: null, bb_lower: null, bb_width: null }
    const slice = closes.slice(i - period + 1, i + 1)
    const mid   = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period
    const std   = Math.sqrt(variance)
    const upper = mid + mult * std
    const lower = mid - mult * std
    return {
      bb_upper: Math.round(upper * 100) / 100,
      bb_mid:   Math.round(mid   * 100) / 100,
      bb_lower: Math.round(lower * 100) / 100,
      bb_width: mid > 0 ? Math.round(((upper - lower) / mid) * 10000) / 10000 : null,
    }
  })
}

// ─── VWAP ─────────────────────────────────────────────────────────────────────

export interface VWAPPoint {
  vwap: number | null
}

/**
 * VWAP = Σ(typical_price × volume) / Σ(volume), accumulated from the first candle.
 * Meaningful only on intraday (1D) data — caller should hide it for other ranges.
 */
export function calcVWAP(candles: CandlePoint[]): VWAPPoint[] {
  let cumPV = 0, cumVol = 0
  return candles.map(c => {
    const typical = (c.high + c.low + c.close) / 3
    cumPV  += typical * c.volume
    cumVol += c.volume
    return { vwap: cumVol > 0 ? Math.round((cumPV / cumVol) * 100) / 100 : null }
  })
}

// ─── Stochastic ───────────────────────────────────────────────────────────────

export interface StochasticPoint {
  stoch_k: number | null
  stoch_d: number | null
}

/**
 * Stochastic Oscillator — %K and %D.
 * k_period=14, d_period=3 (standard).
 * %K = (close - lowest_low) / (highest_high - lowest_low) × 100
 * %D = SMA(%K, d_period)
 */
export function calcStochastic(
  candles: CandlePoint[],
  k_period = 14,
  d_period = 3
): StochasticPoint[] {
  const kValues: (number | null)[] = candles.map((_, i) => {
    if (i < k_period - 1) return null
    const slice  = candles.slice(i - k_period + 1, i + 1)
    const lowest = Math.min(...slice.map(c => c.low))
    const highest = Math.max(...slice.map(c => c.high))
    const range = highest - lowest
    if (range === 0) return 50
    return Math.round(((candles[i].close - lowest) / range) * 10000) / 100
  })

  const kNums = kValues.map(v => v ?? 0)
  const dValues = calcSMA(kNums, d_period)

  return candles.map((_, i) => ({
    stoch_k: kValues[i],
    stoch_d: kValues[i] != null ? dValues[i] : null,
  }))
}

// ─── EMA overlays ─────────────────────────────────────────────────────────────

export interface EMAPoint {
  ema9:   number | null
  ema21:  number | null
  ema50:  number | null
  ema200: number | null
}

export function calcEMAOverlays(candles: CandlePoint[], periods: number[]): Record<string, (number | null)[]> {
  const closes = candles.map(c => c.close)
  return Object.fromEntries(periods.map(p => [`ema${p}`, calcEMA(closes, p)]))
}

// ─── MACD cross detection ────────────────────────────────────────────────────

export type CrossType = 'bullish' | 'bearish' | null

/** Returns crossover type for each candle (signal crosses MACD line). */
export function detectMACDCrosses(points: MACDPoint[]): CrossType[] {
  return points.map((pt, i) => {
    if (i === 0 || pt.macd == null || pt.signal == null) return null
    const prev = points[i - 1]
    if (prev.macd == null || prev.signal == null) return null
    // Bullish: MACD crosses above signal
    if (prev.macd <= prev.signal && pt.macd > pt.signal) return 'bullish'
    // Bearish: MACD crosses below signal
    if (prev.macd >= prev.signal && pt.macd < pt.signal) return 'bearish'
    return null
  })
}

// ─── RSI signal label ─────────────────────────────────────────────────────────

export function rsiLabel(rsi: number | null): 'overbought' | 'oversold' | 'neutral' {
  if (rsi == null) return 'neutral'
  if (rsi >= 70)   return 'overbought'
  if (rsi <= 30)   return 'oversold'
  return 'neutral'
}
