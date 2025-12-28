/**
 * Market Analysis - Entry Score Calculation
 *
 * Analyzes market conditions and generates trading signals for
 * the Man in the Mirror leveraged ETF decay strategy.
 *
 * Ported from: backend/market_analysis.py
 */

// ============================================================================
// Types
// ============================================================================

export interface SymbolData {
  currentPrice: number;
  changePercent: number;
}

export interface MarketData {
  vix: SymbolData;
  qqq: SymbolData;
  tqqq: SymbolData;
  sqqq: SymbolData;
}

export type Signal = 'ENTER' | 'WATCH' | 'WAIT';

export interface VolatilityResult {
  regime: 'Extreme' | 'High' | 'Low';
  score: number;
}

export interface TrendResult {
  regime: 'Sideways/Choppy' | 'Strong Uptrend' | 'Strong Downtrend' | 'Mixed';
  score: number;
}

export interface EntryScore {
  total: number;
  signal: Signal;
  vixValue: number;
  volatilityRegime: string;
  volatilityScore: number;
  trendRegime: string;
  trendScore: number;
  decayScore: number;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

const ENTRY_THRESHOLD = 70;  // Minimum score to enter position

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify volatility regime based on VIX value.
 *
 * VIX Thresholds:
 * - >= 30: Extreme volatility (score 50)
 * - >= 20: High volatility (score 30)
 * - < 20: Low volatility (score 0)
 */
export function classifyVolatility(vixValue: number): VolatilityResult {
  if (vixValue >= 30) {
    return { regime: 'Extreme', score: 50 };
  }
  if (vixValue >= 20) {
    return { regime: 'High', score: 30 };
  }
  return { regime: 'Low', score: 0 };
}

/**
 * Classify market trend using QQQ price change.
 *
 * Trend Thresholds:
 * - |change| < 1%: Sideways/Choppy (score 30) - IDEAL for strategy
 * - change > 2%: Strong Uptrend (score 10)
 * - change < -2%: Strong Downtrend (score 10)
 * - otherwise: Mixed (score 20)
 */
export function classifyTrend(qqqChangePercent: number): TrendResult {
  const absChange = Math.abs(qqqChangePercent);

  if (absChange < 1) {
    return { regime: 'Sideways/Choppy', score: 30 };
  }
  if (qqqChangePercent > 2) {
    return { regime: 'Strong Uptrend', score: 10 };
  }
  if (qqqChangePercent < -2) {
    return { regime: 'Strong Downtrend', score: 10 };
  }
  return { regime: 'Mixed', score: 20 };
}

/**
 * Calculate decay potential score based on TQQQ/SQQQ inverse correlation.
 *
 * Strong inverse correlation is ideal for the decay strategy.
 *
 * Correlation Strength Thresholds:
 * - > 5%: Strong inverse (score 30)
 * - > 3%: Moderate inverse (score 20)
 * - > 0%: Weak inverse (score 10)
 * - 0% or same direction: No decay opportunity (score 0)
 */
export function calculateDecayPotential(
  tqqqChangePercent: number,
  sqqqChangePercent: number,
): number {
  // Check if they're moving in opposite directions
  const isInverseCorrelation =
    (tqqqChangePercent > 0 && sqqqChangePercent < 0) ||
    (tqqqChangePercent < 0 && sqqqChangePercent > 0);

  if (!isInverseCorrelation) {
    return 0;
  }

  const correlationStrength =
    Math.abs(tqqqChangePercent) + Math.abs(sqqqChangePercent);

  if (correlationStrength > 5) {
    return 30;
  }
  if (correlationStrength > 3) {
    return 20;
  }
  return 10;
}

// ============================================================================
// Main Entry Score Function
// ============================================================================

/**
 * Calculate strategy entry score based on market conditions.
 *
 * The score is composed of three components:
 * 1. Volatility Score (0-50): Based on VIX level
 * 2. Trend Score (0-30): Based on QQQ movement
 * 3. Decay Score (0-30): Based on TQQQ/SQQQ inverse correlation
 *
 * Total Score Range: 0-110
 *
 * Signal Thresholds:
 * - >= 70: ENTER - Favorable conditions to open position
 * - >= 50: WATCH - Conditions may become favorable
 * - < 50: WAIT - Unfavorable conditions
 */
export function calculateEntryScore(marketData: MarketData): EntryScore {
  // Extract values
  const vixValue = marketData.vix.currentPrice;
  const qqqChange = marketData.qqq.changePercent;
  const tqqqChange = marketData.tqqq.changePercent;
  const sqqqChange = marketData.sqqq.changePercent;

  // Calculate component scores
  const volatility = classifyVolatility(vixValue);
  const trend = classifyTrend(qqqChange);
  const decayScore = calculateDecayPotential(tqqqChange, sqqqChange);

  // Calculate total score
  const total = volatility.score + trend.score + decayScore;

  // Determine signal
  let signal: Signal;
  if (total >= ENTRY_THRESHOLD) {
    signal = 'ENTER';
  } else if (total >= 50) {
    signal = 'WATCH';
  } else {
    signal = 'WAIT';
  }

  return {
    total,
    signal,
    vixValue,
    volatilityRegime: volatility.regime,
    volatilityScore: volatility.score,
    trendRegime: trend.regime,
    trendScore: trend.score,
    decayScore,
    timestamp: new Date().toISOString(),
  };
}
