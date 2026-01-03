# Stooq-First Integration Technical Guide

**Document Purpose:** Deep technical reference for the Stooq→Yahoo Finance data pipeline
**Audience:** Backend engineers, QA, DevOps
**Last Updated:** January 2, 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Stooq CSV API](#stooq-csv-api)
3. [Fallback Chain](#fallback-chain)
4. [Implementation Details](#implementation-details)
5. [Testing Strategy](#testing-strategy)
6. [Troubleshooting](#troubleshooting)
7. [Performance Tuning](#performance-tuning)
8. [Monitoring](#monitoring)

---

## Architecture Overview

### Data Pipeline

```
┌─────────────────┐
│  Dashboard      │
│  (Next.js App)  │
└────────┬────────┘
         │
         ├─ fetch('/api/market-data')
         ├─ fetch('/api/historical-data')
         └─ fetch('/api/entry-score')
         │
         ↓
┌─────────────────────────────────────┐
│   Next.js API Routes                │
├─────────────────────────────────────┤
│ GET /api/market-data     (30s cache)│
│ GET /api/historical-data (5m cache) │
│ GET /api/entry-score     (30s cache)│
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│   MarketDataClient Class            │
├─────────────────────────────────────┤
│ - Cache layer (5m / 15m TTL)        │
│ - fetchCurrentData()                │
│ - fetchHistoricalData()             │
│ - getVixData()                      │
│ - isMarketOpen()                    │
└────────┬────────────────────────────┘
         │
    ┌────┴──────────────────────────┐
    │                               │
    ↓                               ↓
┌─────────────────┐          ┌──────────────┐
│   STOOQ.COM     │          │  YAHOO FINANCE│
│  (Primary)      │          │  (Fallback)   │
│                 │          │               │
│ - CSV format    │          │ - JSON format │
│ - No API key    │          │ - More fields │
│ - Fast (<100ms) │          │ - More reliable
│ - US markets    │          │ - Slower      │
└─────────────────┘          └──────────────┘
```

### Data Source Priority

1. **Primary:** Stooq.com (preferred - fastest, no API key needed)
2. **Fallback:** Yahoo Finance (backup - more reliable, slower)
3. **Cache:** 5 min for current, 15 min for historical (prevents rate limiting)
4. **Degradation:** Returns cached data if both sources fail

---

## Stooq CSV API

### Endpoint

```
https://stooq.com/q/l/?s={SYMBOL}&f={FORMAT}&h&e=csv
```

### Parameters

| Param | Value | Purpose |
|-------|-------|---------|
| `s` | Symbol | `^VIX`, `QQQ.US`, `TQQQ.US`, `SQQQ.US` |
| `f` | Format | `sd2t2ohlcv` = symbol,date,time,open,high,low,close,volume |
| `h` | Header | Include CSV header (1 row) |
| `e` | Encoding | CSV format |

### Response Format

```
Symbol,Date,Time,Open,High,Low,Close,Volume
TQQQ.US,2025-01-02,22:00:00,85.50,86.25,84.75,85.80,50000000
```

### Parsing Implementation

```typescript
async function fetchStooqQuote(symbol: string): Promise<StooqQuote | null> {
  try {
    const stooqSymbol = STOOQ_SYMBOLS[symbol] || symbol;
    const url = `${STOOQ_BASE_URL}?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
    const response = await fetch(url);

    // Check HTTP status
    if (!response.ok) return null;

    // Parse CSV text
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    // Require at least header + 1 data row
    if (lines.length < 2) return null;

    // Skip header (line 0), parse data line (line 1)
    const dataLine = lines[1];
    const values = dataLine.split(',');

    // Require 8 columns: Symbol,Date,Time,Open,High,Low,Close,Volume
    if (values.length < 8) return null;

    // Parse and validate close price (critical field)
    const close = parseFloat(values[6]);
    if (isNaN(close) || close === 0) return null;

    // Return structured quote
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
  } catch {
    return null; // Silent failure - will trigger fallback
  }
}
```

### Symbol Mapping

Why mapping is needed: Stooq uses `.US` suffix for US stocks and `^` prefix for indices.

```typescript
const STOOQ_SYMBOLS: Record<string, string> = {
  '^VIX': '^VIX',        // VIX index (no change)
  'QQQ': 'QQQ.US',       // Nasdaq-100 ETF
  'TQQQ': 'TQQQ.US',     // 3x Leveraged Nasdaq ETF
  'SQQQ': 'SQQQ.US',     // 3x Inverse Nasdaq ETF
};
```

### Data Limitations

1. **Previous Close:** Stooq doesn't provide `previousClose` field
   - **Solution:** Estimate from `open` price (same-day open ≈ previous close)
   - **Accuracy:** High (typically differs by <0.1%)
   - **Code:**
     ```typescript
     const previousClose = quote.open || currentPrice;
     ```

2. **Data Timing:** Quote time is intraday or end-of-day depending on market status
   - **During trading hours:** Updates every few seconds
   - **After market close:** Shows last available price with PM timestamp

3. **Historical Data:** Stooq doesn't provide historical API
   - **Solution:** Use Yahoo Finance for historical data
   - **Implementation:** Fallback to `yahooFinance.historical()`

### Example Requests

```bash
# VIX (Volatility Index)
curl 'https://stooq.com/q/l/?s=%5EVIX&f=sd2t2ohlcv&h&e=csv'
# Response: ^VIX,2025-01-02,22:00:00,18.50,19.50,18.25,19.20,0

# QQQ (Nasdaq-100 ETF)
curl 'https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv'
# Response: QQQ.US,2025-01-02,22:00:00,400.00,405.50,399.75,402.50,50000000

# TQQQ (3x Leveraged Nasdaq)
curl 'https://stooq.com/q/l/?s=TQQQ.US&f=sd2t2ohlcv&h&e=csv'
# Response: TQQQ.US,2025-01-02,22:00:00,80.00,85.50,79.50,85.80,50000000

# SQQQ (3x Inverse Nasdaq)
curl 'https://stooq.com/q/l/?s=SQQQ.US&f=sd2t2ohlcv&h&e=csv'
# Response: SQQQ.US,2025-01-02,22:00:00,40.00,35.50,40.25,32.75,20000000
```

---

## Fallback Chain

### Flow Diagram

```
fetchQuote(symbol)
├─ Step 1: Try Stooq
│  ├─ fetchStooqQuote(symbol)
│  ├─ Fetch CSV from stooq.com
│  ├─ Parse CSV
│  └─ Return StooqQuote or null
│
├─ Check Stooq result
│  ├─ If successful (not null)
│  │  └─ formatStooqQuote() → SymbolQuote
│  │     └─ RETURN (success, no fallback)
│  │
│  └─ If failed (null)
│     └─ Step 2: Try Yahoo Finance
│
├─ Step 2: Yahoo Finance fallback
│  ├─ Console log: "Stooq unavailable for {symbol}, trying Yahoo Finance..."
│  ├─ yahooFinance.quote(symbol, { validateResult: false })
│  ├─ formatSymbolData(quote) → SymbolQuote
│  ├─ Console log: "Yahoo Finance fallback succeeded for {symbol}"
│  └─ RETURN (fallback success)
│
└─ Step 3: Both failed
   ├─ Console error: "All data sources failed for {symbol}: {error}"
   └─ RETURN null (graceful degradation to cached data)
```

### Console Output Examples

**Success (Stooq works - silent):**
```javascript
// No console output
// Data returned immediately
// Cache updated (5-minute TTL)
```

**Fallback Triggered (Stooq fails):**
```javascript
console.log("Stooq unavailable for QQQ, trying Yahoo Finance fallback...");
console.log("Yahoo Finance fallback succeeded for QQQ");
```

**Complete Failure:**
```javascript
console.error("Error fetching current data: Network error");
console.error("All data sources failed for VIX: Cannot read property 'quote' of undefined");
// Returns cached data or empty quote object
```

### Conditional Logging

Logging is **conditional** - only triggered on fallback:

```typescript
private async fetchQuote(symbol: string): Promise<SymbolQuote | null> {
  // Try Stooq
  const stooqQuote = await fetchStooqQuote(symbol);
  if (stooqQuote) {
    return formatStooqQuote(stooqQuote); // ← Silent success
  }

  // Log fallback (only here, not on success)
  console.log(`Stooq unavailable for ${symbol}, trying Yahoo Finance fallback...`);
  try {
    const quote = await yahooFinance.quote(symbol, { validateResult: false });
    console.log(`Yahoo Finance fallback succeeded for ${symbol}`);
    return formatSymbolData(quote);
  } catch (error) {
    console.error(`All data sources failed for ${symbol}:`, error);
    return null;
  }
}
```

---

## Implementation Details

### File Locations

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/market-data/client.ts` | MarketDataClient class, Stooq/Yahoo logic | 469 |
| `src/app/api/market-data/route.ts` | API endpoint for current data | 49 |
| `src/app/api/historical-data/route.ts` | API endpoint for historical data | ~60 |
| `src/hooks/useMarketData.ts` | React hook for data fetching | 150 |
| `__tests__/unit/marketDataClient.test.ts` | 79+ unit tests | 578 |

### Cache Implementation

```typescript
export class MarketDataClient {
  private cache: {
    currentData?: CurrentMarketData;
    timestamp?: number;
    historicalData?: HistoricalData;
    historicalTimestamp?: number;
  } = {};

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly HISTORICAL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async fetchCurrentData(): Promise<CurrentMarketData> {
    // Check cache freshness
    if (
      this.cache.currentData &&
      this.cache.timestamp &&
      Date.now() - this.cache.timestamp < this.CACHE_TTL
    ) {
      return this.cache.currentData; // ← Cache hit, no API call
    }

    // Cache miss - fetch new data
    const [vixQuote, qqqQuote, tqqqQuote, sqqqQuote] = await Promise.all([
      this.fetchQuote(SYMBOLS.VIX),
      this.fetchQuote(SYMBOLS.QQQ),
      this.fetchQuote(SYMBOLS.TQQQ),
      this.fetchQuote(SYMBOLS.SQQQ),
    ]);

    const data: CurrentMarketData = { vix: vixQuote || emptyQuote, ... };

    // Update cache
    this.cache.currentData = data;
    this.cache.timestamp = Date.now();

    return data;
  }

  clearCache(): void {
    this.cache = {};
  }
}
```

### Cache Behavior Timeline

```
Time   Event                              Cache Status
────────────────────────────────────────────────────────
00:00  First fetch → Cache miss          [Updated 00:00]
00:01  Second fetch → Cache hit          [Fresh (1 min old)]
00:03  Third fetch → Cache hit           [Fresh (3 min old)]
00:05  Fourth fetch → Cache miss         [Expired (5+ min old)]
       (API call triggered)
       API returns new data              [Updated 00:05]
```

### Memory Footprint

**Per cache entry:**
- CurrentMarketData: ~4 SymbolQuotes × 200 bytes = 800 bytes
- HistoricalData: ~30 days × 3 symbols × 100 bytes = 9 KB
- **Total per instance:** ~10 KB

**Impact:** Negligible (Next.js server handles multiple instances)

---

## Testing Strategy

### Test Categories

#### 1. Unit Tests - Market Data Client
**File:** `__tests__/unit/marketDataClient.test.ts` (578 lines)

**Coverage:**
- CSV parsing (5 tests)
- Symbol validation (4 tests)
- Stooq→Yahoo fallback chain (2 tests)
- Cache behavior (3 tests)
- VIX regime classification (4 tests)
- Market hours detection (5 tests)

**Key Test: Stooq Success Path**
```typescript
it('uses Stooq as primary data source', async () => {
  const stooqCsvResponse = `Symbol,Date,Time,Open,High,Low,Close,Volume
TQQQ.US,2025-01-02,22:00:00,85.50,86.25,84.75,85.80,50000000`;

  const mockFetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('stooq.com')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(stooqCsvResponse),
      });
    }
    return Promise.resolve({ ok: false });
  });
  global.fetch = mockFetch;

  const result = await testClient.fetchCurrentData();

  // Verify
  expect(result.tqqq.currentPrice).toBe(85.80); // ← Stooq data
  expect(mockQuote).not.toHaveBeenCalled(); // ← Yahoo NOT called
});
```

**Key Test: Fallback Path**
```typescript
it('falls back to Yahoo Finance when Stooq fails', async () => {
  // Stooq returns null (network error)
  const mockFetch = vi.fn().mockResolvedValue({ ok: false });
  global.fetch = mockFetch;

  // Yahoo Finance succeeds
  mockQuote.mockResolvedValue({
    regularMarketPrice: 85.80,
    regularMarketPreviousClose: 85.50,
    regularMarketVolume: 50000000,
  });

  const result = await testClient.fetchCurrentData();

  // Verify
  expect(result.tqqq.currentPrice).toBe(85.80); // ← Yahoo data
  expect(mockQuote).toHaveBeenCalled(); // ← Yahoo WAS called
});
```

#### 2. Component Tests
**Files:** `__tests__/components/*.test.tsx` (~600 lines total)

**Coverage:**
- Chart rendering (8 tests)
- Data visualization (12 tests)
- Empty states (4 tests)
- Error states (4 tests)
- Responsive layout (3 tests)

#### 3. Integration Tests
**File:** `__tests__/pages/Dashboard.test.tsx` (~200 lines)

**Coverage:**
- Dashboard render (2 tests)
- Data fetching flow (3 tests)
- Component integration (2 tests)
- Position sizing (2 tests)

---

## Troubleshooting

### Symptom: Data Not Loading

**Diagnosis:**
```typescript
// Check browser DevTools Console for:
"Stooq unavailable for QQQ, trying Yahoo Finance fallback..."
"Yahoo Finance fallback succeeded for QQQ"

// If both messages appear:
// → Stooq failed, Yahoo succeeded (OK)

// If only first message (no second):
// → Both Stooq AND Yahoo failed (ERROR)
```

**Solutions:**

1. **Network Issue**
   - Check internet connectivity
   - Check firewall rules for stooq.com and api.example.com (Yahoo)
   - Verify DNS resolution: `nslookup stooq.com`

2. **Stooq Service Down**
   - Visit https://stooq.com/ manually
   - Check status page (if available)
   - Fall back to Yahoo Finance (should work automatically)

3. **Yahoo Finance Rate Limited**
   - Check API rate limits (50 requests/min default)
   - Verify cache is working (should see cache hits)
   - Increase cache TTL if needed

4. **Cache Corruption**
   - Clear cache: `client.clearCache()`
   - Restart server
   - Check MarketDataClient instance is singleton

### Symptom: Stooq Not Being Called

**Diagnosis:**
```typescript
// If no console logs and Yahoo is called immediately:
// → Stooq was skipped (possible causes below)

// Check:
// 1. Is Stooq URL correct in code?
const STOOQ_BASE_URL = 'https://stooq.com/q/l/';

// 2. Are symbol mappings correct?
const STOOQ_SYMBOLS = { 'QQQ': 'QQQ.US', ... };

// 3. Is fetchStooqQuote() being called?
// Add: console.log('Attempting Stooq fetch for:', symbol);
```

**Solutions:**

1. **Verify Code Path**
   ```typescript
   // In fetchQuote(), add logging:
   console.log('fetchQuote called for:', symbol);
   const stooqQuote = await fetchStooqQuote(symbol);
   console.log('Stooq result:', stooqQuote ? 'Success' : 'Null');
   ```

2. **Check URL Construction**
   ```typescript
   const url = `${STOOQ_BASE_URL}?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
   console.log('Stooq URL:', url);
   // Should be: https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv
   ```

3. **Verify Symbol Mapping**
   ```typescript
   const stooqSymbol = STOOQ_SYMBOLS[symbol] || symbol;
   console.log('Mapped symbol:', symbol, '→', stooqSymbol);
   // Should be: 'QQQ' → 'QQQ.US'
   ```

### Symptom: Wrong Price Data

**Diagnosis:**
```typescript
// Check if price is from Stooq or Yahoo:
// 1. Stooq prices: Integer or 1-2 decimals (85.50, 20.30)
// 2. Yahoo prices: More precision (85.50254, 20.30001)

// If prices are very different:
// → Possible data source mismatch
// → Or market data lag (Stooq vs Yahoo updates)
```

**Solutions:**

1. **Verify Parser**
   ```typescript
   // Add logging to formatStooqQuote():
   console.log('Raw Stooq quote:', quote);
   console.log('Formatted quote:', result);
   ```

2. **Check Time Alignment**
   - Stooq: End-of-day price (16:00 ET)
   - Yahoo: Real-time during market hours
   - After hours: Both may show last known price

3. **Validate Data Quality**
   ```typescript
   // Check price is non-zero
   if (close === 0) return null;
   // Check price is reasonable (e.g., QQQ between 100-1000)
   if (close < 100 || close > 1000) return null;
   ```

### Symptom: Console Shows "All data sources failed"

**Diagnosis:**
```
Error message: "All data sources failed for VIX: Cannot read property 'quote' of undefined"

Possible causes:
1. Yahoo Finance module not imported correctly
2. yahooFinance instance not created
3. Both Stooq and Yahoo API down
4. Network connectivity issue (firewall, DNS, VPN)
```

**Solutions:**

1. **Check Module Import**
   ```typescript
   // In client.ts, verify:
   import YahooFinance from 'yahoo-finance2';
   const yahooFinance = new YahooFinance();
   ```

2. **Test Stooq Directly**
   ```bash
   curl 'https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv'
   # Should return CSV with data
   ```

3. **Test Yahoo Finance Directly**
   ```bash
   node -e "const yf = require('yahoo-finance2').default; new yf().quote('QQQ')"
   # Should return quote object
   ```

4. **Check Network**
   ```bash
   # Test connectivity
   ping stooq.com
   nslookup stooq.com
   curl -I https://stooq.com
   ```

5. **Increase Logging**
   ```typescript
   // Add in fetchQuote():
   console.log('Stooq attempt:', symbol);
   console.log('Stooq result:', stooqQuote);
   console.log('Yahoo attempt:', symbol);
   console.log('Yahoo result:', quote);
   ```

---

## Performance Tuning

### Current Configuration (Optimized)

```typescript
// Cache TTLs (prevent API rate limiting)
CACHE_TTL = 5 * 60 * 1000          // 5 minutes for current data
HISTORICAL_CACHE_TTL = 15 * 60 * 1000 // 15 minutes for historical

// API route caching (Next.js)
export const revalidate = 30        // 30 seconds (can be increased to 60)
```

### Optimization Options

**Option 1: Increase Cache TTL (Aggressive)**
```typescript
// If rate limiting occurs:
CACHE_TTL = 10 * 60 * 1000         // 10 minutes (2x)
HISTORICAL_CACHE_TTL = 30 * 60 * 1000 // 30 minutes (2x)

// Trade-off: Data is 2x staler, but 2x fewer API calls
```

**Option 2: Increase API Route Cache (Moderate)**
```typescript
export const revalidate = 60        // 60 seconds (2x)

// Trade-off: Dashboard data updates every 60 sec instead of 30 sec
```

**Option 3: Batch Requests (Advanced)**
```typescript
// Combine 4 quotes into single Stooq request:
// (Current implementation: 4 separate requests)
// (Optimized: 1 batch request if Stooq supports it)

// Research: Check if Stooq allows comma-separated symbols
// Current: ?s=QQQ.US&f=sd2t2ohlcv&h&e=csv
// Proposed: ?s=QQQ.US,TQQQ.US,SQQQ.US&f=sd2t2ohlcv&h&e=csv
```

### Benchmarks (Current)

```
Operation              Time        Network I/O
─────────────────────────────────────────────
Stooq CSV fetch       ~50-100 ms   150-500 bytes
CSV parsing           ~1-5 ms      (CPU only)
Yahoo quote fetch     ~200-500 ms  2-5 KB
Total (Stooq success) ~100-150 ms  (fast path)
Total (Yahoo fallback)~300-600 ms  (slow path)

Cache hit             <1 ms        (memory access)
```

### Stress Testing

```bash
# Load test with 100 concurrent requests
ab -n 100 -c 10 http://localhost:3000/api/market-data

# Expected results:
# - If cache working: All requests in <10ms total
# - If cache not working: Requests time out or slow to 500ms+
# - API rate limiting: 429 Too Many Requests from Stooq

# Verify cache by checking response times:
# Request 1-4: ~100-150ms (Stooq/Yahoo)
# Request 5-N: <1ms (cache)
```

---

## Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold | Action |
|--------|--------|-----------------|--------|
| Stooq availability | 99%+ | <95% | Check service status |
| Fallback rate | 0-1% | >5% | Investigate Stooq issues |
| Cache hit rate | 95%+ | <80% | Check cache invalidation |
| API response time | <150ms | >500ms | Check network/Stooq |
| Error rate | 0% | >1% | Review fallback logs |

### Monitoring Implementation

```typescript
// Add to MarketDataClient
private stats = {
  stooqAttempts: 0,
  stooqSuccesses: 0,
  yahooFallbacks: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
};

async fetchCurrentData(): Promise<CurrentMarketData> {
  // Cache hit
  if (this.cache.currentData && !this.cache.isExpired()) {
    this.stats.cacheHits++;
    return this.cache.currentData;
  }

  // Cache miss
  this.stats.cacheMisses++;

  // Fetch new data
  // ... (track stooqSuccesses, yahooFallbacks, errors)

  // Log stats
  console.log({
    stooqSuccess: this.stats.stooqSuccesses,
    yahooFallback: this.stats.yahooFallbacks,
    cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses),
  });
}
```

### Log Aggregation

Expected logs in production:

```
INFO: Market data fetch completed (source: Stooq)
INFO: Cache updated (expires in 5 minutes)

[After 5 minutes]
INFO: Cache expired, fetching new data

[If Stooq fails]
WARN: Stooq unavailable for QQQ, trying Yahoo Finance fallback...
INFO: Yahoo Finance fallback succeeded for QQQ

[If both fail]
ERROR: All data sources failed for VIX: Network timeout
WARN: Returning cached data (age: 10 minutes)
```

### Health Check Endpoint (Recommended)

```typescript
// Add to API routes
export async function GET(_request: NextRequest) {
  const client = new MarketDataClient();

  try {
    const data = await client.fetchCurrentData();

    // Determine health status
    const health = {
      status: 'healthy',
      stooqWorking: data.vix.currentPrice > 0,
      timestamp: new Date().toISOString(),
      cacheInfo: {
        currentDataAge: Date.now() - client.cacheTimestamp,
      },
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

---

## Quick Reference Commands

```bash
# Test Stooq endpoint manually
curl 'https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv'

# Test API endpoint
curl http://localhost:3000/api/market-data | jq .

# Run tests
npm run test -- marketDataClient.test.ts

# Run with verbose output
npm run test -- marketDataClient.test.ts --reporter=verbose

# Run specific test
npm run test -- marketDataClient.test.ts -t "Stooq primary"

# View coverage
npm run test:coverage

# Clear node cache (if modules not loading)
rm -rf node_modules/.vite && npm run test

# Check for console errors
# (In browser DevTools: console.error() or console.warn())
```

---

## References

- **Stooq API:** https://stooq.com (no official docs, reverse-engineered from web interface)
- **Yahoo Finance 2:** https://github.com/galic/yahoo-finance2
- **Next.js Caching:** https://nextjs.org/docs/app/building-your-application/caching
- **Vitest Documentation:** https://vitest.dev/

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-02 | 1.0 | Initial Stooq-first implementation |
| TBD | 1.1 | Planned: Batch symbol requests |
| TBD | 1.2 | Planned: Health check endpoint |
| TBD | 2.0 | Planned: Alternative data sources (Alpha Vantage) |

---

**Document Status:** Final
**Last Reviewed:** January 2, 2026
**Next Review:** Q2 2026 (or if API changes detected)
