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
 * Check whether a short position's stop-loss has been breached.
 *
 * Stops sit ABOVE entry for short positions (see calculatePositionPnL), so a
 * breach occurs when the current price rises above the stop level.
 */
export function isStopBreached(
  currentPrice: number | undefined,
  stopLevel: number | undefined,
): boolean {
  if (currentPrice === undefined || stopLevel === undefined) return false;
  return currentPrice > stopLevel;
}

/** YYYY-MM-DD for the user's LOCAL calendar day (toISOString would give UTC). */
export function toLocalDateString(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Calculate days between entry date and today
 */
export function calculateDaysActive(entryDate: string): number {
  // Stored dates are local calendar days; parsing 'YYYY-MM-DD' directly would
  // give UTC midnight and make an evening same-day entry read as 2 days.
  // Strings with a time component carry their own instant, so parse as-is.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entryDate);
  const entry = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(entryDate);
  const today = new Date();
  // Clamp to 0: the date picker allows future entry dates, which must not
  // show positive "days active"
  const diffTime = today.getTime() - entry.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
