# Code Patterns Reference

This file contains detailed code patterns for the Man in the Mirror Strategy Dashboard.
Moved from CLAUDE.md to reduce file size.

## Component Structure Pattern

```typescript
// 1. Types (exported)
export interface ComponentProps { ... }

// 2. Constants
const MAX_VALUE = 100;
const UNIFIED_VISUAL_MAX = 100;  // For proportional bar comparisons

// 3. Helper functions
function calculateValue(...) { ... }
function calculateBarWidth(score: number, visualMax: number = UNIFIED_VISUAL_MAX): string {
  const percentage = Math.min((score / visualMax) * 100, 100);
  return `${percentage}%`;
}

// 4. Sub-components (if needed)
function SubComponent(...) { ... }

// 5. Main component
export function Component({ ...props }: ComponentProps) {
  // Error state
  if (error) return <ErrorDisplay />

  // Main render
  return <div data-testid="component">...</div>
}
```

## Visual Comparison Pattern

```typescript
// For score bars with different max values, use unified scale for visual comparison
// while maintaining accurate aria attributes for accessibility

const MAX_VOLATILITY_SCORE = 50;
const MAX_TREND_SCORE = 30;
const MAX_DECAY_SCORE = 30;
const UNIFIED_VISUAL_MAX = 100;  // All bars scaled to 100 for comparison

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  return (
    <div
      className="score-fill"
      style={{ width: calculateBarWidth(score, UNIFIED_VISUAL_MAX) }}  // Visual: unified scale
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={maxScore}  // Accessibility: actual max
    />
  );
}
```

## Structured Logging Pattern

```typescript
import { LogLevel, structuredLog, type LogContext } from '@/lib/market-data/client';

// Conditional logging: silent on success, verbose on fallback/errors
structuredLog(LogLevel.INFO, 'Stooq unavailable, trying Yahoo Finance fallback', {
  component: 'MarketDataClient',
  action: 'fetchQuote',
  symbol: 'TQQQ',
  source: 'yahoo',
});

// Error logging with classification
structuredLog(LogLevel.ERROR, 'All data sources failed for symbol', {
  component: 'MarketDataClient',
  action: 'fetchQuote',
  symbol: 'TQQQ',
  errorType: 'NETWORK',
  errorMessage: error.message,
  retryAfter: 5,
});

// Logs are JSON in production, readable in development
```

## Error Classification Pattern

```typescript
import { classifyError, DataSourceError } from '@/lib/market-data/client';

try {
  const data = await fetchData();
} catch (error) {
  const { type, retryAfter } = classifyError(error);
  // DataSourceError.NETWORK → 'Network connection failed' (retry in 5s)
  // DataSourceError.RATE_LIMIT → 'Rate limit exceeded' (retry in 60s)
  // DataSourceError.TIMEOUT → 'Request timed out' (retry in 5s)
  // DataSourceError.SERVER_ERROR → 'Data provider unavailable' (retry in 30s)
  // DataSourceError.INVALID_SYMBOL → 'Invalid trading symbol' (no retry)
}
```

## Cache Staleness Pattern

```typescript
interface CurrentMarketData {
  vix: SymbolQuote;
  cacheAge?: number;  // Age in milliseconds
  isStale?: boolean;  // True if older than TTL
}

// Component displays warning when data is stale
{isStale && cacheAge !== undefined && (
  <div data-testid="stale-data-indicator" className="text-yellow-500 text-xs font-medium">
    Using cached data ({Math.floor(cacheAge / 60000)}m old)
  </div>
)}
```

## Empty State Pattern

```typescript
export function VixChart({ data }: VixChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="ghibli-card" data-testid="vix-chart">
        <div className="card-header">VIX (Volatility Index)</div>
        <div className="card-content" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No VIX data available
          </p>
        </div>
      </div>
    );
  }
  // ... render chart
}
```

## Position Sizing (VIX Regime-Based)

```typescript
function calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice) {
  let allocationPercent: number;

  if (vixValue >= 30) allocationPercent = 0.50;      // Extreme: 50%
  else if (vixValue >= 20) allocationPercent = 0.40; // High: 40%
  else if (vixValue >= 15) allocationPercent = 0.35; // Moderate: 35%
  else allocationPercent = 0.30;                      // Low: 30%

  const allocationAmount = accountSize * allocationPercent;

  // Target 1.25:1 SQQQ:TQQQ share ratio (asymmetric hedge)
  const TARGET_RATIO = 1.25;
  const tqqqShares = Math.floor(allocationAmount / (tqqqPrice + TARGET_RATIO * sqqqPrice));
  const sqqqShares = Math.floor(TARGET_RATIO * tqqqShares);

  return { tqqqShares, sqqqShares, allocationPercent, ... };
}
```

## Deferred State Updates Pattern

