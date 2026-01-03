/**
 * TDD Tests for Market Data API Routes
 *
 * Tests the API endpoints for:
 * - /api/market-data - Current market data
 * - /api/historical-data - Historical price data
 * - /api/entry-score - Entry score calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the market data client - both class and singleton
// Note: vi.mock is hoisted, so we must inline all mock data
vi.mock('@/lib/market-data/client', () => {
  // Mock data must be defined inside the factory (hoisting issue)
  const mockCurrentData = {
    vix: { currentPrice: 20.5, changePercent: 1.5, previousClose: 20.2, change: 0.3, volume: 0, timestamp: '2024-01-15T16:00:00Z' },
    qqq: { currentPrice: 400, changePercent: 0.5, previousClose: 398, change: 2, volume: 50000000, timestamp: '2024-01-15T16:00:00Z' },
    tqqq: { currentPrice: 50, changePercent: 1.5, previousClose: 49.25, change: 0.75, volume: 30000000, timestamp: '2024-01-15T16:00:00Z' },
    sqqq: { currentPrice: 30, changePercent: -1.5, previousClose: 30.45, change: -0.45, volume: 20000000, timestamp: '2024-01-15T16:00:00Z' },
  };

  const mockHistoricalData = {
    vix: [
      { date: '2024-01-15', open: 20, high: 21, low: 19.5, close: 20.5, volume: 0 },
      { date: '2024-01-16', open: 20.5, high: 22, low: 20, close: 21.0, volume: 0 },
    ],
    tqqq: [
      { date: '2024-01-15', open: 49, high: 51, low: 48, close: 50, volume: 30000000 },
      { date: '2024-01-16', open: 50, high: 52, low: 49, close: 51.5, volume: 32000000 },
    ],
    sqqq: [
      { date: '2024-01-15', open: 31, high: 32, low: 29.5, close: 30, volume: 20000000 },
      { date: '2024-01-16', open: 30, high: 31, low: 28.5, close: 28.5, volume: 22000000 },
    ],
  };

  const mockClient = {
    fetchCurrentData: vi.fn().mockResolvedValue(mockCurrentData),
    fetchHistoricalData: vi.fn().mockResolvedValue(mockHistoricalData),
    getVixData: vi.fn().mockResolvedValue({
      current: 20.5,
      average30d: 19.8,
      regime: 'High',
      allocationPercentage: 0.4,
      history: [19.5, 20.0, 20.5],
    }),
    isMarketOpen: vi.fn().mockReturnValue(true),
    getMetrics: vi.fn().mockReturnValue({
      cacheHits: 10,
      cacheMisses: 2,
      stooqSuccess: 8,
      stooqFailed: 0,
      yahooSuccess: 2,
      yahooFailed: 0,
      cacheHitRate: 83.3,
    }),
    clearCache: vi.fn(),
  };

  return {
    MarketDataClient: class MockMarketDataClient {
      fetchCurrentData = mockClient.fetchCurrentData;
      fetchHistoricalData = mockClient.fetchHistoricalData;
      getVixData = mockClient.getVixData;
      isMarketOpen = mockClient.isMarketOpen;
      getMetrics = mockClient.getMetrics;
      clearCache = mockClient.clearCache;
    },
    marketDataClient: mockClient,
  };
});

// Import after mocks - we'll import the route handlers
import { GET as getMarketData } from '@/app/api/market-data/route';
import { GET as getHistoricalData } from '@/app/api/historical-data/route';
import { GET as getEntryScore } from '@/app/api/entry-score/route';

describe('Market Data API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/market-data', () => {
    it('returns success response with market data', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-data');
      const response = await getMarketData(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes all required symbols', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-data');
      const response = await getMarketData(request);
      const data = await response.json();

      expect(data.marketData).toBeDefined();
      expect(data.marketData.vix).toBeDefined();
      expect(data.marketData.qqq).toBeDefined();
      expect(data.marketData.tqqq).toBeDefined();
      expect(data.marketData.sqqq).toBeDefined();
    });

    it('includes timestamp', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-data');
      const response = await getMarketData(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
    });

    it('includes market open status', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-data');
      const response = await getMarketData(request);
      const data = await response.json();

      expect(data.marketOpen).toBeDefined();
      expect(typeof data.marketOpen).toBe('boolean');
    });
  });

  describe('GET /api/historical-data', () => {
    it('returns success response with historical data', async () => {
      const request = new NextRequest('http://localhost:3000/api/historical-data');
      const response = await getHistoricalData(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes VIX historical data', async () => {
      const request = new NextRequest('http://localhost:3000/api/historical-data');
      const response = await getHistoricalData(request);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.data.vix).toBeDefined();
      expect(Array.isArray(data.data.vix)).toBe(true);
    });

    it('includes TQQQ historical data', async () => {
      const request = new NextRequest('http://localhost:3000/api/historical-data');
      const response = await getHistoricalData(request);
      const data = await response.json();

      expect(data.data.tqqq).toBeDefined();
      expect(Array.isArray(data.data.tqqq)).toBe(true);
    });

    it('includes SQQQ historical data', async () => {
      const request = new NextRequest('http://localhost:3000/api/historical-data');
      const response = await getHistoricalData(request);
      const data = await response.json();

      expect(data.data.sqqq).toBeDefined();
      expect(Array.isArray(data.data.sqqq)).toBe(true);
    });

    it('accepts days query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/historical-data?days=60');
      const response = await getHistoricalData(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('validates days parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/historical-data?days=invalid');
      const response = await getHistoricalData(request);

      // Should use default of 30 days or return validation error
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /api/entry-score', () => {
    it('returns success response with entry score', async () => {
      const request = new NextRequest('http://localhost:3000/api/entry-score');
      const response = await getEntryScore(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes entry score total', async () => {
      const request = new NextRequest('http://localhost:3000/api/entry-score');
      const response = await getEntryScore(request);
      const data = await response.json();

      expect(data.entryScore).toBeDefined();
      expect(typeof data.entryScore.total).toBe('number');
    });

    it('includes signal (ENTER/WATCH/WAIT)', async () => {
      const request = new NextRequest('http://localhost:3000/api/entry-score');
      const response = await getEntryScore(request);
      const data = await response.json();

      expect(data.entryScore.signal).toBeDefined();
      expect(['ENTER', 'WATCH', 'WAIT']).toContain(data.entryScore.signal);
    });

    it('includes volatility regime', async () => {
      const request = new NextRequest('http://localhost:3000/api/entry-score');
      const response = await getEntryScore(request);
      const data = await response.json();

      expect(data.entryScore.volatilityRegime).toBeDefined();
    });

    it('includes all score components', async () => {
      const request = new NextRequest('http://localhost:3000/api/entry-score');
      const response = await getEntryScore(request);
      const data = await response.json();

      expect(data.entryScore.volatilityScore).toBeDefined();
      expect(data.entryScore.trendScore).toBeDefined();
      expect(data.entryScore.decayScore).toBeDefined();
    });
  });
});

describe('API Response Format', () => {
  it('market-data response matches expected schema', async () => {
    const request = new NextRequest('http://localhost:3000/api/market-data');
    const response = await getMarketData(request);
    const data = await response.json();

    // Check response structure
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('marketData');
    expect(data).toHaveProperty('marketOpen');
  });

  it('historical-data response matches expected schema', async () => {
    const request = new NextRequest('http://localhost:3000/api/historical-data');
    const response = await getHistoricalData(request);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
  });

  it('entry-score response matches expected schema', async () => {
    const request = new NextRequest('http://localhost:3000/api/entry-score');
    const response = await getEntryScore(request);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('entryScore');
  });
});
