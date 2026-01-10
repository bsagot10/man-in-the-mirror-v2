// filepath: src/lib/market-analysis/positionSizing.ts
// Purpose: Position sizing calculations based on VIX regime
// Key exports: PositionSizing, calculatePositionSizing

/**
 * Position Sizing Calculator
 *
 * Calculates recommended position sizes based on VIX regime and account size.
 * Higher VIX = higher allocation (more decay opportunity).
 */

// ============================================================================
// Types
// ============================================================================

export interface PositionSizing {
  allocationPercent: number;
  allocationAmount: number;
  tqqqShares: number;
  sqqqShares: number;
  totalInvestment: number;
  marginRequired: number;
  vixRegimeLabel: string;
}

// ============================================================================
// Constants
// ============================================================================

// VIX regime thresholds (aligned with determineVixRegime)
const VIX_EXTREME_THRESHOLD = 30;
const VIX_HIGH_THRESHOLD = 20;
const VIX_MODERATE_THRESHOLD = 15;

// Allocation percentages by regime
const ALLOCATION_EXTREME = 0.50;
const ALLOCATION_HIGH = 0.40;
const ALLOCATION_MODERATE = 0.35;
const ALLOCATION_LOW = 0.30;

// Target SQQQ:TQQQ share ratio
const TARGET_RATIO = 1.25;

// Margin requirement
const MARGIN_RATE = 0.5;

// ============================================================================
// Main Function
// ============================================================================

/**
 * Calculate position sizing based on account size and VIX value.
 */
export function calculatePositionSizing(
  accountSize: number,
  vixValue: number,
  tqqqPrice: number,
  sqqqPrice: number
): PositionSizing {
  // Determine allocation based on VIX regime
  let allocationPercent: number;
  let vixRegimeLabel: string;

  if (vixValue >= VIX_EXTREME_THRESHOLD) {
    allocationPercent = ALLOCATION_EXTREME;
    vixRegimeLabel = 'Extreme volatility';
  } else if (vixValue >= VIX_HIGH_THRESHOLD) {
    allocationPercent = ALLOCATION_HIGH;
    vixRegimeLabel = 'High volatility';
  } else if (vixValue >= VIX_MODERATE_THRESHOLD) {
    allocationPercent = ALLOCATION_MODERATE;
    vixRegimeLabel = 'Moderate volatility';
  } else {
    allocationPercent = ALLOCATION_LOW;
    vixRegimeLabel = 'Low volatility';
  }

  // Guard against invalid inputs
  if (accountSize <= 0 || tqqqPrice <= 0 || sqqqPrice <= 0) {
    return {
      allocationPercent,
      allocationAmount: 0,
      tqqqShares: 0,
      sqqqShares: 0,
      totalInvestment: 0,
      marginRequired: 0,
      vixRegimeLabel,
    };
  }

  const allocationAmount = accountSize * allocationPercent;

  // Calculate shares with target 1.25:1 SQQQ:TQQQ ratio
  // tqqqShares = allocationAmount / (tqqqPrice + TARGET_RATIO * sqqqPrice)
  const tqqqShares = Math.floor(allocationAmount / (tqqqPrice + TARGET_RATIO * sqqqPrice));
  const sqqqShares = Math.floor(TARGET_RATIO * tqqqShares);
  const totalInvestment = (tqqqShares * tqqqPrice) + (sqqqShares * sqqqPrice);
  const marginRequired = totalInvestment * MARGIN_RATE;

  return {
    allocationPercent,
    allocationAmount,
    tqqqShares,
    sqqqShares,
    totalInvestment,
    marginRequired,
    vixRegimeLabel,
  };
}
