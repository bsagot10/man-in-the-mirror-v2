// filepath: __tests__/hooks/useDashboard.test.ts
// Purpose: Tests that a closed position (auto-close on stop breach, or manual
//          toggle) stays closed across a page reload, and reopens on demand.
// Key exports: test suites for useDashboard position persistence

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// The real hooks return referentially stable values between renders; the mocks
// must too, or effects keyed on them re-run forever. setTqqqPrice() swaps in a
// new market snapshot, standing in for the market moving between page loads.
const mocks = vi.hoisted(() => {
  const refresh = () => Promise.resolve();
  const build = (tqqq: number) => ({
    marketData: {
      vix: { currentPrice: 25, changePercent: 0 },
      qqq: { currentPrice: 400, changePercent: 0 },
      tqqq: { currentPrice: tqqq, changePercent: 0 },
      sqqq: { currentPrice: 20, changePercent: 0 },
    },
    historicalData: null,
    entryScore: null,
    loading: false,
    error: null,
    marketOpen: true,
    lastUpdated: null,
    refresh,
  });
  const state = { market: build(60) };
  // Entry prices restored from localStorage by useEntryPrices on every load.
  // Stops sit 15% above entry: TQQQ 57.50, SQQQ 23.00.
  const entry = {
    prices: { tqqq: 50, sqqq: 20 },
    loading: false,
    error: null,
    actualDate: '2026-11-01',
    fetchPrices: () => Promise.resolve(),
    // Like the real hook: manual prices replace what the hook sees next render.
    setPricesManually: vi.fn((p: { tqqq: number; sqqq: number }) => { entry.prices = p; }),
    clearPrices: () => {},
  };
  return { state, entry, setTqqqPrice: (p: number) => { state.market = build(p); } };
});

vi.mock('@/hooks/useMarketData', () => ({ useMarketData: () => mocks.state.market }));
vi.mock('@/hooks/useEntryPrices', () => ({ useEntryPrices: () => mocks.entry }));

import { useDashboard } from '@/hooks/useDashboard';

describe('useDashboard position persistence across reloads', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.setTqqqPrice(60);
  });

  it('keeps an auto-closed position closed after reload, even if price falls back below the stop', async () => {
    // Load 1: TQQQ at 60 breaches its 57.50 stop, so the pair auto-closes
    const first = renderHook(() => useDashboard());
    await waitFor(() => expect(first.result.current.positionActive).toBe(false));
    expect(first.result.current.stopReason).toBe('TQQQ');
    first.unmount();

    // Load 2 (reload): price has dropped back below the stop
    mocks.setTqqqPrice(52);
    const second = renderHook(() => useDashboard());
    await waitFor(() => expect(second.result.current.positionActive).toBe(false));
    expect(second.result.current.positions).toEqual([]);
  });

  it('keeps a manually closed position closed after reload', async () => {
    mocks.setTqqqPrice(52); // below stop, no auto-close
    const first = renderHook(() => useDashboard());
    act(() => first.result.current.setPositionActive(false));
    first.unmount();

    const second = renderHook(() => useDashboard());
    await waitFor(() => expect(second.result.current.positionActive).toBe(false));
    expect(second.result.current.positions).toEqual([]);
  });

  it('reopening via Update Account Size stays open after reload', async () => {
    mocks.setTqqqPrice(52);
    const first = renderHook(() => useDashboard());
    act(() => first.result.current.setPositionActive(false));
    act(() => first.result.current.handleUpdateAccountSize());
    expect(first.result.current.positionActive).toBe(true);
    first.unmount();

    const second = renderHook(() => useDashboard());
    await waitFor(() => expect(second.result.current.positions).toHaveLength(2));
    expect(second.result.current.positionActive).toBe(true);
  });
});

describe('useDashboard auto-close hydration gate', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.setTqqqPrice(60);
  });

  it('does not auto-close a manually closed position on the first commit', async () => {
    localStorage.setItem('positionActive', 'false');
    localStorage.setItem('positionShares', JSON.stringify({ tqqq: 3, sqqq: 4 }));
    localStorage.setItem('committedSizing', JSON.stringify({ tqqqShares: 3, sqqqShares: 4 }));

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.positionActive).toBe(false));

    expect(result.current.stopReason).toBeNull();
    expect(localStorage.getItem('positionShares')).not.toBeNull();
  });
});

describe('useDashboard reopening a closed position', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.setTqqqPrice(60);
    mocks.entry.prices = { tqqq: 50, sqqq: 20 };
    mocks.entry.setPricesManually.mockClear();
  });

  it('re-enabling ACTIVE after an auto-close opens fresh at current prices, not stale entry', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.positionActive).toBe(false));

    act(() => result.current.setPositionActive(true));

    await waitFor(() => expect(result.current.positionActive).toBe(true));
    expect(result.current.stopReason).toBeNull();
    const tqqq = result.current.positions.find((p) => p.symbol === 'TQQQ');
    expect(tqqq?.entryPrice).toBe(60);
    expect(tqqq?.shares).toBe(result.current.positionSizing.tqqqShares);
    expect(tqqq?.shares).not.toBe(5);
    expect(mocks.entry.setPricesManually).toHaveBeenCalledWith({ tqqq: 60, sqqq: 20 });
  });
});
