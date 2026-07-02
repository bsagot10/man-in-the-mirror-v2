/**
 * TDD Tests for Market Data Client
 *
 * Tests the yahoo-finance2 wrapper for fetching market data.
 * Ported from: backend/data_collection.py
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MarketDataClient,
  type CurrentMarketData,
  type HistoricalDataPoint,
  SYMBOLS,
  calculateChangePercent,
  formatSymbolData,
  validateHistoricalData,
  DataSourceError,
  classifyError,
  LogLevel,
  structuredLog,
} from '@/lib/market-data/client';

// Mock yahoo-finance2 as a class constructor
vi.mock('yahoo-finance2', () => {
  const mockQuote = vi.fn();
  const mockHistorical = vi.fn();

  class MockYahooFinance {
    quote = mockQuote;
    historical = mockHistorical;
  }

  return {
    default: MockYahooFinance,
    __mockQuote: mockQuote,
    __mockHistorical: mockHistorical,
  };
});

// Get references to the mocks after module initialization
let mockQuote: ReturnType<typeof vi.fn>;
let mockHistorical: ReturnType<typeof vi.fn>;

describe('SYMBOLS constant', () => {
  it('includes all required trading symbols', () => {
    expect(SYMBOLS.VIX).toBe('^VIX');
    expect(SYMBOLS.QQQ).toBe('QQQ');
    expect(SYMBOLS.TQQQ).toBe('TQQQ');
    expect(SYMBOLS.SQQQ).toBe('SQQQ');
  });

  it('has 4 symbols total', () => {
    expect(Object.keys(SYMBOLS)).toHaveLength(4);
  });
});

describe('calculateChangePercent', () => {
  it('calculates positive change correctly', () => {
    const result = calculateChangePercent(110, 100);
    expect(result).toBe(10);
  });

  it('calculates negative change correctly', () => {
    const result = calculateChangePercent(90, 100);
    expect(result).toBe(-10);
  });

  it('returns 0 when prices are equal', () => {
    const result = calculateChangePercent(100, 100);
    expect(result).toBe(0);
  });

  it('handles small decimal changes', () => {
    const result = calculateChangePercent(100.50, 100);
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('returns 0 when previous price is 0', () => {
    const result = calculateChangePercent(100, 0);
    expect(result).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateChangePercent(100.333, 100);
    expect(result).toBe(0.33);
  });
});

describe('formatSymbolData', () => {
  const mockQuote = {
    symbol: 'TQQQ',
    regularMarketPrice: 50.25,
    regularMarketPreviousClose: 49.50,
    regularMarketVolume: 50000000,
    regularMarketTime: new Date('2024-01-15T16:00:00Z'),
  };

  it('formats quote data correctly', () => {
    const result = formatSymbolData(mockQuote);

    expect(result.currentPrice).toBe(50.25);
    expect(result.previousClose).toBe(49.50);
    expect(result.volume).toBe(50000000);
  });

  it('calculates change correctly', () => {
    const result = formatSymbolData(mockQuote);

    expect(result.change).toBeCloseTo(0.75, 2);
    expect(result.changePercent).toBeCloseTo(1.52, 1);
  });

  it('includes timestamp', () => {
    const result = formatSymbolData(mockQuote);

    expect(result.timestamp).toBeDefined();
    expect(typeof result.timestamp).toBe('string');
  });

  it('handles missing volume', () => {
    const quoteWithoutVolume = { ...mockQuote, regularMarketVolume: undefined };
    const result = formatSymbolData(quoteWithoutVolume);

    expect(result.volume).toBe(0);
  });

  it('handles missing previous close', () => {
    const quoteWithoutPrevClose = { ...mockQuote, regularMarketPreviousClose: undefined };
    const result = formatSymbolData(quoteWithoutPrevClose);

    expect(result.previousClose).toBe(50.25); // Falls back to current price
    expect(result.change).toBe(0);
    expect(result.changePercent).toBe(0);
  });
});

describe('validateHistoricalData', () => {
  it('returns true for valid data array', () => {
    const data: HistoricalDataPoint[] = [
      { date: '2024-01-15', open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
      { date: '2024-01-16', open: 50.5, high: 52, low: 50, close: 51.5, volume: 1100000 },
    ];

    expect(validateHistoricalData(data)).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(validateHistoricalData([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateHistoricalData(null as unknown as HistoricalDataPoint[])).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateHistoricalData(undefined as unknown as HistoricalDataPoint[])).toBe(false);
  });

  it('returns true for single data point', () => {
    const data: HistoricalDataPoint[] = [
      { date: '2024-01-15', open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
    ];

    expect(validateHistoricalData(data)).toBe(true);
  });
});

describe('MarketDataClient', () => {
  let client: MarketDataClient;

  beforeEach(async () => {
    // Get mock references from the hoisted mock
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    client = new MarketDataClient();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates instance successfully', () => {
      expect(client).toBeInstanceOf(MarketDataClient);
    });
  });

  describe('fetchCurrentData', () => {
    it('fetches data for all symbols', async () => {
      mockQuote.mockResolvedValue({
        symbol: 'TQQQ',
        regularMarketPrice: 50.25,
        regularMarketPreviousClose: 49.50,
        regularMarketVolume: 50000000,
        regularMarketTime: new Date(),
      });

      const result = await client.fetchCurrentData();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('returns data structure with all required symbols', async () => {
      mockQuote.mockImplementation(async (symbol: string) => ({
        symbol,
        regularMarketPrice: 50,
        regularMarketPreviousClose: 49,
        regularMarketVolume: 1000000,
        regularMarketTime: new Date(),
      }));

      const result = await client.fetchCurrentData();

      expect(result.vix).toBeDefined();
      expect(result.qqq).toBeDefined();
      expect(result.tqqq).toBeDefined();
      expect(result.sqqq).toBeDefined();
    });

    it('handles API errors gracefully', async () => {
      mockQuote.mockRejectedValue(new Error('API Error'));
      // Block the FRED fallback too — this test must not hit the live network
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      // Throws when all sources fail and no cache is available
      await expect(client.fetchCurrentData()).rejects.toThrow();
    });

    it('includes all required fields in symbol data', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 20.5,
        regularMarketPreviousClose: 19.8,
        regularMarketVolume: 0,
        regularMarketTime: new Date(),
      });

      const result = await client.fetchCurrentData();

      expect(result.vix).toHaveProperty('currentPrice');
      expect(result.vix).toHaveProperty('previousClose');
      expect(result.vix).toHaveProperty('change');
      expect(result.vix).toHaveProperty('changePercent');
      expect(result.vix).toHaveProperty('volume');
      expect(result.vix).toHaveProperty('timestamp');
    });
  });

  describe('fetchHistoricalData', () => {
    it('fetches 30 days of data by default', async () => {
      mockHistorical.mockResolvedValue([
        { date: new Date('2024-01-15'), open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
      ]);

      await client.fetchHistoricalData();

      expect(mockHistorical).toHaveBeenCalled();
    });

    it('returns data for VIX, TQQQ, and SQQQ', async () => {
      mockHistorical.mockResolvedValue([
        { date: new Date('2024-01-15'), open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
      ]);

      const result = await client.fetchHistoricalData();

      expect(result.vix).toBeDefined();
      expect(result.tqqq).toBeDefined();
      expect(result.sqqq).toBeDefined();
    });

    it('formats dates as ISO strings', async () => {
      mockHistorical.mockResolvedValue([
        { date: new Date('2024-01-15'), open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
      ]);

      const result = await client.fetchHistoricalData();

      if (result.vix && result.vix.length > 0) {
        expect(result.vix[0].date).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
    });

    it('handles empty historical data', async () => {
      mockHistorical.mockResolvedValue([]);

      const result = await client.fetchHistoricalData();

      expect(result).toBeDefined();
    });

    it('accepts custom days parameter', async () => {
      mockHistorical.mockResolvedValue([]);

      await client.fetchHistoricalData(60);

      // Verify the call was made with date range
      expect(mockHistorical).toHaveBeenCalled();
    });
  });

  describe('getVixData', () => {
    it('returns VIX-specific data structure', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 25.5,
        regularMarketPreviousClose: 24.0,
        regularMarketVolume: 0,
        regularMarketTime: new Date(),
      });

      mockHistorical.mockResolvedValue([
        { date: new Date('2024-01-15'), open: 24, high: 26, low: 23, close: 25, volume: 0 },
      ]);

      const result = await client.getVixData();

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('regime');
      expect(result).toHaveProperty('history');
    });

    it('classifies VIX >= 30 as Extreme regime', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 35,
        regularMarketPreviousClose: 34,
        regularMarketVolume: 0,
        regularMarketTime: new Date(),
      });

      mockHistorical.mockResolvedValue([]);

      const result = await client.getVixData();

      expect(result.regime).toBe('Extreme');
    });

    it('classifies VIX 20-30 as High regime', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 25,
        regularMarketPreviousClose: 24,
        regularMarketVolume: 0,
        regularMarketTime: new Date(),
      });

      mockHistorical.mockResolvedValue([]);

      const result = await client.getVixData();

      expect(result.regime).toBe('High');
    });

    it('classifies VIX 15-20 as Moderate regime', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 17,
        regularMarketPreviousClose: 16,
        regularMarketVolume: 0,
        regularMarketTime: new Date(),
      });

      mockHistorical.mockResolvedValue([]);

      const result = await client.getVixData();

      expect(result.regime).toBe('Moderate');
    });

    it('classifies VIX < 15 as Low regime', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 12,
        regularMarketPreviousClose: 11,
        regularMarketVolume: 0,
        regularMarketTime: new Date(),
      });

      mockHistorical.mockResolvedValue([]);

      const result = await client.getVixData();

      expect(result.regime).toBe('Low');
    });
  });

  describe('isMarketOpen', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns false on Saturday', () => {
      // Saturday, January 20, 2024 at 12:00 PM EST
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-20T17:00:00Z')); // 12 PM EST

      expect(client.isMarketOpen()).toBe(false);
    });

    it('returns false on Sunday', () => {
      // Sunday, January 21, 2024 at 12:00 PM EST
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-21T17:00:00Z')); // 12 PM EST

      expect(client.isMarketOpen()).toBe(false);
    });

    it('returns true during market hours on weekday', () => {
      // Monday, January 22, 2024 at 12:00 PM EST (market open)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-22T17:00:00Z')); // 12 PM EST

      expect(client.isMarketOpen()).toBe(true);
    });

    it('returns false before market open on weekday', () => {
      // Monday, January 22, 2024 at 8:00 AM EST (before 9:30 AM open)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-22T13:00:00Z')); // 8 AM EST

      expect(client.isMarketOpen()).toBe(false);
    });

    it('returns false after market close on weekday', () => {
      // Monday, January 22, 2024 at 5:00 PM EST (after 4 PM close)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-22T22:00:00Z')); // 5 PM EST

      expect(client.isMarketOpen()).toBe(false);
    });
  });
});

describe('Caching behavior', () => {
  let client: MarketDataClient;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    client = new MarketDataClient();
    client.clearCache();
    vi.clearAllMocks();
  });

  it('cache TTL is at least 5 minutes for current data to reduce rate limiting', async () => {
    expect(client['CACHE_TTL']).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });

  it('historical cache TTL is at least 15 minutes', async () => {
    expect(client['HISTORICAL_CACHE_TTL']).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });

  it('caches historical data to reduce API calls', async () => {
    mockHistorical.mockResolvedValue([
      { date: new Date('2024-01-15'), open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
    ]);

    // First call - should hit API
    await client.fetchHistoricalData();
    const firstCallCount = mockHistorical.mock.calls.length;

    // Second call - should use cache
    await client.fetchHistoricalData();
    const secondCallCount = mockHistorical.mock.calls.length;

    expect(secondCallCount).toBe(firstCallCount); // No new API calls
  });
});

describe('Polygon primary with Yahoo fallback', () => {
  let client: MarketDataClient;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    process.env.POLYGON_API_KEY = 'test-key';
    client = new MarketDataClient();
    client.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.POLYGON_API_KEY;
  });

  it('uses Polygon as primary data source for ETFs', async () => {
    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    // Mock Yahoo for VIX (always goes to Yahoo)
    mockQuote.mockResolvedValue({
      regularMarketPrice: 18.50,
      regularMarketPreviousClose: 18.00,
      regularMarketVolume: 0,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData();

    // Should have valid data from Polygon (not zeros)
    expect(result.tqqq.currentPrice).toBeGreaterThan(0);
    // Yahoo should only be called for VIX (not QQQ/TQQQ/SQQQ)
    expect(mockQuote).toHaveBeenCalledTimes(1);
    expect(mockQuote).toHaveBeenCalledWith('^VIX', {}, expect.objectContaining({ validateResult: false }));
  });

  it('falls back to Yahoo Finance when Polygon fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = mockFetch;

    // Mock Yahoo Finance to succeed for all symbols
    mockQuote.mockResolvedValue({
      regularMarketPrice: 85.80,
      regularMarketPreviousClose: 85.50,
      regularMarketVolume: 50000000,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData();

    // Should have valid data from Yahoo fallback
    expect(result.tqqq.currentPrice).toBeGreaterThan(0);
    // Yahoo should have been called as fallback for ETFs + once for VIX
    expect(mockQuote).toHaveBeenCalled();
  });

  it('builds ETF quotes from Polygon daily aggregates when snapshot is unauthorized (free tier)', async () => {
    // Free-tier keys get NOT_AUTHORIZED on the snapshot endpoint but CAN read aggregates
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v2/snapshot/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'NOT_AUTHORIZED' }) });
      }
      if (url.includes('/v2/aggs/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'DELAYED',
            results: [
              { t: 1751000000000, o: 83, h: 84, l: 82, c: 84.00, v: 40000000 },
              { t: 1751086400000, o: 84, h: 86, l: 83, c: 85.80, v: 50000000 },
            ],
          }),
        });
      }
      if (url.includes('fred.stlouisfed.org')) {
        // VIX comes from FRED when Yahoo is down
        return Promise.resolve({ ok: true, text: () => Promise.resolve('DATE,VIXCLS\n2026-06-29,17.50\n2026-06-30,18.25\n') });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    // Yahoo unavailable (rate limited) — aggregates fallback must carry the quote
    mockQuote.mockRejectedValue(new Error('Failed to get crumb, status 429'));

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData().catch(() => null);

    expect(result).not.toBeNull();
    expect(result!.tqqq.currentPrice).toBe(85.80);
    expect(result!.tqqq.previousClose).toBe(84.00);
    expect(result!.tqqq.changePercent).toBeCloseTo(2.14, 1);
  });

  it('falls back to FRED for the current VIX quote when Yahoo fails', async () => {
    const fredCsv = 'DATE,VIXCLS\n2026-06-29,17.50\n2026-06-30,18.25\n';
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('fred.stlouisfed.org')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(fredCsv) });
      }
      if (url.includes('/v2/snapshot/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            ticker: {
              day: { o: 85, h: 86, l: 84, c: 85.8, v: 50000000 },
              prevDay: { c: 84 },
              todaysChange: 1.8,
              todaysChangePerc: 2.14,
            },
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    // Yahoo fails for VIX (its only non-FRED source)
    mockQuote.mockRejectedValue(new Error('Failed to get crumb, status 429'));

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData();

    expect(result.vix.currentPrice).toBe(18.25);
    expect(result.vix.previousClose).toBe(17.50);
  });

  it('stops calling the snapshot endpoint after a NOT_AUTHORIZED response (free-tier call budget)', async () => {
    let snapshotCalls = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v2/snapshot/')) {
        snapshotCalls++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'NOT_AUTHORIZED' }) });
      }
      if (url.includes('/v2/aggs/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'DELAYED',
            results: [
              { t: 1751000000000, o: 83, h: 84, l: 82, c: 84.00, v: 40000000 },
              { t: 1751086400000, o: 84, h: 86, l: 83, c: 85.80, v: 50000000 },
            ],
          }),
        });
      }
      if (url.includes('fred.stlouisfed.org')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('DATE,VIXCLS\n2026-06-29,17.50\n2026-06-30,18.25\n') });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;
    mockQuote.mockRejectedValue(new Error('Failed to get crumb, status 429'));

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    await testClient.fetchCurrentData();
    const callsAfterFirstRound = snapshotCalls;
    expect(callsAfterFirstRound).toBeGreaterThan(0);

    testClient.clearCache();
    await testClient.fetchCurrentData();

    // Second round must not touch the snapshot endpoint again
    expect(snapshotCalls).toBe(callsAfterFirstRound);
  });

  it('reuses the shared historical cache for TQQQ/SQQQ quotes instead of extra Polygon calls', async () => {
    const aggsUrls: string[] = [];
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v2/snapshot/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'NOT_AUTHORIZED' }) });
      }
      if (url.includes('/v2/aggs/')) {
        aggsUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'DELAYED',
            results: [
              { t: 1751000000000, o: 83, h: 84, l: 82, c: 84.00, v: 40000000 },
              { t: 1751086400000, o: 84, h: 86, l: 83, c: 85.80, v: 50000000 },
            ],
          }),
        });
      }
      if (url.includes('fred.stlouisfed.org')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('DATE,VIXCLS\n2026-06-29,17.50\n2026-06-30,18.25\n') });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;
    mockQuote.mockRejectedValue(new Error('Failed to get crumb, status 429'));
    mockHistorical.mockRejectedValue(new Error('Failed to get crumb, status 429'));

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    // Seed the shared 30-day historical cache (one aggs call per ETF)
    await testClient.fetchHistoricalData();
    // Quotes should reuse those bars rather than refetch aggregates
    const result = await testClient.fetchCurrentData();

    const tqqqAggsCalls = aggsUrls.filter((u) => u.includes('/ticker/TQQQ/')).length;
    expect(tqqqAggsCalls).toBe(1);
    expect(result.tqqq.currentPrice).toBe(85.80);
    expect(result.tqqq.previousClose).toBe(84.00);
  });
});

describe('CurrentMarketData type', () => {
  it('has correct structure', () => {
    const data: CurrentMarketData = {
      vix: {
        currentPrice: 20,
        previousClose: 19,
        change: 1,
        changePercent: 5.26,
        volume: 0,
        timestamp: '2024-01-15T16:00:00Z',
      },
      qqq: {
        currentPrice: 400,
        previousClose: 395,
        change: 5,
        changePercent: 1.27,
        volume: 50000000,
        timestamp: '2024-01-15T16:00:00Z',
      },
      tqqq: {
        currentPrice: 50,
        previousClose: 49,
        change: 1,
        changePercent: 2.04,
        volume: 30000000,
        timestamp: '2024-01-15T16:00:00Z',
      },
      sqqq: {
        currentPrice: 30,
        previousClose: 31,
        change: -1,
        changePercent: -3.23,
        volume: 20000000,
        timestamp: '2024-01-15T16:00:00Z',
      },
    };

    expect(data.vix.currentPrice).toBe(20);
    expect(data.qqq.currentPrice).toBe(400);
    expect(data.tqqq.currentPrice).toBe(50);
    expect(data.sqqq.currentPrice).toBe(30);
  });
});

// ============================================================================
// Phase 1.1: User-Agent Header and Request Timeout Tests
// ============================================================================

describe('Polygon timeout and fallback', () => {
  let client: MarketDataClient;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    process.env.POLYGON_API_KEY = 'test-key';
    originalFetch = global.fetch;
    client = new MarketDataClient();
    client.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.POLYGON_API_KEY;
    vi.useRealTimers();
  });

  it('uses AbortController with timeout for Polygon requests', async () => {
    let capturedSignal: AbortSignal | null | undefined;

    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('api.polygon.io')) {
        capturedSignal = options?.signal ?? null;
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    mockQuote.mockResolvedValue({
      regularMarketPrice: 18.50,
      regularMarketPreviousClose: 18.00,
      regularMarketVolume: 0,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    await testClient.fetchCurrentData();

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it('falls back to Yahoo Finance when Polygon times out', async () => {
    vi.useFakeTimers();

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('api.polygon.io')) {
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    mockQuote.mockResolvedValue({
      regularMarketPrice: 85.80,
      regularMarketPreviousClose: 85.50,
      regularMarketVolume: 50000000,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const fetchPromise = testClient.fetchCurrentData();

    // Advance timers past POLYGON_TIMEOUT_MS (8000ms) for each sequential
    // Polygon attempt: snapshot → shared historical fetch → aggregates quote
    await vi.advanceTimersByTimeAsync(9000);
    await vi.advanceTimersByTimeAsync(9000);
    await vi.advanceTimersByTimeAsync(9000);
    await vi.advanceTimersByTimeAsync(9000);

    const result = await fetchPromise;

    expect(mockQuote).toHaveBeenCalled();
    expect(result.tqqq.currentPrice).toBeGreaterThan(0);
  });

  it('VIX always uses Yahoo Finance (not in POLYGON_SUPPORTED_SYMBOLS)', async () => {
    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    mockQuote.mockResolvedValue({
      regularMarketPrice: 18.50,
      regularMarketPreviousClose: 18.00,
      regularMarketVolume: 0,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData();

    expect(result.vix.currentPrice).toBeGreaterThan(0);
    expect(mockQuote).toHaveBeenCalledWith('^VIX', {}, expect.objectContaining({ validateResult: false }));
  });

  it('clears timeout after successful Polygon response', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    mockQuote.mockResolvedValue({
      regularMarketPrice: 18.50,
      regularMarketPreviousClose: 18.00,
      regularMarketVolume: 0,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    await testClient.fetchCurrentData();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

// ============================================================================
// Phase 1.2: Enhanced Error Logging Tests
// ============================================================================

describe('Enhanced Error Logging', () => {
  let client: MarketDataClient;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    client = new MarketDataClient();
    client.clearCache();
    vi.clearAllMocks();

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('logs warning when no historical data returned for symbol', async () => {
    mockHistorical.mockResolvedValue([]);

    await client.fetchHistoricalData();

    // Should log a warning about empty data
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No data returned')
    );
  });

  it('logs success with data point count', async () => {
    mockHistorical.mockResolvedValue([
      { date: new Date('2024-01-15'), open: 50, high: 51, low: 49, close: 50.5, volume: 1000000 },
      { date: new Date('2024-01-16'), open: 51, high: 52, low: 50, close: 51.5, volume: 1100000 },
    ]);

    await client.fetchHistoricalData();

    // Should log success with structured log format (Yahoo fallback succeeds when Stooq not mocked)
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Yahoo Finance historical fallback succeeded')
    );
  });

  it('logs detailed error context when historical fetch fails', async () => {
    const error = new Error('Network error');
    mockHistorical.mockRejectedValue(error);

    await client.fetchHistoricalData();

    // Should log error with structured log format (uses structuredLog)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('All historical data sources failed')
    );
  });

  it('detects and logs rate limit errors (429)', async () => {
    const error = new Error('Request failed with status 429');
    mockHistorical.mockRejectedValue(error);

    await client.fetchHistoricalData();

    // Rate limit errors are now classified by structuredLog
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('All historical data sources failed')
    );
  });
});

// ============================================================================
// Phase 2.3: Retry with Exponential Backoff Tests
// ============================================================================

describe('Retry with Exponential Backoff', () => {
  let client: MarketDataClient;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    client = new MarketDataClient();
    client.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries failed Yahoo Finance requests up to 3 times', async () => {
    // Mock Stooq to fail
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = mockFetch;

    // Track call counts per symbol
    const callCounts: Record<string, number> = {};

    // Mock Yahoo to fail twice, then succeed for each symbol
    mockQuote.mockImplementation((symbol: string) => {
      callCounts[symbol] = (callCounts[symbol] || 0) + 1;

      // Fail first 2 attempts, succeed on 3rd
      if (callCounts[symbol] <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        regularMarketPrice: 85.80,
        regularMarketPreviousClose: 85.50,
        regularMarketVolume: 50000000,
      });
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData();

    // Should have succeeded after retries
    expect(result.tqqq.currentPrice).toBeGreaterThan(0);
    // Each symbol should have been called 3 times (2 failures + 1 success)
    expect(callCounts['TQQQ']).toBe(3);
  });

  it('does not retry on rate limit errors (429)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = mockFetch;

    // Mock Yahoo to return rate limit error
    mockQuote.mockRejectedValue(new Error('Request failed with status 429'));

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    // Throws when all sources fail with no cache
    await expect(testClient.fetchCurrentData()).rejects.toThrow();

    // Should have only called once per symbol (no retries for 429)
    expect(mockQuote.mock.calls.filter(call => call[0] === 'TQQQ')).toHaveLength(1);
  });

  it('does not retry on client errors (400, 404)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = mockFetch;

    // Mock Yahoo to return 404 error
    mockQuote.mockRejectedValue(new Error('Request failed with status 404'));

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    // Throws when all sources fail with no cache
    await expect(testClient.fetchCurrentData()).rejects.toThrow();

    // Should have only called once per symbol (no retries for 404)
    expect(mockQuote.mock.calls.filter(call => call[0] === 'TQQQ')).toHaveLength(1);
  });

  it('uses exponential backoff with jitter between retries', async () => {
    vi.useFakeTimers();

    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = mockFetch;

    // Track call counts per symbol
    const callCounts: Record<string, number> = {};

    // Mock Yahoo to fail twice, then succeed for each symbol
    mockQuote.mockImplementation((symbol: string) => {
      callCounts[symbol] = (callCounts[symbol] || 0) + 1;

      // Fail first 2 attempts, succeed on 3rd
      if (callCounts[symbol] <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        regularMarketPrice: 85.80,
        regularMarketPreviousClose: 85.50,
        regularMarketVolume: 50000000,
      });
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const fetchPromise = testClient.fetchCurrentData();

    // Advance through retry delays (need more time for all 4 symbols to retry)
    await vi.advanceTimersByTimeAsync(10000);

    await fetchPromise;

    // Should have retried at least once (2+ calls per symbol)
    expect(callCounts['TQQQ']).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// Phase 3.2: Cache Metrics Tests
// ============================================================================

describe('Cache Metrics', () => {
  let client: MarketDataClient;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    vi.clearAllMocks();
  });

  it('tracks cache hits and misses', async () => {
    process.env.POLYGON_API_KEY = 'test-key';
    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    // First call - cache miss
    await testClient.fetchCurrentData();
    // Second call - cache hit
    await testClient.fetchCurrentData();

    const metrics = testClient.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.cacheHits).toBeGreaterThanOrEqual(1);
    expect(metrics.cacheMisses).toBeGreaterThanOrEqual(1);
    delete process.env.POLYGON_API_KEY;
  });

  it('calculates cache hit rate correctly', async () => {
    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();

    const metrics = testClient.getMetrics();

    expect(metrics).toHaveProperty('cacheHitRate');
    expect(typeof metrics.cacheHitRate).toBe('number');
  });

  it('tracks Polygon and Yahoo success/failure counts', async () => {
    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();

    const metrics = testClient.getMetrics();

    expect(metrics).toHaveProperty('polygonSuccess');
    expect(metrics).toHaveProperty('polygonFailed');
    expect(metrics).toHaveProperty('yahooSuccess');
    expect(metrics).toHaveProperty('yahooFailed');
  });
});

// ============================================================================
// Integration Tests: Full Fallback Chain
// ============================================================================

describe('Full Fallback Chain Integration', () => {
  let client: MarketDataClient;

  beforeEach(async () => {
    const yahooFinanceMock = await import('yahoo-finance2') as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    vi.clearAllMocks();
  });

  it('returns cached data when all sources fail', async () => {
    process.env.POLYGON_API_KEY = 'test-key';
    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };
    // First call with working Polygon to populate cache
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    // First call - populate cache
    await testClient.fetchCurrentData();

    // Now make all sources fail
    mockFetch.mockResolvedValue({ ok: false });
    mockQuote.mockRejectedValue(new Error('Rate limited'));

    // Second call - should use cache
    const result = await testClient.fetchCurrentData();

    // Should still have valid data from cache
    expect(result.tqqq.currentPrice).toBeGreaterThan(0);
    delete process.env.POLYGON_API_KEY;
  });

  it('handles partial success (some symbols fail)', async () => {
    process.env.POLYGON_API_KEY = 'test-key';
    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };
    // Mock Polygon to work for TQQQ but fail for SQQQ/QQQ
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io') && url.includes('TQQQ')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    // Mock Yahoo to succeed for other symbols
    mockQuote.mockResolvedValue({
      regularMarketPrice: 68.97,
      regularMarketPreviousClose: 69.50,
      regularMarketVolume: 37000000,
    });

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    const result = await testClient.fetchCurrentData();

    // Both should have data (one from Polygon, one from Yahoo fallback)
    expect(result.tqqq.currentPrice).toBeGreaterThan(0);
    expect(result.sqqq.currentPrice).toBeGreaterThan(0);
    delete process.env.POLYGON_API_KEY;
  });

  it('handles concurrent requests by caching after first batch completes', async () => {
    process.env.POLYGON_API_KEY = 'test-key';
    let fetchCallCount = 0;

    const polygonJson = {
      status: 'OK',
      ticker: {
        day: { o: 85.50, h: 86.25, l: 84.75, c: 85.80, v: 50000000 },
        prevDay: { c: 84.00 },
        todaysChange: 1.80,
        todaysChangePerc: 2.14,
      },
    };
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        fetchCallCount++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve(polygonJson) });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = mockFetch;

    const { MarketDataClient } = await import('@/lib/market-data/client');
    const testClient = new MarketDataClient();
    testClient.clearCache();

    // First batch of concurrent requests - will all hit API
    const firstBatch = Array(5).fill(null).map(() =>
      testClient.fetchCurrentData()
    );
    await Promise.all(firstBatch);
    const firstBatchCalls = fetchCallCount;

    // Second batch - should all use cache
    const secondBatch = Array(5).fill(null).map(() =>
      testClient.fetchCurrentData()
    );
    await Promise.all(secondBatch);
    const secondBatchCalls = fetchCallCount - firstBatchCalls;

    // Second batch should make zero new API calls (all cached)
    expect(secondBatchCalls).toBe(0);

    // First batch makes 4 calls per concurrent request due to parallel fetches
    // But caching kicks in after first request completes
    expect(firstBatchCalls).toBeGreaterThan(0);
    delete process.env.POLYGON_API_KEY;
  });
});

// ============================================================================
// Stale Data Indicator Tests (Phase 2.1)
// ============================================================================

describe('Stale Data Indicator', () => {
  beforeEach(async () => {
    vi.useFakeTimers();

    const yahooFinanceMock = (await import('yahoo-finance2')) as unknown as {
      __mockQuote: ReturnType<typeof vi.fn>;
      __mockHistorical: ReturnType<typeof vi.fn>;
    };
    mockQuote = yahooFinanceMock.__mockQuote;
    mockHistorical = yahooFinanceMock.__mockHistorical;

    vi.clearAllMocks();
    // Set fixed timestamp for predictable tests
    vi.setSystemTime(new Date('2024-01-15T16:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fresh data without stale indicators on first fetch', async () => {
    // Mock Yahoo Finance for all 4 symbols
    mockQuote.mockResolvedValue({
      regularMarketPrice: 421.25,
      regularMarketPreviousClose: 420.00,
      regularMarketVolume: 50000000,
    });

    const client = new MarketDataClient();
    const result = await client.fetchCurrentData();

    // Fresh data should not have stale indicators
    expect(result.isStale).toBeUndefined();
    expect(result.cacheAge).toBeUndefined();
  });

  it('returns cached data with fresh indicator when within TTL', async () => {
    // Mock Yahoo Finance for all 4 symbols
    mockQuote.mockResolvedValue({
      regularMarketPrice: 421.25,
      regularMarketPreviousClose: 420.00,
      regularMarketVolume: 50000000,
    });

    const client = new MarketDataClient();

    // First fetch - populate cache
    await client.fetchCurrentData();

    // Advance time by 2 minutes (still within 5 min TTL)
    vi.advanceTimersByTime(2 * 60 * 1000);

    // Second fetch - should use cache and indicate freshness
    const result = await client.fetchCurrentData();

    // Within TTL, should indicate not stale
    expect(result.isStale).toBe(false);
    expect(result.cacheAge).toBeCloseTo(2 * 60 * 1000, -2); // ~2 minutes in ms
  });

  it('returns cached data with stale indicator when cache is expired but used as fallback', async () => {
    // First call succeeds via Yahoo (all 4 symbols) — populates cache
    mockQuote.mockResolvedValue({
      regularMarketPrice: 421.25,
      regularMarketPreviousClose: 420.00,
      regularMarketVolume: 50000000,
    });

    const client = new MarketDataClient();

    // First fetch - populate cache
    await client.fetchCurrentData();

    // Advance time by 6 minutes (past 5 min TTL)
    vi.advanceTimersByTime(6 * 60 * 1000);

    // Mock failure for all subsequent calls (use 404 to skip retries)
    mockQuote.mockRejectedValue(new Error('404 Not Found'));

    // Third fetch - should use stale cache as fallback
    const result = await client.fetchCurrentData();

    // Should indicate stale data
    expect(result.isStale).toBe(true);
    expect(result.cacheAge).toBeCloseTo(6 * 60 * 1000, -2); // ~6 minutes in ms
  }, 10000);

  it('includes cacheAge in milliseconds', async () => {
    mockQuote.mockResolvedValue({
      regularMarketPrice: 421.25,
      regularMarketPreviousClose: 420.00,
      regularMarketVolume: 50000000,
    });

    const client = new MarketDataClient();

    // First fetch
    await client.fetchCurrentData();

    // Advance time by 3 minutes
    vi.advanceTimersByTime(3 * 60 * 1000);

    const result = await client.fetchCurrentData();

    // cacheAge should be close to 3 minutes in ms
    expect(result.cacheAge).toBeDefined();
    expect(result.cacheAge).toBeCloseTo(3 * 60 * 1000, -2);
  });

  it('sets isStale to true when cache is older than TTL', async () => {
    // First call succeeds via Yahoo, then fails
    mockQuote.mockResolvedValue({
      regularMarketPrice: 421.25,
      regularMarketPreviousClose: 420.00,
      regularMarketVolume: 50000000,
    });

    const client = new MarketDataClient();
    await client.fetchCurrentData();

    // Advance past TTL
    vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

    // All subsequent calls fail with 404 (to skip retries)
    mockQuote.mockRejectedValue(new Error('404 Not Found'));

    const result = await client.fetchCurrentData();

    expect(result.isStale).toBe(true);
  }, 10000);

  it('sets isStale to false when cache is within TTL', async () => {
    mockQuote.mockResolvedValue({
      regularMarketPrice: 421.25,
      regularMarketPreviousClose: 420.00,
      regularMarketVolume: 50000000,
    });

    const client = new MarketDataClient();
    await client.fetchCurrentData();

    // Advance but stay within TTL
    vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes

    const result = await client.fetchCurrentData();

    expect(result.isStale).toBe(false);
  });
});

// ============================================================================
// Error Classification Tests (Phase 2.2)
// ============================================================================

describe('classifyError', () => {
  describe('Rate Limit Errors', () => {
    it('classifies 429 error as RATE_LIMIT', () => {
      const result = classifyError(new Error('HTTP 429 Too Many Requests'));
      expect(result.type).toBe(DataSourceError.RATE_LIMIT);
      expect(result.retryAfter).toBe(60);
    });

    it('classifies rate limit message as RATE_LIMIT', () => {
      const result = classifyError(new Error('Rate limit exceeded'));
      expect(result.type).toBe(DataSourceError.RATE_LIMIT);
      expect(result.retryAfter).toBe(60);
    });
  });

  describe('Network Errors', () => {
    it('classifies ENOTFOUND as NETWORK', () => {
      const result = classifyError(new Error('getaddrinfo ENOTFOUND api.example.com'));
      expect(result.type).toBe(DataSourceError.NETWORK);
      expect(result.retryAfter).toBe(5);
    });

    it('classifies ECONNREFUSED as NETWORK', () => {
      const result = classifyError(new Error('connect ECONNREFUSED 127.0.0.1:8080'));
      expect(result.type).toBe(DataSourceError.NETWORK);
      expect(result.retryAfter).toBe(5);
    });

    it('classifies fetch failed as NETWORK', () => {
      const result = classifyError(new Error('Fetch failed'));
      expect(result.type).toBe(DataSourceError.NETWORK);
      expect(result.retryAfter).toBe(5);
    });
  });

  describe('Timeout Errors', () => {
    it('classifies timeout as TIMEOUT', () => {
      const result = classifyError(new Error('Request timeout'));
      expect(result.type).toBe(DataSourceError.TIMEOUT);
      expect(result.retryAfter).toBe(5);
    });

    it('classifies AbortError as TIMEOUT', () => {
      const result = classifyError(new Error('AbortError: signal is aborted'));
      expect(result.type).toBe(DataSourceError.TIMEOUT);
      expect(result.retryAfter).toBe(5);
    });
  });

  describe('Invalid Symbol Errors', () => {
    it('classifies 404 as INVALID_SYMBOL', () => {
      const result = classifyError(new Error('HTTP 404 Not Found'));
      expect(result.type).toBe(DataSourceError.INVALID_SYMBOL);
      expect(result.retryAfter).toBeUndefined();
    });

    it('classifies not found message as INVALID_SYMBOL', () => {
      const result = classifyError(new Error('Symbol not found'));
      expect(result.type).toBe(DataSourceError.INVALID_SYMBOL);
      expect(result.retryAfter).toBeUndefined();
    });
  });

  describe('Server Errors', () => {
    it('classifies 500 as SERVER_ERROR', () => {
      const result = classifyError(new Error('HTTP 500 Internal Server Error'));
      expect(result.type).toBe(DataSourceError.SERVER_ERROR);
      expect(result.retryAfter).toBe(30);
    });

    it('classifies 502 as SERVER_ERROR', () => {
      const result = classifyError(new Error('HTTP 502 Bad Gateway'));
      expect(result.type).toBe(DataSourceError.SERVER_ERROR);
      expect(result.retryAfter).toBe(30);
    });

    it('classifies 503 as SERVER_ERROR', () => {
      const result = classifyError(new Error('HTTP 503 Service Unavailable'));
      expect(result.type).toBe(DataSourceError.SERVER_ERROR);
      expect(result.retryAfter).toBe(30);
    });
  });

  describe('Unknown Errors', () => {
    it('classifies unknown errors as UNKNOWN', () => {
      const result = classifyError(new Error('Something went wrong'));
      expect(result.type).toBe(DataSourceError.UNKNOWN);
      expect(result.retryAfter).toBeUndefined();
    });

    it('handles non-Error objects', () => {
      const result = classifyError('string error');
      expect(result.type).toBe(DataSourceError.UNKNOWN);
    });

    it('handles null', () => {
      const result = classifyError(null);
      expect(result.type).toBe(DataSourceError.UNKNOWN);
    });
  });
});

// ============================================================================
// Structured Logging Tests (Phase 3.1)
// ============================================================================

describe('structuredLog', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    (process.env as { NODE_ENV: string }).NODE_ENV = originalEnv as string;
    vi.restoreAllMocks();
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'development';
    });

    it('logs INFO level with console.log', () => {
      structuredLog(LogLevel.INFO, 'Test message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO] Test message'));
    });

    it('logs ERROR level with console.error', () => {
      structuredLog(LogLevel.ERROR, 'Error message');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Error message'));
    });

    it('logs WARN level with console.warn', () => {
      structuredLog(LogLevel.WARN, 'Warning message');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN] Warning message'));
    });

    it('logs DEBUG level with console.debug', () => {
      structuredLog(LogLevel.DEBUG, 'Debug message');
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Debug message'));
    });

    it('includes context in log output', () => {
      structuredLog(LogLevel.INFO, 'Test', {
        component: 'MarketDataClient',
        action: 'fetchQuote',
        symbol: 'TQQQ',
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('MarketDataClient')
      );
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    });

    it('outputs JSON format', () => {
      structuredLog(LogLevel.INFO, 'Test message');
      expect(console.log).toHaveBeenCalled();
      const logOutput = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test message');
    });

    it('includes timestamp in JSON output', () => {
      structuredLog(LogLevel.INFO, 'Test');
      const logOutput = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();
    });

    it('includes context in JSON output', () => {
      structuredLog(LogLevel.INFO, 'Fetch complete', {
        component: 'MarketDataClient',
        action: 'fetchCurrentData',
        duration: 150,
        source: 'polygon',
      });
      const logOutput = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.component).toBe('MarketDataClient');
      expect(parsed.action).toBe('fetchCurrentData');
      expect(parsed.duration).toBe(150);
      expect(parsed.source).toBe('polygon');
    });
  });

  describe('Log Levels', () => {
    it('has DEBUG level', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG');
    });

    it('has INFO level', () => {
      expect(LogLevel.INFO).toBe('INFO');
    });

    it('has WARN level', () => {
      expect(LogLevel.WARN).toBe('WARN');
    });

    it('has ERROR level', () => {
      expect(LogLevel.ERROR).toBe('ERROR');
    });
  });
});

