/**
 * useMarketData Hook
 *
 * Custom hook for fetching and managing market data state.
 * Fetches data from three API endpoints:
 * - /api/market-data - Current market data
 * - /api/historical-data - Historical price data
 * - /api/entry-score - Entry score calculation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SymbolData {
  currentPrice: number;
  changePercent: number;
  previousClose: number;
  change: number;
  volume: number;
  timestamp: string;
}

interface MarketData {
  vix: SymbolData;
  qqq: SymbolData;
  tqqq: SymbolData;
  sqqq: SymbolData;
}

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HistoricalData {
  vix: HistoricalDataPoint[];
  tqqq: HistoricalDataPoint[];
  sqqq: HistoricalDataPoint[];
}

interface EntryScore {
  total: number;
  signal: 'ENTER' | 'WATCH' | 'WAIT';
  volatilityRegime: string;
  volatilityScore: number;
  trendScore: number;
  decayScore: number;
}

interface UseMarketDataReturn {
  marketData: MarketData | null;
  historicalData: HistoricalData | null;
  entryScore: EntryScore | null;
  loading: boolean;
  error: string | null;
  marketOpen: boolean;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useMarketData(): UseMarketDataReturn {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [entryScore, setEntryScore] = useState<EntryScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all endpoints in parallel
      const [marketResponse, historicalResponse, entryScoreResponse] = await Promise.all([
        fetch('/api/market-data'),
        fetch('/api/historical-data'),
        fetch('/api/entry-score'),
      ]);

      // Check for errors
      if (!marketResponse.ok) {
        throw new Error(`Market data fetch failed: ${marketResponse.status}`);
      }
      if (!historicalResponse.ok) {
        throw new Error(`Historical data fetch failed: ${historicalResponse.status}`);
      }
      if (!entryScoreResponse.ok) {
        throw new Error(`Entry score fetch failed: ${entryScoreResponse.status}`);
      }

      // Parse responses
      const marketJson = await marketResponse.json();
      const historicalJson = await historicalResponse.json();
      const entryScoreJson = await entryScoreResponse.json();

      // Update state
      if (marketJson.success) {
        setMarketData(marketJson.marketData);
        setMarketOpen(marketJson.marketOpen);
        setLastUpdated(marketJson.timestamp);
      }

      if (historicalJson.success) {
        setHistoricalData(historicalJson.data);
      }

      if (entryScoreJson.success) {
        setEntryScore(entryScoreJson.entryScore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    marketData,
    historicalData,
    entryScore,
    loading,
    error,
    marketOpen,
    lastUpdated,
    refresh: fetchAllData,
  };
}

export default useMarketData;
