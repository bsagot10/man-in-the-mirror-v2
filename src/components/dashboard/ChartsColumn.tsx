/**
 * ChartsColumn Component
 *
 * Center column of the Dashboard: VIX, TQQQ/SQQQ, Decay Opportunity,
 * and Strategy Performance charts.
 */

'use client';

import { VixChart } from '@/components/charts/VixChart';
import { TqqqSqqqChart } from '@/components/charts/TqqqSqqqChart';
import { DecayOpportunityChart } from '@/components/charts/DecayOpportunityChart';
import { StrategyPerformanceChart } from '@/components/charts/StrategyPerformanceChart';

// ============================================================================
// Types
// ============================================================================

interface PriceDataPoint {
  date: string;
  close: number;
}

export interface ChartsColumnProps {
  vixChartData: PriceDataPoint[];
  tqqqChartData: PriceDataPoint[];
  sqqqChartData: PriceDataPoint[];
  tqqqStop?: string;
  sqqqStop?: string;
  loading: boolean;
  historicalData: unknown;
}

// ============================================================================
// Component
// ============================================================================

export function ChartsColumn({
  vixChartData,
  tqqqChartData,
  sqqqChartData,
  tqqqStop,
  sqqqStop,
  loading,
  historicalData,
}: ChartsColumnProps) {
  const chartsLoading = loading && !historicalData;

  return (
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
          <span className="chart-subtitle">Volatility &amp; Market Trend</span>
        </div>
        <div className="card-content">
          <VixChart
            data={vixChartData}
            loading={chartsLoading}
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
            tqqqStop={tqqqStop !== undefined ? parseFloat(tqqqStop) : undefined}
            sqqqStop={sqqqStop !== undefined ? parseFloat(sqqqStop) : undefined}
            loading={chartsLoading}
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
            loading={chartsLoading}
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
            loading={chartsLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default ChartsColumn;
