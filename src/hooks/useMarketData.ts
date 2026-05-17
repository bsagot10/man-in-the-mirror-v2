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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      if (!ignore) setLoading(true);
      if (!ignore) setError(null);

      const [marketResult, historicalResult, entryScoreResult] = await Promise.allSettled([
        fetch('/api/market-data'),
        fetch('/api/historical-data'),
        fetch('/api/entry-score'),
      ]);

      if (ignore) return;

      // Market data — partial failure leaves other sections intact
      if (marketResult.status === 'fulfilled' && marketResult.value.ok) {
        const json = await marketResult.value.json();
        if (!ignore && json.success) {
          setMarketData(json.marketData);
          setMarketOpen(json.marketOpen);
          setLastUpdated(json.timestamp);
        }
      }

      if (!ignore) {
        // Historical data
        if (historicalResult.status === 'fulfilled' && historicalResult.value.ok) {
          const json = await historicalResult.value.json();
          if (!ignore && json.success) setHistoricalData(json.data);
        }

        // Entry score
        if (entryScoreResult.status === 'fulfilled' && entryScoreResult.value.ok) {
          const json = await entryScoreResult.value.json();
          if (!ignore && json.success) setEntryScore(json.entryScore);
        }

        // Report error only if all three failed
        const allFailed = [marketResult, historicalResult, entryScoreResult].every(
          r => r.status === 'rejected' || !r.value.ok
        );
        if (allFailed) {
          setError('All market data sources failed');
        }

        setLoading(false);
      }
    }

    fetchData();
    return () => { ignore = true; };
  }, [refreshTrigger]);

  const refresh = useCallback(async () => {
    setRefreshTrigger(c => c + 1);
  }, []);

  return {
    marketData,
    historicalData,
    entryScore,
    loading,
    error,
    marketOpen,
    lastUpdated,
    refresh,
  };
}

export default useMarketData;
