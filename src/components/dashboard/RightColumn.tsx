/**
 * RightColumn Component
 *
 * Right sidebar of the Dashboard: Position Details, Entry Score, Position Sizing,
 * and Fidelity Implementation Guide cards.
 */

'use client';

import { EntryScoreDisplay } from '@/components/dashboard/EntryScoreDisplay';
import type { Position } from '@/types/chart-types';
import { calculatePositionPnL, getPnlClass, formatPnl, calculateDaysActive } from '@/types/chart-types';
import type { PositionSizing } from '@/lib/market-analysis/positionSizing';

// ============================================================================
// Types
// ============================================================================

export interface RightColumnProps {
  positions: Position[];
  positionActive: boolean;
  setPositionActive: (v: boolean) => void;
  positionEntryDate: string;
  setPositionEntryDate: (v: string) => void;
  fetchHistoricalPrices: (date: string) => Promise<void>;
  setStoredEntryPrices: (v: { tqqq: number; sqqq: number } | null) => void;
  fetchingHistoricalPrices: boolean;
  historicalActualDate: string | null;
  historicalPricesError: string | null;
  entryScore: { total: number; signal: string; volatilityScore: number; trendScore: number; decayScore: number } | null;
  loading: boolean;
  positionSizing: PositionSizing;
  committedSizing: PositionSizing | null;
  vixValue: number | undefined;
  tqqqPrice: number | undefined;
  sqqqPrice: number | undefined;
}

// ============================================================================
// Component
// ============================================================================

export function RightColumn({
  positions,
  positionActive,
  setPositionActive,
  positionEntryDate,
  setPositionEntryDate,
  fetchHistoricalPrices,
  setStoredEntryPrices,
  fetchingHistoricalPrices,
  historicalActualDate,
  historicalPricesError,
  entryScore,
  loading,
  positionSizing,
  committedSizing,
  vixValue,
  tqqqPrice,
  sqqqPrice,
}: RightColumnProps) {
  const effectiveSizing = committedSizing ?? positionSizing;

  return (
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
                  fetchHistoricalPrices(newDate);
                  setStoredEntryPrices(null);
                  try { localStorage.setItem('positionEntryDate', newDate); }
                  catch (err) { console.warn('Could not save to localStorage:', err); }
                }}
                max={new Date().toISOString().split('T')[0]}
                aria-label="Position entry date"
                title="Change date to see P&L from that entry point"
              />
              {fetchingHistoricalPrices && (
                <span className="text-warm-500 text-sm animate-pulse">Loading prices...</span>
              )}
            </div>
            <p className="helper-text" style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
              Select a past date to calculate P&amp;L from historical entry prices
            </p>
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
                  <td colSpan={5} className="empty-state">No active positions</td>
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
                      <td className={getPnlClass(posWithPnL.pnl)}>{formatPnl(posWithPnL.pnl)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="allocation-info">
            <div className="info-row">
              <label>Initial Allocation:</label>
              <span>${effectiveSizing.allocationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="info-row">
              <label>Ratio (SQQQ:TQQQ):</label>
              <span>{effectiveSizing.tqqqShares > 0
                ? `${(effectiveSizing.sqqqShares / effectiveSizing.tqqqShares).toFixed(2)}:1`
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
        elevated={(entryScore?.total ?? 0) > 60}
      />

      {/* Position Sizing Recommendations */}
      <div className="ghibli-card">
        <div className="card-header">
          <h2>📊 POSITION SIZING RECOMMENDATIONS</h2>
        </div>
        <div className="card-content">
          <div className="recommendations">
            <p>Based on current market conditions:</p>
            <ul>
              <li>VIX: <strong>{vixValue !== undefined ? vixValue.toFixed(1) : '—'}</strong> ({effectiveSizing.vixRegimeLabel})</li>
              <li>Allocation: <strong>{(effectiveSizing.allocationPercent * 100).toFixed(0)}%</strong> of account</li>
              <li>TQQQ: Short <strong>{effectiveSizing.tqqqShares}</strong> shares @ ${tqqqPrice !== undefined ? tqqqPrice.toFixed(2) : '—'}</li>
              <li>SQQQ: Short <strong>{effectiveSizing.sqqqShares}</strong> shares @ ${sqqqPrice !== undefined ? sqqqPrice.toFixed(2) : '—'}</li>
              <li>Total Investment: <strong>${effectiveSizing.totalInvestment.toFixed(2)}</strong></li>
              <li>Margin Required: <strong>${effectiveSizing.marginRequired.toFixed(2)}</strong></li>
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
            {/* Signal is computed on the UNROUNDED total (strict > 60/40) while the
                displayed total is rounded — wording must not assert an arithmetic
                relation the rounded number could contradict (e.g. "60 is above 60") */}
            {entryScore?.signal === 'ENTER' ? (
              <p>✅ <strong>ENTER</strong> - Entry score ({entryScore.total}/90) — entry conditions met (threshold 60)</p>
            ) : entryScore?.signal === 'WATCH' ? (
              <p>👀 <strong>WATCH</strong> - Entry score ({entryScore.total}/90) — approaching entry threshold (60)</p>
            ) : (
              <p>⚠️ <strong>WAIT</strong> - Entry score ({entryScore?.total ?? 0}/90) — below entry threshold (60)</p>
            )}
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
              <li>Monitor 5% decay threshold</li>
              <li>Track 15% max drawdown</li>
              <li>Watch for 20% profit target</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RightColumn;
