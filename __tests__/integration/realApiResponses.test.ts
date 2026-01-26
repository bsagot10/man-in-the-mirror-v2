/**
 * Integration Tests for Real API Responses
 *
 * These tests hit REAL external APIs (Stooq, Yahoo Finance) to verify:
 * - API endpoints are accessible
 * - Response formats match expectations
 * - Data parsing works correctly
 *
 * NOTE: These tests may be flaky due to:
 * - Rate limiting (especially Yahoo Finance)
 * - Network issues
 * - Market hours (some data only available during trading)
 *
 * Run with: npm run test -- realApiResponses.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Stooq API constants
const STOOQ_QUOTE_URL = 'https://stooq.com/q/l/';
const STOOQ_HISTORICAL_URL = 'https://stooq.com/q/d/l/';
const STOOQ_USER_AGENT = 'Mozilla/5.0 (compatible; MarketDataClient/1.0)';
const STOOQ_TIMEOUT_MS = 10000;

// Helper to format date for Stooq (YYYYMMDD)
function formatDateForStooq(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Skip integration tests in CI or when network is unavailable
// Run explicitly with: INTEGRATION_TESTS=true npm run test -- realApiResponses.test.ts
const SKIP_INTEGRATION = process.env.INTEGRATION_TESTS !== 'true';

// Helper to check if network is available
async function isNetworkAvailable(): Promise<boolean> {
  try {
    const response = await fetch('https://stooq.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe.skipIf(SKIP_INTEGRATION)('Stooq API Integration', () => {
  describe('Current Quote Endpoint', () => {
    it('returns valid CSV for TQQQ', async () => {
      const url = `${STOOQ_QUOTE_URL}?s=tqqq.us&f=sd2t2ohlcv&h&e=csv`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      // Should have header + data
      expect(lines.length).toBeGreaterThanOrEqual(2);

      // Header should contain expected columns
      const header = lines[0].toLowerCase();
      expect(header).toContain('symbol');
      expect(header).toContain('close');

      // Data row should have values
      const dataRow = lines[1].split(',');
      expect(dataRow.length).toBeGreaterThanOrEqual(7);
      expect(dataRow[0]).toContain('TQQQ');
    });

    it('returns valid CSV for SQQQ', async () => {
      const url = `${STOOQ_QUOTE_URL}?s=sqqq.us&f=sd2t2ohlcv&h&e=csv`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(2);

      const dataRow = lines[1].split(',');
      expect(dataRow[0]).toContain('SQQQ');
    });

    it('returns valid CSV for QQQ', async () => {
      const url = `${STOOQ_QUOTE_URL}?s=qqq.us&f=sd2t2ohlcv&h&e=csv`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(2);

      const dataRow = lines[1].split(',');
      expect(dataRow[0]).toContain('QQQ');
    });

    it('returns N/D for VIX (not available on Stooq)', async () => {
      const url = `${STOOQ_QUOTE_URL}?s=%5Evix&f=sd2t2ohlcv&h&e=csv`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();

      // VIX should return N/D (No Data) values
      expect(csvText).toContain('N/D');
    });
  });

  describe('Historical Data Endpoint', () => {
    it('returns historical data for TQQQ', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const d1 = formatDateForStooq(startDate);
      const d2 = formatDateForStooq(endDate);
      const url = `${STOOQ_HISTORICAL_URL}?s=tqqq.us&d1=${d1}&d2=${d2}&i=d`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      // Should have header + multiple data rows
      expect(lines.length).toBeGreaterThan(5);

      // Header should contain OHLCV columns
      const header = lines[0].toLowerCase();
      expect(header).toContain('date');
      expect(header).toContain('open');
      expect(header).toContain('high');
      expect(header).toContain('low');
      expect(header).toContain('close');
      expect(header).toContain('volume');

      // Parse a data row
      const dataRow = lines[1].split(',');
      expect(dataRow.length).toBeGreaterThanOrEqual(6);

      // Date should be in YYYY-MM-DD format
      expect(dataRow[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Close price should be a valid number
      const closePrice = parseFloat(dataRow[4]);
      expect(closePrice).toBeGreaterThan(0);
    });

    it('returns historical data for SQQQ', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const d1 = formatDateForStooq(startDate);
      const d2 = formatDateForStooq(endDate);
      const url = `${STOOQ_HISTORICAL_URL}?s=sqqq.us&d1=${d1}&d2=${d2}&i=d`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      // Should have multiple data points
      expect(lines.length).toBeGreaterThan(5);
    });

    it('returns "No data" for VIX historical (not available)', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const d1 = formatDateForStooq(startDate);
      const d2 = formatDateForStooq(endDate);
      const url = `${STOOQ_HISTORICAL_URL}?s=%5Evix&d1=${d1}&d2=${d2}&i=d`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      expect(response.ok).toBe(true);

      const csvText = await response.text();

      // VIX historical should return "No data"
      expect(csvText.trim()).toBe('No data');
    });
  });

  describe('Data Parsing', () => {
    it('parses TQQQ quote correctly', async () => {
      const url = `${STOOQ_QUOTE_URL}?s=tqqq.us&f=sd2t2ohlcv&h&e=csv`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const values = lines[1].split(',');

      // Parse values
      const symbol = values[0];
      const open = parseFloat(values[3]);
      const high = parseFloat(values[4]);
      const low = parseFloat(values[5]);
      const close = parseFloat(values[6]);
      const volume = parseInt(values[7], 10);

      // Validate parsed values
      expect(symbol).toContain('TQQQ');
      expect(open).toBeGreaterThan(0);
      expect(high).toBeGreaterThanOrEqual(open);
      expect(low).toBeLessThanOrEqual(open);
      expect(close).toBeGreaterThan(0);
      expect(volume).toBeGreaterThan(0);

      // High should be >= Low
      expect(high).toBeGreaterThanOrEqual(low);
    });

    it('parses historical data points correctly', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const d1 = formatDateForStooq(startDate);
      const d2 = formatDateForStooq(endDate);
      const url = `${STOOQ_HISTORICAL_URL}?s=tqqq.us&d1=${d1}&d2=${d2}&i=d`;

      const response = await fetch(url, {
        headers: { 'User-Agent': STOOQ_USER_AGENT },
        signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
      });

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      // Parse each data row (skip header)
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');

        const date = values[0];
        const open = parseFloat(values[1]);
        const high = parseFloat(values[2]);
        const low = parseFloat(values[3]);
        const close = parseFloat(values[4]);
        const volume = parseInt(values[5], 10);

        // Validate each row
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(open).toBeGreaterThan(0);
        expect(high).toBeGreaterThanOrEqual(low);
        expect(close).toBeGreaterThan(0);
        expect(volume).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe.skipIf(SKIP_INTEGRATION)('API Route Integration', () => {
  const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3003';
  let serverAvailable = false;

  beforeAll(async () => {
    // Check if local server is running
    try {
      const response = await fetch(`${BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      serverAvailable = response.ok;
    } catch {
      serverAvailable = false;
    }
  });

  describe('Health Endpoint', () => {
    it.skipIf(!serverAvailable)('returns health status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeDefined();
    });
  });

  describe('Metrics Endpoint', () => {
    it.skipIf(!serverAvailable)('returns metrics data', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(typeof data.metrics.cacheHits).toBe('number');
      expect(typeof data.metrics.cacheMisses).toBe('number');
    });
  });

  describe('Market Data Endpoint', () => {
    it.skipIf(!serverAvailable)('returns current market data', async () => {
      const response = await fetch(`${BASE_URL}/api/market-data`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();

      // Should have TQQQ and SQQQ data (from Stooq)
      if (data.data.tqqq) {
        expect(data.data.tqqq.currentPrice).toBeGreaterThan(0);
      }
      if (data.data.sqqq) {
        expect(data.data.sqqq.currentPrice).toBeGreaterThan(0);
      }
    });
  });

  describe('Historical Data Endpoint', () => {
    it.skipIf(!serverAvailable)('returns historical data', async () => {
      const response = await fetch(`${BASE_URL}/api/historical-data`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();

      // Should have TQQQ and SQQQ historical (from Stooq)
      expect(data.data.tqqq).toBeDefined();
      expect(data.data.sqqq).toBeDefined();
      expect(Array.isArray(data.data.tqqq)).toBe(true);
      expect(Array.isArray(data.data.sqqq)).toBe(true);

      // Should have data points
      expect(data.data.tqqq.length).toBeGreaterThan(0);
      expect(data.data.sqqq.length).toBeGreaterThan(0);

      // Validate data point structure
      const tqqqPoint = data.data.tqqq[0];
      expect(tqqqPoint.date).toBeDefined();
      expect(tqqqPoint.close).toBeGreaterThan(0);
    });
  });

  describe('Entry Score Endpoint', () => {
    it.skipIf(!serverAvailable)('returns entry score calculation', async () => {
      const response = await fetch(`${BASE_URL}/api/entry-score`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();

      // Should have score components
      expect(typeof data.data.totalScore).toBe('number');
      expect(data.data.totalScore).toBeGreaterThanOrEqual(0);
      expect(data.data.totalScore).toBeLessThanOrEqual(110);
    });
  });
});

describe.skipIf(SKIP_INTEGRATION)('Response Schema Validation', () => {
  it('Stooq quote CSV has correct column count', async () => {
    const url = `${STOOQ_QUOTE_URL}?s=qqq.us&f=sd2t2ohlcv&h&e=csv`;

    const response = await fetch(url, {
      headers: { 'User-Agent': STOOQ_USER_AGENT },
      signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
    });

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    // Header: Symbol,Date,Time,Open,High,Low,Close,Volume
    const headerColumns = lines[0].split(',').length;
    expect(headerColumns).toBe(8);

    // Data row should have same column count
    const dataColumns = lines[1].split(',').length;
    expect(dataColumns).toBe(headerColumns);
  });

  it('Stooq historical CSV has correct column count', async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const d1 = formatDateForStooq(startDate);
    const d2 = formatDateForStooq(endDate);
    const url = `${STOOQ_HISTORICAL_URL}?s=qqq.us&d1=${d1}&d2=${d2}&i=d`;

    const response = await fetch(url, {
      headers: { 'User-Agent': STOOQ_USER_AGENT },
      signal: AbortSignal.timeout(STOOQ_TIMEOUT_MS),
    });

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    // Header: Date,Open,High,Low,Close,Volume
    const headerColumns = lines[0].split(',').length;
    expect(headerColumns).toBe(6);

    // Data rows should have same column count
    for (let i = 1; i < lines.length; i++) {
      const dataColumns = lines[i].split(',').length;
      expect(dataColumns).toBe(headerColumns);
    }
  });
});
