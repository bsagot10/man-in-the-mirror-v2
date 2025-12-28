/**
 * Chart Data Types
 *
 * Shared types for chart components to ensure consistency
 * across the application.
 */

/**
 * Basic price data point for chart rendering.
 * Used by TQQQ, SQQQ, and other price-based charts.
 */
export interface PriceDataPoint {
  date: string;
  close: number;
}

/**
 * Decay data point combining price and decay metrics.
 * Used by DecayOpportunityChart to visualize ETF decay over time.
 */
export interface DecayDataPoint {
  date: string;
  decay: number;
  tqqqPrice: number;
  sqqqPrice: number;
}

/**
 * Performance data point for strategy backtesting.
 * Used by StrategyPerformanceChart to visualize P&L over time.
 */
export interface PerformanceDataPoint {
  date: string;
  cumulativePnL: number;
  dailyReturn: number;
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
 * Position with calculated P&L values
 */
export interface PositionWithPnL extends Position {
  pnl: number;
  pnlPercent: number;
}

// ============================================================================
// Position Utility Functions
// ============================================================================

/**
 * Calculate P&L for a position
 */
export function calculatePositionPnL(position: Position): PositionWithPnL {
  const pnl = (position.currentPrice - position.entryPrice) * position.shares;
  const pnlPercent = position.entryPrice > 0
    ? ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100
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
  if (pnl > 0.01) return 'positive';
  if (pnl < -0.01) return 'negative';
  return 'neutral';
}

/**
 * Format P&L for display
 */
export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${pnl.toFixed(2)}`;
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
