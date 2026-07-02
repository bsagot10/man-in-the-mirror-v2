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

interface VolatilityResult {
  regime: 'Extreme' | 'High' | 'Moderate' | 'Low';
  score: number;
}

interface TrendResult {
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

// All weights and thresholds are aligned with the canonical MCP strategy
// config (man-in-the-mirror-mcp: utils/config.ts + services/calculator.ts).
// Signal mapping: ENTER = MCP 'buy' (> 60), WATCH = MCP 'neutral' (> 40).
// The MCP position-count penalty is intentionally omitted: this API has no
// position state, and MCP with positionCount=0 applies no penalty either.

// Signal thresholds (strict greater-than, matching MCP)
const ENTRY_THRESHOLD = 60;
const WATCH_THRESHOLD = 40;

// Trend thresholds (percentage)
const TREND_SIDEWAYS_THRESHOLD = 1;
const TREND_STRONG_THRESHOLD = 2;

// Score values for volatility (max 40; VIX < 20 scores 0 = below entry threshold)
const VOLATILITY_EXTREME_SCORE = 40;
const VOLATILITY_HIGH_SCORE = 30;
const VOLATILITY_MODERATE_SCORE = 0;
const VOLATILITY_LOW_SCORE = 0;

// Score values for trend (max 30; only strong UPtrends get the low score —
// downtrends still allow decay capture, per MCP)
const TREND_SIDEWAYS_SCORE = 30;  // Ideal for strategy
const TREND_STRONG_SCORE = 10;
const TREND_MIXED_SCORE = 20;

// Decay score (max 20): leverage² × move² / 2 per ETF, summed, ×100, capped
const DECAY_SCORE_MAX = 20;
const LEVERAGE_MULTIPLIER = 3;

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify volatility regime based on VIX value.
 * Labels use vixRegime.ts 4-tier thresholds: Extreme (30+), High (20+), Moderate (15+), Low (<15).
 * Scores follow the MCP canon: VIX below the entry threshold (20) contributes 0
 * points — the strategy does not enter in calm markets.
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
    // MCP canon scores downtrends like mixed conditions: only strong uptrends
    // are penalized (directional melt-ups compress the decay opportunity)
    return { regime: 'Strong Downtrend', score: TREND_MIXED_SCORE };
  }
  return { regime: 'Mixed', score: TREND_MIXED_SCORE };
}

/**
 * Calculate decay potential score using the canonical MCP formula:
 * per-ETF daily decay = leverage² × move² / 2 (move as a fraction), summed
 * across TQQQ and SQQQ, scaled ×100 and capped at DECAY_SCORE_MAX.
 * Direction-agnostic — leveraged ETFs bleed from any movement.
 */
export function calculateDecayPotential(
  tqqqChangePercent: number,
  sqqqChangePercent: number,
): number {
  const leverageSquared = LEVERAGE_MULTIPLIER ** 2;
  const tqqqMove = Math.abs(tqqqChangePercent) / 100;
  const sqqqMove = Math.abs(sqqqChangePercent) / 100;

  const totalDecay =
    (leverageSquared * tqqqMove ** 2) / 2 +
    (leverageSquared * sqqqMove ** 2) / 2;

  return Math.min(DECAY_SCORE_MAX, totalDecay * 100);
}

// ============================================================================
// Main Entry Score Function
// ============================================================================

/**
 * Calculate strategy entry score based on market conditions.
 *
 * The score is composed of three components (canonical MCP weights):
 * 1. Volatility Score (0-40): Based on VIX level (0 below the VIX 20 entry threshold)
 * 2. Trend Score (0-30): Based on QQQ movement (sideways is ideal)
 * 3. Decay Score (0-20): leverage² × move² / 2 per ETF, summed, ×100
 *
 * Total Score Range: 0-90
 *
 * Signal Thresholds (strict >, on the unrounded total, matching MCP):
 * - > 60: ENTER - Favorable conditions to open position (MCP 'buy')
 * - > 40: WATCH - Conditions may become favorable (MCP 'neutral')
 * - otherwise: WAIT - Unfavorable conditions
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

  // Signal is determined from the unrounded total; total is rounded for display
  const rawTotal = volatility.score + trend.score + decayScore;

  let signal: Signal;
  if (rawTotal > ENTRY_THRESHOLD) {
    signal = 'ENTER';
  } else if (rawTotal > WATCH_THRESHOLD) {
    signal = 'WATCH';
  } else {
    signal = 'WAIT';
  }

  return {
    total: Math.round(rawTotal),
    signal,
    vixValue,
    volatilityRegime: volatility.regime,
    volatilityScore: volatility.score,
    trendRegime: trend.regime,
    trendScore: trend.score,
    decayScore: Math.round(decayScore * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}
