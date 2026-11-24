// filepath: src/lib/market-data/provenance.ts
// Purpose: Pure helpers describing the trading date (asOf) of market quotes and when entry should be blocked.
// Key exports: getAsOfSummary, getEntryBlockReason, getEntryPriceNotice
import type { MarketData } from '@/types/market-data';

const SYMBOLS = ['vix', 'qqq', 'tqqq', 'sqqq'] as const;

/** Format 'YYYY-MM-DD' as 'Nov 23' using a local Date (no timezone drift). */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getAsOfSummary(md: MarketData | null): { label: string; stale: boolean } | null {
  if (!md) return null;
  const stale = !!md.isStale;
  const dated = SYMBOLS.filter((s) => md[s].asOf);
  if (dated.length === 0) {
    return stale ? { label: 'Prices may be out of date', stale: true } : null;
  }
  const reference = dated.map((s) => md[s].asOf as string).reduce((a, b) => (b > a ? b : a));
  let label = `Prices as of ${formatDate(reference)}`;
  for (const s of dated) {
    const asOf = md[s].asOf as string;
    if (asOf < reference) label += `, ${s.toUpperCase()} as of ${formatDate(asOf)}`;
  }
  return { label, stale };
}

export function getEntryBlockReason(md: MarketData | null): string | null {
  if (!md) return null;
  if (md.isStale) return 'Market data is stale — refresh before entering a position.';
  const t = md.tqqq.asOf;
  const s = md.sqqq.asOf;
  if (t && s && t !== s) {
    return `TQQQ and SQQQ prices are from different dates (${formatDate(t)} vs ${formatDate(s)}) — refresh before entering.`;
  }
  return null;
}

/** Non-blocking notice: while the market is open, free-tier prices are the previous close. */
export function getEntryPriceNotice(
  md: MarketData | null,
  marketOpen: boolean,
  now: Date = new Date()
): string | null {
  if (!md || !marketOpen) return null;
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const dates = [md.tqqq.asOf, md.sqqq.asOf].filter((d): d is string => !!d);
  if (dates.length === 0) return null;
  const oldest = dates.reduce((a, b) => (b < a ? b : a));
  return oldest < today
    ? `Live prices unavailable — entry will be recorded at the ${formatDate(oldest)} close.`
    : null;
}
