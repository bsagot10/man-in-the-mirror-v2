/**
 * TDD Tests for VIX Regime and Market Trend Classification
 *
 * Tests the market analysis logic for:
 * - VIX regime classification (Low, Moderate, High, Extreme)
 * - Market trend determination (bullish, bearish, neutral)
 */

import { describe, it, expect } from 'vitest';
import {
  determineVixRegime,
  determineMarketTrend,
} from '@/lib/market-analysis/vixRegime';

describe('determineVixRegime', () => {
  describe('Extreme regime (VIX >= 30)', () => {
    it('classifies VIX = 30 as Extreme', () => {
      expect(determineVixRegime(30)).toBe('Extreme');
    });

    it('classifies VIX = 35 as Extreme', () => {
      expect(determineVixRegime(35)).toBe('Extreme');
    });

    it('classifies VIX = 50 as Extreme', () => {
      expect(determineVixRegime(50)).toBe('Extreme');
    });
  });

  describe('High regime (20 <= VIX < 30)', () => {
    it('classifies VIX = 20 as High', () => {
      expect(determineVixRegime(20)).toBe('High');
    });

    it('classifies VIX = 25 as High', () => {
      expect(determineVixRegime(25)).toBe('High');
    });

    it('classifies VIX = 29.99 as High', () => {
      expect(determineVixRegime(29.99)).toBe('High');
    });
  });

  describe('Moderate regime (15 <= VIX < 20)', () => {
    it('classifies VIX = 15 as Moderate', () => {
      expect(determineVixRegime(15)).toBe('Moderate');
    });

    it('classifies VIX = 17 as Moderate', () => {
      expect(determineVixRegime(17)).toBe('Moderate');
    });

    it('classifies VIX = 19.99 as Moderate', () => {
      expect(determineVixRegime(19.99)).toBe('Moderate');
    });
  });

  describe('Low regime (VIX < 15)', () => {
    it('classifies VIX = 14.99 as Low', () => {
      expect(determineVixRegime(14.99)).toBe('Low');
    });

    it('classifies VIX = 12 as Low', () => {
      expect(determineVixRegime(12)).toBe('Low');
    });

    it('classifies VIX = 10 as Low', () => {
      expect(determineVixRegime(10)).toBe('Low');
    });
  });

  describe('Edge cases', () => {
    it('handles VIX = 0', () => {
      expect(determineVixRegime(0)).toBe('Low');
    });

    it('handles negative VIX (invalid but graceful)', () => {
      expect(determineVixRegime(-5)).toBe('Low');
    });

    it('handles very high VIX values', () => {
      expect(determineVixRegime(100)).toBe('Extreme');
    });
  });
});

describe('determineMarketTrend', () => {
  describe('Bullish trend (change > 0.5%)', () => {
    it('classifies change = 0.51 as bullish', () => {
      expect(determineMarketTrend(0.51)).toBe('bullish');
    });

    it('classifies change = 1.0 as bullish', () => {
      expect(determineMarketTrend(1.0)).toBe('bullish');
    });

    it('classifies change = 3.0 as bullish', () => {
      expect(determineMarketTrend(3.0)).toBe('bullish');
    });
  });

  describe('Bearish trend (change < -0.5%)', () => {
    it('classifies change = -0.51 as bearish', () => {
      expect(determineMarketTrend(-0.51)).toBe('bearish');
    });

    it('classifies change = -1.0 as bearish', () => {
      expect(determineMarketTrend(-1.0)).toBe('bearish');
    });

    it('classifies change = -3.0 as bearish', () => {
      expect(determineMarketTrend(-3.0)).toBe('bearish');
    });
  });

  describe('Neutral trend (-0.5% <= change <= 0.5%)', () => {
    it('classifies change = 0 as neutral', () => {
      expect(determineMarketTrend(0)).toBe('neutral');
    });

    it('classifies change = 0.5 as neutral', () => {
      expect(determineMarketTrend(0.5)).toBe('neutral');
    });

    it('classifies change = -0.5 as neutral', () => {
      expect(determineMarketTrend(-0.5)).toBe('neutral');
    });

    it('classifies change = 0.25 as neutral', () => {
      expect(determineMarketTrend(0.25)).toBe('neutral');
    });

    it('classifies change = -0.25 as neutral', () => {
      expect(determineMarketTrend(-0.25)).toBe('neutral');
    });
  });

  describe('Edge cases', () => {
    it('handles very small positive change', () => {
      expect(determineMarketTrend(0.001)).toBe('neutral');
    });

    it('handles very small negative change', () => {
      expect(determineMarketTrend(-0.001)).toBe('neutral');
    });

    it('handles extreme positive change', () => {
      expect(determineMarketTrend(10)).toBe('bullish');
    });

    it('handles extreme negative change', () => {
      expect(determineMarketTrend(-10)).toBe('bearish');
    });
  });
});
