/**
 * Decay Opportunity Chart Component
 *
 * Displays the cumulative decay percentage from TQQQ * SQQQ product.
 * The decay is calculated as: (current_product / initial_product - 1) * 100
 *
 * CRITICAL: Uses 'scatter' type - NEVER 'scattergl' (no spline support)
 *
 * Theory: Leveraged ETFs decay over time due to daily rebalancing.
 * When you short both TQQQ and SQQQ, you profit from this decay.
 */

'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { Data, Config, Shape } from 'plotly.js';
import type { PriceDataPoint } from '@/types/chart-types';
import {
  CHART_COLORS,
  SPLINE_CONFIG,
  LAYOUT_CONFIG,
  AXIS_CONFIG,
  LEGEND_CONFIG,
  PLOT_CONFIG,
} from '@/lib/chart-config';
import { processChartData } from '@/lib/data-processing/removeFlatSegments';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] flex items-center justify-center">
      Loading chart...
    </div>
  ),
});

// ============================================================================
// Types
// ============================================================================

export interface DecayOpportunityChartProps {
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

const DEFAULT_TITLE = 'Decay Opportunity (Last 30 Days)';
const DEFAULT_HEIGHT = 480;
const ENTRY_THRESHOLD = -5; // 5% decay threshold for entry signal

// ============================================================================
// Component
// ============================================================================

export function DecayOpportunityChart({
  tqqqData,
  sqqqData,
  title = DEFAULT_TITLE,
  height = DEFAULT_HEIGHT,
  className = '',
  loading = false,
  error,
}: DecayOpportunityChartProps) {
  // Calculate decay from TQQQ * SQQQ product
  const { dates, decayValues } = useMemo(() => {
    if (
      !tqqqData ||
      !sqqqData ||
      tqqqData.length === 0 ||
      sqqqData.length === 0
    ) {
      return { dates: [] as string[], decayValues: [] as number[] };
    }

    // Filter out invalid values
    const validTqqq = tqqqData.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );
    const validSqqq = sqqqData.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );

    if (validTqqq.length === 0 || validSqqq.length === 0) {
      return { dates: [] as string[], decayValues: [] as number[] };
    }

    // Calculate initial product for baseline
    const initialProduct = validTqqq[0].close * validSqqq[0].close;

    if (initialProduct === 0) {
      return { dates: [] as string[], decayValues: [] as number[] };
    }

    // Calculate decay for each date
    const resultDates: string[] = [];
    const rawDecayValues: number[] = [];

    // Use the shorter array length to ensure alignment
    const minLength = Math.min(validTqqq.length, validSqqq.length);

    for (let i = 0; i < minLength; i++) {
      const tqqq = validTqqq[i];
      const sqqq = validSqqq[i];

      // Only include if dates match (aligned data)
      if (tqqq.date === sqqq.date) {
        const currentProduct = tqqq.close * sqqq.close;
        const decay = (currentProduct / initialProduct - 1) * 100;

        resultDates.push(tqqq.date);
        rawDecayValues.push(decay);
      }
    }

    // Process values to remove flat segments for smooth splines
    const processedValues = processChartData(rawDecayValues);

    // If lengths differ after processing, return original
    if (processedValues.length !== resultDates.length) {
      return { dates: resultDates, decayValues: rawDecayValues };
    }

    return { dates: resultDates, decayValues: processedValues };
  }, [tqqqData, sqqqData]);

  // Create trace configuration with area fill
  const traces: Data[] = useMemo(() => {
    return [
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: dates,
        y: decayValues,
        name: 'Cumulative Decay %',
        line: {
          color: CHART_COLORS.decay,
          shape: SPLINE_CONFIG.shape,
          smoothing: SPLINE_CONFIG.smoothing,
          width: SPLINE_CONFIG.width,
          dash: 'solid',  // Explicitly solid to ensure legend marker is a solid bar
        },
        fill: 'tozeroy' as const,
        fillcolor: 'rgba(76, 175, 80, 0.2)',
        connectgaps: true,
        showlegend: true,
      },
    ];
  }, [dates, decayValues]);

  // Create threshold shapes
  const shapes: Partial<Shape>[] = useMemo(() => {
    if (dates.length === 0) return [];

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
      // Zero line for reference
      {
        type: 'line' as const,
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: 0,
        y1: 0,
        line: {
          color: 'rgba(139, 69, 19, 0.3)',
          width: 1,
          dash: 'dot',
        },
      },
    ];
  }, [dates]);

  // Create layout configuration
  const layout = useMemo(() => {
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
        title: { text: 'Decay %', standoff: 15 },
        ...AXIS_CONFIG,
        // Calculate range with top padding for legend visibility
        range: decayValues.length > 0
          ? [Math.min(...decayValues) - 0.5, Math.max(...decayValues) + 2]
          : undefined,
        autorange: decayValues.length === 0,
        tickformat: '.2f',
        ticksuffix: '%',
      },
      shapes,
    };
  }, [title, height, shapes, decayValues]);

  // Plot configuration
  const config: Partial<Config> = {
    ...PLOT_CONFIG,
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`h-[${height}px] flex items-center justify-center ${className}`}
        role="status"
        aria-label="Loading decay data"
      >
        <div className="text-warm-brown animate-pulse">Loading decay data...</div>
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
  if (dates.length === 0) {
    return (
      <div
        className={`h-[${height}px] flex items-center justify-center ${className}`}
        aria-label="No decay data available"
      >
        <div className="text-warm-600">No decay data available</div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: '100%', height: height }}
      role="img"
      aria-label="Decay opportunity chart showing cumulative leveraged ETF decay"
      tabIndex={0}
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

export default DecayOpportunityChart;
