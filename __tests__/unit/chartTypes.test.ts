/**
 * TDD Tests for Chart Types Utility Functions
 *
 * Tests the position P&L calculation and formatting utilities:
 * - calculatePositionPnL: Calculate position P&L and percentage
 * - getPnlClass: CSS class selection based on P&L value
 * - formatPnl: Format P&L for display with sign prefix
 * - calculateDaysActive: Calculate days since entry date
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculatePositionPnL,
  getPnlClass,
  formatPnl,
  calculateDaysActive,
  isStopBreached,
  type Position,
} from '@/types/chart-types';

describe('calculatePositionPnL', () => {
  const basePosition: Position = {
    symbol: 'TQQQ',
    shares: 100,
    entryPrice: 50.00,
    currentPrice: 55.00,
    entryDate: '2024-01-01',
  };

  // Strategy convention: all positions are SHORT (Man in the Mirror shorts
  // both TQQQ and SQQQ to harvest decay). Price DROP = profit.
  describe('P&L calculation (short positions)', () => {
    it('calculates negative P&L when price rises (short loses)', () => {
      const result = calculatePositionPnL(basePosition);
      // (50 - 55) * 100 = -500
      expect(result.pnl).toBe(-500);
    });

    it('calculates positive P&L when price falls (short profits)', () => {
      const position: Position = { ...basePosition, currentPrice: 45.00 };
      const result = calculatePositionPnL(position);
      // (50 - 45) * 100 = 500
      expect(result.pnl).toBe(500);
    });

    it('calculates zero P&L when prices are equal', () => {
      const position: Position = { ...basePosition, currentPrice: 50.00 };
      const result = calculatePositionPnL(position);
      expect(result.pnl).toBe(0);
    });

    it('handles fractional share prices', () => {
      const position: Position = {
        ...basePosition,
        entryPrice: 50.25,
        currentPrice: 51.75,
      };
      const result = calculatePositionPnL(position);
      // (50.25 - 51.75) * 100 = -150
      expect(result.pnl).toBeCloseTo(-150, 2);
    });

    it('handles small share counts', () => {
      const position: Position = { ...basePosition, shares: 1 };
      const result = calculatePositionPnL(position);
      // (50 - 55) * 1 = -5
      expect(result.pnl).toBe(-5);
    });
  });

  describe('P&L percentage calculation (short positions)', () => {
    it('calculates negative percentage when price rises', () => {
      const result = calculatePositionPnL(basePosition);
      // ((50 - 55) / 50) * 100 = -10%
      expect(result.pnlPercent).toBe(-10);
    });

    it('calculates positive percentage when price falls', () => {
      const position: Position = { ...basePosition, currentPrice: 45.00 };
      const result = calculatePositionPnL(position);
      // ((50 - 45) / 50) * 100 = 10%
      expect(result.pnlPercent).toBe(10);
    });

    it('handles zero entry price gracefully', () => {
      const position: Position = { ...basePosition, entryPrice: 0 };
      const result = calculatePositionPnL(position);
      expect(result.pnlPercent).toBe(0);
    });

    it('calculates fractional percentages', () => {
      const position: Position = {
        ...basePosition,
        entryPrice: 100,
        currentPrice: 101.5,
      };
      const result = calculatePositionPnL(position);
      // ((100 - 101.5) / 100) * 100 = -1.5%
      expect(result.pnlPercent).toBeCloseTo(-1.5, 2);
    });
  });

  describe('Return value structure', () => {
    it('preserves original position data', () => {
      const result = calculatePositionPnL(basePosition);
      expect(result.symbol).toBe(basePosition.symbol);
      expect(result.shares).toBe(basePosition.shares);
      expect(result.entryPrice).toBe(basePosition.entryPrice);
      expect(result.currentPrice).toBe(basePosition.currentPrice);
      expect(result.entryDate).toBe(basePosition.entryDate);
    });

    it('adds pnl and pnlPercent fields', () => {
      const result = calculatePositionPnL(basePosition);
      expect(result).toHaveProperty('pnl');
      expect(result).toHaveProperty('pnlPercent');
    });
  });

  describe('SQQQ positions', () => {
    it('calculates short P&L for SQQQ', () => {
      const sqqqPosition: Position = {
        symbol: 'SQQQ',
        shares: 200,
        entryPrice: 30.00,
        currentPrice: 32.50,
        entryDate: '2024-01-01',
      };
      const result = calculatePositionPnL(sqqqPosition);
      // (30 - 32.50) * 200 = -500
      expect(result.pnl).toBe(-500);
      expect(result.symbol).toBe('SQQQ');
    });
  });
});

describe('getPnlClass', () => {
  describe('Positive P&L', () => {
    it('returns positive for values above threshold', () => {
      expect(getPnlClass(100)).toBe('positive');
    });

    it('returns positive for small positive values', () => {
      expect(getPnlClass(0.02)).toBe('positive');
    });

    it('returns positive for values just above threshold', () => {
      expect(getPnlClass(0.011)).toBe('positive');
    });
  });

  describe('Negative P&L', () => {
    it('returns negative for values below threshold', () => {
      expect(getPnlClass(-100)).toBe('negative');
    });

    it('returns negative for small negative values', () => {
      expect(getPnlClass(-0.02)).toBe('negative');
    });

    it('returns negative for values just below threshold', () => {
      expect(getPnlClass(-0.011)).toBe('negative');
    });
  });

  describe('Neutral P&L (within threshold)', () => {
    it('returns neutral for zero', () => {
      expect(getPnlClass(0)).toBe('neutral');
    });

    it('returns neutral for small positive within threshold', () => {
      expect(getPnlClass(0.005)).toBe('neutral');
    });

    it('returns neutral for small negative within threshold', () => {
      expect(getPnlClass(-0.005)).toBe('neutral');
    });

    it('returns neutral at positive threshold boundary', () => {
      expect(getPnlClass(0.01)).toBe('neutral');
    });

    it('returns neutral at negative threshold boundary', () => {
      expect(getPnlClass(-0.01)).toBe('neutral');
    });
  });
});

describe('formatPnl', () => {
  describe('Positive values', () => {
    it('formats positive P&L with + sign', () => {
      expect(formatPnl(100)).toBe('+$100.00');
    });

    it('formats small positive P&L', () => {
      expect(formatPnl(0.50)).toBe('+$0.50');
    });

    it('formats large positive P&L', () => {
      expect(formatPnl(10000)).toBe('+$10000.00');
    });
  });

  describe('Negative values', () => {
    it('formats negative P&L without extra + sign', () => {
      expect(formatPnl(-100)).toBe('-$100.00');
    });

    it('formats small negative P&L', () => {
      expect(formatPnl(-0.50)).toBe('-$0.50');
    });

    it('formats large negative P&L', () => {
      expect(formatPnl(-10000)).toBe('-$10000.00');
    });
  });

  describe('Zero and edge cases', () => {
    it('formats zero with + sign', () => {
      expect(formatPnl(0)).toBe('+$0.00');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatPnl(100.999)).toBe('+$101.00');
    });

    it('handles very small positive values', () => {
      expect(formatPnl(0.001)).toBe('+$0.00');
    });

    it('handles very small negative values', () => {
      expect(formatPnl(-0.001)).toBe('-$0.00');
    });
  });
});

describe('calculateDaysActive', () => {
  // Use fixed dates for predictable testing (midnight for cleaner day calculations)
  const mockDate = new Date('2024-01-15T00:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Days calculation', () => {
    it('calculates days for recent entry', () => {
      // Entry 5 days ago
      const result = calculateDaysActive('2024-01-10');
      expect(result).toBe(5);
    });

    it('calculates days for older entry', () => {
      // Entry 30 days ago
      const result = calculateDaysActive('2023-12-16');
      expect(result).toBe(30);
    });

    it('returns 0 or 1 for same day entry', () => {
      // Entry today - Math.ceil means partial day counts as 1
      const result = calculateDaysActive('2024-01-15');
      expect(result).toBeLessThanOrEqual(1);
    });

    it('handles entry date in previous year', () => {
      // Entry date in previous year (365 days: 2023 is not a leap year)
      const result = calculateDaysActive('2023-01-15');
      expect(result).toBe(365);
    });

    it('returns 0 for a future entry date', () => {
      // The date picker allows future dates; a position can't have been
      // active for positive days before it was entered
      const result = calculateDaysActive('2024-01-18');
      expect(result).toBe(0);
    });
  });

  describe('Date format handling', () => {
    it('handles ISO date format', () => {
      const result = calculateDaysActive('2024-01-10');
      expect(result).toBe(5);
    });

    it('handles date with time component', () => {
      // Even with time, should calculate correctly
      const result = calculateDaysActive('2024-01-10T00:00:00Z');
      expect(result).toBeGreaterThanOrEqual(5);
    });
  });
});

// Short positions are stopped out when price rises ABOVE the stop level
// (loss on a short grows as price climbs), matching the fixed entry*1.15
// stop levels computed in useDashboard.
describe('isStopBreached', () => {
  it('returns true when current price is above the stop level', () => {
    expect(isStopBreached(71.37, 58.67)).toBe(true);
  });

  it('returns false when current price is below the stop level', () => {
    expect(isStopBreached(40.31, 79.79)).toBe(false);
  });

  it('returns false when current price equals the stop level exactly', () => {
    expect(isStopBreached(58.67, 58.67)).toBe(false);
  });

  it('returns false when either value is undefined', () => {
    expect(isStopBreached(undefined, 58.67)).toBe(false);
    expect(isStopBreached(71.37, undefined)).toBe(false);
    expect(isStopBreached(undefined, undefined)).toBe(false);
  });
});
