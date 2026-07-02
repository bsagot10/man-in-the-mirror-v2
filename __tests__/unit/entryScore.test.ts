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

// Scores aligned with the canonical MCP strategy config (calculator.ts):
// VIX max 40; VIX >= 30 → 40, VIX >= 20 → 30 (0.75x), VIX < 20 → 0 (below entry threshold).
// Regime LABELS keep the 4-tier display classification (Low/Moderate/High/Extreme).
describe('classifyVolatility', () => {
  it('classifies VIX >= 30 as Extreme with score 40', () => {
    const result = classifyVolatility(30);
    expect(result.regime).toBe('Extreme');
    expect(result.score).toBe(40);
  });

  it('classifies VIX 35 as Extreme', () => {
    const result = classifyVolatility(35);
    expect(result.regime).toBe('Extreme');
    expect(result.score).toBe(40);
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

  it('classifies VIX >= 15 but < 20 as Moderate with score 0 (below entry threshold)', () => {
    const result = classifyVolatility(17);
    expect(result.regime).toBe('Moderate');
    expect(result.score).toBe(0);
  });

  it('classifies VIX at exactly 15 as Moderate with score 0', () => {
    const result = classifyVolatility(15);
    expect(result.regime).toBe('Moderate');
    expect(result.score).toBe(0);
  });

  it('classifies VIX < 15 as Low with score 0', () => {
    const result = classifyVolatility(14);
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

  it('classifies QQQ change < -2% as Strong Downtrend with score 20', () => {
    // MCP canon: only strong UPtrends get the low score (0.33x);
    // downtrends still allow decay capture and score as mixed (0.67x)
    const result = classifyTrend(-2.5);
    expect(result.regime).toBe('Strong Downtrend');
    expect(result.score).toBe(20);
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

// Canonical MCP decay formula: per-ETF decay = leverage² × move² / 2 (move as
// fraction), summed and scaled ×100, capped at 20. No inverse-correlation gate
// (MCP does not gate either — decay accrues from any movement).
describe('calculateDecayPotential', () => {
  it('computes decay for symmetric 3% moves', () => {
    // 9 × 0.03² / 2 = 0.00405 per ETF → 0.0081 total → ×100 = 0.81
    const score = calculateDecayPotential(3, -3);
    expect(score).toBeCloseTo(0.81, 2);
  });

  it('computes decay for symmetric 2% moves', () => {
    // 9 × 0.02² / 2 = 0.0018 per ETF → 0.0036 total → ×100 = 0.36
    const score = calculateDecayPotential(2, -2);
    expect(score).toBeCloseTo(0.36, 2);
  });

  it('computes decay for asymmetric small moves', () => {
    // 9 × 0.01²/2 + 9 × 0.005²/2 = 0.00045 + 0.0001125 → ×100 = 0.05625
    const score = calculateDecayPotential(1, -0.5);
    expect(score).toBeCloseTo(0.06, 2);
  });

  it('accrues decay even when both move in the same direction', () => {
    const score = calculateDecayPotential(2, 2);
    expect(score).toBeCloseTo(0.36, 2);
  });

  it('returns 0 when both are zero', () => {
    const score = calculateDecayPotential(0, 0);
    expect(score).toBe(0);
  });

  it('is direction-agnostic (uses absolute moves)', () => {
    expect(calculateDecayPotential(-3, 3)).toBeCloseTo(calculateDecayPotential(3, -3), 10);
  });

  it('caps the decay score at 20', () => {
    // 30% moves: 9 × 0.09 / 2 = 0.405 per ETF → 0.81 total → ×100 = 81 → cap 20
    const score = calculateDecayPotential(30, -30);
    expect(score).toBe(20);
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

  it('returns ENTER signal when score > 60 (MCP buy threshold)', () => {
    // VIX >= 30 (40) + Sideways (30) + decay(3,-3) ≈ 0.81 → 70.81 > 60
    const data = createMarketData({
      vix: { currentPrice: 30, changePercent: 5 },
      qqq: { currentPrice: 400, changePercent: 0.5 },
      tqqq: { currentPrice: 50, changePercent: 3 },
      sqqq: { currentPrice: 30, changePercent: -3 },
    });

    const result = calculateEntryScore(data);
    expect(result.total).toBe(71); // rounded for display
    expect(result.signal).toBe('ENTER');
  });

  it('returns WATCH signal when score is in (40, 60]', () => {
    // VIX High (30) + Mixed trend 1.5% (20) + decay(1,1) ≈ 0.09 → 50.09
    const data = createMarketData({
      vix: { currentPrice: 25, changePercent: 2 },
      qqq: { currentPrice: 400, changePercent: 1.5 },
      tqqq: { currentPrice: 50, changePercent: 1 },
      sqqq: { currentPrice: 30, changePercent: 1 },
    });

    const result = calculateEntryScore(data);
    expect(result.total).toBe(50);
    expect(result.signal).toBe('WATCH');
  });

  it('returns WAIT signal when score <= 40', () => {
    // VIX Moderate (0, below entry threshold) + Strong Uptrend (10) + decay(5,5) ≈ 2.25 → 12.25
    const data = createMarketData({
      vix: { currentPrice: 15, changePercent: -1 },
      qqq: { currentPrice: 400, changePercent: 3 },
      tqqq: { currentPrice: 50, changePercent: 5 },
      sqqq: { currentPrice: 30, changePercent: 5 },
    });

    const result = calculateEntryScore(data);
    expect(result.total).toBe(12);
    expect(result.signal).toBe('WAIT');
  });

  it('returns WAIT below VIX 20 even in ideal sideways conditions', () => {
    // Canon rule: VIX < 20 = no entry. Sideways (30) + tiny decay only → WAIT
    const data = createMarketData({
      vix: { currentPrice: 18, changePercent: 0 },
      qqq: { currentPrice: 400, changePercent: 0.2 },
      tqqq: { currentPrice: 50, changePercent: 0.5 },
      sqqq: { currentPrice: 30, changePercent: -0.5 },
    });

    const result = calculateEntryScore(data);
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
      vix: { currentPrice: 30, changePercent: 5 },  // Extreme: 40
      qqq: { currentPrice: 400, changePercent: 0 }, // Sideways: 30
      tqqq: { currentPrice: 50, changePercent: 3 },
      sqqq: { currentPrice: 30, changePercent: -3 }, // decay ≈ 0.81
    });

    const result = calculateEntryScore(data);

    expect(result.volatilityScore).toBe(40);
    expect(result.trendScore).toBe(30);
    expect(result.decayScore).toBeCloseTo(0.81, 2);
    expect(result.total).toBe(71);
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
