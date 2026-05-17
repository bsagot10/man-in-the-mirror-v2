/**
 * Market Data Client
 *
 * Wrapper around yahoo-finance2 for fetching market data.
 * Ported from: backend/data_collection.py
 */

import YahooFinance from 'yahoo-finance2';


// Initialize yahoo-finance2 instance
const yahooFinance = new YahooFinance();

// ============================================================================
// Constants for HTTP requests
// ============================================================================

const POLYGON_BASE_URL = 'https://api.polygon.io';
const POLYGON_TIMEOUT_MS = 8000;
// ETF tickers supported by Polygon; VIX is an index handled by Yahoo/FRED
const POLYGON_SUPPORTED_SYMBOLS = new Set(['QQQ', 'TQQQ', 'SQQQ']);
const RETRY_JITTER_MAX_MS = 500; // Max random jitter for retry backoff

// ============================================================================
// Retry Utility with Exponential Backoff
// ============================================================================

interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

// Type for Yahoo Finance historical data item
interface YahooHistoricalItem {
  date: Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  adjClose?: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxAttempts: 3, baseDelay: 1000, maxDelay: 5000 }
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Type-safe error message extraction
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Don't retry on rate limits (fail fast)
      if (errorMessage.includes('429')) throw error;

      // Don't retry on client errors (4xx)
      if (errorMessage.includes('400') || errorMessage.includes('404')) throw error;

      // Last attempt - throw
      if (attempt === options.maxAttempts) throw error;

      // Exponential backoff with jitter
      const baseDelay = options.baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * RETRY_JITTER_MAX_MS;
      const delay = Math.min(baseDelay + jitter, options.maxDelay);

      structuredLog(LogLevel.DEBUG, 'Retry attempt failed, backing off', {
        component: 'MarketDataClient',
        action: 'withRetry',
        attempt,
        maxAttempts: options.maxAttempts,
        delayMs: Math.round(delay),
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================================================
// Structured Logging
// ============================================================================

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  component: string;
  action: string;
  symbol?: string;
  duration?: number;
  source?: 'polygon' | 'yahoo' | 'cache' | 'fred';
  errorType?: string;
  [key: string]: unknown;
}

/**
 * Outputs structured JSON logs for monitoring and debugging.
 * In production, these can be parsed by log aggregation tools.
 */
export function structuredLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  // In production, we want JSON logs for parsing
  // In development, we want readable logs
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const prefix = `[${level}]`;
    const ctxStr = context
      ? ` ${JSON.stringify(context, null, 0)}`
      : '';
    switch (level) {
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}${ctxStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}${ctxStr}`);
        break;
      case LogLevel.DEBUG:
        // Only log debug in non-production
        console.debug(`${prefix} ${message}${ctxStr}`);
        break;
      default:
        console.log(`${prefix} ${message}${ctxStr}`);
    }
  }
}

// ============================================================================
// Error Types (User-Friendly Error Messages)
// ============================================================================

export enum DataSourceError {
  NETWORK = 'Network connection failed',
  RATE_LIMIT = 'Rate limit exceeded - please wait',
  SERVER_ERROR = 'Data provider unavailable',
  INVALID_SYMBOL = 'Invalid trading symbol',
  TIMEOUT = 'Request timed out',
  UNKNOWN = 'Unknown error occurred',
}

/**
 * Classifies an error into a user-friendly error type.
 */
export function classifyError(error: unknown): {
  type: DataSourceError;
  retryAfter?: number;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (
    errorMessage.includes('429') ||
    errorMessage.toLowerCase().includes('rate limit')
  ) {
    return { type: DataSourceError.RATE_LIMIT, retryAfter: 60 };
  }

  if (
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('network') ||
    errorMessage.toLowerCase().includes('fetch failed')
  ) {
    return { type: DataSourceError.NETWORK, retryAfter: 5 };
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
    return { type: DataSourceError.TIMEOUT, retryAfter: 5 };
  }

  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return { type: DataSourceError.INVALID_SYMBOL };
  }

  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503')
  ) {
    return { type: DataSourceError.SERVER_ERROR, retryAfter: 30 };
  }

  return { type: DataSourceError.UNKNOWN };
}

// ============================================================================
// Types
// ============================================================================

interface SymbolQuote {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface CurrentMarketData {
  vix: SymbolQuote;
  qqq: SymbolQuote;
  tqqq: SymbolQuote;
  sqqq: SymbolQuote;
  /** Age of cached data in milliseconds. Only present when serving cached data. */
  cacheAge?: number;
  /** True if data is older than the cache TTL. Only present when serving cached data. */
  isStale?: boolean;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HistoricalData {
  vix: HistoricalDataPoint[];
  tqqq: HistoricalDataPoint[];
  sqqq: HistoricalDataPoint[];
}

interface VixData {
  current: number;
  average30d: number;
  regime: 'Low' | 'Moderate' | 'High' | 'Extreme';
  allocationPercentage: number;
  history: number[];
}

// ============================================================================
// Constants
// ============================================================================

export const SYMBOLS = {
  VIX: '^VIX',
  QQQ: 'QQQ',
  TQQQ: 'TQQQ',
  SQQQ: 'SQQQ',
} as const;


// Market hours (EST/EDT)
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_CLOSE_HOUR = 16;
const MARKET_CLOSE_MINUTE = 0;


// ============================================================================
// Polygon.io API (primary source for ETF quotes and history)
// ============================================================================

// FRED API for VIX (fallback when Yahoo hits rate limits)
const FRED_VIX_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS';

interface PolygonSnapshotResponse {
  status: string;
  ticker?: {
    day: { o: number; h: number; l: number; c: number; v: number };
    prevDay: { c: number };
    todaysChange: number;
    todaysChangePerc: number;
  };
}

async function fetchPolygonQuote(symbol: string): Promise<SymbolQuote | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey || !POLYGON_SUPPORTED_SYMBOLS.has(symbol)) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLYGON_TIMEOUT_MS);

  try {
    const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${apiKey}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: PolygonSnapshotResponse = await response.json();
    const ticker = data?.ticker;
    if (!ticker?.day?.c) return null;

    const currentPrice = ticker.day.c;
    const previousClose = ticker.prevDay?.c ?? currentPrice;

    return {
      currentPrice,
      previousClose,
      change: Math.round((currentPrice - previousClose) * 100) / 100,
      changePercent: previousClose === 0 ? 0 : Math.round(((currentPrice - previousClose) / previousClose) * 10000) / 100,
      volume: ticker.day.v ?? 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Polygon request timed out for ${symbol}`);
    }
    return null;
  }
}

