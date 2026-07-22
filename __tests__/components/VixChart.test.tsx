/**
 * TDD Tests for VIX Chart Component
 *
 * Tests the VIX visualization component that displays:
 * - VIX historical data as smooth spline line
 * - Entry threshold line at VIX = 20
 * - Proper color scheme and styling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CHART_COLORS, SPLINE_CONFIG } from '@/lib/chart-config';

// Mock next/dynamic to avoid SSR loading state
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>) => {
    // Execute the dynamic import and return the component directly
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
import { VixChart, type VixChartProps } from '@/components/charts/VixChart';

describe('VixChart', () => {
  const mockData: VixChartProps['data'] = [
    { date: '2024-01-15', close: 20.5 },
    { date: '2024-01-16', close: 21.0 },
    { date: '2024-01-17', close: 19.8 },
    { date: '2024-01-18', close: 22.3 },
    { date: '2024-01-19', close: 21.5 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<VixChart data={mockData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('shows "No data available" when data array is empty', () => {
      render(<VixChart data={[]} />);
      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });

    it('renders with single data point', () => {
      render(<VixChart data={[{ date: '2024-01-15', close: 20.5 }]} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('chart data configuration', () => {
    it('creates VIX trace with correct color', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const vixTrace = traces.find((t: { name?: string }) => t.name === 'VIX');
      expect(vixTrace).toBeDefined();
      expect(vixTrace.line.color).toBe(CHART_COLORS.vix);
    });

    it('uses scatter type (not scattergl)', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      traces.forEach((trace: { type?: string }) => {
        expect(trace.type).toBe('scatter');
        expect(trace.type).not.toBe('scattergl');
      });
    });

    it('applies spline configuration', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const vixTrace = traces.find((t: { name?: string }) => t.name === 'VIX');
      expect(vixTrace.line.shape).toBe(SPLINE_CONFIG.shape);
      expect(vixTrace.line.smoothing).toBe(SPLINE_CONFIG.smoothing);
    });

    it('includes entry threshold line at VIX = 20', () => {
      render(<VixChart data={mockData} showThreshold />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      // Check for horizontal line shape at y=20
      expect(layout.shapes).toBeDefined();
      const thresholdLine = layout.shapes.find(
        (s: { type?: string; y0?: number; y1?: number }) =>
          s.type === 'line' && s.y0 === 20 && s.y1 === 20
      );
      expect(thresholdLine).toBeDefined();
    });

    it('labels the entry threshold line with an annotation', () => {
      render(<VixChart data={mockData} showThreshold />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.annotations).toBeDefined();
      const thresholdAnnotation = layout.annotations.find(
        (a: { y?: number }) => a.y === 20
      );
      expect(thresholdAnnotation).toBeDefined();
      expect(thresholdAnnotation.text).toContain('20');
      expect(thresholdAnnotation.showarrow).toBe(false);
    });

    it('does not add a threshold annotation when showThreshold is false', () => {
      render(<VixChart data={mockData} showThreshold={false} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.annotations).toEqual([]);
    });

    it('pins the x-axis range to the data extent so the line ends flush with the plot edge', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.xaxis.range).toEqual([
        mockData[0].date,
        mockData[mockData.length - 1].date,
      ]);
      expect(layout.xaxis.autorange).toBe(false);
    });

    it('passes correct dates to x-axis', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const vixTrace = traces.find((t: { name?: string }) => t.name === 'VIX');
      expect(vixTrace.x).toEqual(mockData.map((d) => d.date));
    });

    it('passes correct values to y-axis', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const vixTrace = traces.find((t: { name?: string }) => t.name === 'VIX');
      expect(vixTrace.y).toEqual(mockData.map((d) => d.close));
    });
  });

  describe('layout configuration', () => {
    it('sets correct title', () => {
      render(<VixChart data={mockData} title="Custom VIX Title" />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toBe('Custom VIX Title');
    });

    it('uses default title when not provided', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toContain('VIX');
    });

    it('has warm transparent background', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.plot_bgcolor).toBe('rgba(254, 246, 228, 0.3)');
    });

    it('has transparent paper background', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.paper_bgcolor).toBe('transparent');
    });

    it('uses unified hover mode', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.hovermode).toBe('x unified');
    });

    it('positions legend at top-left', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.legend.x).toBe(0.02);
      expect(layout.legend.y).toBe(0.98);
    });
  });

  describe('plot config', () => {
    it('is responsive', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.responsive).toBe(true);
    });

    it('hides mode bar', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.displayModeBar).toBe(false);
    });
  });

  describe('props', () => {
    it('accepts custom height', () => {
      render(<VixChart data={mockData} height={600} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(600);
    });

    it('uses default height of 480', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(480);
    });

    it('accepts className prop', () => {
      const { container } = render(<VixChart data={mockData} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('accepts loading state', () => {
      render(<VixChart data={mockData} loading />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('accepts error state', () => {
      render(<VixChart data={mockData} error="Failed to load data" />);
      expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
    });
  });

  describe('data processing', () => {
    it('handles data with consecutive duplicate values', () => {
      const dataWithDuplicates: VixChartProps['data'] = [
        { date: '2024-01-15', close: 20.0 },
        { date: '2024-01-16', close: 20.0 },
        { date: '2024-01-17', close: 20.0 },
        { date: '2024-01-18', close: 21.0 },
      ];

      render(<VixChart data={dataWithDuplicates} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('handles null/undefined values gracefully', () => {
      const dataWithNulls = [
        { date: '2024-01-15', close: 20.0 },
        { date: '2024-01-16', close: null as unknown as number },
        { date: '2024-01-17', close: 21.0 },
      ];

      render(<VixChart data={dataWithNulls} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible chart container', () => {
      render(<VixChart data={mockData} />);
      const chart = screen.getByTestId('plotly-chart');
      expect(chart).toBeInTheDocument();
    });
  });
});

describe('VixChartProps type', () => {
  it('accepts required data prop', () => {
    const props: VixChartProps = {
      data: [{ date: '2024-01-15', close: 20.5 }],
    };
    expect(props.data).toHaveLength(1);
  });

  it('accepts all optional props', () => {
    const props: VixChartProps = {
      data: [],
      title: 'Custom Title',
      height: 500,
      showThreshold: true,
      className: 'custom-class',
      loading: false,
      error: undefined,
    };
    expect(props).toBeDefined();
  });
});
