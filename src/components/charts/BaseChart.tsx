/**
 * BaseChart Component
 *
 * Shared rendering shell for all Plotly chart components.
 * Handles the common loading / error / empty / plot lifecycle.
 *
 * Each consumer is responsible for its own data-processing hooks
 * and passes ready-to-render traces + layout + config here.
 *
 * CRITICAL: Uses 'scatter' type traces only — NEVER 'scattergl' (no spline support)
 */

'use client';

import dynamic from 'next/dynamic';
import type { Data, Layout, Config } from 'plotly.js';

// Dynamic import — uses partial bundle (~1MB vs ~3.5MB full plotly.js)
// Shared across all chart components so the module is loaded only once.
const Plot = dynamic(() => import('@/lib/PlotlyPartial'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] flex items-center justify-center animate-pulse">
      <span className="text-warm-500 text-sm">Loading chart...</span>
    </div>
  ),
});

// ============================================================================
// Types
// ============================================================================

export interface BaseChartProps {
  /** Plotly trace data — computed by the parent chart component */
  traces: Data[];
  /** Plotly layout — computed by the parent chart component */
  layout: Partial<Layout>;
  /** Plotly config — usually PLOT_CONFIG from chart-config */
  config: Partial<Config>;
  /** Chart height in pixels */
  height: number;
  /** Optional CSS class applied to the outermost wrapper */
  className?: string;
  /** When true, shows the loading state instead of the chart */
  loading?: boolean;
  /** Text displayed in the loading state */
  loadingMessage?: string;
  /** When set, shows the error state instead of the chart */
  error?: string;
  /** When true, shows the empty state instead of the chart */
  isEmpty: boolean;
  /** Text displayed in the empty state */
  emptyMessage?: string;
  /**
   * ARIA role for the main chart wrapper when data is present.
   * Use "img" for charts that need accessible role="img" semantics.
   */
  role?: string;
  /** Accessible label for the main chart wrapper */
  ariaLabel?: string;
  /** tabIndex for keyboard focus on the chart container */
  tabIndex?: number;
}

// ============================================================================
// Component
// ============================================================================

export function BaseChart({
  traces,
  layout,
  config,
  height,
  className = '',
  loading = false,
  loadingMessage = 'Loading data...',
  error,
  isEmpty,
  emptyMessage = 'No data available',
  role,
  ariaLabel,
  tabIndex,
}: BaseChartProps) {
  // Loading state — role="status" satisfies both aria and getByRole('status') tests
  if (loading) {
    return (
      <div
        className={`h-[${height}px] flex items-center justify-center ${className}`}
        role="status"
        aria-label={loadingMessage}
      >
        <div className="text-warm-brown animate-pulse">{loadingMessage}</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`h-[${height}px] flex items-center justify-center ${className}`}
        role="alert"
      >
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div
        className={`h-[${height}px] flex items-center justify-center ${className}`}
        aria-label={emptyMessage}
      >
        <div className="text-warm-600">{emptyMessage}</div>
      </div>
    );
  }

  // Chart render
  return (
    <div
      className={className}
      style={{ width: '100%', height }}
      role={role}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
    >
      <Plot
        data={traces}
        layout={layout}
        config={config}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default BaseChart;
