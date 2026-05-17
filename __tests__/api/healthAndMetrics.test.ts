/**
 * TDD Tests for Health and Metrics API Routes
 *
 * Tests the API endpoints for:
 * - /api/health - Health check endpoint for monitoring
 * - /api/metrics - Cache and data source metrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the market data client - define mock inside factory to avoid hoisting issues
vi.mock('@/lib/market-data/client', () => {
  // Default healthy metrics
  const defaultMetrics = {
    cacheHits: 10,
    cacheMisses: 2,
    polygonSuccess: 8,
    polygonFailed: 0,
    yahooSuccess: 2,
    yahooFailed: 0,
    cacheHitRate: 83.3,
  };

  const mockGetMetrics = vi.fn().mockReturnValue(defaultMetrics);

  return {
    MarketDataClient: class MockMarketDataClient {
      getMetrics = mockGetMetrics;
    },
    marketDataClient: {
      getMetrics: mockGetMetrics,
    },
    __mockGetMetrics: mockGetMetrics, // Export for test access
  };
});

// Import after mocks
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getMetrics } from '@/app/api/metrics/route';

// Helper to create metrics with overrides
const createMockMetrics = (overrides: Partial<{
  cacheHits: number;
  cacheMisses: number;
  polygonSuccess: number;
  polygonFailed: number;
  yahooSuccess: number;
  yahooFailed: number;
  cacheHitRate: number;
}> = {}) => ({
  cacheHits: 10,
  cacheMisses: 2,
  polygonSuccess: 8,
  polygonFailed: 0,
  yahooSuccess: 2,
  yahooFailed: 0,
  cacheHitRate: 83.3,
  ...overrides,
});

// Get mock reference after module initialization
let mockGetMetricsFn: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const clientMock = await import('@/lib/market-data/client') as unknown as {
    __mockGetMetrics: ReturnType<typeof vi.fn>;
  };
  mockGetMetricsFn = clientMock.__mockGetMetrics;
  vi.clearAllMocks();
  // Reset to default metrics
  mockGetMetricsFn.mockReturnValue(createMockMetrics());
});

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('returns success response with health status', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('includes timestamp', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });

    it('includes uptime', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('includes data source health status', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth).toBeDefined();
      expect(data.dataSourceHealth.polygon).toBeDefined();
      expect(data.dataSourceHealth.yahooFinance).toBeDefined();
      expect(data.dataSourceHealth.cache).toBeDefined();
    });

    it('includes success rate and cache hit rate', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(data.metrics).toBeDefined();
      expect(typeof data.metrics.successRate).toBe('number');
      expect(typeof data.metrics.cacheHitRate).toBe('number');
    });
  });

  describe('health status calculation', () => {
    it('returns healthy when success rate >= 50%', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 6,
        polygonFailed: 4,
        yahooSuccess: 0,
        yahooFailed: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('returns degraded when success rate between 20% and 50%', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 2,
        polygonFailed: 8,
        yahooSuccess: 1,
        yahooFailed: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
    });

    it('returns unhealthy when success rate < 20%', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 1,
        polygonFailed: 9,
        yahooSuccess: 0,
        yahooFailed: 5,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
    });

    it('returns healthy when no API calls have been made yet', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 0,
        polygonFailed: 0,
        yahooSuccess: 0,
        yahooFailed: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });
  });

  describe('data source health detection', () => {
    it('shows polygon as up when it has successful calls', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 5,
        polygonFailed: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.polygon).toBe('up');
    });

    it('shows polygon as down when it has only failures', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 0,
        polygonFailed: 5,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.polygon).toBe('down');
    });

    it('shows polygon as unknown when no calls', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        polygonSuccess: 0,
        polygonFailed: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.polygon).toBe('unknown');
    });

    it('shows yahoo as up when it has successful calls', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        yahooSuccess: 3,
        yahooFailed: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.yahooFinance).toBe('up');
    });

    it('shows yahoo as down when it has only failures', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        yahooSuccess: 0,
        yahooFailed: 3,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.yahooFinance).toBe('down');
    });

    it('shows cache as warm when there are cache hits', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        cacheHits: 5,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.cache).toBe('warm');
    });

    it('shows cache as cold when no cache hits', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        cacheHits: 0,
      }));

      const response = await getHealth();
      const data = await response.json();

      expect(data.dataSourceHealth.cache).toBe('cold');
    });
  });

  describe('error handling', () => {
    it('returns unhealthy status when getMetrics throws', async () => {
      mockGetMetricsFn.mockImplementation(() => {
        throw new Error('Failed to get metrics');
      });

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Internal server error');
    });

    it('includes timestamp in error response', async () => {
      mockGetMetricsFn.mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await getHealth();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
    });

    it('handles non-Error objects in catch block', async () => {
      mockGetMetricsFn.mockImplementation(() => {
        throw 'String error';
      });

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Internal server error');
    });
  });
});

describe('Metrics API', () => {
  describe('GET /api/metrics', () => {
    it('returns success response with metrics', async () => {
      const response = await getMetrics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes timestamp', async () => {
      const response = await getMetrics();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });

    it('includes all metrics fields', async () => {
      mockGetMetricsFn.mockReturnValue(createMockMetrics({
        cacheHits: 15,
        cacheMisses: 5,
        polygonSuccess: 12,
        polygonFailed: 2,
        yahooSuccess: 3,
        yahooFailed: 1,
        cacheHitRate: 75.0,
      }));

      const response = await getMetrics();
      const data = await response.json();

      expect(data.metrics).toBeDefined();
      expect(data.metrics.cacheHits).toBe(15);
      expect(data.metrics.cacheMisses).toBe(5);
      expect(data.metrics.polygonSuccess).toBe(12);
      expect(data.metrics.polygonFailed).toBe(2);
      expect(data.metrics.yahooSuccess).toBe(3);
      expect(data.metrics.yahooFailed).toBe(1);
      expect(data.metrics.cacheHitRate).toBe(75.0);
    });
  });

  describe('error handling', () => {
    it('returns 500 when getMetrics throws', async () => {
      mockGetMetricsFn.mockImplementation(() => {
        throw new Error('Metrics unavailable');
      });

      const response = await getMetrics();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('handles non-Error objects in catch block', async () => {
      mockGetMetricsFn.mockImplementation(() => {
        throw { message: 'Non-standard error' };
      });

      const response = await getMetrics();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});

describe('API Response Schema', () => {
  it('health response matches expected schema', async () => {
    const response = await getHealth();
    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('dataSourceHealth');
    expect(data).toHaveProperty('metrics');
  });

  it('metrics response matches expected schema', async () => {
    const response = await getMetrics();
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('metrics');
  });
});