interface PolygonAggsResponse {
  status: string;
  results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
}

async function fetchPolygonHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<HistoricalDataPoint[] | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey || !POLYGON_SUPPORTED_SYMBOLS.has(symbol)) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLYGON_TIMEOUT_MS);

  try {
    const from = formatDateToISO(startDate);
    const to = formatDateToISO(endDate);
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=120&apiKey=${apiKey}`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Polygon historical request failed for ${symbol}: ${response.status}`);
      return null;
    }

    const data: PolygonAggsResponse = await response.json();
    if (!data.results || data.results.length === 0) {
      console.warn(`No historical data from Polygon for ${symbol}`);
      return null;
    }

    return data.results.map((bar) => ({
      date: new Date(bar.t).toISOString().split('T')[0],
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Polygon historical request timed out for ${symbol}`);
    } else {
      console.warn(`Polygon historical fetch error for ${symbol}:`, error);
    }
    return null;
  }
}

/**
 * Fetch VIX historical data from FRED (Federal Reserve Economic Data).
 * FRED provides VIXCLS (VIX Close) data as a CSV.
 * Used as fallback when Yahoo Finance hits rate limits (429).
 *
 * @param days - Number of days of historical data to fetch
 * @returns HistoricalDataPoint[] or null if fetch fails
 */
export async function fetchFredVixHistorical(days: number = 30): Promise<HistoricalDataPoint[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLYGON_TIMEOUT_MS);

  try {
    const response = await fetch(FRED_VIX_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`FRED VIX request failed: ${response.status}`);
      return null;
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    // Need at least header + 1 data row
    if (lines.length < 2) {
      console.warn('No VIX data from FRED');
      return null;
    }

    // Parse CSV: DATE,VIXCLS
    // FRED returns data in ascending date order, we want last N days
    const dataPoints: HistoricalDataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 2) continue;

      const dateStr = values[0]; // YYYY-MM-DD format
      const closeStr = values[1].trim();

      // Skip missing values (FRED uses "." for missing)
      if (closeStr === '.' || closeStr === '') continue;

      const close = parseFloat(closeStr);
      if (isNaN(close) || close === 0) continue;

      dataPoints.push({
        date: dateStr,
        open: close, // FRED only provides close, use as open
        high: close,
        low: close,
        close,
        volume: 0, // VIX doesn't have volume
      });
    }

    if (dataPoints.length === 0) {
      console.warn('No valid VIX data points from FRED');
      return null;
    }

    // Return last N days (FRED returns all history, we slice)
    const result = dataPoints.slice(-days);

    structuredLog(LogLevel.INFO, 'FRED VIX fallback succeeded', {
      component: 'MarketDataClient',
      action: 'fetchFredVixHistorical',
      symbol: '^VIX',
      source: 'fred',
      dataPoints: result.length,
    });

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('FRED VIX request timed out');
    } else {
      console.warn('FRED VIX fetch error:', error);
    }
    return null;
  }
}

/**
 * Forward-fill VIX data to match the end date of other charts.
 * Uses last known VIX value for missing trading days.
 * This handles the FRED 1-day lag issue by extending VIX to match TQQQ/SQQQ.
 */
function alignVixToEndDate(
  vixHistory: HistoricalDataPoint[],
  targetEndDate: string
): HistoricalDataPoint[] {
  if (vixHistory.length === 0) return vixHistory;

  const lastVix = vixHistory[vixHistory.length - 1];
  const lastVixDate = new Date(lastVix.date);
  const targetDate = new Date(targetEndDate);

  // If already aligned or ahead, return as-is
  if (lastVixDate >= targetDate) return vixHistory;

  // Generate missing trading days (skip weekends)
  const result = [...vixHistory];
  const currentDate = new Date(lastVixDate);
  currentDate.setDate(currentDate.getDate() + 1);

  while (currentDate <= targetDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (0=Sunday, 6=Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      result.push({
        date: currentDate.toISOString().split('T')[0],
        open: lastVix.close,
        high: lastVix.close,
        low: lastVix.close,
        close: lastVix.close,
        volume: 0,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (result.length > vixHistory.length) {
    structuredLog(LogLevel.INFO, 'VIX forward-filled to align with ETF data', {
      component: 'MarketDataClient',
      action: 'alignVixToEndDate',
      originalEndDate: lastVix.date,
      targetEndDate,
      filledDays: result.length - vixHistory.length,
    });
  }

  return result;
}


// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate percent change between two values.
 * Returns 0 if previous value is 0 to avoid division by zero.
 */
export function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 100) / 100; // Round to 2 decimal places
}

// Yahoo Finance quote response fields we use
interface YahooQuoteResponse {
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
}

/**
 * Format raw Yahoo Finance quote data into our SymbolQuote structure.
 */
export function formatSymbolData(quote: YahooQuoteResponse): SymbolQuote {
  const currentPrice = quote.regularMarketPrice ?? 0;
  const previousClose = quote.regularMarketPreviousClose ?? currentPrice;
  const change = Math.round((currentPrice - previousClose) * 100) / 100;
  const changePercent = calculateChangePercent(currentPrice, previousClose);

  return {
    currentPrice,
    previousClose,
    change,
    changePercent,
    volume: quote.regularMarketVolume ?? 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate historical data array.
 */
export function validateHistoricalData(data: HistoricalDataPoint[] | null | undefined): boolean {
  if (!data || !Array.isArray(data)) return false;
  return data.length > 0;
}

/**
 * Format date to ISO date string (YYYY-MM-DD).
 */
function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days ago.
 */
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ============================================================================
// Market Data Client Class
// ============================================================================

/**
 * Client for fetching market data from Yahoo Finance.
 *
 * Features:
 * - Fetches current quotes for VIX, QQQ, TQQQ, SQQQ
 * - Fetches historical data for charting
 * - Provides VIX regime classification
 * - Checks market open status
 */
export class MarketDataClient {
  private cache: {
    currentData?: CurrentMarketData;
    timestamp?: number;
    historicalData?: HistoricalData;
    historicalTimestamp?: number;
  } = {};

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minute cache (increased to reduce rate limiting)
  private readonly HISTORICAL_CACHE_TTL = 15 * 60 * 1000; // 15 minute cache for historical data

  // Metrics tracking
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    polygonSuccess: 0,
    polygonFailed: 0,
    yahooSuccess: 0,
    yahooFailed: 0,
  };

  /**
   * Get current metrics for monitoring.
   */
  getMetrics() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return {
      ...this.metrics,
      cacheHitRate: total > 0 ? (this.metrics.cacheHits / total) * 100 : 0,
    };
  }

  /**
   * Fetch current market data for all symbols.
   */
  async fetchCurrentData(): Promise<CurrentMarketData> {
    // Check cache
    if (
      this.cache.currentData &&
      this.cache.timestamp &&
      Date.now() - this.cache.timestamp < this.CACHE_TTL
    ) {
      this.metrics.cacheHits++;
      const cacheAge = Date.now() - this.cache.timestamp;
      return {
        ...this.cache.currentData,
        cacheAge,
        isStale: false,
      };
    }

    this.metrics.cacheMisses++;

    try {
      const [vixQuote, qqqQuote, tqqqQuote, sqqqQuote] = await Promise.all([
        this.fetchQuote(SYMBOLS.VIX),
        this.fetchQuote(SYMBOLS.QQQ),
        this.fetchQuote(SYMBOLS.TQQQ),
        this.fetchQuote(SYMBOLS.SQQQ),
      ]);

      // Check if ALL data sources failed (all quotes are null)
      const allFailed = !vixQuote && !qqqQuote && !tqqqQuote && !sqqqQuote;

      // If all sources failed, return stale cache or throw
      if (allFailed) {
        if (this.cache.currentData && this.cache.timestamp) {
          const cacheAge = Date.now() - this.cache.timestamp;
          return {
            ...this.cache.currentData,
            cacheAge,
            isStale: cacheAge > this.CACHE_TTL,
          };
        }
        throw new Error('All market data sources failed and no cache available');
      }

      // Use per-symbol cached fallback for individual fetch failures
      const cachedData = this.cache.currentData;
      const vix = vixQuote ?? cachedData?.vix;
      const qqq = qqqQuote ?? cachedData?.qqq;
      const tqqq = tqqqQuote ?? cachedData?.tqqq;
      const sqqq = sqqqQuote ?? cachedData?.sqqq;

      // If any symbol is still missing, throw (partial-success handling comes in Task 5)
      if (!vix || !qqq || !tqqq || !sqqq) {
        throw new Error('Market data unavailable for one or more symbols');
      }

      const data: CurrentMarketData = { vix, qqq, tqqq, sqqq };

      // Update cache only if we have at least some valid data
      if (!allFailed) {
        this.cache.currentData = data;
        this.cache.timestamp = Date.now();
      }

      return data;
    } catch (error) {
      console.error('Error fetching current data:', error);

      // Return cached data if available (with stale indicator), otherwise re-throw
      if (this.cache.currentData && this.cache.timestamp) {
        const cacheAge = Date.now() - this.cache.timestamp;
        return {
          ...this.cache.currentData,
          cacheAge,
          isStale: cacheAge > this.CACHE_TTL,
        };
      }

      throw error;
    }
  }

  /**
   * Fetch quote for a single symbol.
   * Uses Polygon.io as primary source for ETFs, falls back to Yahoo Finance.
   * VIX goes straight to Yahoo (Polygon free tier targets ETFs/stocks).
   */
  private async fetchQuote(symbol: string): Promise<SymbolQuote | null> {
    if (symbol !== SYMBOLS.VIX) {
      const polygonQuote = await fetchPolygonQuote(symbol);
      if (polygonQuote) {
        this.metrics.polygonSuccess++;
        return polygonQuote;
      }
      this.metrics.polygonFailed++;
    }

    // VIX always uses Yahoo; ETFs fall back to Yahoo when Polygon is unavailable
    structuredLog(LogLevel.INFO, symbol === SYMBOLS.VIX ? 'Fetching VIX from Yahoo Finance' : 'Polygon unavailable, trying Yahoo Finance fallback', {
      component: 'MarketDataClient',
      action: 'fetchQuote',
      symbol,
      source: 'yahoo',
    });

    try {
      const quote = await withRetry(
        () => yahooFinance.quote(symbol, {}, { validateResult: false }),
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 5000 }
      );
      structuredLog(LogLevel.INFO, 'Yahoo Finance fallback succeeded', {
        component: 'MarketDataClient',
        action: 'fetchQuote',
        symbol,
        source: 'yahoo',
      });
      this.metrics.yahooSuccess++;
      return formatSymbolData(quote);
    } catch (error) {
      this.metrics.yahooFailed++;

      // Enhanced error type handling with structured logging
      const { type: errorType, retryAfter } = classifyError(error);

      structuredLog(LogLevel.ERROR, 'All data sources failed for symbol', {
        component: 'MarketDataClient',
        action: 'fetchQuote',
        symbol,
        errorType: errorType,
        errorMessage: error instanceof Error ? error.message : String(error),
        retryAfter,
      });

      return null;
    }
  }

  /**
   * Fetch historical data for charting.
   *
   * @param days - Number of days of historical data (default: 30)
   * @returns Historical data for VIX, TQQQ, and SQQQ
   */
  async fetchHistoricalData(days: number = 30): Promise<HistoricalData> {
    // Check cache
    if (
      this.cache.historicalData &&
      this.cache.historicalTimestamp &&
      Date.now() - this.cache.historicalTimestamp < this.HISTORICAL_CACHE_TTL
    ) {
      return this.cache.historicalData;
    }

    const endDate = new Date();
    const startDate = getDaysAgo(days);

    const emptyData: HistoricalDataPoint[] = [];

    try {
      const [vixHistory, tqqqHistory, sqqqHistory] = await Promise.all([
        this.fetchSymbolHistory(SYMBOLS.VIX, startDate, endDate),
        this.fetchSymbolHistory(SYMBOLS.TQQQ, startDate, endDate),
        this.fetchSymbolHistory(SYMBOLS.SQQQ, startDate, endDate),
      ]);

      // Align VIX to match TQQQ/SQQQ end date (handles FRED 1-day lag)
      const tqqqEndDate = tqqqHistory?.[tqqqHistory.length - 1]?.date;
      const sqqqEndDate = sqqqHistory?.[sqqqHistory.length - 1]?.date;
      const targetEndDate = tqqqEndDate && sqqqEndDate
        ? (tqqqEndDate > sqqqEndDate ? tqqqEndDate : sqqqEndDate)
        : tqqqEndDate || sqqqEndDate;

      const alignedVix = targetEndDate && vixHistory
        ? alignVixToEndDate(vixHistory, targetEndDate)
        : vixHistory ?? emptyData;

      const data: HistoricalData = {
        vix: alignedVix,
        tqqq: tqqqHistory ?? emptyData,
        sqqq: sqqqHistory ?? emptyData,
      };

      // Update cache
      this.cache.historicalData = data;
      this.cache.historicalTimestamp = Date.now();

      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return {
        vix: emptyData,
        tqqq: emptyData,
        sqqq: emptyData,
      };
    }
  }

  /**
   * Fetch historical prices for TQQQ and SQQQ on a specific date.
   * Used for calculating position P&L with real historical entry prices.
   *
   * @param targetDate - The date to fetch prices for (YYYY-MM-DD format)
   * @returns Object with tqqq and sqqq closing prices, and the actual trading date
   */
  // fallow-ignore-next-line unused-class-members
  async fetchPricesOnDate(targetDate: string): Promise<{
    tqqq: number | null;
    sqqq: number | null;
    actualDate: string | null;
  }> {
    const LOOKBACK_DAYS = 7;

    const target = new Date(targetDate + 'T00:00:00Z');
    const startDate = new Date(target);
    startDate.setDate(startDate.getDate() - LOOKBACK_DAYS);
    const endDate = new Date(target);
    endDate.setDate(endDate.getDate() + 1);

    const [tqqqData, sqqqData] = await Promise.all([
      this.fetchSymbolHistory(SYMBOLS.TQQQ, startDate, endDate),
      this.fetchSymbolHistory(SYMBOLS.SQQQ, startDate, endDate),
    ]);

    // Find the closest trading day to target date (prefer earlier dates)
    const findClosestDate = (
      data: HistoricalDataPoint[],
      target: string
    ): HistoricalDataPoint | null => {
      if (!data || data.length === 0) return null;

      // Try exact match first
      const exact = data.find((d) => d.date === target);
      if (exact) return exact;

      // Find closest earlier date
      const targetTime = new Date(target + 'T00:00:00Z').getTime();
      let closest: HistoricalDataPoint | null = null;
      let closestDiff = Infinity;

      for (const point of data) {
        const pointTime = new Date(point.date + 'T00:00:00Z').getTime();
        const diff = targetTime - pointTime;
        if (diff >= 0 && diff < closestDiff) {
          closestDiff = diff;
          closest = point;
        }
      }

      return closest;
    };

    const tqqqPrice = findClosestDate(tqqqData, targetDate);
    const sqqqPrice = findClosestDate(sqqqData, targetDate);

    return {
      tqqq: tqqqPrice?.close ?? null,
      sqqq: sqqqPrice?.close ?? null,
      actualDate: tqqqPrice?.date ?? sqqqPrice?.date ?? null,
    };
  }

  /**
   * Fetch historical data for a single symbol.
   * Uses Polygon.io as primary source for ETFs, falls back to Yahoo Finance.
   * VIX goes straight to Yahoo (Polygon free tier targets ETFs/stocks).
   */
  private async fetchSymbolHistory(
    symbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HistoricalDataPoint[]> {
    if (symbol !== SYMBOLS.VIX) {
      const polygonData = await fetchPolygonHistoricalData(symbol, startDate, endDate);
      if (polygonData && polygonData.length > 0) {
        this.metrics.polygonSuccess++;
        return polygonData;
      }

      structuredLog(LogLevel.INFO, 'Polygon historical unavailable, trying Yahoo Finance fallback', {
        component: 'MarketDataClient',
        action: 'fetchSymbolHistory',
        symbol,
        source: 'yahoo',
      });
    } else {
      structuredLog(LogLevel.INFO, 'Fetching VIX from Yahoo Finance', {
        component: 'MarketDataClient',
        action: 'fetchSymbolHistory',
        symbol,
        source: 'yahoo',
      });
    }

    try {
      const history = await withRetry(
        () => yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
        }, { validateResult: false }),
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 5000 }
      );

      // Validate response
      if (!history || history.length === 0) {
        structuredLog(LogLevel.WARN, 'No data returned from Yahoo Finance', {
          component: 'MarketDataClient',
          action: 'fetchSymbolHistory',
          symbol,
          source: 'yahoo',
        });
        this.metrics.yahooFailed++;

        return [];
      }

      const mapped = history.map((item: YahooHistoricalItem) => ({
        date: formatDateToISO(item.date),
        open: item.open ?? 0,
        high: item.high ?? 0,
        low: item.low ?? 0,
        close: item.close ?? 0,
        volume: item.volume ?? 0,
      }));

      structuredLog(LogLevel.INFO, 'Yahoo Finance historical fallback succeeded', {
        component: 'MarketDataClient',
        action: 'fetchSymbolHistory',
        symbol,
        source: 'yahoo',
        dataPoints: mapped.length,
      });

      this.metrics.yahooSuccess++;
      return mapped;
    } catch (error) {
      const { type: errorType, retryAfter } = classifyError(error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.metrics.yahooFailed++;

      // VIX fallback: Try FRED when Yahoo fails (especially on 429 rate limit)
      if (symbol === SYMBOLS.VIX) {
        structuredLog(LogLevel.INFO, 'Yahoo VIX failed, trying FRED fallback', {
          component: 'MarketDataClient',
          action: 'fetchSymbolHistory',
          symbol,
          errorType,
          source: 'yahoo',
        });

        // Calculate days from date range
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const fredData = await fetchFredVixHistorical(days);

        if (fredData && fredData.length > 0) {
          structuredLog(LogLevel.INFO, 'FRED VIX fallback succeeded', {
            component: 'MarketDataClient',
            action: 'fetchSymbolHistory',
            symbol,
            source: 'fred',
            dataPoints: fredData.length,
          });
          return fredData;
        }
      }

      structuredLog(LogLevel.ERROR, 'All historical data sources failed for symbol', {
        component: 'MarketDataClient',
        action: 'fetchSymbolHistory',
        symbol,
        errorType,
        errorMessage,
        retryAfter,
      });

      return [];
    }
  }

  /**
   * Get detailed VIX data with regime classification.
   */
  async getVixData(): Promise<VixData> {
    try {
      const [currentData, historicalData] = await Promise.all([
        this.fetchCurrentData(),
        this.fetchHistoricalData(30),
      ]);

      const currentVix = currentData.vix.currentPrice;
      const history = historicalData.vix.map((d) => d.close);
      const average30d =
        history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : currentVix;

      // Classify volatility regime (aligned with vixRegime.ts thresholds)
      let regime: 'Low' | 'Moderate' | 'High' | 'Extreme';
      let allocationPercentage: number;

      if (currentVix >= 30) {
        regime = 'Extreme';
        allocationPercentage = 0.5;
      } else if (currentVix >= 20) {
        regime = 'High';
        allocationPercentage = 0.4;
      } else if (currentVix >= 15) {
        regime = 'Moderate';
        allocationPercentage = 0.35;
      } else {
        regime = 'Low';
        allocationPercentage = 0.3;
      }

      return {
        current: Math.round(currentVix * 100) / 100,
        average30d: Math.round(average30d * 100) / 100,
        regime,
        allocationPercentage,
        history,
      };
    } catch (error) {
      console.error('Error getting VIX data:', error);
      return {
        current: 0,
        average30d: 0,
        regime: 'Low',
        allocationPercentage: 0.3,
        history: [],
      };
    }
  }

  /**
   * Check if US market is currently open.
   *
   * Market hours: 9:30 AM - 4:00 PM ET
   * Closed on weekends
   */
  isMarketOpen(): boolean {
    const now = new Date();

    // Convert to Eastern Time
    const estTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
    );

    // Check if weekend (0 = Sunday, 6 = Saturday)
    const dayOfWeek = estTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check market hours
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    const currentTimeMinutes = hours * 60 + minutes;

    const marketOpenMinutes = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
    const marketCloseMinutes = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;

    return currentTimeMinutes >= marketOpenMinutes && currentTimeMinutes < marketCloseMinutes;
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache = {};
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const marketDataClient = new MarketDataClient();
