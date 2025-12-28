/**
 * TDD Tests for Entry Score Calculation
 *
 * Tests the market analysis logic for determining trading signals.
 * Ported from: backend/market_analysis.py
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEntryScore,
  classifyVolatility,
  classifyTrend,
  calculateDecayPotential,
  type MarketData,
  type EntryScore,
} from '@/lib/market-analysis/entryScore';

describe('classifyVolatility', () => {
  it('classifies VIX >= 30 as Extreme with score 50', () => {
    const result = classifyVolatility(30);
    expect(result.regime).toBe('Extreme');
    expect(result.score).toBe(50);
  });

  it('classifies VIX 35 as Extreme', () => {
    const result = classifyVolatility(35);
    expect(result.regime).toBe('Extreme');
    expect(result.score).toBe(50);
  });

  it('classifies VIX >= 20 but < 30 as High with score 30', () => {
    const result = classifyVolatility(25);
    expect(result.regime).toBe('High');
    expect(result.score).toBe(30);
  });

  it('classifies VIX at exactly 20 as High', () => {
    const result = classifyVolatility(20);
    expect(result.regime).toBe('High');
    expect(result.score).toBe(30);
  });

  it('classifies VIX < 20 as Low with score 0', () => {
    const result = classifyVolatility(15);
    expect(result.regime).toBe('Low');
    expect(result.score).toBe(0);
  });

  it('handles edge case VIX at 29.99', () => {
    const result = classifyVolatility(29.99);
    expect(result.regime).toBe('High');
    expect(result.score).toBe(30);
  });
});

describe('classifyTrend', () => {
  it('classifies QQQ change < 1% as Sideways/Choppy with score 30', () => {
    const result = classifyTrend(0.5);
    expect(result.regime).toBe('Sideways/Choppy');
    expect(result.score).toBe(30);
  });

  it('classifies QQQ change at -0.8% as Sideways/Choppy', () => {
    const result = classifyTrend(-0.8);
    expect(result.regime).toBe('Sideways/Choppy');
    expect(result.score).toBe(30);
  });

  it('classifies QQQ change > 2% as Strong Uptrend with score 10', () => {
    const result = classifyTrend(2.5);
    expect(result.regime).toBe('Strong Uptrend');
    expect(result.score).toBe(10);
  });

  it('classifies QQQ change < -2% as Strong Downtrend with score 10', () => {
    const result = classifyTrend(-2.5);
    expect(result.regime).toBe('Strong Downtrend');
    expect(result.score).toBe(10);
  });

  it('classifies QQQ change between 1% and 2% as Mixed with score 20', () => {
    const result = classifyTrend(1.5);
    expect(result.regime).toBe('Mixed');
    expect(result.score).toBe(20);
  });

  it('handles negative mixed range', () => {
    const result = classifyTrend(-1.5);
    expect(result.regime).toBe('Mixed');
    expect(result.score).toBe(20);
  });

  it('classifies zero change as Sideways/Choppy', () => {
    const result = classifyTrend(0);
    expect(result.regime).toBe('Sideways/Choppy');
    expect(result.score).toBe(30);
  });
});

describe('calculateDecayPotential', () => {
  it('returns 30 for strong inverse correlation (>5%)', () => {
    const score = calculateDecayPotential(3, -3);
    expect(score).toBe(30);
  });

  it('returns 20 for moderate inverse correlation (3-5%)', () => {
    const score = calculateDecayPotential(2, -2);
    expect(score).toBe(20);
  });

  it('returns 10 for weak inverse correlation (<3%)', () => {
    const score = calculateDecayPotential(1, -0.5);
    expect(score).toBe(10);
  });

  it('returns 0 when both move in same direction', () => {
    const score = calculateDecayPotential(2, 2);
    expect(score).toBe(0);
  });

  it('returns 0 when both are zero', () => {
    const score = calculateDecayPotential(0, 0);
    expect(score).toBe(0);
  });

  it('handles SQQQ positive and TQQQ negative', () => {
    const score = calculateDecayPotential(-3, 3);
    expect(score).toBe(30);
  });
});

describe('calculateEntryScore', () => {
  const createMarketData = (overrides: Partial<MarketData> = {}): MarketData => ({
    vix: { currentPrice: 20, changePercent: 0 },
    qqq: { currentPrice: 400, changePercent: 0 },
    tqqq: { currentPrice: 50, changePercent: 0 },
    sqqq: { currentPrice: 30, changePercent: 0 },
    ...overrides,
  });

  it('returns ENTER signal when score >= 70', () => {
    // VIX >= 30 (50) + Sideways (30) = 80 + possible decay
    const data = createMarketData({
      vix: { currentPrice: 30, changePercent: 5 },
      qqq: { currentPrice: 400, changePercent: 0.5 },
      tqqq: { currentPrice: 50, changePercent: 3 },
      sqqq: { currentPrice: 30, changePercent: -3 },
    });

    const result = calculateEntryScore(data);
    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.signal).toBe('ENTER');
  });

  it('returns WATCH signal when score is 50-69', () => {
    // VIX High (30) + Sideways (30) = 60
    const data = createMarketData({
      vix: { currentPrice: 25, changePercent: 2 },
      qqq: { currentPrice: 400, changePercent: 0.5 },
      tqqq: { currentPrice: 50, changePercent: 1 },
      sqqq: { currentPrice: 30, changePercent: 1 },
    });

    const result = calculateEntryScore(data);
    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.total).toBeLessThan(70);
    expect(result.signal).toBe('WATCH');
  });

  it('returns WAIT signal when score < 50', () => {
    // VIX Low (0) + Strong trend (10) = 10
    const data = createMarketData({
      vix: { currentPrice: 15, changePercent: -1 },
      qqq: { currentPrice: 400, changePercent: 3 },
      tqqq: { currentPrice: 50, changePercent: 5 },
      sqqq: { currentPrice: 30, changePercent: 5 },
    });

    const result = calculateEntryScore(data);
    expect(result.total).toBeLessThan(50);
    expect(result.signal).toBe('WAIT');
  });

  it('includes all score components in result', () => {
    const data = createMarketData({
      vix: { currentPrice: 25, changePercent: 2 },
    });

    const result = calculateEntryScore(data);

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('signal');
    expect(result).toHaveProperty('vixValue');
    expect(result).toHaveProperty('volatilityRegime');
    expect(result).toHaveProperty('volatilityScore');
    expect(result).toHaveProperty('trendRegime');
    expect(result).toHaveProperty('trendScore');
    expect(result).toHaveProperty('decayScore');
  });

  it('correctly sums all component scores', () => {
    const data = createMarketData({
      vix: { currentPrice: 30, changePercent: 5 },  // Extreme: 50
      qqq: { currentPrice: 400, changePercent: 0 }, // Sideways: 30
      tqqq: { currentPrice: 50, changePercent: 3 },
      sqqq: { currentPrice: 30, changePercent: -3 }, // Strong inverse: 30
    });

    const result = calculateEntryScore(data);

    expect(result.volatilityScore).toBe(50);
    expect(result.trendScore).toBe(30);
    expect(result.decayScore).toBe(30);
    expect(result.total).toBe(110);
  });

  it('handles missing market data gracefully', () => {
    const data = createMarketData({
      vix: { currentPrice: 0, changePercent: 0 },
    });

    const result = calculateEntryScore(data);
    expect(result.signal).toBe('WAIT');
    expect(result.vixValue).toBe(0);
  });
});

describe('EntryScore type', () => {
  it('has correct signal types', () => {
    const validSignals: EntryScore['signal'][] = ['ENTER', 'WATCH', 'WAIT'];
    expect(validSignals).toHaveLength(3);
  });
});
