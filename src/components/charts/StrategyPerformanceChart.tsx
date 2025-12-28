/**
 * Strategy Performance Chart Component
 *
 * Displays the historical backtest results of the Man in the Mirror strategy.
 * Shows cumulative P&L from shorting both TQQQ and SQQQ simultaneously.
 *
 * CRITICAL: Uses 'scatter' type - NEVER 'scattergl' (no spline support)
 *
 * Strategy: Short both TQQQ and SQQQ, profit from leveraged ETF decay.
 * The P&L is calculated based on the inverse returns of both positions.
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

export interface StrategyPerformanceChartProps {
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

const DEFAULT_TITLE = 'Strategy Performance (Last 30 Days)';
const DEFAULT_HEIGHT = 480;
const PROFIT_TARGET = 20; // 20% profit target
const MAX_DRAWDOWN = -15; // -15% max drawdown

// ============================================================================
// Component
// ============================================================================

export function StrategyPerformanceChart({
  tqqqData,
  sqqqData,
  title = DEFAULT_TITLE,
  height = DEFAULT_HEIGHT,
  className = '',
  loading = false,
  error,
}: StrategyPerformanceChartProps) {
  // Calculate cumulative P&L from shorting both ETFs
  const { dates, pnlValues } = useMemo(() => {
    if (
      !tqqqData ||
      !sqqqData ||
      tqqqData.length === 0 ||
      sqqqData.length === 0
    ) {
      return { dates: [] as string[], pnlValues: [] as number[] };
    }

    // Filter out invalid values
    const validTqqq = tqqqData.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );
    const validSqqq = sqqqData.filter(
      (d) => d && d.date && typeof d.close === 'number' && !isNaN(d.close)
    );

    if (validTqqq.length < 2 || validSqqq.length < 2) {
      return { dates: [] as string[], pnlValues: [] as number[] };
    }

    // Get initial prices for calculating returns
    const initialTqqq = validTqqq[0].close;
    const initialSqqq = validSqqq[0].close;

    if (initialTqqq === 0 || initialSqqq === 0) {
      return { dates: [] as string[], pnlValues: [] as number[] };
    }

    // Calculate cumulative P&L for each date
    // Strategy: Short TQQQ and Short SQQQ
    // P&L = -(TQQQ return) + -(SQQQ return) = profit from price drops
    const resultDates: string[] = [];
    const rawPnlValues: number[] = [];

    // Use the shorter array length to ensure alignment
    const minLength = Math.min(validTqqq.length, validSqqq.length);

    for (let i = 0; i < minLength; i++) {
      const tqqq = validTqqq[i];
      const sqqq = validSqqq[i];

      // Only include if dates match (aligned data)
      if (tqqq.date === sqqq.date) {
        // Calculate returns from initial price
        const tqqqReturn = (tqqq.close - initialTqqq) / initialTqqq;
        const sqqqReturn = (sqqq.close - initialSqqq) / initialSqqq;

        // Short positions profit from price drops
        // Weighted equally between TQQQ and SQQQ
        const shortTqqqPnL = -tqqqReturn * 50; // 50% allocation to TQQQ short
        const shortSqqqPnL = -sqqqReturn * 50; // 50% allocation to SQQQ short

        const cumulativePnL = shortTqqqPnL + shortSqqqPnL;

        resultDates.push(tqqq.date);
        rawPnlValues.push(cumulativePnL);
      }
    }

    // Process values to remove flat segments for smooth splines
    const processedValues = processChartData(rawPnlValues);

    // If lengths differ after processing, return original
    if (processedValues.length !== resultDates.length) {
      return { dates: resultDates, pnlValues: rawPnlValues };
    }

    return { dates: resultDates, pnlValues: processedValues };
  }, [tqqqData, sqqqData]);

  // Create trace configuration
  const traces: Data[] = useMemo(() => {
    return [
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: dates,
        y: pnlValues,
        name: 'Cumulative P&L %',
        line: {
          color: CHART_COLORS.strategyPnl,
          shape: SPLINE_CONFIG.shape,
          smoothing: SPLINE_CONFIG.smoothing,
          width: SPLINE_CONFIG.width,
        },
        fill: 'tozeroy' as const,
        fillcolor: 'rgba(255, 140, 66, 0.15)',
        connectgaps: true,
        showlegend: true,
      },
    ];
  }, [dates, pnlValues]);

  // Create threshold shapes
  const shapes: Partial<Shape>[] = useMemo(() => {
    if (dates.length === 0) return [];

    return [
      // Profit target line
      {
        type: 'line' as const,
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: PROFIT_TARGET,
        y1: PROFIT_TARGET,
        line: {
          color: CHART_COLORS.decay, // Green for profit target
          width: 2,
          dash: 'dash',
        },
      },
      // Max drawdown line
      {
        type: 'line' as const,
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: MAX_DRAWDOWN,
        y1: MAX_DRAWDOWN,
        line: {
          color: CHART_COLORS.vix, // Red for drawdown limit
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

  // Create annotations for threshold labels
  const annotations = useMemo(() => {
    if (dates.length === 0) return [];

    return [
      {
        x: dates[dates.length - 1],
        y: PROFIT_TARGET,
        xanchor: 'left' as const,
        yanchor: 'middle' as const,
        text: `Target: ${PROFIT_TARGET}%`,
        showarrow: false,
        font: {
          size: 10,
          color: CHART_COLORS.decay,
        },
        xshift: 5,
      },
      {
        x: dates[dates.length - 1],
        y: MAX_DRAWDOWN,
        xanchor: 'left' as const,
        yanchor: 'middle' as const,
        text: `Stop: ${MAX_DRAWDOWN}%`,
        showarrow: false,
        font: {
          size: 10,
          color: CHART_COLORS.vix,
        },
        xshift: 5,
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
        title: { text: 'P&L %' },
        ...AXIS_CONFIG,
        autorange: true,
        tickformat: '.2f',
        ticksuffix: '%',
      },
      shapes,
      annotations,
    };
  }, [title, height, shapes, annotations]);

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
        aria-label="Loading performance data"
      >
        <div className="text-warm-brown animate-pulse">
          Loading performance data...
        </div>
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
        aria-label="No performance data available"
      >
        <div className="text-warm-600">No performance data available</div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: '100%', height: height }}
      role="img"
      aria-label="Strategy performance chart showing cumulative profit and loss"
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

export default StrategyPerformanceChart;
