/**
 * TDD Tests for useMarketData Hook
 *
 * Tests the custom hook for fetching and managing market data state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMarketData } from '@/hooks/useMarketData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock market data response
const mockMarketDataResponse = {
  success: true,
  timestamp: '2024-01-15T16:00:00Z',
  marketData: {
    vix: { currentPrice: 20.5, changePercent: 1.5, previousClose: 20.2, change: 0.3, volume: 0, timestamp: '2024-01-15T16:00:00Z' },
    qqq: { currentPrice: 400, changePercent: 0.5, previousClose: 398, change: 2, volume: 50000000, timestamp: '2024-01-15T16:00:00Z' },
    tqqq: { currentPrice: 50, changePercent: 1.5, previousClose: 49.25, change: 0.75, volume: 30000000, timestamp: '2024-01-15T16:00:00Z' },
    sqqq: { currentPrice: 30, changePercent: -1.5, previousClose: 30.45, change: -0.45, volume: 20000000, timestamp: '2024-01-15T16:00:00Z' },
  },
  marketOpen: true,
};

// Mock historical data response
const mockHistoricalDataResponse = {
  success: true,
  data: {
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
  },
};

// Mock entry score response
const mockEntryScoreResponse = {
  success: true,
  entryScore: {
    total: 75,
    signal: 'WATCH',
    volatilityRegime: 'Moderate',
    volatilityScore: 30,
    trendScore: 25,
    decayScore: 20,
  },
};

describe('useMarketData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('starts with loading true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useMarketData());

      expect(result.current.loading).toBe(true);
    });

    it('starts with no data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMarketData());

      expect(result.current.marketData).toBeNull();
      expect(result.current.historicalData).toBeNull();
      expect(result.current.entryScore).toBeNull();
    });

    it('starts with no error', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMarketData());

      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('fetches market data on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMarketDataResponse),
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/market-data');
    });

    it('fetches historical data on mount', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderHook(() => useMarketData());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/historical-data');
      });
    });

    it('fetches entry score on mount', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderHook(() => useMarketData());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/entry-score');
      });
    });

    it('updates marketData state after successful fetch', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.marketData).not.toBeNull();
      });

      expect(result.current.marketData?.vix.currentPrice).toBe(20.5);
      expect(result.current.marketData?.tqqq.currentPrice).toBe(50);
      expect(result.current.marketData?.sqqq.currentPrice).toBe(30);
    });

    it('updates historicalData state after successful fetch', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.historicalData).not.toBeNull();
      });

      expect(result.current.historicalData?.vix).toHaveLength(2);
      expect(result.current.historicalData?.tqqq).toHaveLength(2);
      expect(result.current.historicalData?.sqqq).toHaveLength(2);
    });

    it('updates entryScore state after successful fetch', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.entryScore).not.toBeNull();
      });

      expect(result.current.entryScore?.total).toBe(75);
      expect(result.current.entryScore?.signal).toBe('WATCH');
    });

    it('sets loading to false after all fetches complete', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('sets error state on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('All market data sources failed');
    });

    it('sets error for non-success response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });

    it('sets loading false on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('provides refresh function', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
    });

    it('refresh re-fetches all data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mocks to count new calls
      mockFetch.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/market-data');
      expect(mockFetch).toHaveBeenCalledWith('/api/historical-data');
      expect(mockFetch).toHaveBeenCalledWith('/api/entry-score');
    });
  });

  describe('Market Status', () => {
    it('exposes marketOpen status', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.marketOpen).toBeDefined();
      });

      expect(result.current.marketOpen).toBe(true);
    });

    it('exposes lastUpdated timestamp', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMarketDataResponse),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useMarketData());

      await waitFor(() => {
        expect(result.current.lastUpdated).not.toBeNull();
      });

      expect(result.current.lastUpdated).toBe('2024-01-15T16:00:00Z');
    });
  });
});
