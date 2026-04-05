/**
 * VIX Chart Component
 *
 * Displays VIX historical data as a smooth spline line chart.
 * Includes optional entry threshold line at VIX = 20.
 *
 * CRITICAL: Uses 'scatter' type - NEVER 'scattergl' (no spline support)
 *
 * Ported from: Flask app's VIX chart implementation
 */

'use client';

import { useMemo } from 'react';
import type { Data, Layout, Config, Shape } from 'plotly.js';
import {
  CHART_COLORS,
  SPLINE_CONFIG,
  LAYOUT_CONFIG,
  AXIS_CONFIG,
  LEGEND_CONFIG,
  PLOT_CONFIG,
} from '@/lib/chart-config';
import { processChartData } from '@/lib/data-processing/removeFlatSegments';
import { BaseChart } from './BaseChart';

// ============================================================================
// Types
// ============================================================================

export interface VixDataPoint {
  date: string;
  close: number;
}

export interface VixChartProps {
  data: VixDataPoint[];
  title?: string;
  height?: number;
  showThreshold?: boolean;
  className?: string;
  loading?: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TITLE = 'VIX Index (Last 30 Days)';
const DEFAULT_HEIGHT = 480;
const ENTRY_THRESHOLD = 20; // VIX level for entry signal

// ============================================================================
// Component
// ============================================================================

export function VixChart({
  data,
  title = DEFAULT_TITLE,
  height = DEFAULT_HEIGHT,
  showThreshold = false,
  className = '',
  loading = false,
  error,
}: VixChartProps) {
  // IMPORTANT: All hooks must be called unconditionally before any early returns
  // to satisfy React's Rules of Hooks

  // Process data to remove flat segments for smooth splines
  const { dates, values } = useMemo(() => {
    if (!data || data.length === 0) {
      return { dates: [] as string[], values: [] as number[] };
    }

    // Filter out null/undefined values
    const validData = data.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );

    const rawDates = validData.map((d) => d.date);
    const rawValues = validData.map((d) => d.close);

    // Process values to remove flat segments
    const processedValues = processChartData(rawValues);

    // If lengths differ after processing, we need to align dates
    // For simplicity, return original data as spline will handle smoothing
    if (processedValues.length !== rawDates.length) {
      return { dates: rawDates, values: rawValues };
    }

    return { dates: rawDates, values: processedValues };
  }, [data]);

  // Create trace configuration
  const traces: Data[] = useMemo(() => {
    if (dates.length === 0) return [];
    return [
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: dates,
        y: values,
        name: 'VIX',
        line: {
          color: CHART_COLORS.vix,
          shape: SPLINE_CONFIG.shape,
          smoothing: SPLINE_CONFIG.smoothing,
          width: SPLINE_CONFIG.width,
        },
        connectgaps: true,
        showlegend: true,
      },
    ];
  }, [dates, values]);

  // Create threshold shapes
  const shapes: Partial<Shape>[] = useMemo(() => {
    if (!showThreshold || dates.length === 0) return [];

    return [
      {
        type: 'line' as const,
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: ENTRY_THRESHOLD,
        y1: ENTRY_THRESHOLD,
        line: {
          color: CHART_COLORS.entryThreshold,
          width: 2,
          dash: 'dash',
        },
      },
    ];
  }, [showThreshold, dates]);

  // Create layout configuration
  const layout: Partial<Layout> = useMemo(() => {
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
        xanchor: 'center' as const,
        yanchor: 'top' as const,
      },
      plot_bgcolor: LAYOUT_CONFIG.plot_bgcolor,
      paper_bgcolor: LAYOUT_CONFIG.paper_bgcolor,
      font: { ...LAYOUT_CONFIG.font },
      margin: { ...LAYOUT_CONFIG.margin },
      autosize: LAYOUT_CONFIG.autosize,
      showlegend: true,
      legend: { ...LEGEND_CONFIG },
      height,
      hovermode: 'x unified' as const,
      hoverlabel: {
        bgcolor: 'rgba(254, 246, 228, 0.95)',
        bordercolor: '#8b6914',
        font: {
          size: 11,
          family: LAYOUT_CONFIG.font.family,
        },
      },
      xaxis: {
        title: { text: 'Date' },
        ...AXIS_CONFIG,
        tickformat: '%b %d',
        tickmode: 'auto' as const,
        nticks: 5,
        fixedrange: false,
      },
      yaxis: {
        title: { text: 'VIX Value', standoff: 15 },
        ...AXIS_CONFIG,
        autorange: true,
        tickformat: '.1f',
      },
      shapes,
    };
  }, [title, height, shapes]);

  const config: Partial<Config> = { ...PLOT_CONFIG };

  return (
    <BaseChart
      traces={traces}
      layout={layout}
      config={config}
      height={height}
      className={className}
      loading={loading}
      loadingMessage="Loading VIX data..."
      error={error}
      isEmpty={!data || data.length === 0}
      emptyMessage="No data available"
    />
  );
}

export default VixChart;
