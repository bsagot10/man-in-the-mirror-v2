// filepath: __tests__/components/DataAsOf.test.tsx
// Purpose: Verifies the dashboard's data-as-of badge reflects quote asOf dates and staleness (replaces static "Cached Data").
// Key exports: none (test file)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Dashboard from '@/app/page';

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="plotly-chart" />,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const quote = (price: number, asOf?: string) => ({
  currentPrice: price, changePercent: 1, previousClose: price - 1, change: 1,
  volume: 0, timestamp: '2026-11-23T16:00:00Z', ...(asOf ? { asOf } : {}),
});

function setup(opts: { asOf?: Partial<Record<'vix' | 'qqq' | 'tqqq' | 'sqqq', string>>; isStale?: boolean }) {
  const a = opts.asOf ?? {};
  const marketData = {
    vix: quote(20, a.vix), qqq: quote(400, a.qqq), tqqq: quote(50, a.tqqq), sqqq: quote(30, a.sqqq),
    ...(opts.isStale ? { isStale: true } : {}),
  };
  mockFetch.mockImplementation((url: string) => {
    const body =
      url === '/api/market-data' ? { success: true, timestamp: '2026-11-23T16:00:00Z', marketData, marketOpen: false }
      : url === '/api/historical-data' ? { success: true, data: { vix: [], tqqq: [], sqqq: [] } }
      : url === '/api/entry-score' ? { success: true, entryScore: { total: 50, signal: 'WAIT', volatilityRegime: 'Normal', volatilityScore: 10, trendScore: 10, decayScore: 5 } }
      : null;
    return body ? Promise.resolve({ ok: true, json: () => Promise.resolve(body) }) : Promise.reject(new Error('Unknown URL'));
  });
}

const allDate = { vix: '2026-11-23', qqq: '2026-11-23', tqqq: '2026-11-23', sqqq: '2026-11-23' };

describe('Data as-of badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows "Prices as of Nov 23" when all quotes share a date', async () => {
    setup({ asOf: allDate });
    render(<Dashboard />);
    const badge = await screen.findByTestId('data-as-of');
    expect(badge).toHaveTextContent('Prices as of Nov 23');
    expect(badge).not.toHaveTextContent('stale');
    expect(badge).not.toHaveClass('stale');
  });

  it('mentions VIX when it lags the other quotes', async () => {
    setup({ asOf: { ...allDate, vix: '2026-11-20' } });
    render(<Dashboard />);
    expect(await screen.findByTestId('data-as-of')).toHaveTextContent('Prices as of Nov 23, VIX as of Nov 20');
  });

  it('appends stale marker and class when isStale', async () => {
    setup({ asOf: allDate, isStale: true });
    render(<Dashboard />);
    const badge = await screen.findByTestId('data-as-of');
    expect(badge).toHaveTextContent('Prices as of Nov 23 · stale');
    expect(badge).toHaveClass('stale');
  });

  it('is absent when no asOf and not stale', async () => {
    setup({});
    render(<Dashboard />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/market-data'));
    await screen.findByTestId('left-column');
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId('data-as-of')).not.toBeInTheDocument();
  });

  it('never renders the static "Cached Data" label', async () => {
    setup({ asOf: allDate });
    render(<Dashboard />);
    await screen.findByTestId('data-as-of');
    expect(screen.queryByText('Cached Data')).not.toBeInTheDocument();
  });
});
