// filepath: __tests__/components/LeftColumn.test.tsx
// Purpose: Tests that the Enter Position button is disabled with an alert when market data is stale or mismatched.
// Key exports: test suite for LeftColumn entry blocking
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LeftColumn, type LeftColumnProps } from '@/components/dashboard/LeftColumn';
import type { MarketData, SymbolData } from '@/types/market-data';

const sym = (price: number, asOf?: string): SymbolData => ({
  currentPrice: price, changePercent: 0, previousClose: price, change: 0, volume: 1,
  timestamp: '2026-11-23T00:00:00Z', ...(asOf && { asOf }),
});

const market = (over: Partial<MarketData> = {}, t?: string, s?: string): MarketData => ({
  vix: sym(20), qqq: sym(400), tqqq: sym(60, t), sqqq: sym(20, s), ...over,
});

const props = (md: MarketData | null): LeftColumnProps => ({
  accountSize: 10000,
  setAccountSize: vi.fn(),
  handleUpdateAccountSize: vi.fn(),
  entryScore: null,
  loading: false,
  error: null,
  marketData: md,
  vixRegime: undefined,
  marketTrend: undefined,
  tqqqPrice: 60,
  sqqqPrice: 20,
  tqqqStop: undefined,
  sqqqStop: undefined,
  stopReason: null,
  positionActive: false,
  portfolioMetrics: { totalPnl: 0, returnPct: 0 } as LeftColumnProps['portfolioMetrics'],
  positions: [],
  positionSizing: {} as LeftColumnProps['positionSizing'],
  committedSizing: null,
});

describe('LeftColumn Enter Position button', () => {
  it('is disabled with an alert when TQQQ/SQQQ dates differ', () => {
    render(<LeftColumn {...props(market({}, '2026-11-20', '2026-11-23'))} />);
    expect(screen.getByRole('button', { name: /enter new position/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/different dates/i);
  });

  it('is disabled when data is stale', () => {
    render(<LeftColumn {...props(market({ isStale: true }))} />);
    expect(screen.getByRole('button', { name: /enter new position/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/stale/i);
  });

  it('is enabled with no alert when consistent', () => {
    render(<LeftColumn {...props(market({}, '2026-11-20', '2026-11-20'))} />);
    expect(screen.getByRole('button', { name: /enter new position/i })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LeftColumn entry price notice', () => {
  it('shows a non-blocking notice when market open and prices are old', () => {
    render(<LeftColumn {...props(market({}, '2020-01-02', '2020-01-02'))} marketOpen />);
    expect(screen.getByTestId('entry-price-notice')).toHaveTextContent('Jan 2');
    expect(screen.getByRole('button', { name: /enter new position/i })).toBeEnabled();
  });

  it('shows no notice when market closed', () => {
    render(<LeftColumn {...props(market({}, '2020-01-02', '2020-01-02'))} marketOpen={false} />);
    expect(screen.queryByTestId('entry-price-notice')).not.toBeInTheDocument();
  });

  it('shows only the block alert when blocked', () => {
    render(<LeftColumn {...props(market({ isStale: true }, '2020-01-02', '2020-01-02'))} marketOpen />);
    expect(screen.queryByTestId('entry-price-notice')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows only the block alert when dates mismatch', () => {
    render(<LeftColumn {...props(market({}, '2020-01-02', '2020-01-03'))} marketOpen />);
    expect(screen.queryByTestId('entry-price-notice')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
