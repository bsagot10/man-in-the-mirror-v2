// filepath: __tests__/hooks/useEntryPrices.test.ts
// Purpose: TDD tests for useEntryPrices hook
// Key exports: test suites for useEntryPrices functionality

/**
 * TDD Tests for useEntryPrices Hook
 *
 * Tests the custom hook for fetching and managing entry prices:
 * - Fetching historical prices for a specific date
 * - Storing prices in localStorage
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import hook after mocks
import { useEntryPrices } from '@/hooks/useEntryPrices';

// Mock successful response
const mockSuccessResponse = {
  success: true,
  date: '2024-01-15',
  actualDate: '2024-01-15',
  prices: {
    tqqq: 50.25,
    sqqq: 30.75,
  },
};

// Mock response for weekend (redirects to Friday)
const mockWeekendResponse = {
  success: true,
  date: '2024-01-13',
  actualDate: '2024-01-12',
  prices: {
    tqqq: 48.50,
    sqqq: 31.00,
  },
};

describe('useEntryPrices Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('starts with null prices', () => {
      const { result } = renderHook(() => useEntryPrices());

      expect(result.current.prices).toBeNull();
    });

    it('starts with loading false', () => {
      const { result } = renderHook(() => useEntryPrices());

      expect(result.current.loading).toBe(false);
    });

    it('starts with no error', () => {
      const { result } = renderHook(() => useEntryPrices());

      expect(result.current.error).toBeNull();
    });
  });

  describe('Fetching Historical Prices', () => {
    it('provides fetchPrices function', () => {
      const { result } = renderHook(() => useEntryPrices());

      expect(typeof result.current.fetchPrices).toBe('function');
    });

    it('sets loading true when fetching', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useEntryPrices());

      act(() => {
        result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.loading).toBe(true);
    });

    it('fetches prices for specified date', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/price-on-date?date=2024-01-15');
    });

    it('updates prices state after successful fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.prices).toEqual({
        tqqq: 50.25,
        sqqq: 30.75,
      });
    });

    it('sets loading false after fetch completes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.loading).toBe(false);
    });

    it('tracks actual date from response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeekendResponse),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-13');
      });

      expect(result.current.actualDate).toBe('2024-01-12');
    });
  });

  describe('localStorage Persistence', () => {
    it('saves prices to localStorage after fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'entryPrices',
        JSON.stringify({ tqqq: 50.25, sqqq: 30.75 })
      );
    });

    it('saves entry date to localStorage after fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('positionEntryDate', '2024-01-15');
    });

    it('loads existing prices from localStorage on mount', async () => {
      localStorageMock.store['entryPrices'] = JSON.stringify({ tqqq: 45.00, sqqq: 35.00 });

      const { result } = renderHook(() => useEntryPrices());

      // Wait for useEffect to run
      await waitFor(() => {
        expect(result.current.prices).toEqual({ tqqq: 45.00, sqqq: 35.00 });
      });
    });

    it('provides clearPrices function', () => {
      const { result } = renderHook(() => useEntryPrices());

      expect(typeof result.current.clearPrices).toBe('function');
    });

    it('clearPrices removes prices from state and localStorage', async () => {
      localStorageMock.store['entryPrices'] = JSON.stringify({ tqqq: 45.00, sqqq: 35.00 });

      const { result } = renderHook(() => useEntryPrices());

      await waitFor(() => {
        expect(result.current.prices).not.toBeNull();
      });

      act(() => {
        result.current.clearPrices();
      });

      expect(result.current.prices).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('entryPrices');
    });
  });

  describe('Error Handling', () => {
    it('sets error state on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.error).toContain('Network error');
    });

    it('sets error for non-success response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ success: false, error: 'Invalid date' }),
      });

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('invalid');
      });

      expect(result.current.error).not.toBeNull();
    });

    it('sets loading false on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.loading).toBe(false);
    });

    it('clears error on successful fetch', async () => {
      // First, trigger an error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEntryPrices());

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.error).not.toBeNull();

      // Then, successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await act(async () => {
        await result.current.fetchPrices('2024-01-15');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Set Prices Manually', () => {
    it('provides setPricesManually function', () => {
      const { result } = renderHook(() => useEntryPrices());

      expect(typeof result.current.setPricesManually).toBe('function');
    });

    it('setPricesManually updates state', () => {
      const { result } = renderHook(() => useEntryPrices());

      act(() => {
        result.current.setPricesManually({ tqqq: 55.00, sqqq: 28.00 });
      });

      expect(result.current.prices).toEqual({ tqqq: 55.00, sqqq: 28.00 });
    });

    it('setPricesManually saves to localStorage', () => {
      const { result } = renderHook(() => useEntryPrices());

      act(() => {
        result.current.setPricesManually({ tqqq: 55.00, sqqq: 28.00 });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'entryPrices',
        JSON.stringify({ tqqq: 55.00, sqqq: 28.00 })
      );
    });
  });
});
