/**
 * MarketMetrics Component
 *
 * Displays market conditions including:
 * - Entry Score with signal (ENTER/WATCH/WAIT)
 * - VIX Index with regime
 * - Market Trend indicator
 *
 * Ported from: Flask app's Market Conditions section
 */

'use client';

// ============================================================================
// Types
// ============================================================================

export type Signal = 'ENTER' | 'WATCH' | 'WAIT';
export type VixRegime = 'Low' | 'Moderate' | 'High' | 'Extreme';
export type MarketTrend = 'bullish' | 'bearish' | 'neutral';

export interface MarketMetricsProps {
  entryScore?: number;
  signal?: Signal;
  vixValue?: number;
  vixRegime?: VixRegime;
  marketTrend?: MarketTrend;
  loading?: boolean;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSignalColor(signal?: Signal): string {
  switch (signal) {
    case 'ENTER':
      return 'text-green-500';
    case 'WATCH':
      return 'text-yellow-500';
    case 'WAIT':
      return 'text-red-500';
    default:
      return 'text-warm-600';
  }
}

function getRegimeColor(regime?: VixRegime): string {
  switch (regime) {
    case 'Low':
      return 'text-green-500';
    case 'Moderate':
      return 'text-yellow-500';
    case 'High':
      return 'text-orange-500';
    case 'Extreme':
      return 'text-red-500';
    default:
      return 'text-warm-600';
  }
}

function getTrendColor(trend?: MarketTrend): string {
  switch (trend) {
    case 'bullish':
      return 'text-green-500';
    case 'bearish':
      return 'text-red-500';
    case 'neutral':
      return 'text-yellow-500';
    default:
      return 'text-warm-600';
  }
}

function getTrendArrow(trend?: MarketTrend): string {
  switch (trend) {
    case 'bullish':
      return '↑';
    case 'bearish':
      return '↓';
    case 'neutral':
      return '→';
    default:
      return '-';
  }
}

function getTrendLabel(trend?: MarketTrend): string {
  switch (trend) {
    case 'bullish':
      return 'Bullish';
    case 'bearish':
      return 'Bearish';
    case 'neutral':
      return 'Neutral';
    default:
      return 'Loading...';
  }
}

// ============================================================================
// Component
// ============================================================================

export function MarketMetrics({
  entryScore,
  signal,
  vixValue,
  vixRegime,
  marketTrend,
  loading = false,
  error,
}: MarketMetricsProps) {
  if (error) {
    return (
      <div data-testid="market-metrics" className="ghibli-card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-warm-800">📈 MARKET CONDITIONS</h2>
        </div>
        <div className="card-content">
          <div data-testid="market-metrics-error" className="text-red-500 text-center py-4">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="market-metrics" className="ghibli-card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-warm-800">📈 MARKET CONDITIONS</h2>
      </div>
      <div className={`card-content ${loading ? 'animate-pulse' : ''}`}>
        <div className="grid grid-cols-1 gap-4">
          {/* Entry Score */}
          <div
            data-testid="metric-box-entry"
            className="metric-box bg-warm-100 rounded-lg p-4"
            aria-label="entry score"
          >
            <div className="metric-header text-xs font-medium text-warm-600 uppercase tracking-wide">
              ENTRY SCORE
            </div>
            <div
              data-testid="entry-score-value"
              className="metric-value text-3xl font-bold text-primary-green mt-1"
            >
              {loading ? '...' : entryScore !== undefined ? `${entryScore}/100` : '-'}
            </div>
            <div
              data-testid="entry-signal"
              className={`metric-status text-sm font-medium mt-1 ${getSignalColor(signal)}`}
            >
              {loading ? 'Loading...' : signal || 'Loading...'}
            </div>
          </div>

          {/* VIX Index */}
          <div
            data-testid="metric-box-vix"
            className="metric-box bg-warm-100 rounded-lg p-4"
            aria-label="vix index"
          >
            <div className="metric-header text-xs font-medium text-warm-600 uppercase tracking-wide">
              VIX INDEX
            </div>
            <div
              data-testid="vix-value"
              className="metric-value text-3xl font-bold text-primary-green mt-1"
            >
              {loading ? '...' : vixValue !== undefined ? vixValue.toFixed(2) : '-'}
            </div>
            <div
              data-testid="vix-regime"
              className={`metric-status text-sm font-medium mt-1 ${getRegimeColor(vixRegime)}`}
            >
              {loading ? 'Loading...' : vixRegime || 'Loading...'}
            </div>
          </div>

          {/* Market Trend */}
          <div
            data-testid="metric-box-trend"
            className="metric-box bg-warm-100 rounded-lg p-4"
            aria-label="market trend"
          >
            <div className="metric-header text-xs font-medium text-warm-600 uppercase tracking-wide">
              MARKET TREND
            </div>
            <div data-testid="market-trend" className="metric-trend flex items-center justify-center gap-2 mt-1">
              <span
                data-testid="trend-arrow"
                className={`text-2xl ${getTrendColor(marketTrend)}`}
              >
                {getTrendArrow(marketTrend)}
              </span>
              <span className={`text-lg font-medium ${getTrendColor(marketTrend)}`}>
                {getTrendLabel(marketTrend)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketMetrics;
