/**
 * Chart Data Types
 *
 * Shared types for chart components to ensure consistency
 * across the application.
 */

// ============================================================================
// Market Analysis Types
// ============================================================================

/** Trading signal based on entry score */
export type Signal = 'ENTER' | 'WATCH' | 'WAIT';

/** VIX regime classification */
export type VixRegime = 'Low' | 'Moderate' | 'High' | 'Extreme';

/** Market trend direction */
export type MarketTrend = 'bullish' | 'bearish' | 'neutral';

// ============================================================================
// Constants
// ============================================================================

/** Threshold for determining neutral P&L (to handle floating point rounding) */
const PNL_NEUTRAL_THRESHOLD = 0.01;

/**
 * Basic price data point for chart rendering.
 * Used by TQQQ, SQQQ, and other price-based charts.
 */
export interface PriceDataPoint {
  date: string;
  close: number;
}

// ============================================================================
// Position Types
// ============================================================================

/**
 * Position data for the position table
 */
export interface Position {
  symbol: 'TQQQ' | 'SQQQ';
  shares: number;
  entryPrice: number;
  currentPrice: number;
  entryDate: string;
}

/**
 * Position with calculated P&L values (internal use only)
 */
interface PositionWithPnL extends Position {
  pnl: number;
  pnlPercent: number;
}

// ============================================================================
// Position Utility Functions
// ============================================================================

/**
 * Calculate P&L for a position.
 *
 * SHORT convention: the Man in the Mirror strategy shorts both TQQQ and SQQQ
 * to harvest leveraged-ETF decay, so a price DROP is profit. Matches the
 * canonical MCP calculator (calculatePnL with isShort=true). Do not "fix"
 * this back to long math.
 */
export function calculatePositionPnL(position: Position): PositionWithPnL {
  const pnl = (position.entryPrice - position.currentPrice) * position.shares;
  const pnlPercent = position.entryPrice > 0
    ? ((position.entryPrice - position.currentPrice) / position.entryPrice) * 100
    : 0;

  return {
    ...position,
    pnl,
    pnlPercent,
  };
}

/**
 * Get CSS class for P&L value
 */
export function getPnlClass(pnl: number): 'positive' | 'negative' | 'neutral' {
  if (pnl > PNL_NEUTRAL_THRESHOLD) return 'positive';
  if (pnl < -PNL_NEUTRAL_THRESHOLD) return 'negative';
  return 'neutral';
}

/**
 * Format P&L for display
 */
export function formatPnl(pnl: number): string {
  if (pnl >= 0) {
    return `+$${pnl.toFixed(2)}`;
  }
  // For negative values, place the minus sign before the dollar sign: -$100.00
  return `-$${Math.abs(pnl).toFixed(2)}`;
}

/**
 * Calculate days between entry date and today
 */
export function calculateDaysActive(entryDate: string): number {
  const entry = new Date(entryDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - entry.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
