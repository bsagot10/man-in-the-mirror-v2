// filepath: src/types/market-data.ts
// Purpose: Shared market data types used by useMarketData hook and client.ts.

export interface SymbolData {
  currentPrice: number;
  changePercent: number;
  previousClose: number;
  change: number;
  volume: number;
  timestamp: string;
  /** Trading date of the price, YYYY-MM-DD; absent when unknown. */
  asOf?: string;
}

export interface MarketData {
  vix: SymbolData;
  qqq: SymbolData;
  tqqq: SymbolData;
  sqqq: SymbolData;
  /** Set when served from cache past TTL / after a source fallback. */
  isStale?: boolean;
  /** Age of the cached data in ms; set when served from cache past TTL / after a source fallback. */
  cacheAge?: number;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  vix: HistoricalDataPoint[];
  tqqq: HistoricalDataPoint[];
  sqqq: HistoricalDataPoint[];
}

/** Subset of EntryScore returned by the API route (hook-facing shape). */
export interface EntryScore {
  total: number;
  signal: 'ENTER' | 'WATCH' | 'WAIT';
  volatilityRegime: string;
  volatilityScore: number;
  trendScore: number;
  decayScore: number;
}
