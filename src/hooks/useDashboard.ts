/**
 * useDashboard Hook
 *
 * Centralises all state, effects, computed values, and handlers
 * for the main Dashboard page.
 *
 * Extracted from page.tsx to keep the component under 200 lines.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { useEntryPrices } from '@/hooks/useEntryPrices';
import type { Position } from '@/types/chart-types';
import { calculatePositionPnL } from '@/types/chart-types';
import { calculatePositionSizing, type PositionSizing } from '@/lib/market-analysis/positionSizing';
import { determineVixRegime, determineMarketTrend } from '@/lib/market-analysis/vixRegime';

// ============================================================================
// Types
// ============================================================================

export interface PortfolioMetrics {
  totalPnl: number;
  returnPct: number;
}

export interface DashboardState {
  // Market data
  marketData: ReturnType<typeof useMarketData>['marketData'];
  historicalData: ReturnType<typeof useMarketData>['historicalData'];
  entryScore: ReturnType<typeof useMarketData>['entryScore'];
  loading: boolean;
  error: string | null;
  marketOpen: boolean;
  lastUpdated: string | null;
  refresh: () => Promise<void>;

  // Entry prices
  historicalEntryPrices: ReturnType<typeof useEntryPrices>['prices'];
  fetchingHistoricalPrices: boolean;
  historicalPricesError: string | null;
  historicalActualDate: string | null;
  fetchHistoricalPrices: (date: string) => Promise<void>;

  // UI state
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  accountSize: number;
  setAccountSize: (v: number) => void;
  positionActive: boolean;
  setPositionActive: (v: boolean) => void;
  positionEntryDate: string;
  setPositionEntryDate: (v: string) => void;

  // Position state
  storedEntryPrices: { tqqq: number; sqqq: number } | null;
  setStoredEntryPrices: (v: { tqqq: number; sqqq: number } | null) => void;
  positions: Position[];
  committedSizing: PositionSizing | null;

  // Derived values
  vixRegime: ReturnType<typeof determineVixRegime> | undefined;
  marketTrend: ReturnType<typeof determineMarketTrend> | undefined;
  vixChartData: { date: string; close: number }[];
  tqqqChartData: { date: string; close: number }[];
  sqqqChartData: { date: string; close: number }[];
  vixValue: number;
  tqqqPrice: number;
  sqqqPrice: number;
  tqqqStop: string;
  sqqqStop: string;
  positionSizing: PositionSizing;
  portfolioMetrics: PortfolioMetrics;

  // Handlers
  handleUpdateAccountSize: () => void;
  getStatusMessage: () => string;
}

// ============================================================================
// Hook
// ============================================================================

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function useDashboard(): DashboardState {
  const {
    marketData,
    historicalData,
    entryScore,
    loading,
    error,
    marketOpen,
    lastUpdated,
    refresh,
  } = useMarketData();

  const {
    prices: historicalEntryPrices,
    loading: fetchingHistoricalPrices,
    error: historicalPricesError,
    actualDate: historicalActualDate,
    fetchPrices: fetchHistoricalPrices,
    setPricesManually: setHistoricalPricesManually,
  } = useEntryPrices();

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [accountSize, setAccountSize] = useState<number>(3000);
  const [positionActive, setPositionActive] = useState(true);
  const [positionEntryDate, setPositionEntryDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [storedEntryPrices, setStoredEntryPrices] = useState<{ tqqq: number; sqqq: number } | null>(null);
  const [storedShares, setStoredShares] = useState<{ tqqq: number; sqqq: number } | null>(null);
  const [committedSizing, setCommittedSizing] = useState<PositionSizing | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !marketOpen) return;
    let timeoutId: NodeJS.Timeout;
    let cancelled = false;
    const runRefresh = async () => {
      try { await refresh(); } catch (e) { console.error('Auto-refresh failed:', e); }
      if (!cancelled) timeoutId = setTimeout(runRefresh, 60000);
    };
    timeoutId = setTimeout(runRefresh, 60000);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [autoRefresh, marketOpen, refresh]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedSize = localStorage.getItem('accountSize');
      if (storedSize) {
        const parsed = Number(storedSize);
        if (!isNaN(parsed) && parsed > 0) setAccountSize(parsed);
      }
      const storedDate = localStorage.getItem('positionEntryDate');
      if (storedDate) setPositionEntryDate(storedDate);
      const storedSharesData = localStorage.getItem('positionShares');
      if (storedSharesData) {
        const parsed = JSON.parse(storedSharesData);
        if (parsed.tqqq !== undefined && parsed.sqqq !== undefined) setStoredShares(parsed);
      }
      const storedSizing = localStorage.getItem('committedSizing');
      if (storedSizing) setCommittedSizing(JSON.parse(storedSizing));
    } catch (e) { console.warn('Could not access localStorage:', e); }
  }, []);

  // Fetch historical prices on mount if missing
  useEffect(() => {
    if (!historicalEntryPrices && !storedEntryPrices && positionEntryDate) {
      fetchHistoricalPrices(positionEntryDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update positions when market data changes
  useEffect(() => {
    if (marketData && positionActive) {
      const tqqqEntry = historicalEntryPrices?.tqqq ?? storedEntryPrices?.tqqq ?? marketData.tqqq.currentPrice;
      const sqqqEntry = historicalEntryPrices?.sqqq ?? storedEntryPrices?.sqqq ?? marketData.sqqq.currentPrice;
      if (historicalEntryPrices && !storedEntryPrices) setStoredEntryPrices(historicalEntryPrices);
      const tqqqShares = storedShares?.tqqq ?? 5;
      const sqqqShares = storedShares?.sqqq ?? 5;
      setPositions([
        { symbol: 'TQQQ', shares: tqqqShares, entryPrice: tqqqEntry, currentPrice: marketData.tqqq.currentPrice, entryDate: historicalActualDate ?? positionEntryDate },
        { symbol: 'SQQQ', shares: sqqqShares, entryPrice: sqqqEntry, currentPrice: marketData.sqqq.currentPrice, entryDate: historicalActualDate ?? positionEntryDate },
      ]);
    } else if (!positionActive) {
      setPositions([]);
    }
  }, [marketData, positionActive, positionEntryDate, historicalEntryPrices, storedEntryPrices, storedShares, historicalActualDate]);

  // Derived values
  const vixValue = marketData?.vix.currentPrice || 17.2;
  const tqqqPrice = marketData?.tqqq.currentPrice || 53.37;
  const sqqqPrice = marketData?.sqqq.currentPrice || 69.97;
  const tqqqStop = (tqqqPrice * 1.15).toFixed(2);
  const sqqqStop = (sqqqPrice * 1.15).toFixed(2);
  const vixRegime = marketData ? determineVixRegime(marketData.vix.currentPrice) : undefined;
  const marketTrend = marketData ? determineMarketTrend(marketData.qqq.changePercent) : undefined;

  const vixChartData = useMemo(() =>
    historicalData?.vix.map((d) => ({ date: d.date, close: d.close })) || [], [historicalData]);
  const tqqqChartData = useMemo(() =>
    historicalData?.tqqq.map((d) => ({ date: d.date, close: d.close })) || [], [historicalData]);
  const sqqqChartData = useMemo(() =>
    historicalData?.sqqq.map((d) => ({ date: d.date, close: d.close })) || [], [historicalData]);

  const positionSizing = useMemo(() =>
    calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice),
    [accountSize, vixValue, tqqqPrice, sqqqPrice]);

  const portfolioMetrics = useMemo((): PortfolioMetrics => {
    const totalPnl = positions.reduce((sum, pos) => sum + calculatePositionPnL(pos).pnl, 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.entryPrice * pos.shares, 0);
    const returnPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { totalPnl, returnPct };
  }, [positions]);

  // Auto-initialize committedSizing
  useEffect(() => {
    if (committedSizing === null && marketData && positionSizing.tqqqShares > 0) {
      setCommittedSizing(positionSizing);
      try { localStorage.setItem('committedSizing', JSON.stringify(positionSizing)); }
      catch (e) { console.warn('Could not save to localStorage:', e); }
    }
  }, [committedSizing, marketData, positionSizing]);

  const handleUpdateAccountSize = useCallback(() => {
    try { localStorage.setItem('accountSize', String(accountSize)); }
    catch (e) { console.warn('Could not save to localStorage:', e); }

    if (marketData && positionActive) {
      const newEntryPrices = { tqqq: marketData.tqqq.currentPrice, sqqq: marketData.sqqq.currentPrice };
      setHistoricalPricesManually(newEntryPrices);
      setStoredEntryPrices(newEntryPrices);
      const newShares = { tqqq: positionSizing.tqqqShares, sqqq: positionSizing.sqqqShares };
      setStoredShares(newShares);
      setCommittedSizing(positionSizing);
      const today = new Date().toISOString().split('T')[0];
      try {
        localStorage.setItem('positionShares', JSON.stringify(newShares));
        localStorage.setItem('committedSizing', JSON.stringify(positionSizing));
        localStorage.setItem('positionEntryDate', today);
      } catch (e) { console.warn('Could not save to localStorage:', e); }
      setPositionEntryDate(today);
      setPositions([
        { symbol: 'TQQQ', shares: positionSizing.tqqqShares, entryPrice: marketData.tqqq.currentPrice, currentPrice: marketData.tqqq.currentPrice, entryDate: today },
        { symbol: 'SQQQ', shares: positionSizing.sqqqShares, entryPrice: marketData.sqqq.currentPrice, currentPrice: marketData.sqqq.currentPrice, entryDate: today },
      ]);
    }
  }, [accountSize, marketData, positionActive, positionSizing, setHistoricalPricesManually]);

  const getStatusMessage = useCallback(() => {
    if (loading) return 'Updating market data...';
    if (error) return `Error: ${error}`;
    if (lastUpdated) return `Market data updated at ${formatTimestamp(lastUpdated)}`;
    return '';
  }, [loading, error, lastUpdated]);

  return {
    marketData, historicalData, entryScore, loading, error, marketOpen, lastUpdated, refresh,
    historicalEntryPrices, fetchingHistoricalPrices, historicalPricesError, historicalActualDate, fetchHistoricalPrices,
    autoRefresh, setAutoRefresh, accountSize, setAccountSize, positionActive, setPositionActive,
    positionEntryDate, setPositionEntryDate, storedEntryPrices, setStoredEntryPrices, positions, committedSizing,
    vixRegime, marketTrend, vixChartData, tqqqChartData, sqqqChartData,
    vixValue, tqqqPrice, sqqqPrice, tqqqStop, sqqqStop, positionSizing, portfolioMetrics,
    handleUpdateAccountSize, getStatusMessage,
  };
}
