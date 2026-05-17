/**
 * Dashboard Page
 *
 * Main page for the Man in the Mirror Strategy dashboard.
 * Integrates all components: VixChart, TqqqSqqqChart, MarketMetrics, EntryScoreDisplay
 *
 * Ported from: Flask app's index.html
 */

'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { LeftColumn } from '@/components/dashboard/LeftColumn';
import { ChartsColumn } from '@/components/dashboard/ChartsColumn';
import { RightColumn } from '@/components/dashboard/RightColumn';
import { RefreshIcon } from '@/components/icons/RefreshIcon';
import { AutoRefreshIcon } from '@/components/icons/AutoRefreshIcon';

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

// ============================================================================
// Dashboard Component
// ============================================================================

export default function Dashboard() {
  const state = useDashboard();

  const {
    marketData,
    historicalData,
    entryScore,
    loading,
    error,
    marketOpen,
    lastUpdated,
    refresh,
    autoRefresh,
    setAutoRefresh,
    accountSize,
    setAccountSize,
    positionActive,
    setPositionActive,
    positionEntryDate,
    setPositionEntryDate,
    setStoredEntryPrices,
    positions,
    committedSizing,
    vixRegime,
    marketTrend,
    vixChartData,
    tqqqChartData,
    sqqqChartData,
    vixValue,
    tqqqPrice,
    sqqqPrice,
    tqqqStop,
    sqqqStop,
    positionSizing,
    portfolioMetrics,
    handleUpdateAccountSize,
    getStatusMessage,
    fetchingHistoricalPrices,
    historicalPricesError,
    historicalActualDate,
    fetchHistoricalPrices,
  } = state;

  // Handle error state
  if (error && !marketData) {
    return (
      <div data-testid="dashboard" className="min-h-screen bg-warm-gradient p-6">
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
      {/* Live Region for Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {getStatusMessage()}
      </div>

      {/* Cached Data Indicator */}
      <div className="cached-indicator">Cached Data</div>

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

          <span data-testid="last-update" className="last-update">
            Last updated: {lastUpdated ? formatTimestamp(lastUpdated) : '-'}
          </span>

          <span data-testid="market-status" className="market-status">
            Market: {marketOpen ? 'Open' : 'Closed'}
          </span>

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
        <LeftColumn
          accountSize={accountSize}
          setAccountSize={setAccountSize}
          handleUpdateAccountSize={handleUpdateAccountSize}
          entryScore={entryScore}
          loading={loading}
          error={error}
          marketData={marketData}
          vixRegime={vixRegime}
          marketTrend={marketTrend}
          tqqqPrice={tqqqPrice}
          sqqqPrice={sqqqPrice}
          tqqqStop={tqqqStop}
          sqqqStop={sqqqStop}
          positionActive={positionActive}
          portfolioMetrics={portfolioMetrics}
          positions={positions}
          positionSizing={positionSizing}
          committedSizing={committedSizing}
        />

        <ChartsColumn
          vixChartData={vixChartData}
          tqqqChartData={tqqqChartData}
          sqqqChartData={sqqqChartData}
          loading={loading}
          historicalData={historicalData}
        />

        <RightColumn
          positions={positions}
          positionActive={positionActive}
          setPositionActive={setPositionActive}
          positionEntryDate={positionEntryDate}
          setPositionEntryDate={setPositionEntryDate}
          fetchHistoricalPrices={fetchHistoricalPrices}
          setStoredEntryPrices={setStoredEntryPrices}
          fetchingHistoricalPrices={fetchingHistoricalPrices}
          historicalActualDate={historicalActualDate}
          historicalPricesError={historicalPricesError}
          entryScore={entryScore}
          loading={loading}
          positionSizing={positionSizing}
          committedSizing={committedSizing}
          vixValue={vixValue}
          tqqqPrice={tqqqPrice}
          sqqqPrice={sqqqPrice}
        />
      </main>
    </div>
  );
}
