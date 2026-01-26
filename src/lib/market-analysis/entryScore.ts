/**
 * Market Analysis - Entry Score Calculation
 *
 * Analyzes market conditions and generates trading signals for
 * the Man in the Mirror leveraged ETF decay strategy.
 *
 * Ported from: backend/market_analysis.py
 */

import type { Signal } from '@/types/chart-types';
import {
  VIX_EXTREME_THRESHOLD,
  VIX_HIGH_THRESHOLD,
  VIX_MODERATE_THRESHOLD,
} from './vixRegime';

// Re-export Signal for consumers that import from entryScore
export type { Signal } from '@/types/chart-types';

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

export interface VolatilityResult {
  regime: 'Extreme' | 'High' | 'Moderate' | 'Low';
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

// Signal thresholds
const ENTRY_THRESHOLD = 70;  // Minimum score to enter position
const WATCH_THRESHOLD = 50;  // Minimum score to watch

// Trend thresholds (percentage)
const TREND_SIDEWAYS_THRESHOLD = 1;
const TREND_STRONG_THRESHOLD = 2;

// Decay correlation thresholds (percentage)
const DECAY_STRONG_THRESHOLD = 5;
const DECAY_MODERATE_THRESHOLD = 3;

// Score values for volatility
const VOLATILITY_EXTREME_SCORE = 50;
const VOLATILITY_HIGH_SCORE = 30;
const VOLATILITY_MODERATE_SCORE = 15;
const VOLATILITY_LOW_SCORE = 0;

// Score values for trend
const TREND_SIDEWAYS_SCORE = 30;  // Ideal for strategy
const TREND_STRONG_SCORE = 10;
const TREND_MIXED_SCORE = 20;

// Score values for decay
const DECAY_STRONG_SCORE = 30;
const DECAY_MODERATE_SCORE = 20;
const DECAY_WEAK_SCORE = 10;
const DECAY_NONE_SCORE = 0;

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify volatility regime based on VIX value.
 * Aligned with vixRegime.ts thresholds: Extreme (30+), High (20+), Moderate (15+), Low (<15)
 */
export function classifyVolatility(vixValue: number): VolatilityResult {
  if (vixValue >= VIX_EXTREME_THRESHOLD) {
    return { regime: 'Extreme', score: VOLATILITY_EXTREME_SCORE };
  }
  if (vixValue >= VIX_HIGH_THRESHOLD) {
    return { regime: 'High', score: VOLATILITY_HIGH_SCORE };
  }
  if (vixValue >= VIX_MODERATE_THRESHOLD) {
    return { regime: 'Moderate', score: VOLATILITY_MODERATE_SCORE };
  }
  return { regime: 'Low', score: VOLATILITY_LOW_SCORE };
}

/**
 * Classify market trend using QQQ price change.
 * Sideways/choppy markets are ideal for the decay strategy.
 */
export function classifyTrend(qqqChangePercent: number): TrendResult {
  const absChange = Math.abs(qqqChangePercent);

  if (absChange < TREND_SIDEWAYS_THRESHOLD) {
    return { regime: 'Sideways/Choppy', score: TREND_SIDEWAYS_SCORE };
  }
  if (qqqChangePercent > TREND_STRONG_THRESHOLD) {
    return { regime: 'Strong Uptrend', score: TREND_STRONG_SCORE };
  }
  if (qqqChangePercent < -TREND_STRONG_THRESHOLD) {
    return { regime: 'Strong Downtrend', score: TREND_STRONG_SCORE };
  }
  return { regime: 'Mixed', score: TREND_MIXED_SCORE };
}

/**
 * Calculate decay potential score based on TQQQ/SQQQ inverse correlation.
 * Strong inverse correlation is ideal for the decay strategy.
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
    return DECAY_NONE_SCORE;
  }

  const correlationStrength =
    Math.abs(tqqqChangePercent) + Math.abs(sqqqChangePercent);

  if (correlationStrength > DECAY_STRONG_THRESHOLD) {
    return DECAY_STRONG_SCORE;
  }
  if (correlationStrength > DECAY_MODERATE_THRESHOLD) {
    return DECAY_MODERATE_SCORE;
  }
  return DECAY_WEAK_SCORE;
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

  // Determine signal based on total score
  let signal: Signal;
  if (total >= ENTRY_THRESHOLD) {
    signal = 'ENTER';
  } else if (total >= WATCH_THRESHOLD) {
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
