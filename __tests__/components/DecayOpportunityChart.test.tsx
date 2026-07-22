/**
 * TDD Tests for DecayOpportunityChart Component
 *
 * Tests the decay opportunity visualization component that displays:
 * - Cumulative decay from TQQQ * SQQQ product
 * - Entry threshold line at -5%
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
import { DecayOpportunityChart, type DecayOpportunityChartProps } from '@/components/charts/DecayOpportunityChart';
import type { PriceDataPoint } from '@/types/chart-types';

describe('DecayOpportunityChart', () => {
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
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('shows empty state when tqqqData is empty', () => {
      render(<DecayOpportunityChart tqqqData={[]} sqqqData={mockSqqqData} />);
      expect(screen.getByText(/no decay data available/i)).toBeInTheDocument();
    });

    it('shows empty state when sqqqData is empty', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={[]} />);
      expect(screen.getByText(/no decay data available/i)).toBeInTheDocument();
    });

    it('shows empty state when both arrays are empty', () => {
      render(<DecayOpportunityChart tqqqData={[]} sqqqData={[]} />);
      expect(screen.getByText(/no decay data available/i)).toBeInTheDocument();
    });

    it('renders with single data point', () => {
      render(
        <DecayOpportunityChart
          tqqqData={[{ date: '2024-01-15', close: 50.0 }]}
          sqqqData={[{ date: '2024-01-15', close: 20.0 }]}
        />
      );
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('chart data configuration', () => {
    it('creates decay trace with correct color', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      expect(decayTrace).toBeDefined();
      expect(decayTrace.line.color).toBe(CHART_COLORS.decay);
    });

    it('uses scatter type (not scattergl)', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      traces.forEach((trace: { type?: string }) => {
        expect(trace.type).toBe('scatter');
        expect(trace.type).not.toBe('scattergl');
      });
    });

    it('applies spline configuration', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      expect(decayTrace.line.shape).toBe(SPLINE_CONFIG.shape);
      expect(decayTrace.line.smoothing).toBe(SPLINE_CONFIG.smoothing);
    });

    it('includes area fill under line', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      expect(decayTrace.fill).toBe('tozeroy');
      expect(decayTrace.fillcolor).toContain('rgba');
    });

    it('passes aligned dates to x-axis', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      expect(decayTrace.x.length).toBe(mockTqqqData.length);
    });

    it('calculates decay values correctly', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      // First value should be 0 (initial product / initial product - 1)
      expect(decayTrace.y[0]).toBeCloseTo(0, 5);
    });
  });

  describe('threshold lines', () => {
    it('includes entry threshold line at -5%', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.shapes).toBeDefined();
      const thresholdLine = layout.shapes.find(
        (s: { type?: string; y0?: number; y1?: number }) =>
          s.type === 'line' && s.y0 === -5 && s.y1 === -5
      );
      expect(thresholdLine).toBeDefined();
    });

    it('includes zero reference line', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const zeroLine = layout.shapes.find(
        (s: { type?: string; y0?: number; y1?: number }) =>
          s.type === 'line' && s.y0 === 0 && s.y1 === 0
      );
      expect(zeroLine).toBeDefined();
    });

    it('threshold line uses entry threshold color', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const thresholdLine = layout.shapes.find(
        (s: { y0?: number }) => s.y0 === -5
      );
      expect(thresholdLine.line.color).toBe(CHART_COLORS.entryThreshold);
    });

    it('labels the entry threshold line with an annotation', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.annotations).toBeDefined();
      const thresholdAnnotation = layout.annotations.find(
        (a: { y?: number }) => a.y === -5
      );
      expect(thresholdAnnotation).toBeDefined();
      expect(thresholdAnnotation.text).toContain('-5');
      expect(thresholdAnnotation.showarrow).toBe(false);
    });

    it('pins the x-axis range to the data extent so the line ends flush with the plot edge', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.xaxis.range).toEqual([
        mockTqqqData[0].date,
        mockTqqqData[mockTqqqData.length - 1].date,
      ]);
      expect(layout.xaxis.autorange).toBe(false);
    });
  });

  describe('layout configuration', () => {
    it('sets correct title', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} title="Custom Decay Title" />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toBe('Custom Decay Title');
    });

    it('uses default title when not provided', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toContain('Decay');
    });

    it('has warm transparent background', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.plot_bgcolor).toBe('rgba(254, 246, 228, 0.3)');
    });

    it('uses unified hover mode', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.hovermode).toBe('x unified');
    });

    it('has y-axis with percent suffix', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.yaxis.ticksuffix).toBe('%');
    });
  });

  describe('plot config', () => {
    it('is responsive', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.responsive).toBe(true);
    });

    it('hides mode bar', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.displayModeBar).toBe(false);
    });
  });

  describe('props', () => {
    it('accepts custom height', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} height={600} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(600);
    });

    it('uses default height of 480', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(480);
    });

    it('accepts className prop', () => {
      const { container } = render(
        <DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('accepts loading state', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} loading />);
      expect(screen.getByText(/loading decay data/i)).toBeInTheDocument();
    });

    it('accepts error state', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} error="Failed to load decay data" />);
      expect(screen.getByText(/failed to load decay data/i)).toBeInTheDocument();
    });
  });

  describe('data alignment', () => {
    it('only uses dates that exist in both datasets', () => {
      const tqqqWithExtra = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-16', close: 51.0 },
        { date: '2024-01-17', close: 49.5 },
      ];
      const sqqqShorter = [
        { date: '2024-01-15', close: 20.0 },
        { date: '2024-01-16', close: 19.5 },
      ];

      render(<DecayOpportunityChart tqqqData={tqqqWithExtra} sqqqData={sqqqShorter} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      expect(decayTrace.x.length).toBe(2); // Only 2 matching dates
    });

    it('handles misaligned dates by matching', () => {
      const tqqqMisaligned = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-17', close: 51.0 }, // Missing 01-16
      ];
      const sqqqMisaligned = [
        { date: '2024-01-15', close: 20.0 },
        { date: '2024-01-16', close: 19.5 }, // Different date
        { date: '2024-01-17', close: 20.2 },
      ];

      render(<DecayOpportunityChart tqqqData={tqqqMisaligned} sqqqData={sqqqMisaligned} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const decayTrace = traces.find((t: { name?: string }) => t.name === 'Cumulative Decay %');
      // Should only have matching dates (01-15 and 01-17)
      expect(decayTrace.x).toContain('2024-01-15');
    });
  });

  describe('edge cases', () => {
    it('handles zero initial product gracefully', () => {
      const zeroTqqq = [{ date: '2024-01-15', close: 0 }];
      const zeroSqqq = [{ date: '2024-01-15', close: 20.0 }];

      render(<DecayOpportunityChart tqqqData={zeroTqqq} sqqqData={zeroSqqq} />);
      expect(screen.getByText(/no decay data available/i)).toBeInTheDocument();
    });

    it('handles NaN values gracefully', () => {
      const dataWithNaN = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-16', close: NaN },
        { date: '2024-01-17', close: 49.5 },
      ];

      render(<DecayOpportunityChart tqqqData={dataWithNaN} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role img for chart container', () => {
      const { container } = render(
        <DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />
      );
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('has accessible aria-label', () => {
      const { container } = render(
        <DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />
      );
      expect(container.querySelector('[aria-label]')).toBeInTheDocument();
    });

    it('has role status for loading state', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has role alert for error state', () => {
      render(<DecayOpportunityChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} error="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('DecayOpportunityChartProps type', () => {
  it('accepts required props', () => {
    const props: DecayOpportunityChartProps = {
      tqqqData: [{ date: '2024-01-15', close: 50.0 }],
      sqqqData: [{ date: '2024-01-15', close: 20.0 }],
    };
    expect(props.tqqqData).toHaveLength(1);
    expect(props.sqqqData).toHaveLength(1);
  });

  it('accepts all optional props', () => {
    const props: DecayOpportunityChartProps = {
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
