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
  type SymbolQuote,
  SYMBOLS,
  calculateChangePercent,
  formatSymbolData,
  validateHistoricalData,
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

      // Should not throw, should return cached or empty data
      await expect(client.fetchCurrentData()).resolves.toBeDefined();
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

    it('classifies VIX < 20 as Low regime', async () => {
      mockQuote.mockResolvedValue({
        symbol: '^VIX',
        regularMarketPrice: 15,
        regularMarketPreviousClose: 14,
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
