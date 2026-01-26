/**
 * TDD Tests for Position Sizing Calculator
 *
 * Tests the position sizing logic for:
 * - VIX regime-based allocation percentages
 * - Share calculations with target SQQQ:TQQQ ratio
 * - Edge cases and input validation
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePositionSizing,
  type PositionSizing,
} from '@/lib/market-analysis/positionSizing';

describe('calculatePositionSizing', () => {
  // Standard test inputs
  const ACCOUNT_SIZE = 100000;
  const TQQQ_PRICE = 50;
  const SQQQ_PRICE = 10;

  describe('VIX regime allocation percentages', () => {
    describe('Extreme regime (VIX >= 30) allocates 50%', () => {
      it('allocates 50% at VIX = 30', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 30, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.5);
        expect(result.vixRegimeLabel).toBe('Extreme volatility');
      });

      it('allocates 50% at VIX = 40', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 40, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.5);
      });

      it('allocates 50% at VIX = 80', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 80, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.5);
      });
    });

    describe('High regime (20 <= VIX < 30) allocates 40%', () => {
      it('allocates 40% at VIX = 20', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 20, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.4);
        expect(result.vixRegimeLabel).toBe('High volatility');
      });

      it('allocates 40% at VIX = 25', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 25, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.4);
      });

      it('allocates 40% at VIX = 29.99', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 29.99, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.4);
      });
    });

    describe('Moderate regime (15 <= VIX < 20) allocates 35%', () => {
      it('allocates 35% at VIX = 15', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 15, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.35);
        expect(result.vixRegimeLabel).toBe('Moderate volatility');
      });

      it('allocates 35% at VIX = 17', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 17, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.35);
      });

      it('allocates 35% at VIX = 19.99', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 19.99, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.35);
      });
    });

    describe('Low regime (VIX < 15) allocates 30%', () => {
      it('allocates 30% at VIX = 14.99', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 14.99, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.3);
        expect(result.vixRegimeLabel).toBe('Low volatility');
      });

      it('allocates 30% at VIX = 12', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 12, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.3);
      });

      it('allocates 30% at VIX = 10', () => {
        const result = calculatePositionSizing(ACCOUNT_SIZE, 10, TQQQ_PRICE, SQQQ_PRICE);
        expect(result.allocationPercent).toBe(0.3);
      });
    });
  });

  describe('Share calculations', () => {
    it('calculates allocation amount correctly', () => {
      const result = calculatePositionSizing(100000, 25, 50, 10);
      // High regime = 40% allocation
      expect(result.allocationAmount).toBe(40000);
    });

    it('calculates TQQQ shares with floor rounding', () => {
      // With $40,000 allocation, TQQQ=$50, SQQQ=$10, ratio=1.25
      // tqqqShares = floor(40000 / (50 + 1.25 * 10)) = floor(40000 / 62.5) = 640
      const result = calculatePositionSizing(100000, 25, 50, 10);
      expect(result.tqqqShares).toBe(640);
    });

    it('calculates SQQQ shares with 1.25:1 ratio', () => {
      // sqqqShares = floor(1.25 * 640) = 800
      const result = calculatePositionSizing(100000, 25, 50, 10);
      expect(result.sqqqShares).toBe(800);
    });

    it('calculates total investment correctly', () => {
      const result = calculatePositionSizing(100000, 25, 50, 10);
      // tqqq: 640 * $50 = $32,000
      // sqqq: 800 * $10 = $8,000
      // total: $40,000
      expect(result.totalInvestment).toBe(40000);
    });

    it('calculates margin required at 50%', () => {
      const result = calculatePositionSizing(100000, 25, 50, 10);
      // marginRequired = totalInvestment * 0.5
      expect(result.marginRequired).toBe(20000);
    });
  });

  describe('Edge cases - invalid inputs', () => {
    describe('Zero account size', () => {
      it('returns zero shares with zero account', () => {
        const result = calculatePositionSizing(0, 25, 50, 10);
        expect(result.tqqqShares).toBe(0);
        expect(result.sqqqShares).toBe(0);
        expect(result.totalInvestment).toBe(0);
      });

      it('still calculates allocation percent with zero account', () => {
        const result = calculatePositionSizing(0, 25, 50, 10);
        expect(result.allocationPercent).toBe(0.4); // High regime
      });
    });

    describe('Negative account size', () => {
      it('returns zero shares with negative account', () => {
        const result = calculatePositionSizing(-10000, 25, 50, 10);
        expect(result.tqqqShares).toBe(0);
        expect(result.sqqqShares).toBe(0);
        expect(result.totalInvestment).toBe(0);
      });
    });

    describe('Zero or negative prices', () => {
      it('returns zero shares with zero TQQQ price', () => {
        const result = calculatePositionSizing(100000, 25, 0, 10);
        expect(result.tqqqShares).toBe(0);
        expect(result.sqqqShares).toBe(0);
      });

      it('returns zero shares with zero SQQQ price', () => {
        const result = calculatePositionSizing(100000, 25, 50, 0);
        expect(result.tqqqShares).toBe(0);
        expect(result.sqqqShares).toBe(0);
      });

      it('returns zero shares with negative TQQQ price', () => {
        const result = calculatePositionSizing(100000, 25, -50, 10);
        expect(result.tqqqShares).toBe(0);
        expect(result.sqqqShares).toBe(0);
      });

      it('returns zero shares with negative SQQQ price', () => {
        const result = calculatePositionSizing(100000, 25, 50, -10);
        expect(result.tqqqShares).toBe(0);
        expect(result.sqqqShares).toBe(0);
      });
    });

    describe('Edge VIX values', () => {
      it('handles VIX = 0', () => {
        const result = calculatePositionSizing(100000, 0, 50, 10);
        expect(result.allocationPercent).toBe(0.3); // Low regime
        expect(result.vixRegimeLabel).toBe('Low volatility');
      });

      it('handles negative VIX (gracefully)', () => {
        const result = calculatePositionSizing(100000, -5, 50, 10);
        expect(result.allocationPercent).toBe(0.3); // Low regime
      });
    });
  });

  describe('Boundary conditions', () => {
    it('VIX at exact boundary 15 is Moderate (not Low)', () => {
      const result = calculatePositionSizing(100000, 15, 50, 10);
      expect(result.allocationPercent).toBe(0.35);
      expect(result.vixRegimeLabel).toBe('Moderate volatility');
    });

    it('VIX at exact boundary 20 is High (not Moderate)', () => {
      const result = calculatePositionSizing(100000, 20, 50, 10);
      expect(result.allocationPercent).toBe(0.4);
      expect(result.vixRegimeLabel).toBe('High volatility');
    });

    it('VIX at exact boundary 30 is Extreme (not High)', () => {
      const result = calculatePositionSizing(100000, 30, 50, 10);
      expect(result.allocationPercent).toBe(0.5);
      expect(result.vixRegimeLabel).toBe('Extreme volatility');
    });

    it('VIX just below 15 is Low', () => {
      const result = calculatePositionSizing(100000, 14.999, 50, 10);
      expect(result.allocationPercent).toBe(0.3);
    });

    it('VIX just below 20 is Moderate', () => {
      const result = calculatePositionSizing(100000, 19.999, 50, 10);
      expect(result.allocationPercent).toBe(0.35);
    });

    it('VIX just below 30 is High', () => {
      const result = calculatePositionSizing(100000, 29.999, 50, 10);
      expect(result.allocationPercent).toBe(0.4);
    });
  });

  describe('Different account sizes', () => {
    it('scales shares proportionally with larger account', () => {
      const small = calculatePositionSizing(50000, 25, 50, 10);
      const large = calculatePositionSizing(100000, 25, 50, 10);

      // Large account should have ~2x shares
      expect(large.tqqqShares).toBe(small.tqqqShares * 2);
      expect(large.sqqqShares).toBe(small.sqqqShares * 2);
    });

    it('handles small account size', () => {
      const result = calculatePositionSizing(1000, 25, 50, 10);
      // $1000 * 40% = $400 allocation
      // tqqqShares = floor(400 / 62.5) = 6
      expect(result.tqqqShares).toBe(6);
      expect(result.sqqqShares).toBe(7); // floor(1.25 * 6) = 7
    });

    it('handles very small account with insufficient funds', () => {
      const result = calculatePositionSizing(100, 25, 50, 10);
      // $100 * 40% = $40 allocation
      // tqqqShares = floor(40 / 62.5) = 0
      expect(result.tqqqShares).toBe(0);
      expect(result.sqqqShares).toBe(0);
    });
  });

  describe('Return type structure', () => {
    it('returns all required PositionSizing fields', () => {
      const result = calculatePositionSizing(100000, 25, 50, 10);

      expect(result).toHaveProperty('allocationPercent');
      expect(result).toHaveProperty('allocationAmount');
      expect(result).toHaveProperty('tqqqShares');
      expect(result).toHaveProperty('sqqqShares');
      expect(result).toHaveProperty('totalInvestment');
      expect(result).toHaveProperty('marginRequired');
      expect(result).toHaveProperty('vixRegimeLabel');
    });

    it('returns numeric values for all number fields', () => {
      const result = calculatePositionSizing(100000, 25, 50, 10);

      expect(typeof result.allocationPercent).toBe('number');
      expect(typeof result.allocationAmount).toBe('number');
      expect(typeof result.tqqqShares).toBe('number');
      expect(typeof result.sqqqShares).toBe('number');
      expect(typeof result.totalInvestment).toBe('number');
      expect(typeof result.marginRequired).toBe('number');
    });

    it('returns string for vixRegimeLabel', () => {
      const result = calculatePositionSizing(100000, 25, 50, 10);
      expect(typeof result.vixRegimeLabel).toBe('string');
    });
  });
});
