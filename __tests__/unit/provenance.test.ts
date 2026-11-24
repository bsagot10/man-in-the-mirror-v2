// filepath: __tests__/unit/provenance.test.ts
// Purpose: Tests for quote-date provenance helpers (as-of summary label, entry block reasons).
// Key exports: none (test file)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAsOfSummary, getEntryBlockReason, getEntryPriceNotice } from '@/lib/market-data/provenance';
import type { MarketData, SymbolData } from '@/types/market-data';

function sym(asOf?: string): SymbolData {
  return {
    currentPrice: 10,
    changePercent: 0,
    previousClose: 10,
    change: 0,
    volume: 1,
    timestamp: '2026-11-23T21:00:00Z',
    ...(asOf ? { asOf } : {}),
  };
}

function md(
  dates: Partial<Record<'vix' | 'qqq' | 'tqqq' | 'sqqq', string>>,
  extra: Partial<MarketData> = {}
): MarketData {
  return {
    vix: sym(dates.vix),
    qqq: sym(dates.qqq),
    tqqq: sym(dates.tqqq),
    sqqq: sym(dates.sqqq),
    ...extra,
  };
}

const D23 = '2026-11-23';
const D20 = '2026-11-20';

describe('getAsOfSummary', () => {
  it('same dates -> single label', () => {
    const r = getAsOfSummary(md({ vix: D23, qqq: D23, tqqq: D23, sqqq: D23 }));
    expect(r).toEqual({ label: 'Prices as of Nov 23', stale: false });
  });

  it('lagging VIX is appended', () => {
    const r = getAsOfSummary(md({ vix: D20, qqq: D23, tqqq: D23, sqqq: D23 }));
    expect(r?.label).toBe('Prices as of Nov 23, VIX as of Nov 20');
  });

  it('no asOf and not stale -> null', () => {
    expect(getAsOfSummary(md({}))).toBeNull();
  });

  it('no asOf and stale -> stale label', () => {
    expect(getAsOfSummary(md({}, { isStale: true }))).toEqual({
      label: 'Prices may be out of date',
      stale: true,
    });
  });

  it('asOf present and isStale -> stale true', () => {
    const r = getAsOfSummary(md({ tqqq: D23 }, { isStale: true }));
    expect(r?.stale).toBe(true);
    expect(r?.label).toBe('Prices as of Nov 23');
  });

  it('null md -> null', () => {
    expect(getAsOfSummary(null)).toBeNull();
  });

  describe('timezone', () => {
    const orig = process.env.TZ;
    beforeEach(() => {
      process.env.TZ = 'Pacific/Auckland';
    });
    afterEach(() => {
      if (orig === undefined) delete process.env.TZ;
      else process.env.TZ = orig;
    });
    it('does not drift the date', () => {
      expect(getAsOfSummary(md({ tqqq: D23 }))?.label).toBe('Prices as of Nov 23');
    });
  });
});

describe('getEntryBlockReason', () => {
  it('blocks when stale', () => {
    expect(getEntryBlockReason(md({}, { isStale: true }))).toBe(
      'Market data is stale — refresh before entering a position.'
    );
  });

  it('blocks mixed tqqq/sqqq dates with exact message', () => {
    expect(getEntryBlockReason(md({ tqqq: D20, sqqq: D23 }))).toBe(
      'TQQQ and SQQQ prices are from different dates (Nov 20 vs Nov 23) — refresh before entering.'
    );
  });

  it('does not block on same past date', () => {
    expect(getEntryBlockReason(md({ tqqq: D20, sqqq: D20 }))).toBeNull();
  });

  it('does not block when one asOf is missing', () => {
    expect(getEntryBlockReason(md({ tqqq: D20 }))).toBeNull();
    expect(getEntryBlockReason(md({ sqqq: D20 }))).toBeNull();
  });

  it('null md -> null', () => {
    expect(getEntryBlockReason(null)).toBeNull();
  });
});

describe('getEntryPriceNotice', () => {
  const now = new Date('2026-11-24T17:35:00Z');

  it('warns when market open and prices are from a prior close', () => {
    expect(getEntryPriceNotice(md({ tqqq: '2026-11-23', sqqq: '2026-11-23' }), true, now)).toContain('Nov 23 close');
  });
  it('is null when prices are from today', () => {
    expect(getEntryPriceNotice(md({ tqqq: '2026-11-24', sqqq: '2026-11-24' }), true, now)).toBeNull();
  });
  it('is null when market closed', () => {
    expect(getEntryPriceNotice(md({ tqqq: '2026-11-23', sqqq: '2026-11-23' }), false, now)).toBeNull();
  });
  it('is null when md is null', () => {
    expect(getEntryPriceNotice(null, true, now)).toBeNull();
  });
  it('is null when asOf missing', () => {
    expect(getEntryPriceNotice(md({}), true, now)).toBeNull();
  });
  it('uses the oldest date', () => {
    expect(getEntryPriceNotice(md({ tqqq: '2026-11-23', sqqq: '2026-11-20' }), true, now)).toContain('Nov 20');
  });
  it('uses New York date near UTC midnight', () => {
    const late = new Date('2026-11-25T02:00:00Z');
    expect(getEntryPriceNotice(md({ tqqq: '2026-11-24', sqqq: '2026-11-24' }), true, late)).toBeNull();
  });
});
