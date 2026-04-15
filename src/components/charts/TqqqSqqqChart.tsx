/**
 * TQQQ/SQQQ Chart Component
 *
 * Displays both TQQQ and SQQQ prices on the same chart to visualize
 * the inverse correlation between these leveraged ETFs.
 *
 * CRITICAL: Uses 'scatter' type - NEVER 'scattergl' (no spline support)
 *
 * Ported from: Flask app's TQQQ/SQQQ chart implementation
 */

'use client';

import { useMemo } from 'react';
import type { Data, Layout, Config } from 'plotly.js';
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

interface PriceDataPoint {
  date: string;
  close: number;
}

export interface TqqqSqqqChartProps {
  tqqqData: PriceDataPoint[];
  sqqqData: PriceDataPoint[];
  title?: string;
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TITLE = 'TQQQ/SQQQ Prices (Last 30 Days)';
const DEFAULT_HEIGHT = 480;

// ============================================================================
// Component
// ============================================================================

export function TqqqSqqqChart({
  tqqqData,
  sqqqData,
  title = DEFAULT_TITLE,
  height = DEFAULT_HEIGHT,
  className = '',
  loading = false,
  error,
}: TqqqSqqqChartProps) {
  // IMPORTANT: All hooks must be called unconditionally before any early returns
  // to satisfy React's Rules of Hooks

  // Process TQQQ data
  const { dates: tqqqDates, values: tqqqValues } = useMemo(() => {
    if (!tqqqData || tqqqData.length === 0) {
      return { dates: [] as string[], values: [] as number[] };
    }

    const validData = tqqqData.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );

    const rawDates = validData.map((d) => d.date);
    const rawValues = validData.map((d) => d.close);
    const processedValues = processChartData(rawValues);

    if (processedValues.length !== rawDates.length) {
      return { dates: rawDates, values: rawValues };
    }

    return { dates: rawDates, values: processedValues };
  }, [tqqqData]);

  // Process SQQQ data
  const { dates: sqqqDates, values: sqqqValues } = useMemo(() => {
    if (!sqqqData || sqqqData.length === 0) {
      return { dates: [] as string[], values: [] as number[] };
    }

    const validData = sqqqData.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );

    const rawDates = validData.map((d) => d.date);
    const rawValues = validData.map((d) => d.close);
    const processedValues = processChartData(rawValues);

    if (processedValues.length !== rawDates.length) {
      return { dates: rawDates, values: rawValues };
    }

    return { dates: rawDates, values: processedValues };
  }, [sqqqData]);

  // Create trace configurations
  const traces: Data[] = useMemo(() => {
    // Return empty traces if no data
    if (tqqqDates.length === 0 && sqqqDates.length === 0) return [];
    return [
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: tqqqDates,
        y: tqqqValues,
        name: 'TQQQ',
        line: {
          color: CHART_COLORS.tqqq,
          shape: SPLINE_CONFIG.shape,
          smoothing: SPLINE_CONFIG.smoothing,
          width: SPLINE_CONFIG.width,
        },
        connectgaps: true,
        showlegend: true,
      },
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: sqqqDates,
        y: sqqqValues,
        name: 'SQQQ',
        line: {
          color: CHART_COLORS.sqqq,
          shape: SPLINE_CONFIG.shape,
          smoothing: SPLINE_CONFIG.smoothing,
          width: SPLINE_CONFIG.width,
        },
        connectgaps: true,
        showlegend: true,
      },
    ];
  }, [tqqqDates, tqqqValues, sqqqDates, sqqqValues]);

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
        title: { text: 'Price ($)', standoff: 15 },
        ...AXIS_CONFIG,
        autorange: true,
        tickformat: '.2f',
      },
    };
  }, [title, height]);

  const config: Partial<Config> = { ...PLOT_CONFIG };

  // Both datasets empty → show empty state
  const bothEmpty =
    (!tqqqData || tqqqData.length === 0) &&
    (!sqqqData || sqqqData.length === 0);

  return (
    <BaseChart
      traces={traces}
      layout={layout}
      config={config}
      height={height}
      className={className}
      loading={loading}
      loadingMessage="Loading price data..."
      error={error}
      isEmpty={bothEmpty}
      emptyMessage="No data available"
    />
  );
}

// fallow-ignore-next-line unused-exports
export default TqqqSqqqChart;
