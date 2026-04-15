/**
 * Chart Configuration
 *
 * CRITICAL: These values are marked "PERFECT - DO NOT MODIFY" in CLAUDE.md
 * Any changes to these values MUST be validated against the original Flask app's charts.
 *
 * Ported from:
 * - backend/chart_config.py
 * - frontend/static/js/chartUtils.js
 */

import type { PlotData, Layout } from 'plotly.js';

// ============================================================================
// Chart Colors - PERFECT - DO NOT MODIFY
// ============================================================================

export const CHART_COLORS = {
  vix: '#F44336',           // Red for VIX
  tqqq: '#00BCD4',          // Cyan for TQQQ
  sqqq: '#E91E63',          // Pink for SQQQ
  decay: '#4CAF50',         // Green for decay
  actual: '#F44336',        // Red for actual values
  theoretical: '#FFC107',   // Yellow for theoretical
  entryThreshold: '#FF9800', // Orange for entry threshold
  extremeThreshold: '#FF9800', // Orange for 20 threshold line
  strategyPnl: '#ff8c42',   // Orange for strategy P&L
} as const;

// ============================================================================
// Spline Configuration - PERFECT - DO NOT MODIFY
// ============================================================================

export const SPLINE_CONFIG = {
  shape: 'spline' as const,
  smoothing: 1.3,           // Maximum smoothing for all charts
  simplify: false,          // NEVER optimize points
  splinemode: 'cubic',      // Cubic interpolation
  width: 3,
} as const;

// ============================================================================
// Layout Configuration - PERFECT - DO NOT MODIFY
// ============================================================================

export const LAYOUT_CONFIG = {
  plot_bgcolor: 'rgba(254, 246, 228, 0.3)',  // Warm transparent background
  paper_bgcolor: 'transparent',               // Fully transparent
  font: {
    family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
    size: 12,
    color: '#5a4a3a',  // Warm brown text for Night Shift
  },
  margin: { t: 60, r: 120, b: 80, l: 80 },
  autosize: true,
} as const;

// ============================================================================
// Axis Configuration - PERFECT - DO NOT MODIFY
// ============================================================================

export const AXIS_CONFIG = {
  showgrid: true,
  gridcolor: 'rgba(139, 69, 19, 0.08)',
  zeroline: false,
  showticklabels: true,
  automargin: true,
  tickangle: 0,
  tickcolor: 'rgba(139, 69, 19, 0.3)',
  linecolor: 'rgba(139, 69, 19, 0.3)',
  showline: true,
  tickfont: {
    size: 11,
    color: '#8b6914',
    family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
  },
  titlefont: {
    size: 12,
    color: '#5a4a3a',
    family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
  },
} as const;

// ============================================================================
// Legend Configuration - PERFECT - DO NOT MODIFY
// ============================================================================

export const LEGEND_CONFIG = {
  orientation: 'v' as const,
  x: 0.02,
  y: 0.98,
  xanchor: 'left' as const,
  yanchor: 'top' as const,
  bgcolor: 'rgba(255, 255, 255, 0)',
  bordercolor: 'rgba(0, 0, 0, 0)',
  borderwidth: 0,
  font: {
    family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
    size: 12,
    color: '#333',
  },
  itemsizing: 'constant' as const,
  itemwidth: 30,
  itemclick: false as const,
  itemdoubleclick: false as const,
  tracegroupgap: 3,
} as const;

// ============================================================================
// Plot Configuration - PERFECT - DO NOT MODIFY
// ============================================================================

export const PLOT_CONFIG = {
  responsive: true,
  displayModeBar: false,
  staticPlot: false,
  doubleClick: false,
  showTips: false,
} as const;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a trace configuration for chart data.
 *
 * IMPORTANT: Always uses 'scatter' type - NEVER 'scattergl'
 * scattergl does not support spline interpolation
 */
export function createTraceConfig(
  dates: string[],
  values: number[],
  name: string,
  color: string,
): Partial<PlotData> {
  return {
    type: 'scatter',  // CRITICAL: Never use 'scattergl'
    mode: 'lines',
    x: dates,
    y: values,
    name,
    line: {
      color,
      shape: SPLINE_CONFIG.shape,
      smoothing: SPLINE_CONFIG.smoothing,
      simplify: SPLINE_CONFIG.simplify,
      // @ts-expect-error - splinemode is valid but not in PlotData types
      splinemode: SPLINE_CONFIG.splinemode,
      width: SPLINE_CONFIG.width,
    },
    connectgaps: true,
    showlegend: true,
  };
}

/**
 * Create layout configuration for a chart.
 */
export function createLayoutConfig(
  title: string,
  height: number = 480,
): Partial<Layout> {
  return {
    title: {
      text: title,
      font: {
        size: 14,
        color: LAYOUT_CONFIG.font.color,
        family: LAYOUT_CONFIG.font.family,
      },
      y: 0.95,
      x: 0.5,
      xanchor: 'center',
      yanchor: 'top',
    },
    plot_bgcolor: LAYOUT_CONFIG.plot_bgcolor,
    paper_bgcolor: LAYOUT_CONFIG.paper_bgcolor,
    font: { ...LAYOUT_CONFIG.font },
    margin: { ...LAYOUT_CONFIG.margin },
    autosize: LAYOUT_CONFIG.autosize,
    showlegend: true,
    legend: { ...LEGEND_CONFIG },
    height,
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'rgba(254, 246, 228, 0.95)',
      bordercolor: '#8b6914',
      font: {
        size: 11,
        family: LAYOUT_CONFIG.font.family,
      },
    },
  };
}

/**
 * Create X-axis configuration.
 */
export function createXAxisConfig(nticks: number = 5): Partial<Layout['xaxis']> {
  return {
    title: { text: 'Date' },
    ...AXIS_CONFIG,
    tickformat: '%b %d',
    tickmode: 'auto',
    nticks,
    fixedrange: false,
  };
}

/**
 * Create Y-axis configuration.
 */
export function createYAxisConfig(
  title: string,
  range?: [number, number],
): Partial<Layout['yaxis']> {
  const config: Partial<Layout['yaxis']> = {
    title: { text: title },
    ...AXIS_CONFIG,
    autorange: true,
    tickformat: '.1f',
  };

  if (range) {
    config.range = range;
    config.autorange = false;
  }

  return config;
}

// ============================================================================
// Type Exports (internal)
// ============================================================================

type ChartColor = keyof typeof CHART_COLORS;
