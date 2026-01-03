/**
 * TDD Tests for StrategyPerformanceChart Component
 *
 * Tests the strategy performance visualization component that displays:
 * - Cumulative P&L from shorting TQQQ and SQQQ
 * - Profit target line at 20%
 * - Max drawdown line at -15%
 * - Proper color scheme and styling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CHART_COLORS, SPLINE_CONFIG } from '@/lib/chart-config';

// Mock next/dynamic to avoid SSR loading state
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>) => {
    const Component = vi.fn(({ data, layout, config }: { data: unknown; layout: unknown; config: unknown }) => (
      <div
        data-testid="plotly-chart"
        data-traces={JSON.stringify(data)}
        data-layout={JSON.stringify(layout)}
        data-config={JSON.stringify(config)}
      >
        Mocked Plotly Chart
      </div>
    ));
    return Component;
  },
}));

// Mock react-plotly.js
vi.mock('react-plotly.js', () => ({
  default: vi.fn(({ data, layout, config }: { data: unknown; layout: unknown; config: unknown }) => (
    <div
      data-testid="plotly-chart"
      data-traces={JSON.stringify(data)}
      data-layout={JSON.stringify(layout)}
      data-config={JSON.stringify(config)}
    >
      Mocked Plotly Chart
    </div>
  )),
}));

// Import after mocks
import { StrategyPerformanceChart, type StrategyPerformanceChartProps } from '@/components/charts/StrategyPerformanceChart';
import type { PriceDataPoint } from '@/types/chart-types';

describe('StrategyPerformanceChart', () => {
  const mockTqqqData: PriceDataPoint[] = [
    { date: '2024-01-15', close: 50.0 },
    { date: '2024-01-16', close: 51.0 },
    { date: '2024-01-17', close: 49.5 },
    { date: '2024-01-18', close: 50.5 },
    { date: '2024-01-19', close: 48.0 },
  ];

  const mockSqqqData: PriceDataPoint[] = [
    { date: '2024-01-15', close: 20.0 },
    { date: '2024-01-16', close: 19.5 },
    { date: '2024-01-17', close: 20.2 },
    { date: '2024-01-18', close: 19.8 },
    { date: '2024-01-19', close: 21.0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('shows empty state when tqqqData is empty', () => {
      render(<StrategyPerformanceChart tqqqData={[]} sqqqData={mockSqqqData} />);
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });

    it('shows empty state when sqqqData is empty', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={[]} />);
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });

    it('shows empty state when both arrays are empty', () => {
      render(<StrategyPerformanceChart tqqqData={[]} sqqqData={[]} />);
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });

    it('shows empty state with single data point (needs at least 2)', () => {
      render(
        <StrategyPerformanceChart
          tqqqData={[{ date: '2024-01-15', close: 50.0 }]}
          sqqqData={[{ date: '2024-01-15', close: 20.0 }]}
        />
      );
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });

    it('renders with minimum two data points', () => {
      render(
        <StrategyPerformanceChart
          tqqqData={[
            { date: '2024-01-15', close: 50.0 },
            { date: '2024-01-16', close: 51.0 },
          ]}
          sqqqData={[
            { date: '2024-01-15', close: 20.0 },
            { date: '2024-01-16', close: 19.5 },
          ]}
        />
      );
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('chart data configuration', () => {
    it('creates P&L trace with correct color', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      expect(pnlTrace).toBeDefined();
      expect(pnlTrace.line.color).toBe(CHART_COLORS.strategyPnl);
    });

    it('uses scatter type (not scattergl)', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      traces.forEach((trace: { type?: string }) => {
        expect(trace.type).toBe('scatter');
        expect(trace.type).not.toBe('scattergl');
      });
    });

    it('applies spline configuration', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      expect(pnlTrace.line.shape).toBe(SPLINE_CONFIG.shape);
      expect(pnlTrace.line.smoothing).toBe(SPLINE_CONFIG.smoothing);
    });

    it('includes area fill under line', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      expect(pnlTrace.fill).toBe('tozeroy');
      expect(pnlTrace.fillcolor).toContain('rgba');
    });

    it('passes aligned dates to x-axis', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      expect(pnlTrace.x.length).toBe(mockTqqqData.length);
    });

    it('calculates P&L correctly (first value is 0)', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      // First value should be 0 (no return on day 1)
      expect(pnlTrace.y[0]).toBeCloseTo(0, 5);
    });
  });

  describe('threshold lines', () => {
    it('includes profit target line at 20%', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.shapes).toBeDefined();
      const profitLine = layout.shapes.find(
        (s: { type?: string; y0?: number; y1?: number }) =>
          s.type === 'line' && s.y0 === 20 && s.y1 === 20
      );
      expect(profitLine).toBeDefined();
    });

    it('includes max drawdown line at -15%', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const drawdownLine = layout.shapes.find(
        (s: { type?: string; y0?: number; y1?: number }) =>
          s.type === 'line' && s.y0 === -15 && s.y1 === -15
      );
      expect(drawdownLine).toBeDefined();
    });

    it('includes zero reference line', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const zeroLine = layout.shapes.find(
        (s: { type?: string; y0?: number; y1?: number }) =>
          s.type === 'line' && s.y0 === 0 && s.y1 === 0
      );
      expect(zeroLine).toBeDefined();
    });

    it('profit target line uses green (decay) color', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const profitLine = layout.shapes.find((s: { y0?: number }) => s.y0 === 20);
      expect(profitLine.line.color).toBe(CHART_COLORS.decay);
    });

    it('drawdown line uses red (vix) color', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const drawdownLine = layout.shapes.find((s: { y0?: number }) => s.y0 === -15);
      expect(drawdownLine.line.color).toBe(CHART_COLORS.vix);
    });
  });

  describe('annotations', () => {
    it('includes profit target annotation', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const profitAnnotation = layout.annotations.find(
        (a: { text?: string }) => a.text?.includes('Target: 20%')
      );
      expect(profitAnnotation).toBeDefined();
    });

    it('includes stop loss annotation', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const stopAnnotation = layout.annotations.find(
        (a: { text?: string }) => a.text?.includes('Stop: -15%')
      );
      expect(stopAnnotation).toBeDefined();
    });
  });

  describe('layout configuration', () => {
    it('sets correct title', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} title="Custom Performance Title" />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toBe('Custom Performance Title');
    });

    it('uses default title when not provided', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toContain('Performance');
    });

    it('has warm transparent background', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.plot_bgcolor).toBe('rgba(254, 246, 228, 0.3)');
    });

    it('uses unified hover mode', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.hovermode).toBe('x unified');
    });

    it('has y-axis with percent suffix', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.yaxis.ticksuffix).toBe('%');
    });

    it('sets explicit x-axis range to prevent padding', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.xaxis.range).toBeDefined();
      expect(layout.xaxis.range[0]).toBe('2024-01-15');
      expect(layout.xaxis.range[1]).toBe('2024-01-19');
    });
  });

  describe('plot config', () => {
    it('is responsive', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.responsive).toBe(true);
    });

    it('hides mode bar', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.displayModeBar).toBe(false);
    });
  });

  describe('props', () => {
    it('accepts custom height', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} height={600} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(600);
    });

    it('uses default height of 480', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(480);
    });

    it('accepts className prop', () => {
      const { container } = render(
        <StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('accepts loading state', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} loading />);
      expect(screen.getByText(/loading performance data/i)).toBeInTheDocument();
    });

    it('accepts error state', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} error="Failed to load performance data" />);
      expect(screen.getByText(/failed to load performance data/i)).toBeInTheDocument();
    });
  });

  describe('data alignment with Map lookup', () => {
    it('uses SQQQ Map for O(1) date lookups', () => {
      // Verify matching behavior through output
      const tqqqWithExtra = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-16', close: 51.0 },
        { date: '2024-01-17', close: 49.5 },
        { date: '2024-01-20', close: 52.0 }, // No matching SQQQ
      ];
      const sqqqDifferent = [
        { date: '2024-01-15', close: 20.0 },
        { date: '2024-01-16', close: 19.5 },
        { date: '2024-01-17', close: 20.2 },
        { date: '2024-01-18', close: 19.8 }, // No matching TQQQ
      ];

      render(<StrategyPerformanceChart tqqqData={tqqqWithExtra} sqqqData={sqqqDifferent} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      // Only 3 matching dates (15, 16, 17)
      expect(pnlTrace.x.length).toBe(3);
    });

    it('handles completely mismatched dates', () => {
      const tqqqDates = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-16', close: 51.0 },
      ];
      const sqqqDifferentDates = [
        { date: '2024-01-17', close: 20.0 },
        { date: '2024-01-18', close: 19.5 },
      ];

      render(<StrategyPerformanceChart tqqqData={tqqqDates} sqqqData={sqqqDifferentDates} />);
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });
  });

  describe('P&L calculation', () => {
    it('calculates short position P&L correctly', () => {
      // Simple test: if both prices drop 10%, short positions lose -10% each
      // Total: -10% TQQQ + -10% SQQQ = -20% (50% allocation each means -5% + -5% = -10%)
      const tqqqSimple = [
        { date: '2024-01-15', close: 100.0 },
        { date: '2024-01-16', close: 90.0 }, // -10%
      ];
      const sqqqSimple = [
        { date: '2024-01-15', close: 100.0 },
        { date: '2024-01-16', close: 90.0 }, // -10%
      ];

      render(<StrategyPerformanceChart tqqqData={tqqqSimple} sqqqData={sqqqSimple} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const pnlTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative P&L %');
      // Short P&L = -(return) * 50 for each
      // TQQQ: -(-10/100) * 50 = 5
      // SQQQ: -(-10/100) * 50 = 5
      // Total: 10
      expect(pnlTrace.y[1]).toBeCloseTo(10, 1);
    });
  });

  describe('edge cases', () => {
    it('handles zero initial prices gracefully', () => {
      const zeroTqqq = [
        { date: '2024-01-15', close: 0 },
        { date: '2024-01-16', close: 50 },
      ];
      const validSqqq = [
        { date: '2024-01-15', close: 20.0 },
        { date: '2024-01-16', close: 19.5 },
      ];

      render(<StrategyPerformanceChart tqqqData={zeroTqqq} sqqqData={validSqqq} />);
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });

    it('handles NaN values gracefully', () => {
      const dataWithNaN = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-16', close: NaN },
        { date: '2024-01-17', close: 49.5 },
      ];

      render(<StrategyPerformanceChart tqqqData={dataWithNaN} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role img for chart container', () => {
      const { container } = render(
        <StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />
      );
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('has accessible aria-label', () => {
      const { container } = render(
        <StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />
      );
      expect(container.querySelector('[aria-label]')).toBeInTheDocument();
    });

    it('has role status for loading state', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has role alert for error state', () => {
      render(<StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} error="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('is keyboard focusable', () => {
      const { container } = render(
        <StrategyPerformanceChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />
      );
      const chartContainer = container.querySelector('[tabindex="0"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});

describe('StrategyPerformanceChartProps type', () => {
  it('accepts required props', () => {
    const props: StrategyPerformanceChartProps = {
      tqqqData: [{ date: '2024-01-15', close: 50.0 }],
      sqqqData: [{ date: '2024-01-15', close: 20.0 }],
    };
    expect(props.tqqqData).toHaveLength(1);
    expect(props.sqqqData).toHaveLength(1);
  });

  it('accepts all optional props', () => {
    const props: StrategyPerformanceChartProps = {
      tqqqData: [],
      sqqqData: [],
      title: 'Custom Title',
      height: 500,
      className: 'custom-class',
      loading: false,
      error: undefined,
    };
    expect(props).toBeDefined();
  });
});
