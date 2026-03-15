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

import type { Signal, VixRegime, MarketTrend } from '@/types/chart-types';

// ============================================================================
// Types
// ============================================================================

// Re-export for consumers that import from this component
export type { Signal, VixRegime, MarketTrend };

export interface MarketMetricsProps {
  entryScore?: number;
  signal?: Signal;
  vixValue?: number;
  vixRegime?: VixRegime;
  marketTrend?: MarketTrend;
  loading?: boolean;
  error?: string;
  /** True if market data is stale (older than cache TTL) */
  isStale?: boolean;
  /** Age of cached data in milliseconds */
  cacheAge?: number;
}

// ============================================================================
// Lookup Tables (simpler than switch statements)
// ============================================================================

const SIGNAL_COLORS: Record<Signal, string> = {
  ENTER: 'text-green-500',
  WATCH: 'text-yellow-500',
  WAIT: 'text-red-500',
};

const REGIME_COLORS: Record<VixRegime, string> = {
  Low: 'text-green-500',
  Moderate: 'text-yellow-500',
  High: 'text-orange-500',
  Extreme: 'text-red-500',
};

const TREND_CONFIG: Record<MarketTrend, { color: string; arrow: string; label: string }> = {
  bullish: { color: 'text-green-500', arrow: '↑', label: 'Bullish' },
  bearish: { color: 'text-red-500', arrow: '↓', label: 'Bearish' },
  neutral: { color: 'text-yellow-500', arrow: '→', label: 'Neutral' },
};

const DEFAULT_COLOR = 'text-warm-600';

// Depth elevation per signal state — full class name strings for Tailwind scanner
const SIGNAL_DEPTH: Record<Signal, string> = {
  ENTER: 'shadow-depth-3',
  WATCH: 'shadow-depth-2',
  WAIT:  'shadow-depth-1',
};

const SIGNAL_BG: Record<Signal, string> = {
  ENTER: 'bg-[var(--glass-float)]',
  WATCH: '',   // uses default var(--glass-raised) from .ghibli-card
  WAIT:  'bg-[var(--glass-base)]',
};

// ============================================================================
// Helper Functions
// ============================================================================

function getSignalColor(signal?: Signal): string {
  return signal ? SIGNAL_COLORS[signal] : DEFAULT_COLOR;
}

function getRegimeColor(regime?: VixRegime): string {
  return regime ? REGIME_COLORS[regime] : DEFAULT_COLOR;
}

function getTrendColor(trend?: MarketTrend): string {
  return trend ? TREND_CONFIG[trend].color : DEFAULT_COLOR;
}

function getTrendArrow(trend?: MarketTrend): string {
  return trend ? TREND_CONFIG[trend].arrow : '-';
}

function getTrendLabel(trend?: MarketTrend): string {
  return trend ? TREND_CONFIG[trend].label : 'Loading...';
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
  isStale,
  cacheAge,
}: MarketMetricsProps) {
  // VIX Extreme takes priority over signal depth (market panic = best entry)
  const cardDepthClass = vixRegime === 'Extreme'
    ? 'shadow-depth-extreme'
    : signal ? SIGNAL_DEPTH[signal] : 'shadow-depth-1';

  const cardBgClass = vixRegime === 'Extreme'
    ? ''   // Extreme glow handles emphasis; don't also shift background
    : signal ? SIGNAL_BG[signal] : '';

  if (error) {
    return (
      <div data-testid="market-metrics" className={`ghibli-card ${cardDepthClass} ${cardBgClass}`.trim()}>
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
    <div data-testid="market-metrics" className={`ghibli-card ${cardDepthClass} ${cardBgClass}`.trim()}>
      <div className="card-header">
        <h2 className="text-lg font-semibold text-warm-800">📈 MARKET CONDITIONS</h2>
        {isStale && cacheAge !== undefined && (
          <div
            data-testid="stale-data-indicator"
            className="text-yellow-500 text-xs font-medium"
          >
            ⚠️ Using cached data ({Math.floor(cacheAge / 60000)}m old)
          </div>
        )}
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
              {loading ? '...' : entryScore !== undefined ? `${entryScore}/110` : '-'}
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