```typescript
// UX pattern: Calculate live in background, but only update UI on user action
// Prevents jarring UI updates while user types in input fields

// Live calculation state (updates on every input change)
const positionSizing = useMemo(() =>
  calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice),
  [accountSize, vixValue, tqqqPrice, sqqqPrice]
);

// Committed state (only updates when user clicks "Update")
const [committedSizing, setCommittedSizing] = useState<PositionSizing | null>(null);

// UI displays committed state, falls back to live calculation
<div>Shares: {(committedSizing ?? positionSizing).tqqqShares}</div>

// User action commits the live calculation
function handleUpdate() {
  setCommittedSizing(positionSizing);
}
```

## Type Patterns

```typescript
// Union types for states
type Signal = 'ENTER' | 'WATCH' | 'WAIT';
type VixRegime = 'Low' | 'Moderate' | 'High' | 'Extreme';
type MarketTrend = 'bullish' | 'bearish' | 'neutral';

// Data structures
interface SymbolQuote {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// Shared chart types (from @/types/chart-types)
interface PriceDataPoint { date: string; close: number; }
interface DecayDataPoint { date: string; decay: number; tqqqPrice: number; sqqqPrice: number; }
interface PerformanceDataPoint { date: string; cumulativePnL: number; dailyReturn: number; }
```

## Chart Patterns

```typescript
// CRITICAL: Use 'scatter' type - NEVER 'scattergl' (no spline support)
const traces: Data[] = [{
  type: 'scatter' as const,
  mode: 'lines' as const,
  x: dates,
  y: values,
  name: 'Series Name',
  line: {
    color: CHART_COLORS.vix,
    shape: SPLINE_CONFIG.shape,      // 'spline'
    smoothing: SPLINE_CONFIG.smoothing,  // 1.3 (maximum)
    width: SPLINE_CONFIG.width,      // 3
  },
  connectgaps: true,
}];

// Data processing: Remove flat segments for smooth splines
const { dates, values } = useMemo(() => {
  const validData = data.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));
  const rawDates = validData.map(d => d.date);
  const rawValues = validData.map(d => d.close);
  const processedValues = processChartData(rawValues);  // From @/lib/data-processing
  return { dates: rawDates, values: processedValues };
}, [data]);

// Map-based lookup for multi-series charts (O(1) lookups)
const sqqqMap = new Map<string, number>(validSqqq.map((d) => [d.date, d.close]));
for (const tqqq of validTqqq) {
  const sqqqClose = sqqqMap.get(tqqq.date);
  if (sqqqClose !== undefined) {
    // Process aligned data point
  }
}

// Layout configuration from chart-config
const layout: Partial<Layout> = {
  title: { text: title, font: { size: 14, color: LAYOUT_CONFIG.font.color } },
  plot_bgcolor: LAYOUT_CONFIG.plot_bgcolor,
  paper_bgcolor: LAYOUT_CONFIG.paper_bgcolor,
  hovermode: 'x unified' as const,
  xaxis: { ...AXIS_CONFIG, tickformat: '%b %d' },
  yaxis: { ...AXIS_CONFIG, autorange: true },
  shapes,        // Add threshold lines
  annotations,   // Add labels
};
```

## API Route Patterns

```typescript
// GET route with error handling
export async function GET(_request: NextRequest) {
  try {
    const data = await client.fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Configure caching
export const revalidate = 30;  // 30 seconds (entry-score, market-data)
export const revalidate = 300; // 5 minutes (historical-data)
export const revalidate = 0;   // No cache (metrics endpoint)
```

## Test Patterns

```typescript
// Test structure
describe('Component', () => {
  describe('Rendering', () => { /* Basic render tests */ });
  describe('Display Logic', () => { /* Value display tests */ });
  describe('Loading State', () => { /* Loading UI tests */ });
  describe('Error State', () => { /* Error handling tests */ });
  describe('Styling', () => { /* CSS class tests */ });
});

// Mock setup patterns
vi.mock('module-name', () => ({ /* mock implementation */ }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

// API Route testing with NextRequest
import { NextRequest } from 'next/server';
import { GET as getHandler } from '@/app/api/route';

it('returns 400 for invalid parameter', async () => {
  const request = new NextRequest('http://localhost:3000/api/endpoint?invalid=true');
  const response = await getHandler(request);
  expect(response.status).toBe(400);
});

// Mock yahoo-finance2 as class constructor
vi.mock('yahoo-finance2', () => {
  const mockQuote = vi.fn();
  const mockHistorical = vi.fn();
  class MockYahooFinance {
    quote = mockQuote;
    historical = mockHistorical;
  }
  return { default: MockYahooFinance, __mockQuote: mockQuote, __mockHistorical: mockHistorical };
});

// Integration test pattern (real API calls)
const SKIP_INTEGRATION = process.env.INTEGRATION_TESTS !== 'true';
describe.skipIf(SKIP_INTEGRATION)('Stooq API Integration', () => {
  it('returns valid CSV for TQQQ', async () => {
    const response = await fetch('https://stooq.com/q/l/?s=tqqq.us&f=sd2t2ohlcv&h&e=csv');
    expect(response.ok).toBe(true);
  });
});
```
