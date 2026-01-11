/**
 * Dashboard Page
 *
 * Main page for the Man in the Mirror Strategy dashboard.
 * Integrates all components: VixChart, TqqqSqqqChart, MarketMetrics, EntryScoreDisplay
 *
 * Ported from: Flask app's index.html
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { useEntryPrices } from '@/hooks/useEntryPrices';
import { VixChart } from '@/components/charts/VixChart';
import { TqqqSqqqChart } from '@/components/charts/TqqqSqqqChart';
import { DecayOpportunityChart } from '@/components/charts/DecayOpportunityChart';
import { StrategyPerformanceChart } from '@/components/charts/StrategyPerformanceChart';
import { MarketMetrics } from '@/components/dashboard/MarketMetrics';
import { EntryScoreDisplay } from '@/components/dashboard/EntryScoreDisplay';
import type { Signal } from '@/components/dashboard/MarketMetrics';
import type { Position } from '@/types/chart-types';
import { calculatePositionPnL, getPnlClass, formatPnl, calculateDaysActive } from '@/types/chart-types';
import { calculatePositionSizing, type PositionSizing } from '@/lib/market-analysis/positionSizing';
import { determineVixRegime, determineMarketTrend } from '@/lib/market-analysis/vixRegime';

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

// ============================================================================
// Icon Components
// ============================================================================

function RefreshIcon() {
  return (
    <svg
      className="icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function AutoRefreshIcon() {
  return (
    <svg
      className="icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="1 4 1 10 7 10" />
      <polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

// ============================================================================
// Dashboard Component
// ============================================================================

export default function Dashboard() {
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

  // Hook for fetching historical entry prices
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
  // Default to 30 days ago for realistic demo
  const [positionEntryDate, setPositionEntryDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });

  // Stored entry prices for P&L calculation (persisted to localStorage)
  const [storedEntryPrices, setStoredEntryPrices] = useState<{ tqqq: number; sqqq: number } | null>(null);

  // Stored shares for position details (persisted to localStorage)
  const [storedShares, setStoredShares] = useState<{ tqqq: number; sqqq: number } | null>(null);

  // Committed position sizing - only updates when user clicks "Update"
  const [committedSizing, setCommittedSizing] = useState<PositionSizing | null>(null);

  // Position state - updates when market data changes
  const [positions, setPositions] = useState<Position[]>([]);

  // Auto-refresh effect: refreshes market data every 60 seconds when enabled and market is open
  useEffect(() => {
    if (!autoRefresh || !marketOpen) return;

    let timeoutId: NodeJS.Timeout;
    let cancelled = false;

    const runRefresh = async () => {
      try {
        await refresh();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        // Continue the cycle even on error - don't break user expectation
      }

      if (!cancelled) {
        // Schedule next refresh only after current one completes
        timeoutId = setTimeout(runRefresh, 60000);
      }
    };

    // Start first refresh after 60 seconds
    timeoutId = setTimeout(runRefresh, 60000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [autoRefresh, marketOpen, refresh]);

  // Load accountSize and entry prices from localStorage on client-side hydration
  useEffect(() => {
    // Only run on client after hydration
    try {
      const storedSize = localStorage.getItem('accountSize');
      if (storedSize) {
        const parsed = Number(storedSize);
        if (!isNaN(parsed) && parsed > 0) {
          setAccountSize(parsed);
        }
      }

      // Load stored entry prices
      const storedPrices = localStorage.getItem('entryPrices');
      if (storedPrices) {
        const parsed = JSON.parse(storedPrices);
        if (parsed.tqqq && parsed.sqqq) {
          setStoredEntryPrices(parsed);
        }
      }

      // Load stored entry date
      const storedDate = localStorage.getItem('positionEntryDate');
      if (storedDate) {
        setPositionEntryDate(storedDate);
      }

      // Load stored shares
      const storedSharesData = localStorage.getItem('positionShares');
      if (storedSharesData) {
        const parsed = JSON.parse(storedSharesData);
        if (parsed.tqqq !== undefined && parsed.sqqq !== undefined) {
          setStoredShares(parsed);
        }
      }

      // Load committed position sizing
      const storedSizing = localStorage.getItem('committedSizing');
      if (storedSizing) {
        const parsed = JSON.parse(storedSizing);
        setCommittedSizing(parsed);
      }
    } catch (error) {
      // localStorage may throw in incognito mode or if quota exceeded
      console.warn('Could not access localStorage:', error);
    }
  }, []);

  // Fetch historical prices on mount if no stored prices exist
  // This ensures we have real historical data for the default entry date
  useEffect(() => {
    // Only fetch if:
    // 1. No historical prices from hook yet
    // 2. No legacy stored prices
    // 3. We have a position entry date
    if (!historicalEntryPrices && !storedEntryPrices && positionEntryDate) {
      fetchHistoricalPrices(positionEntryDate);
    }
    // Run only once on mount - don't re-fetch when these deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update positions when market data changes
  // Priority: historicalEntryPrices (from hook) > storedEntryPrices (legacy localStorage) > current prices
  useEffect(() => {
    if (marketData && positionActive) {
      // Use historical entry prices from hook (real data) if available
      // Fall back to stored prices (legacy), then current prices as last resort
      const tqqqEntry = historicalEntryPrices?.tqqq ?? storedEntryPrices?.tqqq ?? marketData.tqqq.currentPrice;
      const sqqqEntry = historicalEntryPrices?.sqqq ?? storedEntryPrices?.sqqq ?? marketData.sqqq.currentPrice;

      // Sync storedEntryPrices with historicalEntryPrices for consistency
      if (historicalEntryPrices && !storedEntryPrices) {
        setStoredEntryPrices(historicalEntryPrices);
      }

      // Use stored shares if available, otherwise default to 5
      const tqqqShares = storedShares?.tqqq ?? 5;
      const sqqqShares = storedShares?.sqqq ?? 5;

      setPositions([
        {
          symbol: 'TQQQ',
          shares: tqqqShares,
          entryPrice: tqqqEntry,
          currentPrice: marketData.tqqq.currentPrice,
          entryDate: historicalActualDate ?? positionEntryDate,
        },
        {
          symbol: 'SQQQ',
          shares: sqqqShares,
          entryPrice: sqqqEntry,
          currentPrice: marketData.sqqq.currentPrice,
          entryDate: historicalActualDate ?? positionEntryDate,
        },
      ]);
    } else if (!positionActive) {
      setPositions([]);
    }
  }, [marketData, positionActive, positionEntryDate, historicalEntryPrices, storedEntryPrices, storedShares, historicalActualDate]);

  // Handler to save accountSize to localStorage and update positions
  // This is the "Update" button - enters position NOW at current market prices
  const handleUpdateAccountSize = () => {
    try {
      localStorage.setItem('accountSize', String(accountSize));
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
    }

    // Update positions with positionSizing calculations
    if (marketData && positionActive) {
      const newEntryPrices = {
        tqqq: marketData.tqqq.currentPrice,
        sqqq: marketData.sqqq.currentPrice,
      };

      // Use the hook to set prices manually (persists to localStorage)
      setHistoricalPricesManually(newEntryPrices);
      setStoredEntryPrices(newEntryPrices);

      // Store shares from position sizing recommendations
      const newShares = {
        tqqq: positionSizing.tqqqShares,
        sqqq: positionSizing.sqqqShares,
      };
      setStoredShares(newShares);

      // Commit the position sizing (so it only updates on button click)
      setCommittedSizing(positionSizing);

      try {
        localStorage.setItem('positionShares', JSON.stringify(newShares));
        localStorage.setItem('committedSizing', JSON.stringify(positionSizing));
        localStorage.setItem('positionEntryDate', new Date().toISOString().split('T')[0]);
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }

      const today = new Date().toISOString().split('T')[0];
      setPositionEntryDate(today);

      setPositions([
        {
          symbol: 'TQQQ',
          shares: positionSizing.tqqqShares,
          entryPrice: marketData.tqqq.currentPrice,
          currentPrice: marketData.tqqq.currentPrice,
          entryDate: today,
        },
        {
          symbol: 'SQQQ',
          shares: positionSizing.sqqqShares,
          entryPrice: marketData.sqqq.currentPrice,
          currentPrice: marketData.sqqq.currentPrice,
          entryDate: today,
        },
      ]);
    }
  };

  // Generate status message for live region (accessibility)
  const getStatusMessage = () => {
    if (loading) return 'Updating market data...';
    if (error) return `Error: ${error}`;
    if (lastUpdated) return `Market data updated at ${formatTimestamp(lastUpdated)}`;
    return '';
  };

  // Derive regime and trend from data
  const vixRegime = marketData ? determineVixRegime(marketData.vix.currentPrice) : undefined;
  const marketTrend = marketData ? determineMarketTrend(marketData.qqq.changePercent) : undefined;

  // Transform VIX historical data for chart
  const vixChartData = historicalData?.vix.map((d) => ({
    date: d.date,
    close: d.close,
  })) || [];

  // Transform TQQQ/SQQQ historical data for chart
  const tqqqChartData = historicalData?.tqqq.map((d) => ({
    date: d.date,
    close: d.close,
  })) || [];

  const sqqqChartData = historicalData?.sqqq.map((d) => ({
    date: d.date,
    close: d.close,
  })) || [];

  // Calculate derived values
  const vixValue = marketData?.vix.currentPrice || 17.2;
  const tqqqPrice = marketData?.tqqq.currentPrice || 53.37;
  const sqqqPrice = marketData?.sqqq.currentPrice || 69.97;
  const tqqqStop = (tqqqPrice * 1.15).toFixed(2);
  const sqqqStop = (sqqqPrice * 1.15).toFixed(2);

  // Calculate position sizing based on current market conditions
  const positionSizing = useMemo(() => {
    return calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice);
  }, [accountSize, vixValue, tqqqPrice, sqqqPrice]);

  // Initialize committedSizing from positionSizing if not already set
  // This ensures Position Sizing Recommendations shows stable values on first load
  useEffect(() => {
    if (committedSizing === null && marketData && positionSizing.tqqqShares > 0) {
      setCommittedSizing(positionSizing);
      try {
        localStorage.setItem('committedSizing', JSON.stringify(positionSizing));
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }
  }, [committedSizing, marketData, positionSizing]);

  // Handle error state
  if (error && !marketData) {
    return (
      <div data-testid="dashboard" className="min-h-screen bg-warm-gradient p-6">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div data-testid="dashboard-error" className="flex flex-col items-center justify-center h-screen">
          <div className="ghibli-card p-8 text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-4">Error Loading Data</h2>
            <p className="text-warm-600 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="btn-control"
              aria-label="Retry loading market data"
            >
              <RefreshIcon />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="min-h-screen bg-warm-gradient">
      {/* Skip Link for Keyboard Navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Live Region for Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {getStatusMessage()}
      </div>

      {/* Cached Data Indicator */}
      <div className="cached-indicator">
        Cached Data
      </div>

      {/* Loading Overlay */}
      {loading && !marketData && (
        <div data-testid="dashboard-loading" className="fixed inset-0 bg-warm-50/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-warm-600 border-t-transparent mx-auto mb-4" />
            <p className="text-warm-700">Loading VIX data...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <h1 className="main-title">Man in the Mirror Strategy</h1>
        <span className="subtitle">Leveraged ETF Decay Strategy</span>
        <div className="header-controls">
          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="btn-control"
            role="switch"
            aria-checked={autoRefresh}
            aria-label="Toggle auto-refresh"
          >
            <AutoRefreshIcon />
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>

          {/* Last Updated */}
          <span data-testid="last-update" className="last-update">
            Last updated: {lastUpdated ? formatTimestamp(lastUpdated) : '-'}
          </span>

          {/* Market Status */}
          <span data-testid="market-status" className="market-status">
            Market: {marketOpen ? 'Open' : 'Closed'}
          </span>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="btn-control"
            aria-label="Refresh market data"
          >
            <RefreshIcon />
            Refresh Data
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" data-testid="main-content" className="main-content">
        {/* Left Column */}
        <div data-testid="left-column" className="left-column">
          {/* Account Information */}
          <div className="ghibli-card">
            <div className="card-header">
              <h2>📁 ACCOUNT INFORMATION</h2>
              <span className="status-badge active">● Active</span>
            </div>
            <div className="card-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Account Balance</label>
                  <span className="value">${accountSize.toFixed(2)}</span>
                </div>
                <div className="info-item">
                  <label>Available Margin</label>
                  <span className="value">${(accountSize / 2).toFixed(2)}</span>
                </div>
              </div>
              <div className="account-control">
                <label htmlFor="account-size">Account Status:</label>
                <div className="control-group">
                  <span className="status-indicator">Good Standing</span>
                  <label htmlFor="account-size" className="sr-only">Account Balance</label>
                  <input
                    id="account-size"
                    type="number"
                    className="input-field"
                    value={accountSize}
                    onChange={(e) => setAccountSize(Number(e.target.value))}
                    placeholder="$"
                    aria-label="Account balance in dollars"
                  />
                  <button
                    className="btn-update"
                    onClick={handleUpdateAccountSize}
                    aria-label="Save account balance"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Market Conditions */}
          <MarketMetrics
            entryScore={entryScore?.total}
            signal={entryScore?.signal as Signal}
            vixValue={marketData?.vix.currentPrice}
            vixRegime={vixRegime}
            marketTrend={marketTrend}
            loading={loading && !marketData}
            error={error && !marketData ? error : undefined}
          />

          {/* Risk Management */}
          <div className="ghibli-card">
            <div className="card-header">
              <h2>⚠️ RISK MANAGEMENT</h2>
            </div>
            <div className="card-content">
              <div className="risk-grid">
                <div className="risk-item">
                  <label>TQQQ Stop Loss</label>
                  <span className="value negative">${tqqqStop}</span>
                  <span className="sub-label">Current: ${tqqqPrice.toFixed(2)}</span>
                </div>
                <div className="risk-item">
                  <label>SQQQ Stop Loss</label>
                  <span className="value negative">${sqqqStop}</span>
                  <span className="sub-label">Current: ${sqqqPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="ghibli-card">
            <div className="card-header">
              <h2>📊 PERFORMANCE SUMMARY</h2>
            </div>
            <div className="card-content">
              <div className="performance-grid">
                <div className="performance-item">
                  <label>Total P&L</label>
                  <span className="value positive">$0.00</span>
                </div>
                <div className="performance-item">
                  <label>Return</label>
                  <span className="value positive">0.00%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column - Charts */}
        <div data-testid="center-column" className="center-column">
          {/* VIX Chart */}
          <div
            data-testid="vix-chart-container"
            className="ghibli-card ghibli-chart"
            aria-label="VIX Index historical chart showing 30-day trend"
            role="img"
            tabIndex={0}
          >
            <div className="card-header">
              <h2>📊 VIX Index</h2>
              <span className="chart-subtitle">Volatility & Market Trend</span>
            </div>
            <div className="card-content">
              <VixChart
                data={vixChartData}
                loading={loading && !historicalData}
                showThreshold={true}
              />
            </div>
          </div>

          {/* TQQQ/SQQQ Chart */}
          <div
            data-testid="tqqq-sqqq-chart-container"
            className="ghibli-card ghibli-chart"
            aria-label="TQQQ and SQQQ price chart showing 30-day comparison"
            role="img"
            tabIndex={0}
          >
            <div className="card-header">
              <h2>📊 TQQQ/SQQQ Price</h2>
              <span className="chart-subtitle">TQQQ/SQQQ Prices (Last 30 Days)</span>
            </div>
            <div className="card-content">
              <TqqqSqqqChart
                tqqqData={tqqqChartData}
                sqqqData={sqqqChartData}
                loading={loading && !historicalData}
              />
            </div>
          </div>

          {/* Decay Opportunity Chart */}
          <div
            data-testid="decay-chart-container"
            className="ghibli-card ghibli-chart"
            aria-label="Decay opportunity chart showing profit potential from ETF decay"
            role="img"
            tabIndex={0}
          >
            <div className="card-header">
              <h2>💰 Decay Opportunity</h2>
              <span className="chart-subtitle">Profit Potential from ETF Decay</span>
            </div>
            <div className="card-content">
              <DecayOpportunityChart
                tqqqData={tqqqChartData}
                sqqqData={sqqqChartData}
                loading={loading && !historicalData}
              />
            </div>
          </div>

          {/* Strategy Performance Chart */}
          <div
            data-testid="strategy-chart-container"
            className="ghibli-card ghibli-chart"
            aria-label="Strategy performance chart showing historical backtest results"
            role="img"
            tabIndex={0}
          >
            <div className="card-header">
              <h2>📈 Strategy Performance</h2>
              <span className="chart-subtitle">Historical Backtest Results</span>
            </div>
            <div className="card-content">
              <StrategyPerformanceChart
                tqqqData={tqqqChartData}
                sqqqData={sqqqChartData}
                loading={loading && !historicalData}
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div data-testid="right-column" className="right-column">
          {/* Position Details */}
          <div className="ghibli-card">
            <div className="card-header">
              <h2>📋 POSITION DETAILS</h2>
              <button
                className="btn-active"
                onClick={() => setPositionActive(!positionActive)}
                role="switch"
                aria-checked={positionActive}
                aria-label="Toggle position active status"
              >
                ⚡ ACTIVE
              </button>
            </div>
            <div className="card-content">
              <div className="position-info">
                <div className="info-row">
                  <label htmlFor="entry-date">Entry Date</label>
                  <input
                    id="entry-date"
                    type="date"
                    className="input-field"
                    value={positionEntryDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setPositionEntryDate(newDate);
                      // Fetch real historical prices for the selected date
                      // This will automatically update positions via the useEntryPrices hook
                      fetchHistoricalPrices(newDate);
                      // Clear legacy stored prices to allow hook to take priority
                      setStoredEntryPrices(null);
                      try {
                        localStorage.setItem('positionEntryDate', newDate);
                      } catch (error) {
                        console.warn('Could not save to localStorage:', error);
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    aria-label="Position entry date"
                  />
                  {fetchingHistoricalPrices && (
                    <span className="text-warm-500 text-sm animate-pulse">Loading...</span>
                  )}
                </div>
                {historicalActualDate && historicalActualDate !== positionEntryDate && (
                  <div className="info-row">
                    <label>Actual Trading Date</label>
                    <span className="text-warm-600">{historicalActualDate}</span>
                  </div>
                )}
                {historicalPricesError && (
                  <div className="info-row">
                    <label>Error</label>
                    <span className="text-red-500 text-sm">{historicalPricesError}</span>
                  </div>
                )}
                <div className="info-row">
                  <label>Days Active</label>
                  <span>{positions.length > 0 ? calculateDaysActive(historicalActualDate ?? positionEntryDate) : 0}</span>
                </div>
              </div>

              <table className="position-table" aria-label="Current positions">
                <thead>
                  <tr>
                    <th scope="col">Sym</th>
                    <th scope="col">Shr</th>
                    <th scope="col">Entry</th>
                    <th scope="col">Curr</th>
                    <th scope="col">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No active positions
                      </td>
                    </tr>
                  ) : (
                    positions.map((pos) => {
                      const posWithPnL = calculatePositionPnL(pos);
                      return (
                        <tr key={pos.symbol}>
                          <td>{pos.symbol}</td>
                          <td>{pos.shares}</td>
                          <td>${pos.entryPrice.toFixed(2)}</td>
                          <td>${pos.currentPrice.toFixed(2)}</td>
                          <td className={getPnlClass(posWithPnL.pnl)}>
                            {formatPnl(posWithPnL.pnl)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="allocation-info">
                <div className="info-row">
                  <label>Initial Allocation:</label>
                  <span>${(committedSizing ?? positionSizing).allocationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="info-row">
                  <label>Ratio (SQQQ:TQQQ):</label>
                  <span>{(committedSizing ?? positionSizing).tqqqShares > 0
                    ? `${((committedSizing ?? positionSizing).sqqqShares / (committedSizing ?? positionSizing).tqqqShares).toFixed(2)}:1`
                    : '—'}</span>
                </div>
                <div className="info-row">
                  <label>Recommended Ratio:</label>
                  <span className="positive">1.25:1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Entry Score Calculation */}
          <EntryScoreDisplay
            volatilityScore={entryScore?.volatilityScore}
            trendScore={entryScore?.trendScore}
            decayScore={entryScore?.decayScore}
            totalScore={entryScore?.total}
            loading={loading && !entryScore}
          />

          {/* Position Sizing Recommendations - uses committed sizing (only updates on Update click) */}
          <div className="ghibli-card">
            <div className="card-header">
              <h2>📊 POSITION SIZING RECOMMENDATIONS</h2>
            </div>
            <div className="card-content">
              <div className="recommendations">
                <p>Based on current market conditions:</p>
                <ul>
                  <li>VIX: <strong>{vixValue.toFixed(1)}</strong> ({(committedSizing ?? positionSizing).vixRegimeLabel})</li>
                  <li>Allocation: <strong>{((committedSizing ?? positionSizing).allocationPercent * 100).toFixed(0)}%</strong> of account</li>
                  <li>TQQQ: Short <strong>{(committedSizing ?? positionSizing).tqqqShares}</strong> shares @ ${tqqqPrice.toFixed(2)}</li>
                  <li>SQQQ: Short <strong>{(committedSizing ?? positionSizing).sqqqShares}</strong> shares @ ${sqqqPrice.toFixed(2)}</li>
                  <li>Total Investment: <strong>${(committedSizing ?? positionSizing).totalInvestment.toFixed(2)}</strong></li>
                  <li>Margin Required: <strong>${(committedSizing ?? positionSizing).marginRequired.toFixed(2)}</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Fidelity Implementation Guide */}
          <div className="ghibli-card">
            <div className="card-header">
              <h2>🏦 FIDELITY IMPLEMENTATION GUIDE</h2>
            </div>
            <div className="card-content">
              <div className="implementation-guide">
                <h4>Current Market Assessment:</h4>
                <p>⚠️ <strong>WAIT</strong> - Entry score ({entryScore?.total || 40}/100) is below threshold of 70</p>

                <h4>When conditions are favorable:</h4>
                <ol>
                  <li>Log in to your Fidelity account</li>
                  <li>Navigate to &quot;Trade&quot; → &quot;Stocks/ETFs&quot;</li>
                  <li>Enter ticker &quot;TQQQ&quot;, select &quot;Sell Short&quot;</li>
                  <li>Enter shares from recommendations above</li>
                  <li>Review and submit order</li>
                  <li>Repeat for &quot;SQQQ&quot;</li>
                  <li>Set stop-loss orders as shown in Risk Management</li>
                  <li>Record entry date for quarterly reset</li>
                </ol>

                <h4>Daily Monitoring Checklist:</h4>
                <ul>
                  <li>Check if VIX &lt; 20 (exit signal)</li>
                  <li>Monitor 10% decay threshold</li>
                  <li>Track 15% max drawdown</li>
                  <li>Watch for 20% profit target</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
