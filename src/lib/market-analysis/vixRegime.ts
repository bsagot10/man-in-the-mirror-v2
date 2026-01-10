// filepath: src/lib/market-analysis/vixRegime.ts
// Purpose: VIX regime and market trend classification
// Key exports: determineVixRegime, determineMarketTrend

import type { VixRegime, MarketTrend } from '@/components/dashboard/MarketMetrics';

// ============================================================================
// Constants
// ============================================================================

// VIX regime thresholds
const VIX_EXTREME_THRESHOLD = 30;
const VIX_HIGH_THRESHOLD = 20;
const VIX_MODERATE_THRESHOLD = 15;

// Market trend threshold (percentage)
const TREND_THRESHOLD = 0.5;

// ============================================================================
// Functions
// ============================================================================

/**
 * Determine VIX regime based on current value.
 */
export function determineVixRegime(vixValue: number): VixRegime {
  if (vixValue >= VIX_EXTREME_THRESHOLD) return 'Extreme';
  if (vixValue >= VIX_HIGH_THRESHOLD) return 'High';
  if (vixValue >= VIX_MODERATE_THRESHOLD) return 'Moderate';
  return 'Low';
}

/**
 * Determine market trend based on QQQ percentage change.
 */
export function determineMarketTrend(qqqChange: number): MarketTrend {
  if (qqqChange > TREND_THRESHOLD) return 'bullish';
  if (qqqChange < -TREND_THRESHOLD) return 'bearish';
  return 'neutral';
}
