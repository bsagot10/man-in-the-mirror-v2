/**
 * Market Data Client
 *
 * Wrapper around yahoo-finance2 for fetching market data.
 * Ported from: backend/data_collection.py
 */

import YahooFinance from 'yahoo-finance2';

// Initialize yahoo-finance2 instance (required for v3+)
const yahooFinance = new YahooFinance();

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
  } = {};

  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache

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
      return this.cache.currentData;
    }

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

      const data: CurrentMarketData = {
        vix: vixQuote ?? emptyQuote,
        qqq: qqqQuote ?? emptyQuote,
        tqqq: tqqqQuote ?? emptyQuote,
        sqqq: sqqqQuote ?? emptyQuote,
      };

      // Update cache
      this.cache.currentData = data;
      this.cache.timestamp = Date.now();

      return data;
    } catch (error) {
      console.error('Error fetching current data:', error);

      // Return cached data if available, otherwise empty data
      return (
        this.cache.currentData ?? {
          vix: emptyQuote,
          qqq: emptyQuote,
          tqqq: emptyQuote,
          sqqq: emptyQuote,
        }
      );
    }
  }

  /**
   * Fetch quote for a single symbol.
   */
  private async fetchQuote(symbol: string): Promise<SymbolQuote | null> {
    try {
      const quote = await yahooFinance.quote(symbol);
      return formatSymbolData(quote);
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
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
    const endDate = new Date();
    const startDate = getDaysAgo(days);

    const emptyData: HistoricalDataPoint[] = [];

    try {
      const [vixHistory, tqqqHistory, sqqqHistory] = await Promise.all([
        this.fetchSymbolHistory(SYMBOLS.VIX, startDate, endDate),
        this.fetchSymbolHistory(SYMBOLS.TQQQ, startDate, endDate),
        this.fetchSymbolHistory(SYMBOLS.SQQQ, startDate, endDate),
      ]);

      return {
        vix: vixHistory ?? emptyData,
        tqqq: tqqqHistory ?? emptyData,
        sqqq: sqqqHistory ?? emptyData,
      };
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
   */
  private async fetchSymbolHistory(
    symbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HistoricalDataPoint[]> {
    try {
      const history = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
      });

      return history.map((item) => ({
        date: formatDateToISO(item.date),
        open: item.open ?? 0,
        high: item.high ?? 0,
        low: item.low ?? 0,
        close: item.close ?? 0,
        volume: item.volume ?? 0,
      }));
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
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
