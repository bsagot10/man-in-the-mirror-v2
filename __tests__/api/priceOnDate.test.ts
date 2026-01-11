// filepath: __tests__/api/priceOnDate.test.ts
// Purpose: TDD tests for /api/price-on-date endpoint
// Key exports: test suites for price-on-date API

/**
 * TDD Tests for Price on Date API Route
 *
 * Tests the API endpoint for:
 * - /api/price-on-date - Fetch historical closing prices for a specific date
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the market data client
vi.mock('@/lib/market-data/client', () => {
  const mockClient = {
    fetchPricesOnDate: vi.fn().mockImplementation(async (targetDate: string) => {
      // Mock data for different dates
      const priceData: Record<string, { tqqq: number; sqqq: number; actualDate: string }> = {
        '2024-01-15': { tqqq: 50.25, sqqq: 30.75, actualDate: '2024-01-15' },
        '2024-01-13': { tqqq: 48.50, sqqq: 31.00, actualDate: '2024-01-12' }, // Weekend -> Friday
        '2024-01-16': { tqqq: 51.50, sqqq: 28.50, actualDate: '2024-01-16' },
      };

      const result = priceData[targetDate];
      if (result) {
        return result;
      }

      // Default: no data found
      return { tqqq: null, sqqq: null, actualDate: null };
    }),
    fetchCurrentData: vi.fn(),
    fetchHistoricalData: vi.fn(),
    isMarketOpen: vi.fn().mockReturnValue(true),
    getMetrics: vi.fn().mockReturnValue({}),
  };

  return {
    MarketDataClient: class MockMarketDataClient {
      fetchPricesOnDate = mockClient.fetchPricesOnDate;
      fetchCurrentData = mockClient.fetchCurrentData;
      fetchHistoricalData = mockClient.fetchHistoricalData;
      isMarketOpen = mockClient.isMarketOpen;
      getMetrics = mockClient.getMetrics;
    },
    marketDataClient: mockClient,
  };
});

// Import route after mock
import { GET as getPriceOnDate } from '@/app/api/price-on-date/route';

describe('GET /api/price-on-date', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Requests', () => {
    it('returns success response with closing prices for valid date', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-15');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns TQQQ closing price for the specified date', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-15');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(data.prices).toBeDefined();
      expect(data.prices.tqqq).toBe(50.25);
    });

    it('returns SQQQ closing price for the specified date', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-15');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(data.prices.sqqq).toBe(30.75);
    });

    it('includes the requested date in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-15');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(data.date).toBe('2024-01-15');
    });

    it('finds closest available date when exact date has no data', async () => {
      // 2024-01-13 is a Saturday - should find Friday 2024-01-12
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-13');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.actualDate).toBe('2024-01-12'); // Closest trading day
      expect(data.prices.tqqq).toBe(48.50);
    });
  });

  describe('Error Handling', () => {
    it('returns 400 when date parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('date');
    });

    it('returns 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=invalid');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid date');
    });

    it('returns 400 for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateStr = futureDate.toISOString().split('T')[0];

      const request = new NextRequest(`http://localhost:3000/api/price-on-date?date=${dateStr}`);
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('future');
    });

    it('returns 404 when no data found for date range', async () => {
      // 2020-01-01 is not in our mock data, so it returns null
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2020-01-01');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No data');
    });
  });

  describe('Response Format', () => {
    it('response matches expected schema', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-15');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('prices');
      expect(data.prices).toHaveProperty('tqqq');
      expect(data.prices).toHaveProperty('sqqq');
    });

    it('prices are numbers with proper precision', async () => {
      const request = new NextRequest('http://localhost:3000/api/price-on-date?date=2024-01-15');
      const response = await getPriceOnDate(request);
      const data = await response.json();

      expect(typeof data.prices.tqqq).toBe('number');
      expect(typeof data.prices.sqqq).toBe('number');
      expect(data.prices.tqqq).toBeGreaterThan(0);
      expect(data.prices.sqqq).toBeGreaterThan(0);
    });
  });
});
