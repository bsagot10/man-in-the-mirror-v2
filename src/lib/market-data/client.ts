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
// Constants for Stooq requests
// ============================================================================

const STOOQ_USER_AGENT = 'Mozilla/5.0 (compatible; ManInTheMirror/1.0; +https://github.com/bsagot10/man-in-the-mirror-v2)';
const STOOQ_TIMEOUT_MS = 5000; // 5 second timeout
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

export interface LogContext {
  component: string;
  action: string;
  symbol?: string;
  duration?: number;
  source?: 'stooq' | 'yahoo' | 'cache';
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

export interface SymbolQuote {
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

export interface HistoricalData {
  vix: HistoricalDataPoint[];
  tqqq: HistoricalDataPoint[];
  sqqq: HistoricalDataPoint[];
}

export interface VixData {
  current: number;
  average30d: number;
  regime: 'Extreme' | 'High' | 'Low';
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

// Stooq API (primary data source - no API key required)
const STOOQ_BASE_URL = 'https://stooq.com/q/l/';
const STOOQ_SYMBOLS: Record<string, string> = {
  '^VIX': '^VIX', 'QQQ': 'QQQ.US', 'TQQQ': 'TQQQ.US', 'SQQQ': 'SQQQ.US',
};

interface StooqQuote {
  symbol: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchStooqQuote(symbol: string): Promise<StooqQuote | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STOOQ_TIMEOUT_MS);

  try {
    const stooqSymbol = STOOQ_SYMBOLS[symbol] || symbol;
    const url = `${STOOQ_BASE_URL}?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': STOOQ_USER_AGENT,
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    // Parse CSV: Symbol,Date,Time,Open,High,Low,Close,Volume
    const dataLine = lines[1];
    const values = dataLine.split(',');
    if (values.length < 8) return null;

    const close = parseFloat(values[6]);
    if (isNaN(close) || close === 0) return null;

    return {
      symbol: values[0],
      date: values[1],
      time: values[2],
      open: parseFloat(values[3]) || 0,
      high: parseFloat(values[4]) || 0,
      low: parseFloat(values[5]) || 0,
      close,
      volume: parseInt(values[7], 10) || 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Stooq request timed out for ${symbol}`);
    }
    return null;
  }
}

function formatStooqQuote(quote: StooqQuote): SymbolQuote {
  const currentPrice = quote.close;
  // Stooq doesn't provide previous close, estimate from open
  const previousClose = quote.open || currentPrice;
  return {
    currentPrice,
    previousClose,
    change: Math.round((currentPrice - previousClose) * 100) / 100,
    changePercent: previousClose === 0 ? 0 : Math.round(((currentPrice - previousClose) / previousClose) * 10000) / 100,
    volume: quote.volume,
    timestamp: new Date().toISOString(),
  };
}

// Stooq Historical Data endpoint
const STOOQ_HISTORICAL_URL = 'https://stooq.com/q/d/l/';

// FRED API for VIX (fallback when Yahoo hits rate limits)
const FRED_VIX_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS';

/**
 * Format date for Stooq API (YYYYMMDD format)
 */
function formatDateForStooq(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Fetch historical data from Stooq (primary source for historical data)
 * Returns null if fetch fails, allowing fallback to Yahoo Finance.
 */
async function fetchStooqHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<HistoricalDataPoint[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STOOQ_TIMEOUT_MS);

  try {
    const stooqSymbol = STOOQ_SYMBOLS[symbol] || `${symbol}.US`;
    const d1 = formatDateForStooq(startDate);
    const d2 = formatDateForStooq(endDate);
    const url = `${STOOQ_HISTORICAL_URL}?s=${stooqSymbol}&d1=${d1}&d2=${d2}&i=d`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': STOOQ_USER_AGENT,
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Stooq historical request failed for ${symbol}: ${response.status}`);
      return null;
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    // Need at least header + 1 data row
    if (lines.length < 2) {
      console.warn(`No historical data from Stooq for ${symbol}`);
      return null;
    }

    // Parse CSV: Date,Open,High,Low,Close,Volume
    const dataPoints: HistoricalDataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 6) continue;

      const close = parseFloat(values[4]);
      if (isNaN(close) || close === 0) continue;

      dataPoints.push({
        date: values[0], // Already in YYYY-MM-DD format
        open: parseFloat(values[1]) || 0,
        high: parseFloat(values[2]) || 0,
        low: parseFloat(values[3]) || 0,
        close,
        volume: parseInt(values[5], 10) || 0,
      });
    }

    if (dataPoints.length === 0) {
      console.warn(`No valid data points from Stooq for ${symbol}`);
      return null;
    }

    return dataPoints;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Stooq historical request timed out for ${symbol}`);
    } else {
      console.warn(`Stooq historical fetch error for ${symbol}:`, error);
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
  const timeoutId = setTimeout(() => controller.abort(), STOOQ_TIMEOUT_MS);

  try {
    const response = await fetch(FRED_VIX_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': STOOQ_USER_AGENT,
      },
    });
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
      source: 'cache', // Using 'cache' since 'fred' isn't in the type union
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

