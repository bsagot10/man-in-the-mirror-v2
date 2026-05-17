// filepath: src/hooks/useEntryPrices.ts
// Purpose: Hook for fetching and managing entry prices for position P&L
// Key exports: useEntryPrices hook

/**
 * useEntryPrices Hook
 *
 * Custom hook for fetching historical entry prices and persisting them to localStorage.
 * Used to calculate real position P&L based on actual historical prices.
 *
 * Features:
 * - Fetch historical prices for a specific date via /api/price-on-date
 * - Persist prices to localStorage for page refresh survival
 * - Load existing prices from localStorage on mount
 * - Set prices manually (for "Update" button at current price)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface EntryPrices {
  tqqq: number;
  sqqq: number;
}

interface UseEntryPricesReturn {
  prices: EntryPrices | null;
  loading: boolean;
  error: string | null;
  actualDate: string | null;
  fetchPrices: (date: string) => Promise<void>;
  setPricesManually: (prices: EntryPrices, actualDate?: string) => void;
  clearPrices: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PRICES = 'entryPrices';
const STORAGE_KEY_DATE = 'positionEntryDate';

// ============================================================================
// Hook
// ============================================================================

export function useEntryPrices(): UseEntryPricesReturn {
  const [prices, setPrices] = useState<EntryPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualDate, setActualDate] = useState<string | null>(null);

  // Load existing prices from localStorage on mount
  useEffect(() => {
    try {
      const storedPrices = localStorage.getItem(STORAGE_KEY_PRICES);
      if (storedPrices) {
        const parsed = JSON.parse(storedPrices);
        if (parsed.tqqq && parsed.sqqq) {
          setPrices(parsed);
        }
      }

      const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
      if (storedDate) {
        setActualDate(storedDate);
      }
    } catch (err) {
      console.warn('Could not load entry prices from localStorage:', err);
    }
  }, []);

  /**
   * Fetch historical prices for a specific date
   */
  const fetchPrices = useCallback(async (date: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/price-on-date?date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch prices');
      }

      const newPrices: EntryPrices = {
        tqqq: data.prices.tqqq,
        sqqq: data.prices.sqqq,
      };

      // Update state
      setPrices(newPrices);
      setActualDate(data.actualDate);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(newPrices));
        localStorage.setItem(STORAGE_KEY_DATE, data.actualDate);
      } catch (storageError) {
        console.warn('Could not save to localStorage:', storageError);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set prices manually (used for "Update" button with current prices)
   */
  const setPricesManually = useCallback((newPrices: EntryPrices, newActualDate?: string): void => {
    setPrices(newPrices);
    if (newActualDate !== undefined) setActualDate(newActualDate);

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(newPrices));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
  }, []);

  /**
   * Clear prices from state and localStorage
   */
  const clearPrices = useCallback((): void => {
    setPrices(null);
    setActualDate(null);

    try {
      localStorage.removeItem(STORAGE_KEY_PRICES);
      localStorage.removeItem(STORAGE_KEY_DATE);
    } catch (err) {
      console.warn('Could not clear localStorage:', err);
    }
  }, []);

  return {
    prices,
    loading,
    error,
    actualDate,
    fetchPrices,
    setPricesManually,
    clearPrices,
  };
}

export default useEntryPrices;
