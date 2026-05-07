/**
 * patterns.ts — Candlestick pattern detection (OHLC logic, client-side).
 * All functions are pure and stateless — operate on CandlePoint arrays.
 */
import type { CandlePoint } from '@/types/stock'

export type PatternSignal = 'bullish' | 'bearish' | 'neutral'

export interface PatternResult {
  index:       number        // candle index the pattern ends on
  name:        string        // short label e.g. "Hammer"
  fullName:    string        // full name e.g. "Hammer (Bullish Reversal)"
  signal:      PatternSignal
  implication: string        // one-line description
  confidence:  number        // 0–1
}

// ─── Candle geometry helpers ──────────────────────────────────────────────────

function body(c: CandlePoint)    { return Math.abs(c.close - c.open) }
function upperWick(c: CandlePoint) { return c.high - Math.max(c.open, c.close) }
function lowerWick(c: CandlePoint) { return Math.min(c.open, c.close) - c.low }
function totalRange(c: CandlePoint) { return c.high - c.low || 0.0001 }
function isBullish(c: CandlePoint) { return c.close > c.open }
function isBearish(c: CandlePoint) { return c.close < c.open }
function bodyRatio(c: CandlePoint) { return body(c) / totalRange(c) }

// ─── Single-candle patterns ───────────────────────────────────────────────────

function isDoji(c: CandlePoint): boolean {
  // Body < 10% of total range, wicks on both sides
  return bodyRatio(c) < 0.1 && upperWick(c) > 0 && lowerWick(c) > 0
}

function isHammer(c: CandlePoint): boolean {
  // Small body at the top, lower wick ≥ 2× body, tiny upper wick
  const b = body(c)
  return b > 0 && lowerWick(c) >= 2 * b && upperWick(c) <= 0.3 * b
}

function isInvertedHammer(c: CandlePoint): boolean {
  const b = body(c)
  return b > 0 && upperWick(c) >= 2 * b && lowerWick(c) <= 0.3 * b
}

function isShootingStar(c: CandlePoint): boolean {
  // Same geometry as inverted hammer but bearish candle
  return isBearish(c) && isInvertedHammer(c)
}

function isMarubozu(c: CandlePoint): boolean {
  // Very large body with tiny wicks — strong momentum
  return bodyRatio(c) > 0.9
}

// ─── Two-candle patterns ──────────────────────────────────────────────────────

function isBullishEngulfing(prev: CandlePoint, curr: CandlePoint): boolean {
  return (
    isBearish(prev) && isBullish(curr) &&
    curr.open  <= prev.close &&
    curr.close >= prev.open
  )
}

function isBearishEngulfing(prev: CandlePoint, curr: CandlePoint): boolean {
  return (
    isBullish(prev) && isBearish(curr) &&
    curr.open  >= prev.close &&
    curr.close <= prev.open
  )
}

function isPiercingLine(prev: CandlePoint, curr: CandlePoint): boolean {
  if (!isBearish(prev) || !isBullish(curr)) return false
  const mid = (prev.open + prev.close) / 2
  return curr.open < prev.close && curr.close > mid && curr.close < prev.open
}

function isDarkCloudCover(prev: CandlePoint, curr: CandlePoint): boolean {
  if (!isBullish(prev) || !isBearish(curr)) return false
  const mid = (prev.open + prev.close) / 2
  return curr.open > prev.close && curr.close < mid && curr.close > prev.open
}

// ─── Three-candle patterns ────────────────────────────────────────────────────

function isMorningStar(a: CandlePoint, b: CandlePoint, c: CandlePoint): boolean {
  return (
    isBearish(a) && bodyRatio(b) < 0.3 && isBullish(c) &&
    body(a) > body(b) * 2 &&
    c.close > (a.open + a.close) / 2
  )
}

function isEveningStar(a: CandlePoint, b: CandlePoint, c: CandlePoint): boolean {
  return (
    isBullish(a) && bodyRatio(b) < 0.3 && isBearish(c) &&
    body(a) > body(b) * 2 &&
    c.close < (a.open + a.close) / 2
  )
}

function isThreeWhiteSoldiers(a: CandlePoint, b: CandlePoint, c: CandlePoint): boolean {
  return (
    isBullish(a) && isBullish(b) && isBullish(c) &&
    b.open > a.open && b.close > a.close &&
    c.open > b.open && c.close > b.close &&
    bodyRatio(a) > 0.5 && bodyRatio(b) > 0.5 && bodyRatio(c) > 0.5
  )
}

function isThreeBlackCrows(a: CandlePoint, b: CandlePoint, c: CandlePoint): boolean {
  return (
    isBearish(a) && isBearish(b) && isBearish(c) &&
    b.open < a.open && b.close < a.close &&
    c.open < b.open && c.close < b.close &&
    bodyRatio(a) > 0.5 && bodyRatio(b) > 0.5 && bodyRatio(c) > 0.5
  )
}

// ─── Main detection function ──────────────────────────────────────────────────

/**
 * Scan candles array for all recognizable patterns.
 * Returns array of PatternResult — one per detected pattern (may be multiple per candle).
 */
