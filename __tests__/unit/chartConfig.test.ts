/**
 * TDD Tests for Chart Configuration
 *
 * CRITICAL: Chart styling must match exactly for visual consistency.
 * These values are marked "PERFECT - DO NOT MODIFY" in CLAUDE.md
 *
 * Ported from: backend/chart_config.py and frontend/static/js/chartUtils.js
 */

import { describe, it, expect } from 'vitest';
import {
  CHART_COLORS,
  SPLINE_CONFIG,
  LAYOUT_CONFIG,
  AXIS_CONFIG,
  LEGEND_CONFIG,
  createTraceConfig,
  createLayoutConfig,
  createXAxisConfig,
  createYAxisConfig,
} from '@/lib/chart-config';

describe('Chart Colors', () => {
  it('has correct VIX color', () => {
    expect(CHART_COLORS.vix).toBe('#F44336');
  });

  it('has correct TQQQ color', () => {
    expect(CHART_COLORS.tqqq).toBe('#00BCD4');
  });

  it('has correct SQQQ color', () => {
    expect(CHART_COLORS.sqqq).toBe('#E91E63');
  });

  it('has correct decay color', () => {
    expect(CHART_COLORS.decay).toBe('#4CAF50');
  });

  it('has correct entry threshold color', () => {
    expect(CHART_COLORS.entryThreshold).toBe('#FF9800');
  });
});

describe('Spline Configuration', () => {
  it('uses spline shape', () => {
    expect(SPLINE_CONFIG.shape).toBe('spline');
  });

  it('has maximum smoothing of 1.3', () => {
    expect(SPLINE_CONFIG.smoothing).toBe(1.3);
  });

  it('does not simplify points', () => {
    expect(SPLINE_CONFIG.simplify).toBe(false);
  });

  it('uses cubic spline mode', () => {
    expect(SPLINE_CONFIG.splinemode).toBe('cubic');
  });

  it('has line width of 3', () => {
    expect(SPLINE_CONFIG.width).toBe(3);
  });
});

describe('Layout Configuration', () => {
  it('has warm transparent plot background', () => {
    expect(LAYOUT_CONFIG.plot_bgcolor).toBe('rgba(254, 246, 228, 0.3)');
  });

  it('has transparent paper background', () => {
    expect(LAYOUT_CONFIG.paper_bgcolor).toBe('transparent');
  });

  it('uses Apple system font family', () => {
    expect(LAYOUT_CONFIG.font.family).toContain('-apple-system');
    expect(LAYOUT_CONFIG.font.family).toContain('SF Pro Display');
  });

  it('has warm brown text color', () => {
    expect(LAYOUT_CONFIG.font.color).toBe('#5a4a3a');
  });
});

describe('Axis Configuration', () => {
  it('shows grid lines', () => {
    expect(AXIS_CONFIG.showgrid).toBe(true);
  });

  it('has subtle warm grid color', () => {
    expect(AXIS_CONFIG.gridcolor).toBe('rgba(139, 69, 19, 0.08)');
  });

  it('hides zero line', () => {
    expect(AXIS_CONFIG.zeroline).toBe(false);
  });

  it('shows axis line', () => {
    expect(AXIS_CONFIG.showline).toBe(true);
  });
});

describe('Legend Configuration', () => {
  it('is positioned at top-left', () => {
    expect(LEGEND_CONFIG.x).toBe(0.02);
    expect(LEGEND_CONFIG.y).toBe(0.98);
    expect(LEGEND_CONFIG.xanchor).toBe('left');
    expect(LEGEND_CONFIG.yanchor).toBe('top');
  });

  it('has transparent background', () => {
    expect(LEGEND_CONFIG.bgcolor).toBe('rgba(255, 255, 255, 0)');
  });

  it('disables click interactions', () => {
    expect(LEGEND_CONFIG.itemclick).toBe(false);
    expect(LEGEND_CONFIG.itemdoubleclick).toBe(false);
  });
});

describe('createTraceConfig', () => {
  it('creates valid scatter trace', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
    const values = [20.5, 21.0, 20.8];
    const trace = createTraceConfig(dates, values, 'VIX', CHART_COLORS.vix);

    expect(trace.type).toBe('scatter');
    expect(trace.mode).toBe('lines');
    expect(trace.x).toEqual(dates);
    expect(trace.y).toEqual(values);
    expect(trace.name).toBe('VIX');
    expect(trace.line.color).toBe('#F44336');
  });

  it('applies spline configuration to trace', () => {
    const trace = createTraceConfig(['2024-01-01'], [20], 'Test', '#000');

    expect(trace.line.shape).toBe('spline');
    expect(trace.line.smoothing).toBe(1.3);
    expect(trace.line.simplify).toBe(false);
    expect(trace.line.splinemode).toBe('cubic');
  });

  it('NEVER uses scattergl type', () => {
    const trace = createTraceConfig(['2024-01-01'], [20], 'Test', '#000');
    expect(trace.type).not.toBe('scattergl');
    expect(trace.type).toBe('scatter');
  });
});

describe('createLayoutConfig', () => {
  it('creates layout with correct title', () => {
    const layout = createLayoutConfig('VIX Index');
    expect(layout.title.text).toBe('VIX Index');
  });

  it('applies warm color scheme', () => {
    const layout = createLayoutConfig('Test');
    expect(layout.plot_bgcolor).toBe('rgba(254, 246, 228, 0.3)');
    expect(layout.font.color).toBe('#5a4a3a');
  });

  it('includes legend configuration', () => {
    const layout = createLayoutConfig('Test');
    expect(layout.legend).toBeDefined();
    expect(layout.legend.x).toBe(0.02);
  });

  it('sets unified hover mode', () => {
    const layout = createLayoutConfig('Test');
    expect(layout.hovermode).toBe('x unified');
  });

  it('has warm hover label styling', () => {
    const layout = createLayoutConfig('Test');
    expect(layout.hoverlabel.bgcolor).toBe('rgba(254, 246, 228, 0.95)');
  });
});

describe('createXAxisConfig', () => {
  it('formats dates correctly', () => {
    const xaxis = createXAxisConfig();
    expect(xaxis.tickformat).toBe('%b %d');
  });

  it('uses auto tick mode', () => {
    const xaxis = createXAxisConfig();
    expect(xaxis.tickmode).toBe('auto');
  });

  it('defaults to 5 ticks', () => {
    const xaxis = createXAxisConfig();
    expect(xaxis.nticks).toBe(5);
  });

  it('allows custom tick count', () => {
    const xaxis = createXAxisConfig(6);
    expect(xaxis.nticks).toBe(6);
  });
});

describe('createYAxisConfig', () => {
  it('sets title correctly', () => {
    const yaxis = createYAxisConfig('VIX Value');
    // Plotly supports both string and object format for title
    const titleText = typeof yaxis.title === 'string'
      ? yaxis.title
      : (yaxis.title as { text?: string })?.text;
    expect(titleText).toBe('VIX Value');
  });

  it('enables autorange by default', () => {
    const yaxis = createYAxisConfig('Test');
    expect(yaxis.autorange).toBe(true);
  });

  it('allows custom range', () => {
    const yaxis = createYAxisConfig('Test', [10, 50]);
    expect(yaxis.range).toEqual([10, 50]);
  });

  it('formats ticks to 1 decimal', () => {
    const yaxis = createYAxisConfig('Test');
    expect(yaxis.tickformat).toBe('.1f');
  });
});
