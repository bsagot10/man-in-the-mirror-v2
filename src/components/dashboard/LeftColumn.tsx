/**
 * LeftColumn Component
 *
 * Left sidebar of the Dashboard: Account Information, Market Conditions,
 * Risk Management, and Performance Summary cards.
 */

'use client';

import { MarketMetrics } from '@/components/dashboard/MarketMetrics';
import type { Signal, Position } from '@/types/chart-types';
import { getPnlClass, formatPnl } from '@/types/chart-types';
import type { PositionSizing } from '@/lib/market-analysis/positionSizing';
import type { VixRegime, MarketTrend } from '@/types/chart-types';
import type { PortfolioMetrics } from '@/hooks/useDashboard';

// ============================================================================
// Types
// ============================================================================

export interface LeftColumnProps {
  accountSize: number;
  setAccountSize: (v: number) => void;
  handleUpdateAccountSize: () => void;
  entryScore: { total: number; signal: string; volatilityScore: number; trendScore: number; decayScore: number } | null;
  loading: boolean;
  error: string | null;
  marketData: { vix: { currentPrice: number } } | null;
  vixRegime: VixRegime | undefined;
  marketTrend: MarketTrend | undefined;
  tqqqPrice: number;
  sqqqPrice: number;
  tqqqStop: string;
  sqqqStop: string;
  portfolioMetrics: PortfolioMetrics;
  positions: Position[];
  positionSizing: PositionSizing;
  committedSizing: PositionSizing | null;
}

// ============================================================================
// Component
// ============================================================================

export function LeftColumn({
  accountSize,
  setAccountSize,
  handleUpdateAccountSize,
  entryScore,
  loading,
  error,
  marketData,
  vixRegime,
  marketTrend,
  tqqqPrice,
  sqqqPrice,
  tqqqStop,
  sqqqStop,
  portfolioMetrics,
}: LeftColumnProps) {
  return (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="account-size">Account Status:</label>
              <span className="status-indicator">Good Standing</span>
            </div>
            <div className="control-group">
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
                aria-label="Enter new position at current market prices"
                title="Enter new position at current prices"
              >
                Enter Position
              </button>
            </div>
            <p className="helper-text" style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
              Saves account size and enters a new position at today&apos;s prices
            </p>
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
              <span className={`value ${getPnlClass(portfolioMetrics.totalPnl)}`}>
                {formatPnl(portfolioMetrics.totalPnl)}
              </span>
            </div>
            <div className="performance-item">
              <label>Return</label>
              <span className={`value ${getPnlClass(portfolioMetrics.totalPnl)}`}>
                {portfolioMetrics.totalPnl >= 0 ? '+' : ''}{portfolioMetrics.returnPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftColumn;
