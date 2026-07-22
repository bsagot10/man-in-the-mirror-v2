/**
 * TDD Tests for TQQQ/SQQQ Chart Component
 *
 * Tests the dual-trace visualization component that displays:
 * - TQQQ prices as cyan line
 * - SQQQ prices as pink line
 * - Showing inverse correlation between the two ETFs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CHART_COLORS, SPLINE_CONFIG } from '@/lib/chart-config';

// Mock next/dynamic to avoid SSR loading state
vi.mock('next/dynamic', () => ({
  default: () => {
    const Component = vi.fn(
      ({ data, layout, config }: { data: unknown; layout: unknown; config: unknown }) => (
        <div
          data-testid="plotly-chart"
          data-traces={JSON.stringify(data)}
          data-layout={JSON.stringify(layout)}
          data-config={JSON.stringify(config)}
        >
          Mocked Plotly Chart
        </div>
      )
    );
    return Component;
  },
}));

// Mock react-plotly.js
vi.mock('react-plotly.js', () => ({
  default: vi.fn(
    ({ data, layout, config }: { data: unknown; layout: unknown; config: unknown }) => (
      <div
        data-testid="plotly-chart"
        data-traces={JSON.stringify(data)}
        data-layout={JSON.stringify(layout)}
        data-config={JSON.stringify(config)}
      >
        Mocked Plotly Chart
      </div>
    )
  ),
}));

// Import after mocks
import { TqqqSqqqChart, type TqqqSqqqChartProps } from '@/components/charts/TqqqSqqqChart';

describe('TqqqSqqqChart', () => {
  const mockTqqqData: TqqqSqqqChartProps['tqqqData'] = [
    { date: '2024-01-15', close: 50.0 },
    { date: '2024-01-16', close: 51.5 },
    { date: '2024-01-17', close: 49.8 },
    { date: '2024-01-18', close: 52.3 },
    { date: '2024-01-19', close: 51.0 },
  ];

  const mockSqqqData: TqqqSqqqChartProps['sqqqData'] = [
    { date: '2024-01-15', close: 30.0 },
    { date: '2024-01-16', close: 28.5 },
    { date: '2024-01-17', close: 31.2 },
    { date: '2024-01-18', close: 27.8 },
    { date: '2024-01-19', close: 29.0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('shows "No data available" when both data arrays are empty', () => {
      render(<TqqqSqqqChart tqqqData={[]} sqqqData={[]} />);
      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });

    it('renders with only TQQQ data', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={[]} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('renders with only SQQQ data', () => {
      render(<TqqqSqqqChart tqqqData={[]} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('chart data configuration', () => {
    it('creates two traces for TQQQ and SQQQ', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      expect(traces).toHaveLength(2);
    });

    it('creates TQQQ trace with correct color (cyan)', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const tqqqTrace = traces.find((t: { name?: string }) => t.name === 'TQQQ');
      expect(tqqqTrace).toBeDefined();
      expect(tqqqTrace.line.color).toBe(CHART_COLORS.tqqq);
    });

    it('creates SQQQ trace with correct color (pink)', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const sqqqTrace = traces.find((t: { name?: string }) => t.name === 'SQQQ');
      expect(sqqqTrace).toBeDefined();
      expect(sqqqTrace.line.color).toBe(CHART_COLORS.sqqq);
    });

    it('uses scatter type (not scattergl) for both traces', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      traces.forEach((trace: { type?: string }) => {
        expect(trace.type).toBe('scatter');
        expect(trace.type).not.toBe('scattergl');
      });
    });

    it('applies spline configuration to both traces', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      traces.forEach(
        (trace: { line?: { shape?: string; smoothing?: number } }) => {
          expect(trace.line?.shape).toBe(SPLINE_CONFIG.shape);
          expect(trace.line?.smoothing).toBe(SPLINE_CONFIG.smoothing);
        }
      );
    });

    it('passes correct TQQQ dates to x-axis', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const tqqqTrace = traces.find((t: { name?: string }) => t.name === 'TQQQ');
      expect(tqqqTrace.x).toEqual(mockTqqqData.map((d) => d.date));
    });

    it('passes correct TQQQ values to y-axis', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const tqqqTrace = traces.find((t: { name?: string }) => t.name === 'TQQQ');
      expect(tqqqTrace.y).toEqual(mockTqqqData.map((d) => d.close));
    });

    it('passes correct SQQQ dates to x-axis', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const sqqqTrace = traces.find((t: { name?: string }) => t.name === 'SQQQ');
      expect(sqqqTrace.x).toEqual(mockSqqqData.map((d) => d.date));
    });

    it('passes correct SQQQ values to y-axis', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const traces = JSON.parse(chart.getAttribute('data-traces') ?? '[]');

      const sqqqTrace = traces.find((t: { name?: string }) => t.name === 'SQQQ');
      expect(sqqqTrace.y).toEqual(mockSqqqData.map((d) => d.close));
    });
  });

  describe('layout configuration', () => {
    it('sets correct title', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} title="Custom Title" />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toBe('Custom Title');
    });

    it('uses default title when not provided', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.title.text).toContain('TQQQ');
      expect(layout.title.text).toContain('SQQQ');
    });

    it('has warm transparent background', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.plot_bgcolor).toBe('rgba(254, 246, 228, 0.3)');
    });

    it('has transparent paper background', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.paper_bgcolor).toBe('transparent');
    });

    it('uses unified hover mode', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.hovermode).toBe('x unified');
    });

    it('positions legend at top-left', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.legend.x).toBe(0.02);
      expect(layout.legend.y).toBe(0.98);
    });

    it('sets y-axis title to Price ($)', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      // Plotly supports both string and object format for title
      const titleText = typeof layout.yaxis.title === 'string'
        ? layout.yaxis.title
        : layout.yaxis.title?.text;
      expect(titleText).toBe('Price ($)');
    });
  });

  describe('plot config', () => {
    it('is responsive', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.responsive).toBe(true);
    });

    it('hides mode bar', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const config = JSON.parse(chart.getAttribute('data-config') ?? '{}');

      expect(config.displayModeBar).toBe(false);
    });
  });

  describe('props', () => {
    it('accepts custom height', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} height={600} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(600);
    });

    it('uses default height of 480', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.height).toBe(480);
    });

    it('accepts className prop', () => {
      const { container } = render(
        <TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('accepts loading state', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} loading />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('accepts error state', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} error="Failed to load data" />);
      expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
    });
  });

  describe('data processing', () => {
    it('handles data with consecutive duplicate values', () => {
      const dataWithDuplicates = [
        { date: '2024-01-15', close: 50.0 },
        { date: '2024-01-16', close: 50.0 },
        { date: '2024-01-17', close: 50.0 },
        { date: '2024-01-18', close: 51.0 },
      ];

      render(<TqqqSqqqChart tqqqData={dataWithDuplicates} sqqqData={mockSqqqData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });

    it('handles mismatched data lengths', () => {
      const shortData = [
        { date: '2024-01-15', close: 30.0 },
        { date: '2024-01-16', close: 28.5 },
      ];

      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={shortData} />);
      expect(screen.getByTestId('plotly-chart')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible chart container', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('stop-loss lines', () => {
    it('does not add shapes or annotations when no stops are provided', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.shapes).toEqual([]);
      expect(layout.annotations).toEqual([]);
    });

    it('adds a TQQQ stop-loss line in the TQQQ color when tqqqStop is set', () => {
      render(
        <TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} tqqqStop={58.67} />
      );
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const stopLine = layout.shapes.find((s: { y0?: number }) => s.y0 === 58.67);
      expect(stopLine).toBeDefined();
      expect(stopLine.line.color).toBe(CHART_COLORS.tqqq);
      expect(stopLine.line.dash).toBe('dash');
    });

    it('adds an SQQQ stop-loss line in the SQQQ color when sqqqStop is set', () => {
      render(
        <TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} sqqqStop={79.79} />
      );
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const stopLine = layout.shapes.find((s: { y0?: number }) => s.y0 === 79.79);
      expect(stopLine).toBeDefined();
      expect(stopLine.line.color).toBe(CHART_COLORS.sqqq);
    });

    it('adds both stop-loss lines when both stops are set', () => {
      render(
        <TqqqSqqqChart
          tqqqData={mockTqqqData}
          sqqqData={mockSqqqData}
          tqqqStop={58.67}
          sqqqStop={79.79}
        />
      );
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.shapes).toHaveLength(2);
      expect(layout.annotations).toHaveLength(2);
    });

    it('labels the TQQQ stop-loss line with its dollar value', () => {
      render(
        <TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} tqqqStop={58.67} />
      );
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const annotation = layout.annotations.find((a: { y?: number }) => a.y === 58.67);
      expect(annotation).toBeDefined();
      expect(annotation.text).toContain('TQQQ');
      expect(annotation.text).toContain('58.67');
      expect(annotation.showarrow).toBe(false);
    });

    it('labels the SQQQ stop-loss line with its dollar value', () => {
      render(
        <TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} sqqqStop={79.79} />
      );
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      const annotation = layout.annotations.find((a: { y?: number }) => a.y === 79.79);
      expect(annotation).toBeDefined();
      expect(annotation.text).toContain('SQQQ');
      expect(annotation.text).toContain('79.79');
    });
  });

  describe('x-axis range', () => {
    it('pins the range to the combined data extent so the lines end flush with the plot edge', () => {
      render(<TqqqSqqqChart tqqqData={mockTqqqData} sqqqData={mockSqqqData} />);
      const chart = screen.getByTestId('plotly-chart');
      const layout = JSON.parse(chart.getAttribute('data-layout') ?? '{}');

      expect(layout.xaxis.range).toEqual([
        mockTqqqData[0].date,
        mockTqqqData[mockTqqqData.length - 1].date,
      ]);
      expect(layout.xaxis.autorange).toBe(false);
    });
  });
});

describe('TqqqSqqqChartProps type', () => {
  it('accepts required data props', () => {
    const props: TqqqSqqqChartProps = {
      tqqqData: [{ date: '2024-01-15', close: 50.0 }],
      sqqqData: [{ date: '2024-01-15', close: 30.0 }],
    };
    expect(props.tqqqData).toHaveLength(1);
    expect(props.sqqqData).toHaveLength(1);
  });

  it('accepts all optional props', () => {
    const props: TqqqSqqqChartProps = {
      tqqqData: [],
      sqqqData: [],
      tqqqStop: 58.67,
      sqqqStop: 79.79,
      title: 'Custom Title',
      height: 500,
      className: 'custom-class',
      loading: false,
      error: undefined,
    };
    expect(props).toBeDefined();
  });
});