export function detectPatterns(candles: CandlePoint[]): PatternResult[] {
  const results: PatternResult[] = []
  const n = candles.length

  for (let i = 0; i < n; i++) {
    const c = candles[i]
    const prev  = i > 0 ? candles[i - 1] : null
    const prev2 = i > 1 ? candles[i - 2] : null

    // ── Single-candle ─────────────────────────────────────────────────────────
    if (isDoji(c)) {
      results.push({
        index: i, name: 'Doji', fullName: 'Doji',
        signal: 'neutral',
        implication: 'Indecision — potential trend reversal',
        confidence: 0.55,
      })
    }

    if (isHammer(c)) {
      results.push({
        index: i, name: 'Hammer', fullName: 'Hammer (Bullish Reversal)',
        signal: 'bullish',
        implication: 'Buyers rejected lower prices — potential bullish reversal',
        confidence: 0.65,
      })
    }

    if (isShootingStar(c)) {
      results.push({
        index: i, name: 'ShootStar', fullName: 'Shooting Star (Bearish Reversal)',
        signal: 'bearish',
        implication: 'Sellers rejected higher prices — potential bearish reversal',
        confidence: 0.65,
      })
    }

    if (isInvertedHammer(c) && isBullish(c)) {
      results.push({
        index: i, name: 'InvHammer', fullName: 'Inverted Hammer (Bullish)',
        signal: 'bullish',
        implication: 'Buyers gained ground intraday — watch for follow-through',
        confidence: 0.55,
      })
    }

    if (isMarubozu(c)) {
      results.push({
        index: i,
        name: isBullish(c) ? 'BullMaru' : 'BearMaru',
        fullName: isBullish(c) ? 'Bullish Marubozu (Strong Momentum)' : 'Bearish Marubozu (Strong Momentum)',
        signal: isBullish(c) ? 'bullish' : 'bearish',
        implication: 'Dominant one-sided pressure throughout the session',
        confidence: 0.70,
      })
    }

    // ── Two-candle ────────────────────────────────────────────────────────────
    if (prev) {
      if (isBullishEngulfing(prev, c)) {
        results.push({
          index: i, name: 'BullEng', fullName: 'Bullish Engulfing',
          signal: 'bullish',
          implication: 'Buyers completely overwhelmed prior session — strong reversal signal',
          confidence: 0.75,
        })
      }
      if (isBearishEngulfing(prev, c)) {
        results.push({
          index: i, name: 'BearEng', fullName: 'Bearish Engulfing',
          signal: 'bearish',
          implication: 'Sellers completely overwhelmed prior session — strong reversal signal',
          confidence: 0.75,
        })
      }
      if (isPiercingLine(prev, c)) {
        results.push({
          index: i, name: 'Piercing', fullName: 'Piercing Line (Bullish)',
          signal: 'bullish',
          implication: 'Buyers pushed above the midpoint of the prior bearish candle',
          confidence: 0.65,
        })
      }
      if (isDarkCloudCover(prev, c)) {
        results.push({
          index: i, name: 'DarkCloud', fullName: 'Dark Cloud Cover (Bearish)',
          signal: 'bearish',
          implication: 'Sellers pushed below the midpoint of the prior bullish candle',
          confidence: 0.65,
        })
      }
    }

    // ── Three-candle ──────────────────────────────────────────────────────────
    if (prev && prev2) {
      if (isMorningStar(prev2, prev, c)) {
        results.push({
          index: i, name: 'MornStar', fullName: 'Morning Star (Bullish Reversal)',
          signal: 'bullish',
          implication: 'Three-candle bottom reversal — one of the most reliable bullish signals',
          confidence: 0.80,
        })
      }
      if (isEveningStar(prev2, prev, c)) {
        results.push({
          index: i, name: 'EveStar', fullName: 'Evening Star (Bearish Reversal)',
          signal: 'bearish',
          implication: 'Three-candle top reversal — one of the most reliable bearish signals',
          confidence: 0.80,
        })
      }
      if (isThreeWhiteSoldiers(prev2, prev, c)) {
        results.push({
          index: i, name: '3Soldiers', fullName: 'Three White Soldiers (Strong Uptrend)',
          signal: 'bullish',
          implication: 'Three consecutive bullish sessions with expanding bodies — sustained buying',
          confidence: 0.78,
        })
      }
      if (isThreeBlackCrows(prev2, prev, c)) {
        results.push({
          index: i, name: '3Crows', fullName: 'Three Black Crows (Strong Downtrend)',
          signal: 'bearish',
          implication: 'Three consecutive bearish sessions with expanding bodies — sustained selling',
          confidence: 0.78,
        })
      }
    }
  }

  return results
}

/**
 * Groups patterns by candle index for efficient chart rendering.
 */
export function groupPatternsByIndex(patterns: PatternResult[]): Map<number, PatternResult[]> {
  const map = new Map<number, PatternResult[]>()
  for (const p of patterns) {
    if (!map.has(p.index)) map.set(p.index, [])
    map.get(p.index)!.push(p)
  }
  return map
}