/**
 * Format raw Yahoo Finance quote data into our SymbolQuote structure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatSymbolData(quote: any): SymbolQuote {
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
    stooqSuccess: 0,
    stooqFailed: 0,
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

    const emptyQuote: SymbolQuote = {
      currentPrice: 0,
      previousClose: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      const [vixQuote, qqqQuote, tqqqQuote, sqqqQuote] = await Promise.all([
        this.fetchQuote(SYMBOLS.VIX),
        this.fetchQuote(SYMBOLS.QQQ),
        this.fetchQuote(SYMBOLS.TQQQ),
        this.fetchQuote(SYMBOLS.SQQQ),
      ]);

      // Check if ALL data sources failed (all quotes are null)
      const allFailed = !vixQuote && !qqqQuote && !tqqqQuote && !sqqqQuote;

      // If all sources failed and we have cached data, return stale cache
      if (allFailed && this.cache.currentData && this.cache.timestamp) {
        const cacheAge = Date.now() - this.cache.timestamp;
        return {
          ...this.cache.currentData,
          cacheAge,
          isStale: cacheAge > this.CACHE_TTL,
        };
      }

      const data: CurrentMarketData = {
        vix: vixQuote ?? emptyQuote,
        qqq: qqqQuote ?? emptyQuote,
        tqqq: tqqqQuote ?? emptyQuote,
        sqqq: sqqqQuote ?? emptyQuote,
      };

      // Update cache only if we have at least some valid data
      if (!allFailed) {
        this.cache.currentData = data;
        this.cache.timestamp = Date.now();
      }

      return data;
    } catch (error) {
      console.error('Error fetching current data:', error);

      // Return cached data if available (with stale indicator), otherwise empty data
      if (this.cache.currentData && this.cache.timestamp) {
        const cacheAge = Date.now() - this.cache.timestamp;
        return {
          ...this.cache.currentData,
          cacheAge,
          isStale: cacheAge > this.CACHE_TTL,
        };
      }

      return {
        vix: emptyQuote,
        qqq: emptyQuote,
        tqqq: emptyQuote,
        sqqq: emptyQuote,
      };
    }
  }

  /**
   * Fetch quote for a single symbol.
   * Uses Stooq as primary source, falls back to Yahoo Finance with retry.
   */
  private async fetchQuote(symbol: string): Promise<SymbolQuote | null> {
    // Try Stooq first (no API key required, reliable)
    const stooqQuote = await fetchStooqQuote(symbol);
    if (stooqQuote) {
      this.metrics.stooqSuccess++;
      return formatStooqQuote(stooqQuote);
    }

    this.metrics.stooqFailed++;

    // Fall back to Yahoo Finance with retry
    structuredLog(LogLevel.INFO, 'Stooq unavailable, trying Yahoo Finance fallback', {
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
   * Fetch historical data for a single symbol.
   * Uses Stooq as primary source (for non-VIX), falls back to Yahoo Finance.
   * VIX: Uses Yahoo Finance only (no Stooq data).
   */
  private async fetchSymbolHistory(
    symbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HistoricalDataPoint[]> {
    // VIX doesn't have Stooq data, use Yahoo Finance directly
    if (symbol !== SYMBOLS.VIX) {
      // Try Stooq first (primary source for non-VIX)
      const stooqData = await fetchStooqHistoricalData(symbol, startDate, endDate);
      if (stooqData && stooqData.length > 0) {
        this.metrics.stooqSuccess++;
        return stooqData;
      }

      // Stooq failed, try Yahoo Finance as fallback
      structuredLog(LogLevel.INFO, 'Stooq historical unavailable, trying Yahoo Finance fallback', {
        component: 'MarketDataClient',
        action: 'fetchSymbolHistory',
        symbol,
        source: 'yahoo',
      });
    } else {
      // VIX: Go straight to Yahoo Finance
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
            source: 'cache', // Using 'cache' since 'fred' isn't in type union
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

      // Classify volatility regime
      let regime: 'Extreme' | 'High' | 'Low';
      let allocationPercentage: number;

      if (currentVix >= 30) {
        regime = 'Extreme';
        allocationPercentage = 0.5;
      } else if (currentVix >= 20) {
        regime = 'High';
        allocationPercentage = 0.4;
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
